import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event, User } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Calendar, Clock, Users, CheckCircle2 } from 'lucide-react'

interface TrainerSelectionModalProps {
  event: Event
  trainers: { [key: string]: User }
  isOpen: boolean
  onClose: () => void
  onSelectTrainer: (trainerId: string, trainerSlot: any) => void
}

export default function TrainerSelectionModal({
  event,
  trainers,
  isOpen,
  onClose,
  onSelectTrainer
}: TrainerSelectionModalProps) {
  const { t, i18n } = useTranslation()
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null)

  const formatEventDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString(i18n.language === 'sk' ? 'sk-SK' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleSelectTrainer = () => {
    if (!selectedTrainerId) return
    const trainerSlot = event.trainers[selectedTrainerId]
    onSelectTrainer(selectedTrainerId, trainerSlot)
  }

  // Get list of confirmed trainers
  const confirmedTrainers = event.trainers
    ? Object.entries(event.trainers).map(([trainerId, slot]) => ({
        trainerId,
        slot,
        trainerData: trainers[trainerId]
      }))
    : []

  // Check if trainer is full
  const isTrainerFull = (slot: any) => {
    if (slot.capacity === -1) return false // Unlimited
    return slot.currentCount >= slot.capacity
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background-dark border-border text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-400"></div>
            {t('booking.selectTrainer') || 'Select Your Trainer'}
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

          {/* Trainer Selection */}
          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              {t('booking.availableTrainers') || 'Available Trainers'} ({confirmedTrainers.length})
            </h4>

            {confirmedTrainers.length === 0 ? (
              <div className="bg-background-card rounded-lg p-8 text-center">
                <p className="text-text-secondary">
                  {t('trainer.noTrainersAvailableYet') || 'No trainers have confirmed their availability yet. Please check back later.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedTrainers.map(({ trainerId, slot, trainerData }) => {
                  const isFull = isTrainerFull(slot)
                  const isSelected = selectedTrainerId === trainerId
                  
                  return (
                    <button
                      key={trainerId}
                      onClick={() => !isFull && setSelectedTrainerId(trainerId)}
                      disabled={isFull}
                      className={`
                        w-full bg-background-card rounded-lg p-4 flex items-start gap-4 text-left transition-all
                        ${isFull ? 'opacity-50 cursor-not-allowed' : 'hover:bg-background-card/80 hover:border-blue-400/50 cursor-pointer'}
                        ${isSelected ? 'border-2 border-blue-400 bg-blue-500/10' : 'border-2 border-transparent'}
                      `}
                    >
                      {/* Trainer Photo */}
                      {trainerData?.photoURL ? (
                        <img
                          src={trainerData.photoURL}
                          alt={trainerData.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                          {(trainerData?.name || slot.trainerName)?.charAt(0)}
                        </div>
                      )}

                      {/* Trainer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h5 className="font-semibold text-white text-lg">
                            {trainerData?.name || slot.trainerName || 'Unknown Trainer'}
                          </h5>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-text-secondary mb-3">
                          {slot.description || t('booking.noDescription') || 'No description provided'}
                        </p>

                        {/* Capacity Status */}
                        <div className="flex items-center gap-2">
                          {isFull ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                              🔴 {slot.currentCount}/{slot.capacity} {t('home.full') || 'FULL'}
                            </span>
                          ) : slot.capacity === -1 ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                              🟢 {slot.currentCount}/∞ {t('events.unlimited') || 'unlimited'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                              🟢 {slot.currentCount}/{slot.capacity} {t('events.spots') || 'spots'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Join Waitlist Button for Full Trainers */}
                      {isFull && (
                        <div className="flex-shrink-0">
                          <span className="text-xs text-yellow-400">
                            {t('home.joinWaitlist') || 'Join Waitlist'}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-border text-white hover:bg-white/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSelectTrainer}
              disabled={!selectedTrainerId}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('booking.continueWithTrainer') || 'Continue with Selected Trainer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
