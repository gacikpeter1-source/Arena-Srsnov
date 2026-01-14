import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'

interface ParsedEvent {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  title: string
  valid: boolean
  error?: string
}

export default function ImportSchedulePage() {
  const { t } = useTranslation()
  const { userData } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [previewEvents, setPreviewEvents] = useState<ParsedEvent[]>([])
  const [file, setFile] = useState<File | null>(null)

  // Parse date from various formats
  const parseDate = (dateValue: any): string | null => {
    try {
      let date: Date | null = null

      // Handle Excel serial date numbers
      if (typeof dateValue === 'number') {
        // Excel date serial (days since 1900-01-01, with some quirks)
        const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
        date = new Date(excelEpoch.getTime() + dateValue * 86400000)
      } 
      // Handle string dates
      else if (typeof dateValue === 'string') {
        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          date = new Date(dateValue)
        }
        // Try DD/MM/YYYY or DD.MM.YYYY
        else if (/^\d{2}[\/\.]\d{2}[\/\.]\d{4}$/.test(dateValue)) {
          const parts = dateValue.split(/[\/\.]/)
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
        }
        // Try MM/DD/YYYY
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
          date = new Date(dateValue)
        }
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue
      }

      if (!date || isNaN(date.getTime())) {
        return null
      }

      // Return YYYY-MM-DD format
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('Date parsing error:', error)
      return null
    }
  }

  // Parse time from various formats
  const parseTime = (timeValue: any): string | null => {
    try {
      // Handle Excel time (fraction of day)
      if (typeof timeValue === 'number' && timeValue < 1) {
        const totalMinutes = Math.round(timeValue * 24 * 60)
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }
      // Handle HH:MM format
      else if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
        const [hours, minutes] = timeValue.split(':')
        return `${String(parseInt(hours)).padStart(2, '0')}:${minutes}`
      }
      // Handle H:MM format
      else if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
        return timeValue.padStart(5, '0')
      }

      return null
    } catch (error) {
      console.error('Time parsing error:', error)
      return null
    }
  }

  // Handle file upload and parsing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setLoading(true)

    try {
      const data = await uploadedFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      // Find header row
      let headerRow = 0
      const headers = jsonData[headerRow]?.map((h: any) => String(h).toLowerCase().trim())
      
      // Find column indices
      const dateCol = headers.findIndex((h: string) => h.includes('date') || h.includes('datum'))
      const timeCol = headers.findIndex((h: string) => h.includes('time') || h.includes('čas') || h.includes('cas'))
      const titleCol = headers.findIndex((h: string) => h.includes('title') || h.includes('name') || h.includes('názov') || h.includes('nazov'))

      if (dateCol === -1 || timeCol === -1 || titleCol === -1) {
        toast({
          title: t('common.error'),
          description: 'Required columns not found: Date, Time, Title',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // Parse data rows
      const parsed: ParsedEvent[] = []
      for (let i = headerRow + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue

        const dateValue = row[dateCol]
        const timeValue = row[timeCol]
        const titleValue = row[titleCol]

        const date = parseDate(dateValue)
        const time = parseTime(timeValue)
        const title = String(titleValue || '').trim()

        const event: ParsedEvent = {
          date: date || '',
          time: time || '',
          title: title,
          valid: true
        }

        // Validate
        if (!date) {
          event.valid = false
          event.error = 'Invalid date format'
        } else if (!time) {
          event.valid = false
          event.error = 'Invalid time format'
        } else if (!title) {
          event.valid = false
          event.error = 'Missing title'
        }

        parsed.push(event)
      }

      setPreviewEvents(parsed)
      toast({
        title: t('common.success'),
        description: `Parsed ${parsed.length} events (${parsed.filter(e => e.valid).length} valid)`
      })
    } catch (error: any) {
      console.error('File parsing error:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to parse file',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Import events to Firestore
  const handleImport = async () => {
    if (!userData || previewEvents.length === 0) return

    const validEvents = previewEvents.filter(e => e.valid)
    if (validEvents.length === 0) {
      toast({
        title: t('common.error'),
        description: 'No valid events to import',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      let successCount = 0
      
      for (const event of validEvents) {
        const eventDateTime = new Date(event.date)
        const [hours, minutes] = event.time.split(':')
        eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        await addDoc(collection(db, 'events'), {
          title: event.title,
          date: Timestamp.fromDate(eventDateTime),
          startTime: event.time,
          duration: 60, // Default 60 minutes
          type: 'other',
          
          // Organizational event flags
          isOrganizational: true,
          importedBy: userData.uid,
          importedAt: new Date(),
          status: 'pending', // Will become 'active' when first trainer confirms
          
          // Multi-trainer data (empty initially)
          trainers: {},
          
          createdBy: userData.uid,
          createdAt: new Date()
        })
        
        successCount++
      }

      toast({
        title: t('common.success'),
        description: `Successfully imported ${successCount} organizational events`
      })

      // Redirect to calendar
      setTimeout(() => {
        navigate('/calendar')
      }, 1500)
    } catch (error: any) {
      console.error('Import error:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to import events',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-container py-8">
      <Card className="arena-card max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-3">
            <Calendar className="h-7 w-7 text-blue-400" />
            {t('import.title') || 'Import Organizational Schedule'}
          </CardTitle>
          <p className="text-text-secondary text-sm mt-2">
            {t('import.subtitle') || 'Upload an Excel file (.xlsx, .xls, .csv) with organizational events'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-background-dark">
            <FileSpreadsheet className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-white font-semibold mb-2">
                {file ? file.name : t('import.chooseFile') || 'Choose Excel File'}
              </div>
              <div className="text-text-secondary text-sm mb-4">
                {t('import.fileFormats') || 'Supports .xlsx, .xls, .csv'}
              </div>
              <Button type="button" variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400/10">
                <Upload className="mr-2 h-4 w-4" />
                {t('import.selectFile') || 'Select File'}
              </Button>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Label>
          </div>

          {/* Expected Format Info */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
            <h3 className="text-blue-300 font-semibold mb-2">
              {t('import.expectedFormat') || 'Expected Format'}
            </h3>
            <div className="text-blue-200/70 text-sm space-y-1">
              <p>• <strong>Date:</strong> YYYY-MM-DD or DD/MM/YYYY (e.g., 2026-01-15 or 15/01/2026)</p>
              <p>• <strong>Time:</strong> HH:MM in 24-hour format (e.g., 14:00, 18:30)</p>
              <p>• <strong>Title:</strong> Event name (string)</p>
              <p className="mt-2 text-xs opacity-70">Default values: Duration = 60 minutes, Capacity = Unlimited per trainer</p>
            </div>
          </div>

          {/* Preview Table */}
          {previewEvents.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                {t('import.preview') || 'Preview'} - {previewEvents.filter(e => e.valid).length} / {previewEvents.length} {t('import.validEvents') || 'valid events'}
              </h3>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-background-dark">
                    <tr>
                      <th className="text-left p-3 text-text-secondary font-semibold">#</th>
                      <th className="text-left p-3 text-text-secondary font-semibold">{t('import.date') || 'Date'}</th>
                      <th className="text-left p-3 text-text-secondary font-semibold">{t('import.time') || 'Time'}</th>
                      <th className="text-left p-3 text-text-secondary font-semibold">{t('import.title') || 'Title'}</th>
                      <th className="text-left p-3 text-text-secondary font-semibold">{t('import.status') || 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEvents.map((event, index) => (
                      <tr key={index} className={`border-t border-border ${event.valid ? '' : 'bg-red-500/10'}`}>
                        <td className="p-3 text-text-muted">{index + 1}</td>
                        <td className="p-3 text-white">{event.date || '-'}</td>
                        <td className="p-3 text-white font-mono">{event.time || '-'}</td>
                        <td className="p-3 text-white">{event.title || '-'}</td>
                        <td className="p-3">
                          {event.valid ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              {t('import.valid') || 'Valid'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              {event.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleImport}
              disabled={loading || previewEvents.filter(e => e.valid).length === 0}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? t('common.loading') : `${t('import.importEvents') || 'Import'} ${previewEvents.filter(e => e.valid).length} ${t('import.events') || 'Events'}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

