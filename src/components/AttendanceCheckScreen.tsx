import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useToast } from '@/hooks/use-toast'
import { Event, User } from '@/types'
import { ArrowLeft, Search, Download, CheckCircle2, UserCheck } from 'lucide-react'
import * as XLSX from 'xlsx'

interface AttendanceCheckScreenProps {
  event: Event
  onClose: () => void
}

interface AttendanceValidation {
  trainerId: string
  trainerName: string
  validatedBy: string
  validatedByName: string
  validatedAt: Date
}

export default function AttendanceCheckScreen({ event, onClose }: AttendanceCheckScreenProps) {
  const { t } = useTranslation()
  const { userData } = useAuth()
  const { toast } = useToast()

  const [trainers, setTrainers] = useState<User[]>([])
  const [validatedTrainers, setValidatedTrainers] = useState<Set<string>>(new Set())
  const [validations, setValidations] = useState<AttendanceValidation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Ensure event date is a Date object
  const eventDate = (() => {
    if (typeof event.date === 'string') {
      return new Date(event.date)
    } else if (event.date instanceof Date) {
      return event.date
    } else if (event.date && typeof (event.date as any).toDate === 'function') {
      return (event.date as any).toDate()
    }
    return new Date()
  })()

  useEffect(() => {
    loadTrainersAndValidations()
  }, [event.id])

  const loadTrainersAndValidations = async () => {
    try {
      setLoading(true)

      // Load all trainers (users with role 'trainer' or 'admin')
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['trainer', 'admin'])
      )
      const usersSnapshot = await getDocs(usersQuery)
      const allTrainers: User[] = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      } as User))

      // Filter to only show trainers who are approved
      const approvedTrainers = allTrainers.filter(t => t.status === 'approved')
      setTrainers(approvedTrainers)

      // Load existing validations from event document
      const eventDoc = await getDoc(doc(db, 'events', event.id))
      if (eventDoc.exists()) {
        const eventData = eventDoc.data()
        const validationsData = eventData.attendanceValidations || []
        
        // Convert Firestore Timestamps to Dates
        const parsedValidations: AttendanceValidation[] = validationsData.map((v: any) => ({
          ...v,
          validatedAt: v.validatedAt?.toDate ? v.validatedAt.toDate() : new Date(v.validatedAt)
        }))
        
        setValidations(parsedValidations)
        
        // Build set of validated trainer IDs
        const validated = new Set(parsedValidations.map((v: AttendanceValidation) => v.trainerId))
        setValidatedTrainers(validated)
      }
    } catch (error) {
      console.error('Error loading trainers:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to load trainers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTrainerValidation = async (trainer: User) => {
    if (!userData) return

    try {
      const isValidated = validatedTrainers.has(trainer.uid)

      if (isValidated) {
        // Remove validation
        const updatedValidations = validations.filter(v => v.trainerId !== trainer.uid)
        
        await updateDoc(doc(db, 'events', event.id), {
          attendanceValidations: updatedValidations.map(v => ({
            ...v,
            validatedAt: Timestamp.fromDate(v.validatedAt)
          }))
        })

        setValidations(updatedValidations)
        setValidatedTrainers(prev => {
          const newSet = new Set(prev)
          newSet.delete(trainer.uid)
          return newSet
        })

        toast({
          title: t('common.success'),
          description: `${trainer.name} - validation removed`
        })
      } else {
        // Add validation
        const newValidation: AttendanceValidation = {
          trainerId: trainer.uid,
          trainerName: trainer.name,
          validatedBy: userData.uid,
          validatedByName: userData.name,
          validatedAt: new Date()
        }

        await updateDoc(doc(db, 'events', event.id), {
          attendanceValidations: arrayUnion({
            ...newValidation,
            validatedAt: Timestamp.now()
          })
        })

        setValidations(prev => [...prev, newValidation])
        setValidatedTrainers(prev => new Set([...prev, trainer.uid]))

        toast({
          title: t('common.success'),
          description: `${trainer.name} - ${t('attendance.validated')}`
        })
      }
    } catch (error) {
      console.error('Error toggling validation:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to update validation',
        variant: 'destructive'
      })
    }
  }

  const handleMarkAllValidated = async () => {
    if (!userData) return

    try {
      const newValidations: AttendanceValidation[] = trainers
        .filter(trainer => !validatedTrainers.has(trainer.uid))
        .map(trainer => ({
          trainerId: trainer.uid,
          trainerName: trainer.name,
          validatedBy: userData.uid,
          validatedByName: userData.name,
          validatedAt: new Date()
        }))

      if (newValidations.length === 0) {
        toast({
          title: t('common.info'),
          description: 'All trainers already validated'
        })
        return
      }

      const allValidations = [...validations, ...newValidations]

      await updateDoc(doc(db, 'events', event.id), {
        attendanceValidations: allValidations.map(v => ({
          ...v,
          validatedAt: v.validatedAt instanceof Date ? Timestamp.fromDate(v.validatedAt) : v.validatedAt
        }))
      })

      setValidations(allValidations)
      setValidatedTrainers(new Set(allValidations.map(v => v.trainerId)))

      toast({
        title: t('common.success'),
        description: `${newValidations.length} ${t('attendance.trainersValidated')}`
      })
    } catch (error) {
      console.error('Error marking all:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to validate all trainers',
        variant: 'destructive'
      })
    }
  }

  const handleExportReport = () => {
    const reportData = validations.map(v => ({
      'Event': event.title,
      'Date': eventDate.toLocaleDateString('sk-SK'),
      'Time': event.startTime,
      'Trainer Name': v.trainerName,
      'Manual Check By': `${v.validatedByName}, ${v.trainerName}`,
      'Validated At': new Date(v.validatedAt).toLocaleString('sk-SK')
    }))

    // Create Excel
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(reportData)

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Validation')

    const filename = `attendance_validation_${event.title}_${eventDate.toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)

    toast({
      title: t('common.success'),
      description: t('attendance.exported')
    })
  }

  const filteredTrainers = trainers.filter(trainer =>
    trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const validatedCount = validatedTrainers.size
  const totalCount = trainers.length
  const validationPercent = totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background-dark z-50 flex items-center justify-center">
        <div className="text-white text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background-dark z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-background-card border-b border-border px-2 sm:px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:text-primary hover:bg-primary/10 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg sm:text-xl font-bold truncate">{t('attendance.checkAttendance')}</h2>
            <p className="text-text-secondary text-xs sm:text-sm truncate">{event.title}</p>
            <p className="text-text-muted text-xs">
              {eventDate.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'short' })} • {event.startTime}
            </p>
          </div>
        </div>

        {/* Validation Stats */}
        <div className="mt-3 bg-primary/10 border border-primary/30 rounded-lg p-2.5 sm:p-3 text-center">
          <div className="text-primary text-xl sm:text-2xl font-bold">
            {validatedCount}/{totalCount} {t('attendance.validated')} ({validationPercent}%)
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:h-5 text-text-secondary" />
          <Input
            type="text"
            placeholder={t('attendance.searchTrainers') || 'Search trainers...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 bg-background-card border-border text-white text-sm sm:text-base h-10 sm:h-11 w-full"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-6">
          <Button
            onClick={handleMarkAllValidated}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 text-xs sm:text-sm h-10 sm:h-11 px-2 sm:px-4"
          >
            <CheckCircle2 className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">{t('attendance.validateAll')}</span>
          </Button>
          <Button
            onClick={handleExportReport}
            disabled={validations.length === 0}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 text-xs sm:text-sm h-10 sm:h-11 px-2 sm:px-4 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">{t('attendance.exportReport')}</span>
          </Button>
        </div>

        {/* Trainers List */}
        <div className="text-primary text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 pb-2 border-b border-border">
          {t('attendance.trainers')}
        </div>

        {filteredTrainers.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{searchTerm ? t('attendance.noTrainersFound') : t('attendance.noTrainers')}</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredTrainers.map(trainer => {
              const isValidated = validatedTrainers.has(trainer.uid)
              const validation = validations.find(v => v.trainerId === trainer.uid)

              return (
                <div
                  key={trainer.uid}
                  className={`bg-background-card border rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3 transition-all active:scale-[0.98] cursor-pointer ${
                    isValidated
                      ? 'border-green-500 border-l-4'
                      : 'border-border border-l-4 border-l-gray-500'
                  }`}
                  onClick={() => handleToggleTrainerValidation(trainer)}
                >
                  <input
                    type="checkbox"
                    checked={isValidated}
                    onChange={() => {}}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded border-2 border-primary accent-primary flex-shrink-0 cursor-pointer"
                  />
                  
                  {/* Profile Picture */}
                  {trainer.photoURL ? (
                    <img
                      src={trainer.photoURL}
                      alt={trainer.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                  )}

                  {/* Trainer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm sm:text-base truncate">{trainer.name}</div>
                    <div className="text-text-secondary text-xs sm:text-sm truncate">{trainer.email}</div>
                    
                    {isValidated && validation && (
                      <div className="text-green-400 text-xs mt-1">
                        ✓ {t('attendance.validatedBy')} {validation.validatedByName}
                        <span className="text-text-muted ml-1">
                          {new Date(validation.validatedAt).toLocaleTimeString('sk-SK', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    {!isValidated && (
                      <div className="text-text-muted text-xs mt-1">
                        {t('attendance.notValidated')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
