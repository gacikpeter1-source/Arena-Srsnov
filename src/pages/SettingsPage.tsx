import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { generateInviteCode } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Upload, Copy } from 'lucide-react'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { userData, isAdmin } = useAuth()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [qrConfig, setQrConfig] = useState({
    size: '400',
    customSize: '',
    format: 'png'
  })
  const [showQR, setShowQR] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  const appUrl = window.location.origin

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    toast({
      title: t('common.success'),
      description: 'Language changed successfully'
    })
  }

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: 'Please upload an image file',
        variant: 'destructive'
      })
      return
    }

    setUploading(true)
    try {
      const storageRef = ref(storage, `backgrounds/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)

      // Update settings document
      await setDoc(doc(db, 'settings', 'app'), {
        backgroundImageUrl: url,
        updatedAt: new Date()
      }, { merge: true })

      toast({
        title: t('common.success'),
        description: 'Background updated successfully. Refresh to see changes.'
      })

      // Refresh page to show new background
      setTimeout(() => window.location.reload(), 1000)
    } catch (error: any) {
      console.error('Error uploading background:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to upload background',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteBackground = async () => {
    if (!confirm('Are you sure you want to remove the background image?')) return

    setUploading(true)
    try {
      // Remove background from settings
      await setDoc(doc(db, 'settings', 'app'), {
        backgroundImageUrl: null,
        updatedAt: new Date()
      }, { merge: true })

      toast({
        title: t('common.success'),
        description: 'Background removed successfully. Refresh to see changes.'
      })

      // Refresh page to show changes
      setTimeout(() => window.location.reload(), 1000)
    } catch (error: any) {
      console.error('Error removing background:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to remove background',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateInviteCode = async () => {
    if (!userData || !isAdmin) return

    try {
      const code = generateInviteCode()
      
      await setDoc(doc(db, 'inviteCodes', code), {
        code,
        createdBy: userData.uid,
        createdAt: new Date(),
        used: false
      })

      setGeneratedCode(code)
      toast({
        title: t('common.success'),
        description: `Invite code generated: ${code}`
      })
    } catch (error: any) {
      console.error('Error generating invite code:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to generate invite code',
        variant: 'destructive'
      })
    }
  }

  const copyInviteCode = () => {
    navigator.clipboard.writeText(generatedCode)
    toast({
      title: t('common.success'),
      description: 'Code copied to clipboard'
    })
  }

  const downloadQR = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const size = qrConfig.size === 'custom' 
      ? parseInt(qrConfig.customSize) || 400
      : parseInt(qrConfig.size)

    if (qrConfig.format === 'svg') {
      // Download as SVG
      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = svgUrl
      downloadLink.download = 'arena-srsnov-qr.svg'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    } else {
      // Download as PNG
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0, size, size)
        URL.revokeObjectURL(url)
        
        canvas.toBlob((blob) => {
          if (!blob) return
          const pngUrl = URL.createObjectURL(blob)
          const downloadLink = document.createElement('a')
          downloadLink.href = pngUrl
          downloadLink.download = 'arena-srsnov-qr.png'
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
        })
      }
      img.src = url
    }

    toast({
      title: t('common.success'),
      description: 'QR code downloaded'
    })
  }

  return (
    <div className="content-container py-8">
      <h1 className="text-white mb-8">{t('settings.title')}</h1>

      <div className="grid gap-6 max-w-4xl">
        {/* Language Settings */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('settings.language')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={i18n.language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sk">Slovenčina</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Background Upload */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('settings.background')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="background" className="text-white">
                  {t('settings.uploadBackground')}
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="background"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="bg-white/10 border-white/20 text-white flex-1"
                    disabled={uploading}
                  />
                  <Button disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t('common.loading') : t('settings.changeBackground')}
                  </Button>
                </div>
              </div>
              <div>
                <Button 
                  onClick={handleDeleteBackground} 
                  variant="destructive" 
                  disabled={uploading}
                  className="w-full sm:w-auto"
                >
                  Remove Background
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Codes (Admin Only) */}
        {isAdmin && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">{t('settings.inviteCodes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleGenerateInviteCode} className="w-full sm:w-auto">
                  {t('settings.generateCode')}
                </Button>
                
                {generatedCode && (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={generatedCode}
                      readOnly
                      className="bg-white/10 border-white/20 text-white font-mono text-lg"
                    />
                    <Button onClick={copyInviteCode} variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code Generator */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">{t('settings.qrCode')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="qrSize" className="text-white">{t('settings.qrSize')}</Label>
                  <Select value={qrConfig.size} onValueChange={(value) => setQrConfig({ ...qrConfig, size: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="200">{t('settings.sizes.small')}</SelectItem>
                      <SelectItem value="400">{t('settings.sizes.medium')}</SelectItem>
                      <SelectItem value="800">{t('settings.sizes.large')}</SelectItem>
                      <SelectItem value="custom">{t('settings.sizes.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {qrConfig.size === 'custom' && (
                  <div>
                    <Label htmlFor="customSize" className="text-white">Custom Size (px)</Label>
                    <Input
                      id="customSize"
                      type="number"
                      min="100"
                      max="2000"
                      value={qrConfig.customSize}
                      onChange={(e) => setQrConfig({ ...qrConfig, customSize: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="400"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="qrFormat" className="text-white">{t('settings.qrFormat')}</Label>
                  <Select value={qrConfig.format} onValueChange={(value) => setQrConfig({ ...qrConfig, format: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="svg">SVG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowQR(!showQR)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  {showQR ? 'Hide Preview' : t('settings.generateQR')}
                </Button>
                {showQR && (
                  <Button onClick={downloadQR}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('settings.download')}
                  </Button>
                )}
              </div>

              {showQR && (
                <div className="bg-white p-8 rounded-lg flex justify-center" ref={qrRef}>
                  <QRCodeSVG
                    value={appUrl}
                    size={qrConfig.size === 'custom' ? parseInt(qrConfig.customSize) || 400 : parseInt(qrConfig.size)}
                    level="H"
                    includeMargin
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



