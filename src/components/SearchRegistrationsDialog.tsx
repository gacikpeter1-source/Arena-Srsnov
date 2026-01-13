import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Calendar, Clock, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cancelRegistration } from '@/lib/waitlistUtils'
import { useToast } from '@/hooks/use-toast'

interface SearchRegistrationsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchRegistrationsDialog({ isOpen, onClose }: SearchRegistrationsDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [searchType, setSearchType] = useState<'email' | 'phone'>('email')
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        title: t('common.error'),
        description: t('search.enterValue'),
        variant: 'destructive'
      })
      return
    }

    setSearching(true)
    setSearched(true)
    
    try {
      // Search registrations by email or phone
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where(searchType, '==', searchValue.trim()),
        where('status', 'in', ['confirmed', 'waitlist'])
      )
      
      const registrationSnap = await getDocs(registrationsQuery)
      
      if (registrationSnap.empty) {
        setResults([])
        setSearching(false)
        return
      }

      // Fetch event details for each registration
      const registrationsWithEvents = await Promise.all(
        registrationSnap.docs.map(async (regDoc) => {
          const regData: any = {
            id: regDoc.id,
            ...regDoc.data()
          }
          
          // Fetch event details
          const eventDoc = await getDoc(doc(db, 'events', regData.eventId))
          if (eventDoc.exists()) {
            const eventData = eventDoc.data()
            return {
              ...regData,
              event: {
                id: eventDoc.id,
                ...eventData,
                date: eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date)
              }
            }
          }
          return null
        })
      )

      // Filter out null results and sort by date
      const validResults = registrationsWithEvents
        .filter(r => r !== null)
        .sort((a: any, b: any) => a.event.date - b.event.date)
      
      setResults(validResults)
    } catch (error) {
      console.error('Error searching registrations:', error)
      toast({
        title: t('common.error'),
        description: t('search.searchError'),
        variant: 'destructive'
      })
    } finally {
      setSearching(false)
    }
  }

  const handleCancel = async (registrationId: string) => {
    if (!confirm(t('search.confirmCancel'))) return

    try {
      await cancelRegistration(registrationId)
      
      toast({
        title: t('common.success'),
        description: t('search.cancelSuccess')
      })
      
      // Refresh results
      handleSearch()
    } catch (error) {
      console.error('Error cancelling registration:', error)
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: 'destructive'
      })
    }
  }

  const handleViewEvent = (eventId: string) => {
    onClose()
    navigate(`/events/${eventId}`)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-background-default border-border-default">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            🔍 {t('search.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Type Selection */}
          <div>
            <Label className="text-white mb-3 block">{t('search.searchBy')}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="email"
                  checked={searchType === 'email'}
                  onChange={() => setSearchType('email')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-white">{t('search.email')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="searchType"
                  value="phone"
                  checked={searchType === 'phone'}
                  onChange={() => setSearchType('phone')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-white">{t('search.phone')}</span>
              </label>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <Label className="text-white mb-2 block">
              {searchType === 'email' ? t('search.enterEmail') : t('search.enterPhone')}
            </Label>
            <div className="flex gap-2">
              <Input
                type={searchType === 'email' ? 'email' : 'tel'}
                placeholder={searchType === 'email' ? 'email@example.com' : '+421 XXX XXX XXX'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-background-card border-border-default text-white"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="bg-primary hover:bg-primary-gold text-primary-foreground"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('search.searching')}
                  </>
                ) : (
                  t('search.search')
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {searched && (
            <div className="space-y-4">
              <div className="border-t border-border-default pt-4">
                <h3 className="text-white font-semibold mb-4">
                  {t('search.results')} ({results.length})
                </h3>

                {results.length === 0 ? (
                  <div className="text-center py-8 bg-background-card rounded-lg border border-border-default">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                    <p className="text-white mb-2">{t('search.noResults')}</p>
                    <p className="text-text-secondary text-sm">
                      {searchType === 'email' ? searchValue : searchValue}
                    </p>
                    <p className="text-text-muted text-xs mt-2">
                      💡 {t('search.tip')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((registration: any) => (
                      <div
                        key={registration.id}
                        className="bg-background-card border border-border-default rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-semibold text-lg">
                              {registration.event.title}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              registration.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {registration.status === 'confirmed' 
                                ? <><CheckCircle2 className="inline h-3 w-3 mr-1" />{t('events.confirmed')}</>
                                : `⏳ ${t('events.waitlist')}`
                              }
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-text-secondary mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{formatDate(registration.event.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{registration.event.duration} min</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span>
                              {registration.event.trainers?.[registration.trainerId]?.trainerName || t('common.trainer')}
                            </span>
                          </div>
                          {registration.status === 'confirmed' && registration.uniqueCode && (
                            <div className="pt-2 border-t border-border-default/50">
                              <span className="text-text-muted text-xs">{t('search.registrationCode')}:</span>{' '}
                              <span className="text-primary font-mono font-semibold">{registration.uniqueCode}</span>
                            </div>
                          )}
                          {registration.status === 'waitlist' && registration.position && (
                            <div className="pt-2 border-t border-border-default/50">
                              <span className="text-yellow-400 text-sm">
                                {t('search.position')}: #{registration.position}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewEvent(registration.event.id)}
                            className="flex-1 border-primary/50 text-white hover:bg-primary/10"
                          >
                            {t('search.viewDetails')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancel(registration.id)}
                            className="flex-1"
                          >
                            {registration.status === 'confirmed' 
                              ? t('search.cancelRegistration')
                              : t('search.leaveWaitlist')
                            }
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

