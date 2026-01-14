import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event, User } from '@/types'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, Users, CheckCircle2 } from 'lucide-react'

interface TrainerConfirmationModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
  currentUser: User
  onConfirmed: () => void
}

export default function TrainerConfirmationModal({
  event,
  isOpen,
  onClose,
  currentUser,
  onConfirmed
}: TrainerConfirmationModalProps) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [capacity, setCapacity] = useState<number>(10)
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [description, setDescription] = useState('')

  // Check if current user has already confirmed
  const hasConfirmed = event.trainers && event.trainers[currentUser.uid]

  // Get already confirmed trainers
  const confirmedTrainers = event.trainers
    ? Object.values(event.trainers).filter(t => t.trainerId !== currentUser.uid)
    : []

  const handleConfirm = async () => {
    if (!description.trim()) {
      toast({
        title: t('common.error'),
        description: 'Please add a description for participants',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const eventRef = doc(db, 'events', event.id)
      
      // Prepare trainer data
      const trainerData = {
        trainerId: currentUser.uid,
        trainerName: currentUser.name,
        trainerPhoto: currentUser.photoURL || '',
        capacity: isUnlimited ? -1 : capacity,
        currentCount: 0,
        description: description.trim(),
        joinedAt: new Date()
      }

      // Check if this is the first trainer confirming
      const isFirstTrainer = !event.trainers || Object.keys(event.trainers).length === 0

      // Update event with trainer confirmation
      await updateDoc(eventRef, {
        [`trainers.${currentUser.uid}`]: trainerData,
        status: isFirstTrainer ? 'active' : event.status,
        updatedAt: new Date()
      })

      toast({
        title: t('common.success'),
        description: 'You have confirmed your availability for this event'
      })

      onConfirmed()
      onClose()
    } catch (error: any) {
      console.error('Error confirming availability:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to confirm availability',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNotAvailable = () => {
    onClose()
  }

  const formatEventDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString(i18n.language === 'sk' ? 'sk-SK' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (hasConfirmed) {
    // Show already confirmed message
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-background-dark border-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              {t('trainer.alreadyConfirmed') || 'Already Confirmed'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-text-secondary">
              {t('trainer.alreadyConfirmedMessage') || 'You have already confirmed your availability for this event.'}
            </p>
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <p><strong>{t('events.capacity')}:</strong> {event.trainers[currentUser.uid].capacity === -1 ? t('events.unlimited') : event.trainers[currentUser.uid].capacity}</p>
                <p><strong>{t('trainer.description') || 'Description'}:</strong> {event.trainers[currentUser.uid].description}</p>
                <p><strong>{t('trainer.participants') || 'Current Participants'}:</strong> {event.trainers[currentUser.uid].currentCount}</p>
              </div>
            </div>
            <Button onClick={onClose} className="w-full">
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background-dark border-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-400"></div>
            {t('trainer.organizationalEvent') || 'Organizational Event'}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {formatEventDate(event.date)} • {event.startTime}-{(() => {
              const [hours, minutes] = event.startTime.split(':').map(Number)
              const endMinutes = hours * 60 + minutes + (event.duration || 60)
              const endHours = Math.floor(endMinutes / 60)
              const endMins = endMinutes % 60
              return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
            })()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Info */}
          <div className="bg-background-card rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3">{event.title}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar className="h-4 w-4" />
                {formatEventDate(event.date)}
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Clock className="h-4 w-4" />
                {event.startTime} • {event.duration} {t('events.duration') || 'min'}
              </div>
            </div>
          </div>

          {/* Already Confirmed Trainers */}
          {confirmedTrainers.length > 0 && (
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                {t('trainer.trainersAlreadyConfirmed') || 'Trainers Already Confirmed'} ({confirmedTrainers.length})
              </h4>
              <div className="space-y-3">
                {confirmedTrainers.map((trainer) => (
                  <div key={trainer.trainerId} className="bg-background-card rounded-lg p-4 flex items-start gap-3">
                    {trainer.trainerPhoto ? (
                      <img
                        src={trainer.trainerPhoto}
                        alt={trainer.trainerName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {trainer.trainerName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-white">{trainer.trainerName}</p>
                      <p className="text-sm text-text-secondary mt-1">{trainer.description}</p>
                      <p className="text-xs text-blue-400 mt-1">
                        {trainer.capacity === -1 
                          ? `${trainer.currentCount} ${t('events.registeredUnlimited') || 'registered (unlimited)'}`
                          : `${trainer.currentCount}/${trainer.capacity} ${t('events.spots') || 'spots'}`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation Form */}
          <div className="border-t border-border pt-6">
            <h4 className="text-white font-semibold mb-4">
              {t('trainer.confirmYourAvailability') || '✅ Confirm Your Availability?'}
            </h4>

            <div className="space-y-4">
              {/* Capacity */}
              <div>
                <Label className="text-white mb-2 block">
                  {t('trainer.yourCapacityLimit') || 'Your Capacity Limit'}
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="unlimited"
                      checked={isUnlimited}
                      onChange={(e) => setIsUnlimited(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="unlimited" className="text-white cursor-pointer">
                      {t('events.unlimited')} (∞)
                    </Label>
                  </div>
                  {!isUnlimited && (
                    <Input
                      type="number"
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                      className="bg-background-card border-border text-white"
                      placeholder="10"
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-white mb-2 block">
                  {t('trainer.yourDescription') || 'Your Description'} <span className="text-red-400">*</span>
                </Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[80px] bg-background-card border border-border rounded-md p-3 text-white placeholder:text-text-muted focus:border-primary focus:outline-none"
                  placeholder={t('trainer.descriptionPlaceholder') || 'e.g., "Beginner group - technique focus" or "Advanced players welcome"'}
                  required
                />
                <p className="text-xs text-text-muted mt-1">
                  {t('trainer.descriptionHelp') || 'This will be shown to users when they select a trainer'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleNotAvailable}
              variant="outline"
              className="flex-1 border-border text-white hover:bg-white/10"
              disabled={loading}
            >
              {t('trainer.notAvailable') || 'Not Available'}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading || !description.trim()}
            >
              {loading ? t('common.loading') : (t('trainer.confirmAndJoin') || 'Confirm & Join Event')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

