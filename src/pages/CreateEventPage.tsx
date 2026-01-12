import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Event } from '@/types'
import { addDays, addWeeks } from '@/lib/utils'

export default function CreateEventPage() {
  const { t } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const { userData } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    duration: 60,
    type: 'powerskating',
    capacity: 10,
    isUnlimited: false,
    isRecurring: false,
    recurringType: 'weekly',
    occurrences: 4
  })

  const trainingTypes = [
    'powerskating',
    'endurance',
    'shooting',
    'skills',
    'game',
    'other'
  ]

  useEffect(() => {
    if (eventId) {
      // Load event for editing
      const loadEvent = async () => {
        try {
          const eventDoc = await getDoc(doc(db, 'events', eventId))
          if (eventDoc.exists()) {
            const eventData = eventDoc.data() as Event
            const eventDate = eventData.date && typeof eventData.date === 'object' && 'toDate' in eventData.date 
              ? (eventData.date as any).toDate() 
              : new Date(eventData.date)
            
            setFormData({
              title: eventData.title,
              date: eventDate.toISOString().split('T')[0],
              time: eventDate.toTimeString().substring(0, 5),
              duration: eventData.duration,
              type: eventData.type,
              capacity: eventData.capacity || 10,
              isUnlimited: eventData.capacity === null,
              isRecurring: false,
              recurringType: 'weekly',
              occurrences: 4
            })
          }
        } catch (error) {
          console.error('Error loading event:', error)
        }
      }
      loadEvent()
    }
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userData) return

    if (!formData.title || !formData.date || !formData.time) {
      toast({
        title: t('common.error'),
        description: 'Please fill all required fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const eventDateTime = new Date(`${formData.date}T${formData.time}`)
      
      const eventData = {
        title: formData.title,
        trainerId: userData.uid,
        trainerName: userData.name,
        date: Timestamp.fromDate(eventDateTime),
        duration: formData.duration,
        type: formData.type,
        capacity: formData.isUnlimited ? null : formData.capacity,
        attendees: [],
        waitlist: [],
        updatedAt: new Date()
      }

      if (eventId) {
        // Update existing event
        await updateDoc(doc(db, 'events', eventId), eventData)
        toast({
          title: t('common.success'),
          description: 'Event updated successfully'
        })
      } else {
        // Create new event(s)
        if (formData.isRecurring) {
          // Create recurring events
          const dates = []
          let currentDate = eventDateTime

          for (let i = 0; i < formData.occurrences; i++) {
            dates.push(new Date(currentDate))
            currentDate = formData.recurringType === 'daily' 
              ? addDays(currentDate, 1)
              : addWeeks(currentDate, 1)
          }

          await Promise.all(dates.map(date => 
            addDoc(collection(db, 'events'), {
              ...eventData,
              date: Timestamp.fromDate(date),
              createdAt: new Date()
            })
          ))

          toast({
            title: t('common.success'),
            description: `Created ${formData.occurrences} recurring events`
          })
        } else {
          // Create single event
          await addDoc(collection(db, 'events'), {
            ...eventData,
            createdAt: new Date()
          })
          
          toast({
            title: t('common.success'),
            description: 'Event created successfully'
          })
        }
      }

      navigate('/calendar')
    } catch (error: any) {
      console.error('Error saving event:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to save event',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!eventId) return
    
    if (!confirm('Are you sure you want to delete this event?')) return

    setLoading(true)
    try {
      await deleteDoc(doc(db, 'events', eventId))
      toast({
        title: t('common.success'),
        description: 'Event deleted successfully'
      })
      navigate('/calendar')
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete event',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-container py-8">
      <Card className="bg-white/10 border-white/20 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-2xl">
            {eventId ? t('events.editEvent') : t('events.createEvent')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-white">{t('events.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="text-white">{t('events.date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="time" className="text-white">{t('events.time')}</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="duration" className="text-white">{t('events.duration')}</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="type" className="text-white">{t('events.type')}</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`events.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">{t('events.capacity')}</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="unlimited"
                    checked={formData.isUnlimited}
                    onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="unlimited" className="text-white cursor-pointer">
                    {t('events.unlimited')}
                  </Label>
                </div>
                {!formData.isUnlimited && (
                  <Input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                )}
              </div>
            </div>

            {!eventId && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="recurring" className="text-white cursor-pointer">
                      {t('events.recurring')}
                    </Label>
                  </div>
                </div>

                {formData.isRecurring && (
                  <>
                    <div>
                      <Label htmlFor="recurringType" className="text-white">{t('events.recurringType')}</Label>
                      <Select value={formData.recurringType} onValueChange={(value) => setFormData({ ...formData, recurringType: value })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{t('events.daily')}</SelectItem>
                          <SelectItem value="weekly">{t('events.weekly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="occurrences" className="text-white">{t('events.occurrences')}</Label>
                      <Input
                        id="occurrences"
                        type="number"
                        min="2"
                        max="52"
                        value={formData.occurrences}
                        onChange={(e) => setFormData({ ...formData, occurrences: parseInt(e.target.value) })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? t('common.loading') : t('common.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                {t('common.cancel')}
              </Button>
              {eventId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {t('common.delete')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}



