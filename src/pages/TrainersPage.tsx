import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { User as UserIcon } from 'lucide-react'

export default function TrainersPage() {
  const { t } = useTranslation()
  const [trainers, setTrainers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

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
      } finally {
        setLoading(false)
      }
    }

    fetchTrainers()
  }, [])

  return (
    <div className="content-container py-8">
      <h1 className="text-white mb-8">{t('trainers.title')}</h1>

      {loading ? (
        <div className="text-white text-center py-8">
          {t('common.loading')}
        </div>
      ) : trainers.length === 0 ? (
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="py-8 text-center">
            <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('trainers.noTrainers')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map(trainer => (
            <Link key={trainer.uid} to={`/trainers/${trainer.uid}`}>
              <Card className="bg-white/10 hover:bg-white/15 border-white/20 transition-colors cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {trainer.photoURL ? (
                      <img
                        src={trainer.photoURL}
                        alt={trainer.name}
                        className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-white/20"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-4 border-4 border-white/20">
                        <UserIcon className="h-16 w-16 text-white/50" />
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {trainer.name}
                    </h3>
                    {trainer.description && (
                      <p className="text-white/70 text-sm line-clamp-3">
                        {trainer.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}





