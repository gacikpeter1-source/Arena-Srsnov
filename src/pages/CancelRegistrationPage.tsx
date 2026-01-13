import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Users, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cancelRegistration } from '@/lib/waitlistUtils'
import { formatDate } from '@/lib/utils'

export default function CancelRegistrationPage() {
  const { registrationId, token } = useParams<{ registrationId: string; token: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<any>(null)
  const [event, setEvent] = useState<any>(null)

  useEffect(() => {
    const loadRegistration = async () => {
      if (!registrationId || !token) {
        setError(t('cancelRegistration.invalidLink'))
        setLoading(false)
        return
      }

      try {
        // Find registration by ID
        const registrationQuery = query(
          collection(db, 'registrations'),
          where('__name__', '==', registrationId)
        )
        const registrationSnap = await getDocs(registrationQuery)
        
        if (registrationSnap.empty) {
          setError(t('cancelRegistration.notFound'))
          setLoading(false)
          return
        }

        const registrationDoc = registrationSnap.docs[0]
        const registrationData: any = {
          id: registrationDoc.id,
          ...registrationDoc.data()
        }

        // Verify token
        if (registrationData.cancellationToken !== token) {
          setError(t('cancelRegistration.invalidToken'))
          setLoading(false)
          return
        }

        // Check if token expired
        const expiresAt = registrationData.tokenExpiresAt?.toDate ? registrationData.tokenExpiresAt.toDate() : null
        if (expiresAt && expiresAt < new Date()) {
          setError(t('cancelRegistration.tokenExpired'))
          setLoading(false)
          return
        }

        // Check if already cancelled
        if (registrationData.status === 'cancelled') {
          setError(t('cancelRegistration.alreadyCancelled'))
          setLoading(false)
          return
        }

        setRegistration(registrationData)

        // Load event details
        const eventDoc = await getDoc(doc(db, 'events', registrationData.eventId))
        if (eventDoc.exists()) {
          setEvent({
            id: eventDoc.id,
            ...eventDoc.data(),
            date: eventDoc.data().date?.toDate() || new Date()
          })
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading registration:', err)
        setError(t('common.error'))
        setLoading(false)
      }
    }

    loadRegistration()
  }, [registrationId, token, t])

  const handleCancelRegistration = async () => {
    if (!registration || !event) return

    setCancelling(true)
    try {
      // cancelRegistration only needs the registration ID
      await cancelRegistration(registration.id)

      setCancelled(true)
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (err: any) {
      console.error('Error cancelling registration:', err)
      setError(err.message || t('common.error'))
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="content-container py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-white">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="content-container py-8">
        <Card className="arena-card max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">
                {t('cancelRegistration.success')}
              </h2>
              <p className="text-text-secondary mb-4">
                {t('cancelRegistration.successMessage')}
              </p>
              <p className="text-text-muted text-sm">
                {t('cancelRegistration.redirecting')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content-container py-8">
        <Card className="arena-card max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button onClick={() => navigate('/')} variant="outline">
                {t('common.backToHome')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      <Card className="arena-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-center">
            {t('cancelRegistration.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/50">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-200">
              {t('cancelRegistration.warning')}
            </AlertDescription>
          </Alert>

          {event && registration && (
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-background-card rounded-lg border border-border-default">
                <h3 className="text-white font-semibold mb-3">
                  {t('cancelRegistration.eventDetails')}
                </h3>
                
                <div className="space-y-2 text-text-secondary">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">{event.title}</div>
                      <div className="text-sm">{formatDate(event.date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{event.startTime} • {event.duration} min</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{event.trainers?.[registration.trainerId]?.trainerName || t('common.trainer')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background-card rounded-lg border border-border-default">
                <h3 className="text-white font-semibold mb-3">
                  {t('cancelRegistration.registrationDetails')}
                </h3>
                
                <div className="space-y-2 text-text-secondary">
                  <div>
                    <span className="text-text-muted">{t('common.name')}:</span>{' '}
                    <span className="text-white">{registration.name}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">{t('common.email')}:</span>{' '}
                    <span className="text-white">{registration.email}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">{t('cancelRegistration.registrationCode')}:</span>{' '}
                    <span className="text-white mono font-semibold">{registration.uniqueCode}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">{t('cancelRegistration.status')}:</span>{' '}
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      registration.status === 'confirmed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {registration.status === 'confirmed' 
                        ? t('events.confirmed') 
                        : t('events.waitlist')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              disabled={cancelling}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRegistration}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('cancelRegistration.cancelling')}
                </>
              ) : (
                t('cancelRegistration.confirmCancel')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

