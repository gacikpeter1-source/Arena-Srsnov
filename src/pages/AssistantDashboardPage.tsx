import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Event } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, UserCheck, UserPlus, ClipboardCheck } from 'lucide-react'

export default function AssistantDashboardPage() {
  const { t } = useTranslation()
  const { userData } = useAuth()
  const navigate = useNavigate()
  const [todaysEvents, setTodaysEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodaysEvents()
  }, [])

  const loadTodaysEvents = async () => {
    try {
      setLoading(true)

      // Get today's date range
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

      // Query events for today
      const eventsQuery = query(
        collection(db, 'events'),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<', Timestamp.fromDate(endOfDay))
      )

      const eventsSnapshot = await getDocs(eventsQuery)
      const events: Event[] = eventsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          trainers: data.trainers || {}
        } as Event
      })

      // Sort by start time
      events.sort((a, b) => {
        const timeA = a.startTime || '00:00'
        const timeB = b.startTime || '00:00'
        return timeA.localeCompare(timeB)
      })

      setTodaysEvents(events)
    } catch (error) {
      console.error('Error loading today\'s events:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTodayStats = () => {
    let totalEvents = todaysEvents.length
    let totalExpected = 0
    let totalCheckedIn = 0
    let totalWalkIns = 0

    todaysEvents.forEach(event => {
      const stats = event.attendanceStats
      if (stats) {
        totalExpected += stats.totalRegistered || 0
        totalCheckedIn += stats.checkedIn || 0
        totalWalkIns += stats.walkIns || 0
      }
    })

    return {
      totalEvents,
      totalExpected,
      totalCheckedIn,
      totalWalkIns,
      checkedInPercent: totalExpected > 0 ? Math.round((totalCheckedIn / totalExpected) * 100) : 0
    }
  }

  const stats = calculateTodayStats()

  if (loading) {
    return (
      <div className="content-container py-8">
        <div className="text-white text-center">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">
          👋 {t('home.welcome')}, {userData?.name}
        </h1>
        <p className="text-text-secondary text-lg">
          {t('attendance.assistant') || 'Assistant'}
        </p>
      </div>

      {/* Today's Stats */}
      <Card className="bg-primary/10 border-primary/30 mb-8">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {t('attendance.todayStats') || 'Today\'s Stats'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-primary text-3xl font-bold">{stats.totalEvents}</div>
              <div className="text-white text-sm mt-1">{t('attendance.totalEvents') || 'Total Events'}</div>
            </div>
            <div className="text-center">
              <div className="text-primary text-3xl font-bold">{stats.totalExpected}</div>
              <div className="text-white text-sm mt-1">{t('attendance.expected') || 'Expected'}</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 text-3xl font-bold">{stats.totalCheckedIn}</div>
              <div className="text-white text-sm mt-1">
                {t('attendance.checkedIn')} ({stats.checkedInPercent}%)
              </div>
            </div>
            <div className="text-center">
              <div className="text-primary text-3xl font-bold">{stats.totalWalkIns}</div>
              <div className="text-white text-sm mt-1">{t('attendance.walkIns')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Events */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-white text-2xl font-semibold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          {t('attendance.todaysEvents') || 'Today\'s Events'}
        </h2>
        <Button
          variant="outline"
          onClick={() => navigate('/calendar')}
          className="border-primary text-primary hover:bg-primary/10"
        >
          {t('attendance.viewFullCalendar') || 'View Full Calendar'}
        </Button>
      </div>

      {todaysEvents.length === 0 ? (
        <Card className="bg-background-card border-border">
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-text-secondary" />
            <p className="text-text-secondary">
              {t('attendance.noEventsToday') || 'No events scheduled for today'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {todaysEvents.map(event => {
            const stats = event.attendanceStats
            const checkedIn = stats?.checkedIn || 0
            const expected = stats?.totalRegistered || 0
            const walkIns = stats?.walkIns || 0
            const percent = expected > 0 ? Math.round((checkedIn / expected) * 100) : 0

            return (
              <Card
                key={event.id}
                className="bg-background-card border-border hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {event.isOrganizational && (
                          <div className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0"></div>
                        )}
                        <h3 className="text-white text-xl font-semibold truncate">
                          {event.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {event.startTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {Object.keys(event.trainers || {}).length}{' '}
                          {Object.keys(event.trainers || {}).length === 1
                            ? t('events.trainer')
                            : t('events.trainers')}
                        </div>
                      </div>

                      {/* Attendance Stats */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2 bg-background-dark px-3 py-1 rounded-full">
                          <UserCheck className="h-4 w-4 text-green-400" />
                          <span className="text-white">
                            {checkedIn}/{expected} {t('attendance.checkedIn')}
                          </span>
                          {percent > 0 && (
                            <span className="text-green-400 font-semibold">({percent}%)</span>
                          )}
                        </div>
                        {walkIns > 0 && (
                          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                            <UserPlus className="h-4 w-4 text-primary" />
                            <span className="text-primary font-semibold">
                              +{walkIns} {t('attendance.walkIns')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="bg-primary hover:bg-primary-gold text-primary-foreground font-semibold w-full md:w-auto"
                    >
                      {t('attendance.checkAttendance')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}


