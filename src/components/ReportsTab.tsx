import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Download, Trash2, Calendar } from 'lucide-react'

interface TrainerInfo {
  id: string
  name: string
  photoURL?: string
}

interface ReportHistoryItem {
  id: string
  generatedBy: string
  generatedAt: any
  dateFrom: string
  dateTo: string
  trainerIds: string[] | null
  trainerNames: string[]
  format: string
  totalEvents: number
  totalParticipants: number
  totalTrainers: number
  filename: string
}

export default function ReportsTab() {
  const { t } = useTranslation()
  const { userData } = useAuth()
  const { toast } = useToast()
  
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  })
  const [trainerFilter, setTrainerFilter] = useState<'all' | 'specific'>('all')
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'xls'>('xlsx')
  const [trainers, setTrainers] = useState<TrainerInfo[]>([])
  const [previewCount, setPreviewCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [recentReports, setRecentReports] = useState<ReportHistoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadTrainers()
    loadRecentReports()
  }, [])

  useEffect(() => {
    updatePreviewCount()
  }, [dateFrom, dateTo, trainerFilter, selectedTrainerIds])

  const loadTrainers = async () => {
    try {
      const trainersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['trainer', 'admin']),
        where('status', '==', 'approved')
      )
      const snapshot = await getDocs(trainersQuery)
      const trainersList: TrainerInfo[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        photoURL: doc.data().photoURL
      }))
      setTrainers(trainersList)
    } catch (error) {
      console.error('Error loading trainers:', error)
    }
  }

  const loadRecentReports = async () => {
    try {
      const reportsQuery = query(
        collection(db, 'reportHistory'),
        orderBy('generatedAt', 'desc')
      )
      const snapshot = await getDocs(reportsQuery)
      const reports: ReportHistoryItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReportHistoryItem)).slice(0, 10)
      setRecentReports(reports)
    } catch (error) {
      console.error('Error loading recent reports:', error)
    }
  }

  const updatePreviewCount = async () => {
    try {
      const fromDate = Timestamp.fromDate(new Date(dateFrom))
      const toDate = Timestamp.fromDate(new Date(dateTo + 'T23:59:59'))
      
      const eventsQuery = query(
        collection(db, 'events'),
        where('date', '>=', fromDate),
        where('date', '<=', toDate)
      )
      
      const snapshot = await getDocs(eventsQuery)
      let count = 0
      
      snapshot.docs.forEach(doc => {
        const eventData = doc.data()
        
        if (eventData.isOrganizational && eventData.trainers) {
          const trainerIds = Object.keys(eventData.trainers)
          if (trainerFilter === 'all') {
            count += trainerIds.length
          } else {
            count += trainerIds.filter(id => selectedTrainerIds.includes(id)).length
          }
        } else {
          const trainerId = eventData.createdBy
          if (trainerFilter === 'all' || selectedTrainerIds.includes(trainerId)) {
            count += 1
          }
        }
      })
      
      setPreviewCount(count)
    } catch (error) {
      console.error('Error updating preview:', error)
    }
  }

  const handleTrainerToggle = (trainerId: string) => {
    setSelectedTrainerIds(prev => 
      prev.includes(trainerId)
        ? prev.filter(id => id !== trainerId)
        : [...prev, trainerId]
    )
  }

  const generateReport = async () => {
    if (!userData) return
    
    setLoading(true)
    try {
      const fromDate = Timestamp.fromDate(new Date(dateFrom))
      const toDate = Timestamp.fromDate(new Date(dateTo + 'T23:59:59'))
      
      // Fetch events
      const eventsQuery = query(
        collection(db, 'events'),
        where('date', '>=', fromDate),
        where('date', '<=', toDate)
      )
      
      const eventsSnapshot = await getDocs(eventsQuery)
      const reportData: any[] = []
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data()
        const eventDate = eventData.date.toDate()
        const dateStr = eventDate.toISOString().split('T')[0]
        
        // Handle organizational events (multi-trainer)
        if (eventData.isOrganizational && eventData.trainers) {
          for (const [trainerId] of Object.entries(eventData.trainers) as [string, any][]) {
            // Filter by selected trainers
            if (trainerFilter === 'specific' && !selectedTrainerIds.includes(trainerId)) continue
            
            // Get trainer name
            const trainerDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', trainerId)))
            const trainerName = trainerDoc.docs[0]?.data()?.name || 'Unknown'
            
            // Get registrations for this trainer
            const registrationsQuery = query(
              collection(db, 'registrations'),
              where('eventId', '==', eventDoc.id),
              where('trainerId', '==', trainerId),
              where('status', '==', 'confirmed')
            )
            const regsSnapshot = await getDocs(registrationsQuery)
            const participants = regsSnapshot.docs.map(doc => doc.data().name)
            
            reportData.push({
              Date: dateStr,
              Time: eventData.startTime,
              'Event Title': eventData.title,
              Trainer: trainerName,
              Participants: participants.length > 0 ? `${participants.length} (${participants.join(', ')})` : '0'
            })
          }
        } 
        // Handle regular trainer-created events
        else {
          const trainerId = eventData.createdBy
          
          // Filter by selected trainers
          if (trainerFilter === 'specific' && !selectedTrainerIds.includes(trainerId)) continue
          
          // Get trainer name
          const trainerDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', trainerId)))
          const trainerName = trainerDoc.docs[0]?.data()?.name || 'Unknown'
          
          // Get all registrations for this event
          const registrationsQuery = query(
            collection(db, 'registrations'),
            where('eventId', '==', eventDoc.id),
            where('status', '==', 'confirmed')
          )
          const regsSnapshot = await getDocs(registrationsQuery)
          const participants = regsSnapshot.docs.map(doc => doc.data().name)
          
          reportData.push({
            Date: dateStr,
            Time: eventData.startTime,
            'Event Title': eventData.title,
            Trainer: trainerName,
            Participants: participants.length > 0 ? `${participants.length} (${participants.join(', ')})` : '0'
          })
        }
      }
      
      // Sort by date and time
      reportData.sort((a, b) => {
        if (a.Date !== b.Date) return a.Date.localeCompare(b.Date)
        return a.Time.localeCompare(b.Time)
      })
      
      // Calculate summary
      const summary = calculateSummary(reportData)
      
      // Add header and summary
      const fullData = [
        {
          Date: 'ARÉNA SRŠŇOV - TRAINING REPORT',
          Time: '',
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {
          Date: `Period: ${dateFrom} - ${dateTo}`,
          Time: '',
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {
          Date: `Generated: ${new Date().toLocaleString('sk-SK')}`,
          Time: '',
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {},
        ...reportData,
        {},
        {},
        {
          Date: 'SUMMARY',
          Time: '',
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {
          Date: 'Total Events:',
          Time: summary.totalEvents.toString(),
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {
          Date: 'Total Trainers:',
          Time: summary.totalTrainers.toString(),
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {
          Date: 'Total Participants:',
          Time: summary.totalParticipants.toString(),
          'Event Title': '',
          Trainer: '',
          Participants: ''
        },
        {},
        {
          Date: 'BY TRAINER:',
          Time: '',
          'Event Title': '',
          Trainer: '',
          Participants: ''
        }
      ]
      
      // Add trainer breakdown
      Object.entries(summary.trainerStats).forEach(([trainer, stats]: [string, any]) => {
        fullData.push({
          Date: trainer,
          Time: `${stats.count} participants`,
          'Event Title': `${stats.events} events`,
          Trainer: '',
          Participants: ''
        })
      })
      
      // Create workbook
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(fullData, { skipHeader: true })
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 12 },
        { wch: 8 },
        { wch: 20 },
        { wch: 15 },
        { wch: 60 }
      ]
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Report')
      
      // Generate filename and download
      const filename = `training_report_${dateFrom}_${dateTo}.${exportFormat}`
      XLSX.writeFile(workbook, filename, { bookType: exportFormat })
      
      // Save metadata
      await saveReportMetadata(summary, filename)
      
      toast({
        title: t('common.success'),
        description: t('reports.generated') || 'Report generated successfully'
      })
      
      loadRecentReports()
    } catch (error: any) {
      console.error('Error generating report:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to generate report',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (reportData: any[]) => {
    const totalEvents = reportData.length
    const uniqueTrainers = [...new Set(reportData.map((row: any) => row.Trainer))]
    
    let totalParticipants = 0
    const trainerStats: { [key: string]: { count: number; events: number } } = {}
    
    reportData.forEach((row: any) => {
      const count = parseInt(row.Participants.split(' ')[0]) || 0
      totalParticipants += count
      
      if (!trainerStats[row.Trainer]) {
        trainerStats[row.Trainer] = { count: 0, events: 0 }
      }
      trainerStats[row.Trainer].count += count
      trainerStats[row.Trainer].events += 1
    })
    
    return {
      totalEvents,
      totalTrainers: uniqueTrainers.length,
      totalParticipants,
      trainerStats
    }
  }

  const saveReportMetadata = async (summary: any, filename: string) => {
    const selectedTrainers = trainerFilter === 'all' 
      ? null 
      : trainers.filter(t => selectedTrainerIds.includes(t.id))
    
    await addDoc(collection(db, 'reportHistory'), {
      generatedBy: userData!.uid,
      generatedAt: new Date(),
      dateFrom,
      dateTo,
      trainerIds: trainerFilter === 'all' ? null : selectedTrainerIds,
      trainerNames: trainerFilter === 'all' ? [] : selectedTrainers!.map(t => t.name),
      format: exportFormat,
      totalEvents: summary.totalEvents,
      totalParticipants: summary.totalParticipants,
      totalTrainers: summary.totalTrainers,
      filename
    })
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm(t('reports.confirmDelete') || 'Are you sure you want to delete this report history?')) return
    
    try {
      await deleteDoc(doc(db, 'reportHistory', reportId))
      toast({
        title: t('common.success'),
        description: t('reports.deleted') || 'Report deleted'
      })
      loadRecentReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      toast({
        title: t('common.error'),
        description: 'Failed to delete report',
        variant: 'destructive'
      })
    }
  }

  const filteredTrainers = trainers.filter(trainer => 
    trainer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Report Generator Card */}
      <Card className="bg-background-card border-border">
        <CardHeader>
          <CardTitle className="text-primary text-2xl flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            {t('reports.generateNew') || 'Generate New Report'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div>
            <Label className="text-white mb-2 block">{t('reports.dateRange') || 'Date Range'}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-text-secondary text-sm mb-1 block">{t('reports.from') || 'From'}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-background-dark border-border text-white"
                />
              </div>
              <div>
                <Label className="text-text-secondary text-sm mb-1 block">{t('reports.to') || 'To'}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-background-dark border-border text-white"
                />
              </div>
            </div>
          </div>

          {/* Trainer Filter */}
          <div>
            <Label className="text-white mb-2 block">{t('reports.trainers') || 'Trainers'}</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="all-trainers"
                  checked={trainerFilter === 'all'}
                  onChange={() => setTrainerFilter('all')}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="all-trainers" className="text-white cursor-pointer">
                  {t('reports.allTrainers') || 'All Trainers'}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="specific-trainers"
                  checked={trainerFilter === 'specific'}
                  onChange={() => setTrainerFilter('specific')}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="specific-trainers" className="text-white cursor-pointer">
                  {t('reports.specificTrainers') || 'Specific Trainers'}
                </Label>
              </div>
              
              {trainerFilter === 'specific' && (
                <div className="mt-3 bg-background-dark border border-border rounded-lg p-4">
                  <Input
                    type="text"
                    placeholder={t('reports.searchTrainers') || 'Search trainers...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-3 bg-background-card border-border text-white"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredTrainers.map(trainer => (
                      <div key={trainer.id} className="flex items-center gap-3 p-2 hover:bg-background-card rounded transition-colors">
                        <input
                          type="checkbox"
                          id={`trainer-${trainer.id}`}
                          checked={selectedTrainerIds.includes(trainer.id)}
                          onChange={() => handleTrainerToggle(trainer.id)}
                          className="w-4 h-4 accent-primary"
                        />
                        {trainer.photoURL ? (
                          <img src={trainer.photoURL} alt={trainer.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                            {trainer.name.charAt(0)}
                          </div>
                        )}
                        <Label htmlFor={`trainer-${trainer.id}`} className="text-white cursor-pointer flex-1">
                          {trainer.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-text-secondary text-sm mt-3">
                    {t('reports.selected') || 'Selected'}: {selectedTrainerIds.length} {t('reports.trainers')?.toLowerCase() || 'trainers'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <Label className="text-white mb-2 block">{t('reports.exportFormat') || 'Export Format'}</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="format-xlsx"
                  checked={exportFormat === 'xlsx'}
                  onChange={() => setExportFormat('xlsx')}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="format-xlsx" className="text-white cursor-pointer">
                  XLSX (Excel 2007+)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="format-csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="format-csv" className="text-white cursor-pointer">
                  CSV (Comma Separated)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="format-xls"
                  checked={exportFormat === 'xls'}
                  onChange={() => setExportFormat('xls')}
                  className="w-4 h-4 accent-primary"
                />
                <Label htmlFor="format-xls" className="text-white cursor-pointer">
                  XLS (Excel 97-2003)
                </Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-background-dark border border-border rounded-lg p-4">
            <p className="text-white">
              <span className="text-text-secondary">{t('reports.preview') || 'Preview'}:</span>{' '}
              <span className="font-semibold text-primary">{previewCount}</span>{' '}
              {t('reports.eventsFound') || 'events found in date range'}
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateReport}
            disabled={loading || previewCount === 0 || (trainerFilter === 'specific' && selectedTrainerIds.length === 0)}
            className="w-full bg-primary hover:bg-primary-gold text-primary-foreground font-semibold py-6 text-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                {t('reports.generating') || 'Generating...'}
              </span>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                {t('reports.generateDownload') || 'Generate & Download Report'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div>
          <h3 className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('reports.recentReports') || 'Recent Reports'}
          </h3>
          <div className="space-y-3">
            {recentReports.map(report => (
              <Card key={report.id} className="bg-background-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold mb-1 break-words">
                        📄 {report.dateFrom} - {report.dateTo}
                      </h4>
                      <p className="text-text-secondary text-sm mb-1 truncate">
                        {report.trainerIds === null ? t('reports.allTrainers') : report.trainerNames.join(', ')} • {report.format.toUpperCase()}
                      </p>
                      <p className="text-text-secondary text-sm mb-2">
                        {t('reports.generated') || 'Generated'}: {report.generatedAt?.toDate ? report.generatedAt.toDate().toLocaleString('sk-SK') : 'N/A'}
                      </p>
                      <p className="text-text-muted text-sm">
                        {report.totalEvents} {t('reports.events') || 'events'} • {' '}
                        {report.totalParticipants} {t('reports.participants') || 'participants'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateFrom(report.dateFrom)
                          setDateTo(report.dateTo)
                          if (report.trainerIds) {
                            setTrainerFilter('specific')
                            setSelectedTrainerIds(report.trainerIds)
                          } else {
                            setTrainerFilter('all')
                          }
                          setExportFormat(report.format as any)
                          setTimeout(() => generateReport(), 100)
                        }}
                        className="border-primary text-primary hover:bg-primary/10 flex-1 sm:flex-initial"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">{t('reports.downloadAgain') || 'Download'}</span>
                        <span className="sm:hidden">{t('reports.downloadAgain')?.substring(0, 8) || 'Download'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                        className="border-status-danger text-status-danger hover:bg-status-danger/10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

