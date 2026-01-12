import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User, Event } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Users, Calendar, TrendingUp, UserCheck } from 'lucide-react'

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [pendingTrainers, setPendingTrainers] = useState<User[]>([])
  const [allTrainers, setAllTrainers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrainings: 0,
    totalBookings: 0,
    activeTrainers: 0,
    trainingsByTrainer: {} as { [key: string]: number },
    bookingsByMonth: {} as { [key: string]: number }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch pending trainers
      const pendingQuery = query(
        collection(db, 'users'),
        where('status', '==', 'pending')
      )
      const pendingSnapshot = await getDocs(pendingQuery)
      const pending = pendingSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[]
      setPendingTrainers(pending)

      // Fetch all trainers
      const trainersSnapshot = await getDocs(collection(db, 'users'))
      const trainers = trainersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[]
      setAllTrainers(trainers)

      // Fetch all events
      const eventsSnapshot = await getDocs(collection(db, 'events'))
      const allEvents = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Event[]
      setEvents(allEvents)

      // Calculate statistics
      const trainingsByTrainer: { [key: string]: number } = {}
      const bookingsByMonth: { [key: string]: number } = {}
      let totalBookings = 0

      allEvents.forEach(event => {
        // Count trainings by trainer
        const trainerName = event.trainerName || 'Unknown'
        trainingsByTrainer[trainerName] = (trainingsByTrainer[trainerName] || 0) + 1

        // Count bookings
        const bookingsCount = (event.attendees?.length || 0) + (event.waitlist?.length || 0)
        totalBookings += bookingsCount

        // Count bookings by month
        const monthKey = `${event.date.getFullYear()}-${String(event.date.getMonth() + 1).padStart(2, '0')}`
        bookingsByMonth[monthKey] = (bookingsByMonth[monthKey] || 0) + bookingsCount
      })

      setStats({
        totalTrainings: allEvents.length,
        totalBookings,
        activeTrainers: trainers.filter(t => t.status === 'approved').length,
        trainingsByTrainer,
        bookingsByMonth
      })
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved'
      })

      toast({
        title: t('common.success'),
        description: 'Trainer approved successfully'
      })

      fetchData()
    } catch (error: any) {
      console.error('Error approving trainer:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to approve trainer',
        variant: 'destructive'
      })
    }
  }

  const handleReject = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected'
      })

      toast({
        title: t('common.success'),
        description: 'Trainer rejected'
      })

      fetchData()
    } catch (error: any) {
      console.error('Error rejecting trainer:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to reject trainer',
        variant: 'destructive'
      })
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this trainer? This action cannot be undone.')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'users', userId))

      toast({
        title: t('common.success'),
        description: 'Trainer removed successfully'
      })

      fetchData()
    } catch (error: any) {
      console.error('Error removing trainer:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to remove trainer',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="content-container py-8">
        <div className="text-white text-center">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      <h1 className="text-white mb-8">{t('admin.title')}</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">{t('admin.totalTrainings')}</p>
                <p className="text-white text-2xl font-bold">{stats.totalTrainings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">{t('admin.totalBookings')}</p>
                <p className="text-white text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">{t('admin.activeTrainers')}</p>
                <p className="text-white text-2xl font-bold">{stats.activeTrainers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Pending Approvals</p>
                <p className="text-white text-2xl font-bold">{pendingTrainers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingTrainers.length > 0 && (
        <Card className="bg-white/10 border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">{t('admin.pendingApprovals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTrainers.map(trainer => (
                <div key={trainer.uid} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    {trainer.photoURL ? (
                      <img
                        src={trainer.photoURL}
                        alt={trainer.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white/50" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold">{trainer.name}</p>
                      <p className="text-white/70 text-sm">{trainer.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(trainer.uid)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {t('admin.approve')}
                    </Button>
                    <Button
                      onClick={() => handleReject(trainer.uid)}
                      size="sm"
                      variant="destructive"
                    >
                      {t('admin.reject')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Trainers */}
      <Card className="bg-white/10 border-white/20 mb-8">
        <CardHeader>
          <CardTitle className="text-white">{t('admin.manageTrainers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allTrainers.map(trainer => (
              <div key={trainer.uid} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-4">
                  {trainer.photoURL ? (
                    <img
                      src={trainer.photoURL}
                      alt={trainer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-white/50" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold">{trainer.name}</p>
                    <p className="text-white/70 text-sm">{trainer.email}</p>
                    <p className="text-white/50 text-xs capitalize">
                      {trainer.role} • {trainer.status}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleRemove(trainer.uid)}
                  size="sm"
                  variant="destructive"
                >
                  {t('admin.remove')}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('admin.trainingsPerTrainer')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.trainingsByTrainer).map(([trainer, count]) => (
                <div key={trainer} className="flex justify-between items-center p-2 bg-white/5 rounded">
                  <span className="text-white">{trainer}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('admin.attendancePerMonth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.bookingsByMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 6)
                .map(([month, count]) => (
                  <div key={month} className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <span className="text-white">{month}</span>
                    <span className="text-white font-semibold">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



