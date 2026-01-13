import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event, TrainerSlot } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useToast } from '@/hooks/use-toast'
import { QRCodeSVG } from 'qrcode.react'
import { formatDate } from '@/lib/utils'
import { getNextWaitlistPosition } from '@/lib/waitlistUtils'

interface RegistrationFormProps {
  event: Event
  trainerId: string
  trainerSlot: TrainerSlot
  trainerName?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function RegistrationForm({ 
  event, 
  trainerId, 
  trainerSlot,
  trainerName, 
  isOpen, 
  onClose, 
  onSuccess 
}: RegistrationFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [registration, setRegistration] = useState<{
    uniqueCode: string
    qrCodeData: string
  } | null>(null)

  const generateUniqueCode = (): string => {
    // Generate 6-digit code in format XXX-XXX
    const part1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const part2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${part1}-${part2}`
  }

  const generateCancellationToken = (): string => {
    // Generate secure random token (32 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: t('common.error'),
        description: 'Please fill all fields',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const uniqueCode = generateUniqueCode()
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const cancellationToken = generateCancellationToken()
      
      // Generate QR code data
      const qrCodeData = `arena-srsnov://register?event=${event.id}&trainer=${trainerId}&user=${userId}&code=${uniqueCode}`

      // Determine status (confirmed or waitlist)
      const isFull = trainerSlot.capacity !== -1 && trainerSlot.currentCount >= trainerSlot.capacity
      const status = isFull ? 'waitlist' : 'confirmed'

      // Create registration document
      const registrationData: any = {
        eventId: event.id,
        trainerId: trainerId,
        userId: userId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        uniqueCode: uniqueCode,
        qrCodeData: qrCodeData,
        status: status,
        cancellationToken: cancellationToken,
        tokenExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        registeredAt: new Date()
      }

      // Only add position if on waitlist
      if (isFull) {
        const nextPosition = await getNextWaitlistPosition(event.id, trainerId)
        registrationData.position = nextPosition
      }

      const registrationRef = await addDoc(collection(db, 'registrations'), registrationData)
      const registrationId = registrationRef.id

      // Update trainer's current count
      const eventRef = doc(db, 'events', event.id)
      await updateDoc(eventRef, {
        [`trainers.${trainerId}.currentCount`]: increment(1),
        updatedAt: new Date()
      })

      // Send confirmation email (if Firebase Email Extension is installed)
      try {
        const emailData = {
          to: formData.email,
          message: {
            subject: isFull 
              ? 'Pridaný na čakaciu listinu - Aréna Sršňov' 
              : 'Potvrdenie registrácie - Aréna Sršňov',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #1a1a1a; color: #FDB913; padding: 20px; text-align: center; }
                  .content { background: #f9f9f9; padding: 20px; }
                  .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #FDB913; }
                  .label { font-weight: bold; color: #666; }
                  .value { color: #000; }
                  .qr-section { text-align: center; margin: 20px 0; padding: 20px; background: white; }
                  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                  .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
                  .status-confirmed { background: #22c55e; color: white; }
                  .status-waitlist { background: #f59e0b; color: white; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🏒 Aréna Sršňov</h1>
                    <h2>${isFull ? 'Čakacia listina' : 'Potvrdenie registrácie'}</h2>
                  </div>
                  
                  <div class="content">
                    <p>Vitajte, <strong>${formData.name}</strong>!</p>
                    
                    ${isFull 
                      ? `<p>Boli ste pridaní na <span class="status-badge status-waitlist">ČAKACIU LISTINU</span> pre nasledujúci tréning:</p>`
                      : `<p>Vaša registrácia bola <span class="status-badge status-confirmed">POTVRDENÁ</span> pre nasledujúci tréning:</p>`
                    }
                    
                    <div class="info-row">
                      <span class="label">Tréning:</span>
                      <span class="value">${event.title}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Dátum:</span>
                      <span class="value">${event.date}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Čas:</span>
                      <span class="value">${event.startTime}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Trvanie:</span>
                      <span class="value">${event.duration} minút</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Tréner:</span>
                      <span class="value">${trainerName || 'Tréner'}</span>
                    </div>
                    
                    ${!isFull ? `
                      <div class="info-row" style="border-left-color: #FDB913; background: #fffbeb;">
                        <span class="label">Vaše registračné číslo:</span>
                        <span class="value" style="font-size: 20px; font-weight: bold; color: #FDB913;">${uniqueCode}</span>
                      </div>
                      
                      <div class="qr-section">
                        <p><strong>Váš QR kód pre check-in:</strong></p>
                        <p style="color: #666; font-size: 14px;">Uložte si tento QR kód alebo ho ukážte pri príchode na tréning.</p>
                        <div style="margin: 20px 0;">
                          <svg width="200" height="200">
                            <text x="100" y="100" text-anchor="middle" fill="#666" font-size="12">
                              QR kód bude zobrazený v aplikácii
                            </text>
                          </svg>
                        </div>
                        <p style="font-size: 12px; color: #999;">
                          QR kód si môžete stiahnuť priamo z aplikácie.
                        </p>
                      </div>
                    ` : `
                      <div class="info-row" style="border-left-color: #f59e0b;">
                        <p><strong>Pozícia na čakacej listine:</strong> ${registrationData.position || 'TBD'}</p>
                        <p style="margin-top: 10px; color: #666;">
                          Dostanete email hneď ako sa uvoľní miesto.
                        </p>
                      </div>
                    `}
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                      <p style="margin: 0; font-size: 14px;">
                        <strong>💡 Tip:</strong> Prihláste sa do aplikácie a nájdite tento tréning v kalendári pre viac detailov.
                      </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 20px; background: white; border: 2px solid #e5e7eb; border-radius: 8px; text-align: center;">
                      <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                        Potrebujete zrušiť registráciu?
                      </p>
                      <a href="https://arena-srsnov.vercel.app/my-registration/${registrationId}/${cancellationToken}" 
                         style="display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                        Zrušiť registráciu
                      </a>
                      <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                        Tento odkaz vyprší o 14 dní
                      </p>
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>Tento email bol automaticky vygenerovaný systémom Aréna Sršňov.</p>
                    <p style="font-size: 11px; color: #999; margin-top: 10px;">
                      Ak ste túto registráciu nevykonali, ignorujte tento email.
                    </p>
                    <p>&copy; ${new Date().getFullYear()} Aréna Sršňov. Všetky práva vyhradené.</p>
                  </div>
                </div>
              </body>
              </html>
            `
          }
        }
        
        await addDoc(collection(db, 'mail'), emailData)
        console.log('✅ Email queued for sending to:', formData.email)
      } catch (emailError) {
        console.warn('⚠️ Could not queue email (Extension may not be installed):', emailError)
        // Don't fail registration if email fails
      }

      // Show success with QR code
      setRegistration({ uniqueCode, qrCodeData })

      toast({
        title: t('booking.success'),
        description: isFull 
          ? t('booking.waitlistJoined')
          : `Your ID: ${uniqueCode}`
      })

    } catch (error: any) {
      console.error('Error registering:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to register',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const downloadQRCode = () => {
    const svg = document.getElementById('registration-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `arena-srsnov-${registration?.uniqueCode}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Show success screen with QR code
  if (registration) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-background-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-2xl">
              ✅ {t('booking.success')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="text-text-muted mb-2">Your Registration ID:</div>
              <div className="text-primary text-4xl font-bold mono tracking-wider">
                {registration.uniqueCode}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg flex justify-center">
              <QRCodeSVG
                id="registration-qr-code"
                value={registration.qrCodeData}
                size={256}
                level="H"
                includeMargin
              />
            </div>

            <div className="text-center text-text-secondary text-sm">
              <p>{t('booking.confirmationEmail', { email: formData.email })}</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={downloadQRCode}
              className="flex-1 border-primary text-primary hover:bg-primary/10"
            >
              Download QR Code
            </Button>
            <Button 
              onClick={onSuccess}
              className="flex-1 bg-primary hover:bg-primary-gold text-primary-foreground"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Show registration form
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {t('booking.bookTraining')}
          </DialogTitle>
          <div className="text-text-muted text-sm mt-2">
            <div>{event.title} • {formatDate(event.date)} {event.startTime}</div>
            {trainerName && (
              <div className="text-primary font-semibold mt-1">
                Trainer: {trainerName}
              </div>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-white">{t('booking.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-background-dark border-border text-white"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-white">{t('booking.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background-dark border-border text-white"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-white">{t('booking.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-background-dark border-border text-white"
              placeholder="+421 XXX XXX XXX"
              required
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-border text-white"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary hover:bg-primary-gold text-primary-foreground"
            >
              {submitting ? t('common.loading') : t('booking.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

