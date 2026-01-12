import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Event, Attendee } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, Users, MapPin, User as UserIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function EventDetailPage() {
  const { t } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const { isTrainer } = useAuth()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [bookingData, setBookingData] = useState({ name: '', email: '', phone: '' })
  const [cancelData, setCancelData] = useState({ email: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return

      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId))
        if (eventDoc.exists()) {
          const eventData = {
            id: eventDoc.id,
            ...eventDoc.data(),
            date: eventDoc.data().date?.toDate() || new Date(),
            createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: eventDoc.data().updatedAt?.toDate() || new Date(),
            attendees: eventDoc.data().attendees || [],
            waitlist: eventDoc.data().waitlist || []
          } as Event
          setEvent(eventData)
        }
      } catch (error) {
        console.error('Error fetching event:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const handleBooking = async () => {
    if (!event || !eventId) return
    if (!bookingData.name || !bookingData.email || !bookingData.phone) {
      toast({
        title: t('common.error'),
        description: 'Please fill all fields',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const newAttendee: Attendee = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        bookedAt: new Date()
      }

      const confirmedCount = event.attendees?.length || 0
      const isFull = event.capacity !== null && confirmedCount >= event.capacity

      if (isFull) {
        // Add to waitlist
        await updateDoc(doc(db, 'events', eventId), {
          waitlist: arrayUnion(newAttendee),
          updatedAt: new Date()
        })

        toast({
          title: t('booking.success'),
          description: t('booking.waitlistJoined')
        })
      } else {
        // Add to confirmed attendees
        await updateDoc(doc(db, 'events', eventId), {
          attendees: arrayUnion(newAttendee),
          updatedAt: new Date()
        })

        toast({
          title: t('booking.success'),
          description: t('booking.confirmationEmail', { email: bookingData.email })
        })
      }

      setBookingDialogOpen(false)
      setBookingData({ name: '', email: '', phone: '' })
      
      // Refresh event data
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      if (eventDoc.exists()) {
        setEvent({
          id: eventDoc.id,
          ...eventDoc.data(),
          date: eventDoc.data().date?.toDate() || new Date(),
          createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: eventDoc.data().updatedAt?.toDate() || new Date(),
          attendees: eventDoc.data().attendees || [],
          waitlist: eventDoc.data().waitlist || []
        } as Event)
      }
    } catch (error) {
      console.error('Error booking event:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to book event',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!event || !eventId) return
    if (!cancelData.email || !cancelData.phone) {
      toast({
        title: t('common.error'),
        description: 'Please fill all fields',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      // Find attendee in confirmed or waitlist
      const attendee = [...(event.attendees || []), ...(event.waitlist || [])].find(
        a => a.email === cancelData.email && a.phone === cancelData.phone
      )

      if (!attendee) {
        toast({
          title: t('common.error'),
          description: t('booking.cancelError'),
          variant: 'destructive'
        })
        setSubmitting(false)
        return
      }

      const isInWaitlist = event.waitlist?.some(a => a.id === attendee.id)

      if (isInWaitlist) {
        // Remove from waitlist
        await updateDoc(doc(db, 'events', eventId), {
          waitlist: arrayRemove(attendee),
          updatedAt: new Date()
        })
      } else {
        // Remove from attendees
        await updateDoc(doc(db, 'events', eventId), {
          attendees: arrayRemove(attendee),
          updatedAt: new Date()
        })

        // Check if someone from waitlist should be promoted
        if (event.waitlist && event.waitlist.length > 0) {
          const firstWaitlisted = event.waitlist[0]
          await updateDoc(doc(db, 'events', eventId), {
            waitlist: arrayRemove(firstWaitlisted),
            attendees: arrayUnion(firstWaitlisted)
          })
        }
      }

      toast({
        title: t('booking.cancelSuccess'),
        description: 'Booking cancelled successfully'
      })

      setCancelDialogOpen(false)
      setCancelData({ email: '', phone: '' })

      // Refresh event data
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      if (eventDoc.exists()) {
        setEvent({
          id: eventDoc.id,
          ...eventDoc.data(),
          date: eventDoc.data().date?.toDate() || new Date(),
          createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: eventDoc.data().updatedAt?.toDate() || new Date(),
          attendees: eventDoc.data().attendees || [],
          waitlist: eventDoc.data().waitlist || []
        } as Event)
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to cancel booking',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="content-container py-8">
        <div className="text-white text-center">{t('common.loading')}</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="content-container py-8">
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="py-8 text-center">
            <p>{t('common.error')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const confirmedCount = event.attendees?.length || 0
  const isFull = event.capacity !== null && confirmedCount >= event.capacity
  const isPast = event.date < new Date()

  return (
    <div className="content-container py-8">
      <Card className="bg-white/10 border-white/20 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-3xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{formatDateTime(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>{event.duration} {t('events.duration').toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>{event.trainerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{event.type}</span>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4">
            <div className="flex items-center justify-between text-white">
              <span className="text-lg font-semibold">{t('events.capacity')}</span>
              <span className={`text-lg ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                {event.capacity === null
                  ? t('events.unlimited')
                  : `${confirmedCount}/${event.capacity}`
                }
              </span>
            </div>
          </div>

          {!isPast && (
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => setBookingDialogOpen(true)}
                className="flex-1"
                disabled={isPast}
              >
                {isFull ? t('home.joinWaitlist') : t('events.book')}
              </Button>
              <Button
                onClick={() => setCancelDialogOpen(true)}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                disabled={isPast}
              >
                {t('events.cancelBooking')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendees List (visible to trainers only) */}
      {isTrainer && (
        <>
          <Card className="bg-white/10 border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white">{t('events.attendees')}</CardTitle>
            </CardHeader>
            <CardContent>
              {event.attendees && event.attendees.length > 0 ? (
                <div className="space-y-2">
                  {event.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <UserIcon className="h-5 w-5 text-white/70" />
                      <div className="flex-1 text-white">
                        <div className="font-semibold">{attendee.name}</div>
                        <div className="text-sm text-white/70">{attendee.email}</div>
                        <div className="text-sm text-white/70">{attendee.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/70 text-center py-4">No attendees yet</p>
              )}
            </CardContent>
          </Card>

          {event.waitlist && event.waitlist.length > 0 && (
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">{t('events.waitlist')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.waitlist.map((attendee, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <UserIcon className="h-5 w-5 text-white/70" />
                      <div className="flex-1 text-white">
                        <div className="font-semibold">{attendee.name}</div>
                        <div className="text-sm text-white/70">{attendee.email}</div>
                        <div className="text-sm text-white/70">{attendee.phone}</div>
                      </div>
                      <span className="text-sm text-white/50">#{index + 1}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Public attendees list (names only) */}
      {!isTrainer && event.attendees && event.attendees.length > 0 && (
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('events.attendees')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {event.attendees.map((attendee, index) => (
                <div key={index} className="bg-white/10 px-3 py-1 rounded-full text-white text-sm">
                  {attendee.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{t('booking.bookTraining')}</DialogTitle>
            <DialogDescription>
              {isFull ? t('booking.waitlistJoined') : 'Fill in your details to book this training'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">{t('booking.name')}</Label>
              <Input
                id="name"
                value={bookingData.name}
                onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">{t('booking.email')}</Label>
              <Input
                id="email"
                type="email"
                value={bookingData.email}
                onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('booking.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={bookingData.phone}
                onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                placeholder="+421 XXX XXX XXX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBooking} disabled={submitting}>
              {submitting ? t('common.loading') : t('booking.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{t('booking.cancelTitle')}</DialogTitle>
            <DialogDescription>
              {t('booking.cancelDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancel-email">{t('booking.email')}</Label>
              <Input
                id="cancel-email"
                type="email"
                value={cancelData.email}
                onChange={(e) => setCancelData({ ...cancelData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="cancel-phone">{t('booking.phone')}</Label>
              <Input
                id="cancel-phone"
                type="tel"
                value={cancelData.phone}
                onChange={(e) => setCancelData({ ...cancelData, phone: e.target.value })}
                placeholder="+421 XXX XXX XXX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={submitting}>
              {submitting ? t('common.loading') : t('booking.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



