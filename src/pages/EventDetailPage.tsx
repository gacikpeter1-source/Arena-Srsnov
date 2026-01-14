import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Event, Registration, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Users, MapPin, User as UserIcon, QrCode, Trash2, UserMinus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cancelRegistration } from '@/lib/waitlistUtils'
import CancelRegistrationDialog from '@/components/CancelRegistrationDialog'
import RegistrationForm from '@/components/RegistrationForm'
import TrainerConfirmationModal from '@/components/TrainerConfirmationModal'
import TrainerSelectionModal from '@/components/TrainerSelectionModal'

export default function EventDetailPage() {
  const { t } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const { userData: user, isTrainer } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [trainers, setTrainers] = useState<{ [key: string]: User }>({})
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [selectedTrainerForRegistration, setSelectedTrainerForRegistration] = useState<{ id: string; slot: any } | null>(null)
  const [trainerConfirmModalOpen, setTrainerConfirmModalOpen] = useState(false)
  const [trainerSelectionModalOpen, setTrainerSelectionModalOpen] = useState(false)

  useEffect(() => {
    const fetchEventAndRegistrations = async () => {
      if (!eventId) return

      try {
        // Fetch event
        const eventDoc = await getDoc(doc(db, 'events', eventId))
        if (eventDoc.exists()) {
          const eventData = eventDoc.data()
          
          // Convert trainers object to ensure Timestamps are handled
          const trainersObj: any = {}
          if (eventData.trainers) {
            Object.entries(eventData.trainers).forEach(([trainerId, trainerSlot]: [string, any]) => {
              trainersObj[trainerId] = {
                trainerId: trainerSlot.trainerId || trainerId,
                capacity: trainerSlot.capacity,
                currentCount: trainerSlot.currentCount || 0,
                description: trainerSlot.description,
                joinedAt: trainerSlot.joinedAt // Keep as Timestamp, not rendered
              }
            })
          }
          
          // Convert date to string if it's a Timestamp
          let dateString = eventData.date
          if (eventData.date && typeof eventData.date === 'object' && 'toDate' in eventData.date) {
            const dateObj = eventData.date.toDate()
            dateString = dateObj.toISOString().split('T')[0] // YYYY-MM-DD
          }
          
          const parsedEvent: Event = {
            id: eventDoc.id,
            title: eventData.title,
            type: eventData.type,
            date: dateString, // Now guaranteed to be a string
            startTime: eventData.startTime,
            duration: eventData.duration,
            createdBy: eventData.createdBy,
            createdAt: eventData.createdAt,
            recurringSeriesId: eventData.recurringSeriesId,
            recurrencePattern: eventData.recurrencePattern,
            recurringDays: eventData.recurringDays,
            trainers: trainersObj,
            // Organizational event flags
            isOrganizational: eventData.isOrganizational || false,
            importedBy: eventData.importedBy,
            importedAt: eventData.importedAt,
            status: eventData.status
          }
          setEvent(parsedEvent)

          // Fetch ACTIVE registrations for this event (exclude cancelled)
          const registrationsQuery = query(
            collection(db, 'registrations'),
            where('eventId', '==', eventId),
            where('status', 'in', ['confirmed', 'waitlist'])
          )
          const registrationsSnap = await getDocs(registrationsQuery)
          const regs: Registration[] = []
          registrationsSnap.forEach((doc) => {
            regs.push({
              id: doc.id,
              ...doc.data()
            } as Registration)
          })
          setRegistrations(regs)
          
          // Validate currentCount against actual registrations
          if (trainersObj) {
            Object.keys(trainersObj).forEach(trainerId => {
              const trainerSlot = trainersObj[trainerId]
              const actualCount = regs.filter(r => r.trainerId === trainerId && r.status === 'confirmed').length
              if (trainerSlot.currentCount !== actualCount) {
                console.warn(`⚠️ Count mismatch for trainer ${trainerId}: Event shows ${trainerSlot.currentCount}, but actual is ${actualCount}`)
                // Auto-fix: update the event document
                updateDoc(doc(db, 'events', eventId), {
                  [`trainers.${trainerId}.currentCount`]: actualCount
                }).then(() => {
                  console.log(`✅ Fixed count for trainer ${trainerId}: ${actualCount}`)
                  // Update local state
                  trainersObj[trainerId].currentCount = actualCount
                }).catch(err => console.error('Failed to fix count:', err))
              }
            })
          }

          // Fetch trainer details
          const trainerIds = Object.keys(eventData.trainers || {})
          const trainerData: { [key: string]: User } = {}
          for (const trainerId of trainerIds) {
            const trainerDoc = await getDoc(doc(db, 'users', trainerId))
            if (trainerDoc.exists()) {
              trainerData[trainerId] = {
                uid: trainerDoc.id,
                ...trainerDoc.data()
              } as User
            }
          }
          setTrainers(trainerData)
        }
      } catch (error) {
        console.error('Error fetching event:', error)
        toast({
          title: t('common.error'),
          description: 'Failed to load event details',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEventAndRegistrations()
  }, [eventId, toast, t])

  const getRegistrationsByTrainer = (trainerId: string) => {
    return registrations.filter(reg => reg.trainerId === trainerId)
  }

  const getConfirmedCount = (trainerId: string) => {
    return registrations.filter(reg => reg.trainerId === trainerId && reg.status === 'confirmed').length
  }

  const getWaitlistRegistrations = (trainerId: string) => {
    return registrations
      .filter(reg => reg.trainerId === trainerId && reg.status === 'waitlist')
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  const handleDeleteEvent = async () => {
    if (!eventId) return

    setDeleting(true)
    try {
      // Delete the event
      await deleteDoc(doc(db, 'events', eventId))

      // Optionally: Delete all registrations for this event
      const regs = registrations
      for (const reg of regs) {
        await deleteDoc(doc(db, 'registrations', reg.id))
      }

      toast({
        title: t('common.success'),
        description: t('events.eventDeletedSuccess')
      })

      // Navigate back to calendar
      navigate('/calendar')
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({
        title: t('common.error'),
        description: t('events.failedToDeleteEvent'),
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleRemoveUser = async () => {
    if (!selectedRegistration) return

    try {
      await cancelRegistration(selectedRegistration.id)

      toast({
        title: t('common.success'),
        description: t('events.userRemovedSuccess')
      })

      // Refresh BOTH event data and registrations to get updated currentCount
      if (eventId) {
        const eventDoc = await getDoc(doc(db, 'events', eventId))
        if (eventDoc.exists()) {
          const eventData = eventDoc.data()
          
          // Convert trainers object
          const trainersObj: any = {}
          if (eventData.trainers) {
            Object.entries(eventData.trainers).forEach(([trainerId, trainerSlot]: [string, any]) => {
              trainersObj[trainerId] = {
                trainerId: trainerSlot.trainerId || trainerId,
                capacity: trainerSlot.capacity,
                currentCount: trainerSlot.currentCount || 0,
                description: trainerSlot.description,
                joinedAt: trainerSlot.joinedAt
              }
            })
          }
          
          // Convert date to string if it's a Timestamp
          let dateString = eventData.date
          if (eventData.date && typeof eventData.date === 'object' && 'toDate' in eventData.date) {
            const dateObj = eventData.date.toDate()
            dateString = dateObj.toISOString().split('T')[0]
          }
          
          const parsedEvent: Event = {
            id: eventDoc.id,
            title: eventData.title,
            type: eventData.type,
            date: dateString,
            startTime: eventData.startTime,
            duration: eventData.duration,
            createdBy: eventData.createdBy,
            createdAt: eventData.createdAt,
            recurringSeriesId: eventData.recurringSeriesId,
            recurrencePattern: eventData.recurrencePattern,
            recurringDays: eventData.recurringDays,
            trainers: trainersObj
          }
          setEvent(parsedEvent)
        }

        // Refresh ACTIVE registrations (exclude cancelled)
        const registrationsQuery = query(
          collection(db, 'registrations'),
          where('eventId', '==', eventId),
          where('status', 'in', ['confirmed', 'waitlist'])
        )
        const registrationsSnap = await getDocs(registrationsQuery)
        const regs: Registration[] = []
        registrationsSnap.forEach((doc) => {
          regs.push({
            id: doc.id,
            ...doc.data()
          } as Registration)
        })
        setRegistrations(regs)
      }

      setRemoveDialogOpen(false)
      setSelectedRegistration(null)
    } catch (error) {
      console.error('Error removing user:', error)
      toast({
        title: t('common.error'),
        description: t('events.failedToRemoveUser'),
        variant: 'destructive'
      })
    }
  }

  const handleCancelSuccess = () => {
    setCancelDialogOpen(false)
    // Refresh the page
    window.location.reload()
  }

  const handleTrainerConfirmed = () => {
    // Refresh the page to show updated event with trainer confirmation
    window.location.reload()
  }

  const handleTrainerSelected = (trainerId: string, trainerSlot: any) => {
    // Close trainer selection modal
    setTrainerSelectionModalOpen(false)
    // Open registration form with selected trainer
    setSelectedTrainerForRegistration({ id: trainerId, slot: trainerSlot })
    setRegisterModalOpen(true)
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

  // Parse event date if it's a string
  const eventDate = typeof event.date === 'string' 
    ? new Date(`${event.date}T${event.startTime}:00`)
    : event.date
  const isPast = eventDate < new Date()

  // Check if current user is a trainer in this event or admin
  const isEventTrainer = user && event.trainers && Object.keys(event.trainers).includes(user.uid)
  const canDeleteEvent = (isEventTrainer || user?.role === 'admin') && isTrainer

  // Check if this is an organizational event
  const isOrganizationalEvent = event.isOrganizational === true
  const hasConfirmedTrainers = event.trainers && Object.keys(event.trainers).length > 0
  const userHasConfirmed = user && event.trainers && event.trainers[user.uid]

  return (
    <div className="content-container py-8">
      {/* Organizational Event Banner - For Trainers */}
      {isOrganizationalEvent && isTrainer && !isPast && (
        <Card className="bg-blue-500/10 border-2 border-blue-400/30 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                  <h3 className="text-blue-300 font-semibold text-lg">
                    {t('trainer.organizationalEvent') || 'Organizational Event'}
                  </h3>
                </div>
                <p className="text-blue-200/70 text-sm">
                  {userHasConfirmed 
                    ? (t('trainer.youHaveConfirmed') || 'You have confirmed your availability for this event')
                    : hasConfirmedTrainers
                      ? (t('trainer.othersConfirmed') || `${Object.keys(event.trainers).length} trainer(s) already confirmed`)
                      : (t('trainer.noConfirmationsYet') || 'No trainers have confirmed yet. Be the first!')
                  }
                </p>
              </div>
              <Button
                onClick={() => setTrainerConfirmModalOpen(true)}
                className={userHasConfirmed ? "bg-green-600 hover:bg-green-700" : "bg-blue-500 hover:bg-blue-600"}
              >
                {userHasConfirmed 
                  ? (t('trainer.viewYourConfirmation') || 'View Confirmation')
                  : (t('trainer.confirmAvailability') || 'Confirm Availability')
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizational Event Info - For Public Users */}
      {isOrganizationalEvent && !isTrainer && (
        <Card className="bg-blue-500/10 border-2 border-blue-400/30 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                  <h3 className="text-blue-300 font-semibold">
                    {t('trainer.organizationalEvent') || 'Organizational Event'}
                  </h3>
                </div>
                <p className="text-blue-200/70 text-sm">
                  {hasConfirmedTrainers 
                    ? `${Object.keys(event.trainers).length} ${Object.keys(event.trainers).length === 1 ? 'trainer' : 'trainers'} available`
                    : (t('trainer.noTrainersAvailableYet') || 'No trainers have confirmed their availability yet. Please check back later.')
                  }
                </p>
              </div>
              {hasConfirmedTrainers && !isPast && (
                <Button
                  onClick={() => setTrainerSelectionModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {t('booking.bookNow') || 'Book Now'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Details Card */}
      <Card className="bg-white/10 border-white/20 mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            {isOrganizationalEvent && <div className="h-2 w-2 rounded-full bg-blue-400"></div>}
            <CardTitle className="text-white text-3xl">{event.title}</CardTitle>
          </div>
          
          {/* Trainer/Admin: Delete Event Button */}
          {canDeleteEvent && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('events.delete')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>
                {typeof event.date === 'string' ? event.date : event.date.toLocaleDateString('sk-SK')} {event.startTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>{event.duration} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>
                {Object.keys(event.trainers || {}).length} {Object.keys(event.trainers || {}).length === 1 ? t('events.trainer') : t('events.trainers')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{event.type}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trainers and Participants */}
      <Card className="bg-white/10 border-white/20 mb-6">
        <CardHeader>
          <CardTitle className="text-white">
            {isOrganizationalEvent && isEventTrainer 
              ? t('trainer.yourParticipants') || 'Your Participants'
              : t('events.trainersAndParticipants')
            }
          </CardTitle>
          {isOrganizationalEvent && isEventTrainer && user && event.trainers[user.uid] && (
            <p className="text-text-secondary text-sm mt-2">
              {t('trainer.capacityInfo') || 'Your Capacity'}: {' '}
              {event.trainers[user.uid].capacity === -1 
                ? `${getConfirmedCount(user.uid)}/∞ (${t('events.unlimited')})`
                : `${getConfirmedCount(user.uid)}/${event.trainers[user.uid].capacity}`
              }
            </p>
          )}
        </CardHeader>
        <CardContent>
          {Object.entries(event.trainers || {}).length === 0 ? (
            <p className="text-white/70 text-center py-4">{t('events.noTrainersAssigned')}</p>
          ) : isOrganizationalEvent && isEventTrainer && user ? (
            // For organizational events, trainers see only their own participants
            <div>
              {(() => {
                const trainerId = user.uid
                const trainerSlot = event.trainers[trainerId]
                if (!trainerSlot) return null

                const trainer = trainers[trainerId]
                const confirmedRegs = getRegistrationsByTrainer(trainerId).filter(r => r.status === 'confirmed')
                const waitlistRegs = getWaitlistRegistrations(trainerId)
                const capacity = trainerSlot.capacity
                const confirmedCount = confirmedRegs.length
                const isFull = capacity !== -1 && confirmedCount >= capacity

                return (
                  <>
                    {/* Trainer Info */}
                    <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-lg mb-4 border border-blue-400/30">
                      {trainer?.photoURL && (
                        <img
                          src={trainer.photoURL}
                          alt={trainer.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-white font-semibold text-lg">{trainer?.name || t('events.trainer')}</div>
                        {trainerSlot.description && (
                          <p className="text-text-muted text-sm mt-1">{trainerSlot.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className={`text-sm ${isFull ? 'text-status-danger' : 'text-status-success'}`}>
                            {capacity === -1 
                              ? `${confirmedCount} ${t('events.registeredUnlimited')}`
                              : `${confirmedCount}/${capacity} ${t('events.spots')}`
                            }
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const csvContent = [
                            ['Name', 'Email', 'Phone', 'Code', 'Status', 'Registered At'].join(','),
                            ...confirmedRegs.map(reg => 
                              [reg.name, reg.email, reg.phone, reg.uniqueCode, reg.status, new Date(reg.registeredAt).toLocaleString()].join(',')
                            )
                          ].join('\n')
                          const blob = new Blob([csvContent], { type: 'text/csv' })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `participants_${event.title}_${trainerId}.csv`
                          a.click()
                        }}
                        className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                      >
                        {t('trainer.exportList') || 'Export List'}
                      </Button>
                    </div>

                    {/* Confirmed Participants */}
                    <div className="mb-4">
                      <h4 className="text-white font-semibold mb-2">{t('events.confirmedParticipants')}</h4>
                      {confirmedRegs.length > 0 ? (
                        <div className="space-y-2">
                          {confirmedRegs.map((reg) => (
                            <div key={reg.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                              <UserIcon className="h-5 w-5 text-white/70" />
                              <div className="flex-1 text-white">
                                <div className="font-semibold">{reg.name}</div>
                                <div className="text-sm text-white/70">{reg.email}</div>
                                <div className="text-sm text-white/70">{reg.phone}</div>
                                <div className="text-xs text-primary font-mono mt-1">ID: {reg.uniqueCode}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`/qr/${reg.id}`, '_blank')}
                                  className="text-primary hover:text-primary-gold"
                                  title="View QR Code"
                                >
                                  <QrCode className="h-5 w-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRegistration(reg)
                                    setRemoveDialogOpen(true)
                                  }}
                                  className="text-status-danger hover:text-status-danger/80"
                                  title="Remove User"
                                >
                                  <UserMinus className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/70 text-center py-4 text-sm">{t('events.noParticipantsYet')}</p>
                      )}
                    </div>

                    {/* Waitlist */}
                    {waitlistRegs.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2">{t('events.waitlist')}</h4>
                        <div className="space-y-2">
                          {waitlistRegs.map((reg) => (
                            <div key={reg.id} className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">
                                {reg.position}
                              </div>
                              <div className="flex-1 text-white">
                                <div className="font-semibold">{reg.name}</div>
                                <div className="text-sm text-white/70">{reg.email}</div>
                                <div className="text-sm text-white/70">{reg.phone}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRegistration(reg)
                                  setRemoveDialogOpen(true)
                                }}
                                className="text-status-danger hover:text-status-danger/80"
                                title="Remove from Waitlist"
                              >
                                <UserMinus className="h-5 w-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          ) : (
            // For regular events or public view, show tabs for all trainers
            <Tabs defaultValue={Object.keys(event.trainers || {})[0]} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(event.trainers || {}).length}, minmax(0, 1fr))` }}>
                {Object.entries(event.trainers || {}).map(([trainerId, trainerSlot]) => {
                  const trainer = trainers[trainerId]
                  const confirmedCount = getConfirmedCount(trainerId)
                  const capacity = trainerSlot.capacity
                  const isFull = capacity !== -1 && confirmedCount >= capacity

                  return (
                    <TabsTrigger key={trainerId} value={trainerId} className="text-xs sm:text-sm">
                      {trainer?.name || 'Trainer'}
                      <span className={`ml-2 ${isFull ? 'text-status-danger' : 'text-status-success'}`}>
                        {capacity === -1 ? `${confirmedCount}/∞` : `${confirmedCount}/${capacity}`}
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {Object.entries(event.trainers || {}).map(([trainerId, trainerSlot]) => {
                const trainer = trainers[trainerId]
                const confirmedRegs = getRegistrationsByTrainer(trainerId).filter(r => r.status === 'confirmed')
                const waitlistRegs = getWaitlistRegistrations(trainerId)
                const capacity = trainerSlot.capacity
                const confirmedCount = confirmedRegs.length
                const isFull = capacity !== -1 && confirmedCount >= capacity

                return (
                  <TabsContent key={trainerId} value={trainerId} className="mt-4">
                    {/* Trainer Info */}
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg mb-4">
                      {trainer?.photoURL && (
                        <img
                          src={trainer.photoURL}
                          alt={trainer.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-white font-semibold text-lg">{trainer?.name || t('events.trainer')}</div>
                        {trainerSlot.description && (
                          <p className="text-text-muted text-sm mt-1">{trainerSlot.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className={`text-sm ${isFull ? 'text-status-danger' : 'text-status-success'}`}>
                            {capacity === -1 
                              ? `${confirmedCount} ${t('events.registeredUnlimited')}`
                              : `${confirmedCount}/${capacity} ${t('events.spots')}`
                            }
                          </div>
                        </div>
                      </div>
                      {!isPast && !isOrganizationalEvent && (
                        <Button
                          onClick={() => {
                            setSelectedTrainerForRegistration({ id: trainerId, slot: trainerSlot })
                            setRegisterModalOpen(true)
                          }}
                          className="bg-primary hover:bg-primary-gold text-primary-foreground"
                        >
                          {isFull ? t('home.joinWaitlist') : t('booking.register')}
                        </Button>
                      )}
                    </div>

                    {/* Confirmed Participants */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-semibold">{t('events.confirmedParticipants')}</h4>
                        {!isTrainer && confirmedRegs.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelDialogOpen(true)}
                            className="border-white/20 text-white hover:bg-white/10 text-xs"
                          >
                            {t('booking.cancelMyRegistration')}
                          </Button>
                        )}
                      </div>
                      {confirmedRegs.length > 0 ? (
                        <div className="space-y-2">
                          {confirmedRegs.map((reg) => (
                            <div key={reg.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                              <UserIcon className="h-5 w-5 text-white/70" />
                              <div className="flex-1 text-white">
                                <div className="font-semibold">{reg.name}</div>
                                {(isEventTrainer || isTrainer) && (
                                  <>
                                    <div className="text-sm text-white/70">{reg.email}</div>
                                    <div className="text-sm text-white/70">{reg.phone}</div>
                                    <div className="text-xs text-primary font-mono mt-1">ID: {reg.uniqueCode}</div>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {(isEventTrainer || isTrainer) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(`/qr/${reg.id}`, '_blank')}
                                      className="text-primary hover:text-primary-gold"
                                      title="View QR Code"
                                    >
                                      <QrCode className="h-5 w-5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedRegistration(reg)
                                        setRemoveDialogOpen(true)
                                      }}
                                      className="text-status-danger hover:text-status-danger/80"
                                      title="Remove User"
                                    >
                                      <UserMinus className="h-5 w-5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/70 text-center py-4 text-sm">{t('events.noParticipantsYet')}</p>
                      )}
                    </div>

                    {/* Waitlist */}
                    {waitlistRegs.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold">{t('events.waitlist')}</h4>
                          {!isTrainer && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCancelDialogOpen(true)}
                              className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-xs"
                            >
                              {t('booking.leaveWaitlist')}
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {waitlistRegs.map((reg) => (
                            <div key={reg.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-yellow-500/30 hover:bg-white/10 transition-colors">
                              <UserIcon className="h-5 w-5 text-yellow-500/70" />
                              <div className="flex-1 text-white">
                                <div className="font-semibold">{reg.name}</div>
                                {(isEventTrainer || isTrainer) && (
                                  <>
                                    <div className="text-sm text-white/70">{reg.email}</div>
                                    <div className="text-sm text-white/70">{reg.phone}</div>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-yellow-500 font-semibold">#{reg.position}</span>
                                {(isEventTrainer || isTrainer) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRegistration(reg)
                                      setRemoveDialogOpen(true)
                                    }}
                                    className="text-status-danger hover:text-status-danger/80"
                                    title="Remove from Waitlist"
                                  >
                                    <UserMinus className="h-5 w-5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Delete Event Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-background-card">
          <DialogHeader>
            <DialogTitle className="text-white">{t('events.deleteEvent')}</DialogTitle>
            <DialogDescription className="text-text-muted">
              Are you sure you want to delete this event? This will remove all registrations and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-border text-white"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={deleting}
            >
              {deleting ? t('common.loading') : t('events.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="bg-background-card">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Participant</DialogTitle>
            <DialogDescription className="text-text-muted">
              Are you sure you want to remove {selectedRegistration?.name} from this event?
              {selectedRegistration?.status === 'confirmed' && ' The next person on the waitlist will be promoted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false)
                setSelectedRegistration(null)
              }}
              className="border-border text-white"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUser}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Registration Dialog (for public users with email/phone verification) */}
      {eventId && (
        <CancelRegistrationDialog
          eventId={eventId}
          isOpen={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Registration Form Modal */}
      {selectedTrainerForRegistration && (
        <RegistrationForm
          event={event}
          trainerId={selectedTrainerForRegistration.id}
          trainerSlot={selectedTrainerForRegistration.slot}
          trainerName={trainers[selectedTrainerForRegistration.id]?.name}
          isOpen={registerModalOpen}
          onClose={() => {
            setRegisterModalOpen(false)
            setSelectedTrainerForRegistration(null)
          }}
          onSuccess={() => {
            setRegisterModalOpen(false)
            setSelectedTrainerForRegistration(null)
            // Refresh the page
            window.location.reload()
          }}
        />
      )}

      {/* Trainer Confirmation Modal (for organizational events) */}
      {isOrganizationalEvent && user && (
        <TrainerConfirmationModal
          event={event}
          isOpen={trainerConfirmModalOpen}
          onClose={() => setTrainerConfirmModalOpen(false)}
          currentUser={user as User}
          onConfirmed={handleTrainerConfirmed}
        />
      )}

      {/* Trainer Selection Modal (for organizational events - public users) */}
      {isOrganizationalEvent && (
        <TrainerSelectionModal
          event={event}
          trainers={trainers}
          isOpen={trainerSelectionModalOpen}
          onClose={() => setTrainerSelectionModalOpen(false)}
          onSelectTrainer={handleTrainerSelected}
        />
      )}
    </div>
  )
}



