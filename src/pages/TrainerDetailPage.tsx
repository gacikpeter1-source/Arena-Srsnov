import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User, Event } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User as UserIcon, Mail, Phone, Calendar, Clock, Users } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function TrainerDetailPage() {
  const { t } = useTranslation()
  const { trainerId } = useParams<{ trainerId: string }>()
  const [trainer, setTrainer] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrainerAndEvents = async () => {
      if (!trainerId) return

      try {
        // Fetch trainer data
        const trainerDoc = await getDoc(doc(db, 'users', trainerId))
        if (trainerDoc.exists()) {
          const trainerData = {
            uid: trainerDoc.id,
            ...trainerDoc.data(),
            createdAt: trainerDoc.data().createdAt?.toDate() || new Date()
          } as User
          setTrainer(trainerData)
        }

        // Fetch upcoming events for this trainer
        const now = new Date()
        const eventsQuery = query(
          collection(db, 'events'),
          where('trainerId', '==', trainerId),
          where('date', '>=', now),
          orderBy('date', 'asc')
        )
        
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
        console.error('Error fetching trainer data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrainerAndEvents()
  }, [trainerId])

  if (loading) {
    return (
      <div className="content-container py-8">
        <div className="text-white text-center">{t('common.loading')}</div>
      </div>
    )
  }

  if (!trainer) {
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

  return (
    <div className="content-container py-8">
      {/* Trainer Info */}
      <Card className="bg-white/10 border-white/20 mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {trainer.photoURL ? (
              <img
                src={trainer.photoURL}
                alt={trainer.name}
                className="w-48 h-48 rounded-full object-cover border-4 border-white/20"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20">
                <UserIcon className="h-24 w-24 text-white/50" />
              </div>
            )}
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-white mb-4">{trainer.name}</h1>
              
              {trainer.description && (
                <p className="text-white/80 mb-6 text-lg leading-relaxed">
                  {trainer.description}
                </p>
              )}
              
              <div className="space-y-2 text-white/70">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Mail className="h-5 w-5" />
                  <span>{trainer.email}</span>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Phone className="h-5 w-5" />
                  <span>{trainer.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-white mb-6">{t('home.upcomingTrainings')}</h2>
        
        {events.length === 0 ? (
          <Card className="bg-white/10 border-white/20 text-white">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('home.noTrainings')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {events.map(event => {
              // Calculate capacity using multi-trainer system
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
              
              const isFull = !hasUnlimited && totalCapacity > 0 && totalCurrent >= totalCapacity
              const capacityDisplay = hasUnlimited 
                ? t('home.unlimited')
                : `${totalCurrent}/${totalCapacity}`
              
              return (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <Card className="bg-white/10 hover:bg-white/15 border-white/20 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-white flex items-start justify-between">
                        <span>{event.title}</span>
                        <span className={`text-sm font-normal ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                          {capacityDisplay}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-white/80">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateTime(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{event.duration} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{event.type}</span>
                        </div>
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



