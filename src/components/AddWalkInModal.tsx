import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Event, WalkIn } from '@/types'
import { X, UserPlus, AlertCircle } from 'lucide-react'

interface AddWalkInModalProps {
  event: Event
  onClose: () => void
  onWalkInAdded: (walkIn: WalkIn) => void
}

export default function AddWalkInModal({ event, onClose, onWalkInAdded }: AddWalkInModalProps) {
  const { t } = useTranslation()
  const { userData } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: t('common.error'),
        description: t('attendance.nameRequired'),
        variant: 'destructive'
      })
      return
    }

    if (!userData) {
      toast({
        title: t('common.error'),
        description: 'User not authenticated',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      const walkInData = {
        eventId: event.id,
        trainerId: event.trainerId || Object.keys(event.trainers || {})[0] || undefined,
        name: name.trim(),
        notes: notes.trim(),
        checkedInAt: Timestamp.now(),
        addedBy: userData.uid
      }

      const docRef = await addDoc(collection(db, 'walkIns'), walkInData)

      const walkIn: WalkIn = {
        id: docRef.id,
        eventId: event.id,
        trainerId: walkInData.trainerId,
        name: name.trim(),
        notes: notes.trim(),
        checkedInAt: new Date(),
        addedBy: userData.uid
      }

      onWalkInAdded(walkIn)

      toast({
        title: t('common.success'),
        description: t('attendance.walkInAdded')
      })
    } catch (error) {
      console.error('Error adding walk-in:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to add walk-in',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-background-card border border-border rounded-lg max-w-md w-full p-3 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-white text-lg sm:text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">{t('attendance.addWalkIn')}</span>
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:text-primary hover:bg-primary/10 flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-xs sm:text-sm mb-4 sm:mb-6">
          {t('attendance.walkInDescription') ||
            'This person arrived without pre-registering.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="name" className="text-white mb-1.5 sm:mb-2 block text-sm">
              {t('attendance.name')} *
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('attendance.enterName') || 'Enter name'}
              className="bg-background-dark border-border text-white text-sm sm:text-base h-10 sm:h-11"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-white mb-1.5 sm:mb-2 block text-sm">
              {t('attendance.notes')} ({t('common.optional')})
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('attendance.notesPlaceholder') || 'Additional notes...'}
              className="bg-background-dark border-border text-white min-h-16 sm:min-h-20 text-sm sm:text-base"
              disabled={loading}
            />
          </div>

          {/* Warning */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-2.5 sm:p-3 flex gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-primary text-xs sm:text-sm">
              {t('attendance.walkInWarning') ||
                'Walk-ins are marked separately and won\'t receive confirmation emails.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-white/20 text-white hover:bg-white/10 text-sm sm:text-base h-10 sm:h-11"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-primary hover:bg-primary-gold text-primary-foreground font-semibold text-sm sm:text-base h-10 sm:h-11"
            >
              {loading ? t('common.loading') : t('attendance.addWalkIn')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

