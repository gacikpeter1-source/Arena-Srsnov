import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User, Event } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Users, Calendar, TrendingUp, UserCheck, FileSpreadsheet } from 'lucide-react'
import ReportsTab from '@/components/ReportsTab'

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [pendingTrainers, setPendingTrainers] = useState<User[]>([])
  const [allTrainers, setAllTrainers] = useState<User[]>([])
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
      <h1 className="text-white text-3xl font-bold mb-8">{t('admin.title')}</h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-background-card">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t('admin.overview') || 'Overview'}</span>
            <span className="sm:hidden">{t('admin.overview') || 'Overview'}</span>
          </TabsTrigger>
          <TabsTrigger value="trainers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t('admin.trainers') || 'Trainers'}</span>
            <span className="sm:hidden">{t('admin.trainers') || 'Trainers'}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
            <FileSpreadsheet className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t('admin.reports') || 'Reports'}</span>
            <span className="sm:hidden">{t('admin.reports') || 'Reports'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
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
        </TabsContent>

        {/* Trainers Tab */}
        <TabsContent value="trainers">
      {/* Pending Approvals */}
      {pendingTrainers.length > 0 && (
        <Card className="bg-white/10 border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white">{t('admin.pendingApprovals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTrainers.map(trainer => (
                <div key={trainer.uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {trainer.photoURL ? (
                      <img
                        src={trainer.photoURL}
                        alt={trainer.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-white/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold truncate">{trainer.name}</p>
                      <p className="text-white/70 text-sm truncate">{trainer.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                    <Button
                      onClick={() => handleApprove(trainer.uid)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial"
                    >
                      {t('admin.approve')}
                    </Button>
                    <Button
                      onClick={() => handleReject(trainer.uid)}
                      size="sm"
                      variant="destructive"
                      className="flex-1 sm:flex-initial"
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
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">{t('admin.manageTrainers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allTrainers.map(trainer => (
              <div key={trainer.uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {trainer.photoURL ? (
                    <img
                      src={trainer.photoURL}
                      alt={trainer.name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-white/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold truncate">{trainer.name}</p>
                    <p className="text-white/70 text-sm truncate">{trainer.email}</p>
                    <p className="text-white/50 text-xs capitalize">
                      {trainer.role} • {trainer.status}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleRemove(trainer.uid)}
                  size="sm"
                  variant="destructive"
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  {t('admin.remove')}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}



