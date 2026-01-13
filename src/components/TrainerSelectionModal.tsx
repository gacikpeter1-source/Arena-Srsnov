import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event, TrainerSlot, User } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { User as UserIcon, Plus } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import RegistrationForm from './RegistrationForm'
import JoinEventModal from './JoinEventModal'

interface TrainerSelectionModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
}

export default function TrainerSelectionModal({ event, isOpen, onClose }: TrainerSelectionModalProps) {
  const { t } = useTranslation()
  const { userData, isTrainer } = useAuth()
  const [selectedTrainer, setSelectedTrainer] = useState<{ id: string; slot: TrainerSlot; name: string } | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [trainerDetails, setTrainerDetails] = useState<{ [key: string]: User }>({})

  const trainers = event.trainers ? Object.entries(event.trainers) : []
  const hasJoined = userData && event.trainers && event.trainers[userData.uid]

  useEffect(() => {
    const fetchTrainerDetails = async () => {
      const details: { [key: string]: User } = {}
      for (const [trainerId] of trainers) {
        const trainerDoc = await getDoc(doc(db, 'users', trainerId))
        if (trainerDoc.exists()) {
          details[trainerId] = {
            uid: trainerDoc.id,
            ...trainerDoc.data()
          } as User
        }
      }
      setTrainerDetails(details)
    }

    if (trainers.length > 0) {
      fetchTrainerDetails()
    }
  }, [event.id])

  const handleTrainerSelect = (trainerId: string, slot: TrainerSlot, trainerName: string) => {
    setSelectedTrainer({ id: trainerId, slot, name: trainerName })
  }

  const handleCloseRegistration = () => {
    setSelectedTrainer(null)
  }

  const handleRegistrationSuccess = () => {
    setSelectedTrainer(null)
    onClose()
  }

  const handleJoinSuccess = () => {
    setShowJoinModal(false)
    onClose()
  }

  if (showJoinModal) {
    return (
      <JoinEventModal
        event={event}
        isOpen={isOpen}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
      />
    )
  }

  if (selectedTrainer) {
    return (
      <RegistrationForm
        event={event}
        trainerId={selectedTrainer.id}
        trainerSlot={selectedTrainer.slot}
        trainerName={selectedTrainer.name}
        isOpen={isOpen}
        onClose={handleCloseRegistration}
        onSuccess={handleRegistrationSuccess}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background-card max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            <div>{event.title}</div>
            <div className="text-sm text-text-muted font-normal mt-1">
              {formatDate(event.date)} • {event.startTime || formatTime(event.date)}{
                event.startTime && (() => {
                  const [hours, minutes] = event.startTime.split(':').map(Number)
                  const endMinutes = hours * 60 + minutes + event.duration
                  const endHours = Math.floor(endMinutes / 60)
                  const endMins = endMinutes % 60
                  return `-${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
                })()
              }
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">
              {t('events.trainer')}s ({trainers.length})
            </h3>
            {isTrainer && !hasJoined && (
              <Button 
                onClick={() => setShowJoinModal(true)}
                size="sm"
                className="bg-primary hover:bg-primary-gold text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                Join Event
              </Button>
            )}
          </div>

          {trainers.length === 0 ? (
            <div className="text-text-muted text-center py-8">
              No trainers for this event
            </div>
          ) : (
            <div className="grid gap-4">
              {trainers.map(([trainerId, slot]) => {
                const trainer = trainerDetails[trainerId]
                const isFull = slot.capacity !== -1 && slot.currentCount >= slot.capacity
                const spotsText = slot.capacity === -1 
                  ? `${slot.currentCount}/∞ spots`
                  : `${slot.currentCount}/${slot.capacity} spots`

                return (
                  <div
                    key={trainerId}
                    onClick={() => !isFull && trainer && handleTrainerSelect(trainerId, slot, trainer.name)}
                    className={`
                      arena-card p-4 transition-all
                      ${isFull ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Trainer Photo */}
                      {trainer?.photoURL ? (
                        <img
                          src={trainer.photoURL}
                          alt={trainer.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                          <UserIcon className="h-8 w-8 text-primary" />
                        </div>
                      )}

                      {/* Trainer Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold text-lg">
                            {trainer?.name || 'Loading...'}
                          </h4>
                          <div className={`
                            px-3 py-1 rounded-full text-sm font-semibold
                            ${isFull 
                              ? 'bg-status-danger/20 text-status-danger' 
                              : 'bg-status-success/20 text-status-success'}
                          `}>
                            {spotsText}
                          </div>
                        </div>

                        {slot.description && (
                          <p className="text-text-secondary text-sm mb-3">
                            {slot.description}
                          </p>
                        )}

                        {isFull ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              trainer && handleTrainerSelect(trainerId, slot, trainer.name)
                            }}
                            className="border-status-danger text-status-danger hover:bg-status-danger/10"
                          >
                            Join Waitlist
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            className="bg-primary hover:bg-primary-gold text-primary-foreground"
                          >
                            Register
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose} className="border-border text-white">
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

