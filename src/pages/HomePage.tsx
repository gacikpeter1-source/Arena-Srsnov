import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function HomePage() {
  const { t } = useTranslation()
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const now = new Date()
        const eventsQuery = query(
          collection(db, 'events'),
          where('date', '>=', now),
          orderBy('date', 'asc'),
          limit(5)
        )
        
        const snapshot = await getDocs(eventsQuery)
        const events = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Event[]
        
        setUpcomingEvents(events)
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUpcomingEvents()
  }, [])

  const getEventStatus = (event: Event) => {
    // Calculate total capacity and current count from multi-trainer system
    let totalCapacity = 0
    let totalCurrent = 0
    let hasUnlimited = false
    
    if (event.trainers && typeof event.trainers === 'object') {
      Object.values(event.trainers).forEach((slot: any) => {
        totalCurrent += slot.currentCount || 0
        if (slot.capacity === -1) {
          hasUnlimited = true
        } else {
          totalCapacity += slot.capacity || 0
        }
      })
    }
    
    // If any trainer has unlimited capacity, the event is unlimited
    if (hasUnlimited) {
      return { 
        text: `${totalCurrent}/∞`,
        color: 'text-green-400'
      }
    }
    
    const isFull = totalCurrent >= totalCapacity && totalCapacity > 0
    
    if (isFull) {
      return { 
        text: `${totalCurrent}/${totalCapacity}`,
        color: 'text-red-400'
      }
    }
    
    return { 
      text: `${totalCurrent}/${totalCapacity}`,
      color: 'text-green-400'
    }
  }

  return (
    <div className="content-container py-8">
      <div className="mb-8 text-center">
        <h1 className="text-white mb-2">{t('app.title')}</h1>
        <p className="text-white/80 text-lg">{t('app.subtitle')}</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Link to="/trainers">
          <Button 
            size="lg" 
            className="w-full h-28 text-lg bg-primary hover:bg-primary-gold text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Users className="mr-3 h-7 w-7" />
            {t('home.selectByTrainer')}
          </Button>
        </Link>
        
        <Link to="/calendar">
          <Button 
            size="lg" 
            className="w-full h-28 text-lg bg-background-card hover:bg-background-cardHover text-white border-2 border-primary font-semibold shadow-lg hover:shadow-xl transition-all"
            variant="outline"
          >
            <Calendar className="mr-3 h-7 w-7" />
            {t('home.openCalendar')}
          </Button>
        </Link>
      </div>

      {/* Upcoming Trainings */}
      <div>
        <h2 className="text-white mb-6">{t('home.upcomingTrainings')}</h2>
        
        {loading ? (
          <div className="text-white text-center py-8">
            {t('common.loading')}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <Card className="arena-card text-white">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
              <p className="text-text-secondary">{t('home.noTrainings')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingEvents.map(event => {
              const status = getEventStatus(event)
              
              // Calculate if event is full
              let totalCapacity = 0
              let totalCurrent = 0
              let hasUnlimited = false
              
              if (event.trainers && typeof event.trainers === 'object') {
                Object.values(event.trainers).forEach((slot: any) => {
                  totalCurrent += slot.currentCount || 0
                  if (slot.capacity === -1) {
                    hasUnlimited = true
                  } else {
                    totalCapacity += slot.capacity || 0
                  }
                })
              }
              
              const isFull = !hasUnlimited && totalCurrent >= totalCapacity && totalCapacity > 0
              
              return (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <Card className={`arena-card ${isFull ? 'event-full' : 'event-open'} cursor-pointer`}>
                    <CardHeader>
                      <CardTitle className="text-white flex items-start justify-between">
                        <span>{event.title}</span>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                          isFull ? 'bg-status-danger/20 text-status-danger' : 'bg-status-success/20 text-status-success'
                        }`}>
                          {status.text}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="mono">{formatDateTime(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{event.duration} min</span>
                        </div>
                        
                        {/* Trainers with photos */}
                        {event.trainers && typeof event.trainers === 'object' && (
                          <div className="pt-2 border-t border-border-default/50">
                            <div className="text-text-muted text-xs mb-2 font-semibold uppercase tracking-wide">
                              {Object.keys(event.trainers).length === 1 ? t('common.trainer') : t('events.trainers')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.values(event.trainers).map((trainerSlot: any, index: number) => (
                                <div key={index} className="flex items-center gap-2 bg-background-card/50 rounded-full pr-3 py-1 pl-1">
                                  {trainerSlot.trainerPhoto ? (
                                    <img
                                      src={trainerSlot.trainerPhoto}
                                      alt={trainerSlot.trainerName}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-primary/50"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/50">
                                      <Users className="h-4 w-4 text-primary" />
                                    </div>
                                  )}
                                  <span className="text-sm text-white font-medium">{trainerSlot.trainerName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}



