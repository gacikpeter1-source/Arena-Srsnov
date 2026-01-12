import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    description: '',
    inviteCode: ''
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.inviteCode) {
      toast({
        title: t('common.error'),
        description: 'Please fill all required fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Verify invite code
      const inviteCodeDoc = await getDoc(doc(db, 'inviteCodes', formData.inviteCode))
      
      if (!inviteCodeDoc.exists() || inviteCodeDoc.data().used) {
        toast({
          title: t('common.error'),
          description: 'Invalid or already used invite code',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      let photoURL = ''
      
      // Upload photo if provided
      if (photoFile) {
        const photoRef = ref(storage, `trainers/${userCredential.user.uid}/photo`)
        await uploadBytes(photoRef, photoFile)
        photoURL = await getDownloadURL(photoRef)
      }

      // Create user document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        description: formData.description,
        photoURL,
        role: 'trainer',
        status: 'pending',
        createdAt: new Date()
      })

      // Mark invite code as used
      await setDoc(doc(db, 'inviteCodes', formData.inviteCode), {
        ...inviteCodeDoc.data(),
        used: true,
        usedBy: userCredential.user.uid,
        usedAt: new Date()
      })

      toast({
        title: t('common.success'),
        description: t('auth.pendingMessage')
      })

      navigate('/login')
    } catch (error: any) {
      console.error('Registration error:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to register',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-container py-8">
      <div className="max-w-md mx-auto">
        <Card className="bg-white/10 border-white/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white text-2xl">{t('auth.register')}</CardTitle>
            <CardDescription className="text-white/70">
              Register as a trainer (requires invite code)
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white">{t('auth.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-white">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-white">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-white">{t('auth.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-white">{t('auth.description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="photo" className="text-white">{t('auth.photo')}</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="inviteCode" className="text-white">{t('auth.inviteCode')}</Label>
                <Input
                  id="inviteCode"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="XXXXXXXX"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.signUp')}
              </Button>
              <div className="text-white/70 text-sm text-center">
                {t('auth.haveAccount')}{' '}
                <Link to="/login" className="text-white underline hover:text-white/90">
                  {t('auth.login')}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}



