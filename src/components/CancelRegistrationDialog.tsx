import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { query, collection, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useToast } from '@/hooks/use-toast'
import { cancelRegistration } from '@/lib/waitlistUtils'

interface CancelRegistrationDialogProps {
  eventId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CancelRegistrationDialog({
  eventId,
  isOpen,
  onClose,
  onSuccess
}: CancelRegistrationDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.phone) {
      toast({
        title: t('common.error'),
        description: 'Please fill all fields',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      // Find registration by email and phone
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where('eventId', '==', eventId),
        where('email', '==', formData.email),
        where('phone', '==', formData.phone)
      )

      const registrationsSnap = await getDocs(registrationsQuery)

      if (registrationsSnap.empty) {
        toast({
          title: t('common.error'),
          description: t('booking.cancelError'),
          variant: 'destructive'
        })
        setSubmitting(false)
        return
      }

      // Get the first matching registration (should only be one)
      const registrationDoc = registrationsSnap.docs[0]
      const registrationData = registrationDoc.data()

      // Check if already cancelled
      if (registrationData.status === 'cancelled') {
        toast({
          title: t('common.error'),
          description: t('booking.alreadyCancelled'),
          variant: 'destructive'
        })
        setSubmitting(false)
        return
      }

      // Cancel the registration (this will also promote from waitlist if applicable)
      await cancelRegistration(registrationDoc.id)

      toast({
        title: t('booking.cancelSuccess'),
        description: registrationData.status === 'waitlist' 
          ? t('booking.waitlistRemoved') 
          : t('booking.cancelConfirmation')
      })

      // Reset form
      setFormData({ email: '', phone: '' })
      onSuccess()

    } catch (error: any) {
      console.error('Error cancelling registration:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to cancel registration',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {t('booking.cancelTitle')}
          </DialogTitle>
          <DialogDescription className="text-text-muted">
            {t('booking.cancelDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="cancel-email" className="text-white">{t('booking.email')}</Label>
            <Input
              id="cancel-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background-dark border-border text-white"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="cancel-phone" className="text-white">{t('booking.phone')}</Label>
            <Input
              id="cancel-phone"
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
              variant="destructive"
              className="flex-1"
            >
              {submitting ? t('common.loading') : t('booking.cancel')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

