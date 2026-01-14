import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

interface JoinEventModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function JoinEventModal({ event, isOpen, onClose, onSuccess }: JoinEventModalProps) {
  const { t } = useTranslation()
  const { userData } = useAuth()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    capacity: 10,
    isUnlimited: false,
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userData) return

    // Check if trainer already joined
    if (event.trainers && event.trainers[userData.uid]) {
      toast({
        title: t('common.error'),
        description: 'You have already joined this event',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const eventRef = doc(db, 'events', event.id)
      
      // Add trainer to event
      await updateDoc(eventRef, {
        [`trainers.${userData.uid}`]: {
          trainerId: userData.uid,
          trainerName: userData.name,
          trainerPhoto: userData.photoURL || '',
          capacity: formData.isUnlimited ? -1 : formData.capacity,
          currentCount: 0,
          description: formData.description,
          joinedAt: new Date()
        },
        updatedAt: new Date()
      })

      toast({
        title: t('common.success'),
        description: 'Successfully joined the event!'
      })

      onSuccess()
    } catch (error: any) {
      console.error('Error joining event:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to join event',
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
            Join Event
          </DialogTitle>
          <div className="text-text-muted text-sm mt-2">
            <div>{event.title}</div>
            <div className="text-primary mt-1">
              {formatDate(event.date)} • {event.startTime}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label className="text-white">Your Capacity</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unlimited"
                  checked={formData.isUnlimited}
                  onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="unlimited" className="text-white cursor-pointer">
                  Unlimited (∞)
                </Label>
              </div>
              {!formData.isUnlimited && (
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="bg-background-dark border-border text-white"
                  required
                />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-white">
              Description (optional)
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-background-dark border-border text-white"
              placeholder="e.g., Beginner group, Advanced training, etc."
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
              {submitting ? t('common.loading') : 'Join Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



