import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useToast } from '@/hooks/use-toast'
import { X, UserPlus, CheckCircle2, XCircle } from 'lucide-react'

interface CreateAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateAssistantModal({ isOpen, onClose, onSuccess }: CreateAssistantModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({
        title: t('common.error'),
        description: t('admin.allFieldsRequired') || 'All fields are required',
        variant: 'destructive'
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: t('common.error'),
        description: t('admin.passwordTooShort') || 'Password must be at least 6 characters',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const userId = userCredential.user.uid

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        name: name.trim(),
        email: email.trim(),
        phone: '',
        role: 'assistant',
        status: 'approved',
        permissions: {
          viewCalendar: true,
          checkAttendance: true,
          addWalkIns: true,
          viewFullParticipantDetails: false
        },
        createdAt: new Date()
      })

      toast({
        title: t('common.success'),
        description: t('admin.assistantCreated') || 'Assistant user created successfully'
      })

      // Reset form
      setName('')
      setEmail('')
      setPassword('')

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating assistant:', error)
      
      let errorMessage = 'Failed to create assistant user'
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('admin.emailInUse') || 'Email is already in use'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('admin.invalidEmail') || 'Invalid email address'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('admin.weakPassword') || 'Password is too weak'
      }

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-background-card border border-border rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t('admin.createAssistant') || 'Create Assistant User'}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="text-white hover:text-primary hover:bg-primary/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm mb-6">
          {t('admin.assistantDescription') || 'Assistants can check attendance, add walk-ins, and view calendar.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white mb-2 block">
              {t('common.name')} *
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.enterName') || 'Enter full name'}
              className="bg-background-dark border-border text-white"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-white mb-2 block">
              {t('common.email')} *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('admin.enterEmail') || 'assistant@arena.sk'}
              className="bg-background-dark border-border text-white"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-white mb-2 block">
              {t('admin.password')} * ({t('admin.min6chars') || 'min 6 characters'})
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background-dark border-border text-white"
              disabled={loading}
            />
          </div>

          {/* Permissions Info */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <h4 className="text-primary font-semibold mb-2 text-sm">
              {t('admin.assistantPermissions') || 'Assistant Permissions'}
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('admin.canViewCalendar') || 'Can view calendar'}</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('admin.canCheckAttendance') || 'Can check attendance'}</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('admin.canAddWalkIns') || 'Can add walk-ins'}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span>{t('admin.cannotSeeContacts') || 'Cannot see full contact details'}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span>{t('admin.cannotManageEvents') || 'Cannot create/edit/delete events'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || !password.trim()}
              className="flex-1 bg-primary hover:bg-primary-gold text-primary-foreground font-semibold"
            >
              {loading ? t('common.loading') : t('admin.createAssistant') || 'Create Assistant'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}



