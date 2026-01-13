import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event } from '@/types'
import { Card } from './ui/card'
import { getWeekStart, addDays, isSameDay } from '@/lib/utils'

interface CalendarWeekGridProps {
  currentDate: Date
  selectedTrainerId?: string
  onScrollToToday?: () => void
}

interface TimeSlot {
  time: string
  duration: number
  events: { [dayIndex: number]: Event[] }
}

interface WeekData {
  weekStart: Date
  weekDays: Date[]
  timeSlots: TimeSlot[]
}

export default function CalendarWeekGrid({ currentDate, selectedTrainerId, onScrollToToday }: CalendarWeekGridProps) {
  const { t, i18n } = useTranslation()
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [loading, setLoading] = useState(true)
  const [weeksToShow, setWeeksToShow] = useState(12) // Show 12 weeks (3 months)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentWeekRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const todayWeekStart = getWeekStart(today)
  
  const dayNames = i18n.language === 'sk' 
    ? ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Scroll to current week when requested
  useEffect(() => {
    if (currentWeekRef.current) {
      currentWeekRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentDate])

  useEffect(() => {
    fetchMultiWeekEvents()
  }, [weeksToShow, selectedTrainerId])

  // Refetch events when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMultiWeekEvents()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [weeksToShow, selectedTrainerId])

  // Handle scroll to load more weeks
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Load more weeks when scrolled to 80% of content
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        setWeeksToShow(prev => prev + 4) // Load 4 more weeks
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchMultiWeekEvents = async () => {
    setLoading(true)
    try {
      // Fetch events for multiple weeks
      const startDate = todayWeekStart
      const endDate = addDays(todayWeekStart, weeksToShow * 7)

      let eventsQuery = query(
        collection(db, 'events'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      )

      const snapshot = await getDocs(eventsQuery)
      const eventsList = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
      }) as Event[]

      // Filter by trainer if selected
      const filteredEvents = selectedTrainerId
        ? eventsList.filter(e => e.trainers && e.trainers[selectedTrainerId])
        : eventsList

      // Organize events by week
      const weeksData: WeekData[] = []
      for (let i = 0; i < weeksToShow; i++) {
        const weekStart = addDays(todayWeekStart, i * 7)
        const weekDays = Array.from({ length: 7 }, (_, j) => addDays(weekStart, j))
        const weekEvents = filteredEvents.filter(event => {
          const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date
          return weekDays.some(day => isSameDay(day, eventDate))
        })
        
        weeksData.push({
          weekStart,
          weekDays,
          timeSlots: organizeTimeSlots(weekEvents, weekDays)
        })
      }

      setWeeks(weeksData)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const organizeTimeSlots = (eventsList: Event[], weekDays: Date[]): TimeSlot[] => {
    const slotsMap = new Map<string, TimeSlot>()

    eventsList.forEach(event => {
      // Skip events without a valid startTime
      if (!event.startTime) {
        console.warn('Event missing startTime:', event.id, event.title)
        return
      }
      
      const key = `${event.startTime}-${event.duration}`
      
      if (!slotsMap.has(key)) {
        slotsMap.set(key, {
          time: event.startTime,
          duration: event.duration,
          events: {}
        })
      }

      const slot = slotsMap.get(key)!
      const dayIndex = weekDays.findIndex(day => isSameDay(day, event.date))
      
      if (dayIndex !== -1) {
        if (!slot.events[dayIndex]) {
          slot.events[dayIndex] = []
        }
        slot.events[dayIndex].push(event)
      }
    })

    // Sort by time (handle undefined times)
    const sorted = Array.from(slotsMap.values())
      .filter(slot => slot.time && slot.time.includes(':')) // Only include valid time slots
      .sort((a, b) => {
        try {
          const [aHour, aMin] = a.time.split(':').map(Number)
          const [bHour, bMin] = b.time.split(':').map(Number)
          return (aHour * 60 + aMin) - (bHour * 60 + bMin)
        } catch (error) {
          console.error('Error sorting time slots:', error, { a, b })
          return 0
        }
      })

    return sorted
  }

  const handleEventClick = (event: Event) => {
    // Navigate to event detail page
    window.location.href = `/events/${event.id}`
  }

  if (loading && weeks.length === 0) {
    return (
      <div className="text-white text-center py-8">
        {t('common.loading')}
      </div>
    )
  }

  if (weeks.length === 0 || weeks.every(w => w.timeSlots.length === 0)) {
    return (
      <Card className="arena-card text-white p-8 text-center">
        <p className="text-text-secondary">{t('home.noTrainings')}</p>
      </Card>
    )
  }

  const renderWeek = (weekData: WeekData, weekIndex: number) => {
    const isCurrentWeek = isSameDay(weekData.weekStart, todayWeekStart)
    const weekEndDate = addDays(weekData.weekStart, 6)
    
    return (
      <div 
        key={weekIndex}
        ref={isCurrentWeek ? currentWeekRef : null}
        className="mb-4"
      >
        {/* Week Header with Date Range */}
        <div className="mb-1">
          <h3 className="text-white font-semibold text-sm">
            {isCurrentWeek && (
              <span className="text-primary mr-1.5 text-xs">●</span>
            )}
            {weekData.weekStart.toLocaleDateString(i18n.language === 'sk' ? 'sk-SK' : 'en-US', { 
              month: 'short', 
              day: 'numeric' 
            })} - {weekEndDate.toLocaleDateString(i18n.language === 'sk' ? 'sk-SK' : 'en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h3>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekData.weekDays.map((day, index) => (
            <div 
              key={index} 
              className={`p-1 rounded text-center ${
                isSameDay(day, today) 
                  ? 'bg-primary/20 border border-primary' 
                  : 'bg-background-card'
              }`}
            >
              <div className="text-text-muted text-[10px]">{dayNames[index]}</div>
              <div className="text-white font-semibold text-xs">{day.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Time Slots for this week */}
        {weekData.timeSlots.length === 0 ? (
          <div className="text-white/50 text-center py-2 text-xs">
            {t('home.noTrainings')}
          </div>
        ) : (
          weekData.timeSlots.map((slot, slotIndex) => (
            <div key={slotIndex} className="grid grid-cols-7 gap-1 mb-1">
              {weekData.weekDays.map((day, dayIndex) => {
                const dayEvents = slot.events[dayIndex] || []
                
                return (
                  <div key={dayIndex} className="min-h-[60px]">
                    {dayEvents.length > 0 ? (
                      <div className="space-y-1">
                        {dayEvents.map(event => {
                          const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date
                          const isPast = eventDate < new Date()
                          
                          // Calculate total capacity and current count
                          let totalCapacity = 0
                          let totalCurrent = 0
                          let hasUnlimited = false
                          
                          if (event.trainers) {
                            Object.values(event.trainers).forEach(slot => {
                              totalCurrent += slot.currentCount || 0
                              if (slot.capacity === -1) {
                                hasUnlimited = true
                              } else {
                                totalCapacity += slot.capacity || 0
                              }
                            })
                          }
                          
                          // Check if all spots are full (ignoring unlimited trainers)
                          const isFull = !hasUnlimited && totalCapacity > 0 && totalCurrent >= totalCapacity
                          
                          // Determine color class
                          const colorClass = isPast 
                            ? 'bg-gray-500/20 border-gray-500' 
                            : isFull 
                              ? 'bg-red-500/20 border-red-500' 
                              : 'bg-green-500/20 border-green-500'
                          
                          // Format capacity display
                          const capacityDisplay = hasUnlimited 
                            ? `${totalCurrent}/∞`
                            : `${totalCurrent}/${totalCapacity}`
                          
                          return (
                            <div
                              key={event.id}
                              onClick={() => !isPast && handleEventClick(event)}
                              className={`
                                ${colorClass} border-2 p-2 rounded-md cursor-pointer transition-all text-center
                                ${isPast ? 'opacity-60' : 'hover:scale-[1.02] hover:shadow-lg'}
                              `}
                            >
                              <div className="text-primary font-mono text-xs font-bold">
                                {event.startTime || 
                                  `${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`
                                }
                              </div>
                              <div className="text-white font-semibold text-xs leading-tight truncate">
                                {event.title}
                              </div>
                              <div className="text-text-muted text-[10px]">
                                {capacityDisplay}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#3a3a3a #1a1a1a'
      }}
    >
      {weeks.map((weekData, index) => renderWeek(weekData, index))}
      
      {loading && weeks.length > 0 && (
        <div className="text-white/50 text-center py-4 text-sm">
          {t('common.loading')}...
        </div>
      )}
    </div>
  )
}

