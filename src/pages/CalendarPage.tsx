import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Calendar, Clock, Users } from 'lucide-react'
import { formatDate, formatTime, addDays, getWeekStart, getWeekDays, isSameDay } from '@/lib/utils'

export default function CalendarPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'day' | 'week'>(
    (searchParams.get('view') as 'day' | 'week') || 'week'
  )
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [trainers, setTrainers] = useState<User[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<string>(
    searchParams.get('trainer') || 'all'
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get trainer from URL params
    const trainerParam = searchParams.get('trainer')
    if (trainerParam && trainerParam !== 'all') {
      setSelectedTrainer(trainerParam)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const trainersQuery = query(
          collection(db, 'users'),
          where('status', '==', 'approved')
        )
        const snapshot = await getDocs(trainersQuery)
        const trainersList = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as User[]
        setTrainers(trainersList)
      } catch (error) {
        console.error('Error fetching trainers:', error)
      }
    }
    fetchTrainers()
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      try {
        let startDate: Date
        let endDate: Date

        if (view === 'day') {
          startDate = new Date(currentDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(currentDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          // Week view
          startDate = getWeekStart(currentDate)
          endDate = addDays(startDate, 7)
        }

        let eventsQuery = query(
          collection(db, 'events'),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate)),
          orderBy('date', 'asc')
        )

        if (selectedTrainer !== 'all') {
          eventsQuery = query(
            collection(db, 'events'),
            where('trainerId', '==', selectedTrainer),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate)),
            orderBy('date', 'asc')
          )
        }

        const snapshot = await getDocs(eventsQuery)
        const eventsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Event[]

        setEvents(eventsList)
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [currentDate, view, selectedTrainer])

  const goToPrevious = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1))
    } else {
      setCurrentDate(addDays(currentDate, -7))
    }
  }

  const goToNext = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 7))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleViewChange = (newView: string) => {
    setView(newView as 'day' | 'week')
    setSearchParams({ view: newView, trainer: selectedTrainer })
  }

  const handleTrainerChange = (trainerId: string) => {
    setSelectedTrainer(trainerId)
    setSearchParams({ view, trainer: trainerId })
  }

  const getEventColor = (event: Event) => {
    const now = new Date()
    if (event.date < now) return 'bg-gray-500/20 border-gray-500'
    
    const confirmedCount = event.attendees?.length || 0
    const isFull = event.capacity !== null && confirmedCount >= event.capacity
    
    return isFull ? 'bg-red-500/20 border-red-500' : 'bg-green-500/20 border-green-500'
  }

  const renderDayView = () => {
    const dayEvents = events.filter(event => isSameDay(event.date, currentDate))

    return (
      <div className="space-y-4">
        {dayEvents.length === 0 ? (
          <Card className="bg-white/10 border-white/20 text-white">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('home.noTrainings')}</p>
            </CardContent>
          </Card>
        ) : (
          dayEvents.map(event => (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className={`${getEventColor(event)} hover:opacity-80 border-2 transition-colors cursor-pointer`}>
                <CardHeader>
                  <CardTitle className="text-white flex items-start justify-between">
                    <span>{event.title}</span>
                    <span className="text-sm font-normal">
                      {event.capacity === null
                        ? '∞'
                        : `${event.attendees?.length || 0}/${event.capacity}`
                      }
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-white/90">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(event.date)} ({event.duration} min)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{event.trainerName}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate)
    const weekDays = getWeekDays(weekStart)
    const dayNames = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayEvents = events.filter(event => isSameDay(event.date, day))
          const isToday = isSameDay(day, new Date())

          return (
            <div key={index} className="min-h-[200px]">
              <div className={`text-center mb-2 p-2 rounded ${isToday ? 'bg-white/20' : 'bg-white/10'}`}>
                <div className="text-white/70 text-xs">{dayNames[index]}</div>
                <div className="text-white font-semibold">{day.getDate()}</div>
              </div>
              <div className="space-y-2">
                {dayEvents.map(event => (
                  <Link key={event.id} to={`/events/${event.id}`}>
                    <Card className={`${getEventColor(event)} hover:opacity-80 border transition-colors cursor-pointer p-2`}>
                      <div className="text-white text-xs">
                        <div className="font-semibold truncate">{event.title}</div>
                        <div className="text-white/70">{formatTime(event.date)}</div>
                        <div className="text-white/70">
                          {event.capacity === null
                            ? '∞'
                            : `${event.attendees?.length || 0}/${event.capacity}`
                          }
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      <h1 className="text-white mb-6">{t('calendar.title')}</h1>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={goToPrevious} variant="outline" size="icon" className="text-white border-white/20 hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button onClick={goToToday} variant="outline" className="text-white border-white/20 hover:bg-white/10">
            {t('calendar.today')}
          </Button>
          <Button onClick={goToNext} variant="outline" size="icon" className="text-white border-white/20 hover:bg-white/10">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <span className="text-white ml-4 font-semibold">
            {view === 'day' ? formatDate(currentDate) : `${formatDate(getWeekStart(currentDate))} - ${formatDate(addDays(getWeekStart(currentDate), 6))}`}
          </span>
        </div>

        <div className="flex gap-2">
          <Select value={selectedTrainer} onValueChange={handleTrainerChange}>
            <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder={t('calendar.allTrainers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('calendar.allTrainers')}</SelectItem>
              {trainers.map(trainer => (
                <SelectItem key={trainer.uid} value={trainer.uid}>
                  {trainer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={view} onValueChange={handleViewChange} className="mb-6">
        <TabsList className="bg-white/10">
          <TabsTrigger value="day" className="text-white data-[state=active]:bg-white/20">
            {t('calendar.dayView')}
          </TabsTrigger>
          <TabsTrigger value="week" className="text-white data-[state=active]:bg-white/20">
            {t('calendar.weekView')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-6">
          {loading ? (
            <div className="text-white text-center py-8">{t('common.loading')}</div>
          ) : (
            renderDayView()
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          {loading ? (
            <div className="text-white text-center py-8">{t('common.loading')}</div>
          ) : (
            renderWeekView()
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}



