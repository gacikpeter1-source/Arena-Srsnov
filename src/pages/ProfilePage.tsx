import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { deleteUser } from 'firebase/auth'
import { db, storage, auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { User as UserIcon } from 'lucide-react'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { userData, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    phone: userData?.phone || '',
    description: userData?.description || ''
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!userData) return

    setSaving(true)
    try {
      let photoURL = userData.photoURL

      // Upload new photo if provided
      if (photoFile) {
        const photoRef = ref(storage, `trainers/${userData.uid}/photo`)
        await uploadBytes(photoRef, photoFile)
        photoURL = await getDownloadURL(photoRef)
      }

      // Update user document
      await updateDoc(doc(db, 'users', userData.uid), {
        name: formData.name,
        phone: formData.phone,
        description: formData.description,
        photoURL
      })

      toast({
        title: t('common.success'),
        description: 'Profile updated successfully'
      })

      setEditing(false)
      // Refresh page to show updated data
      window.location.reload()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!userData || !auth.currentUser) return

    setDeleting(true)
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', userData.uid))
      
      // Delete user authentication
      await deleteUser(auth.currentUser)
      
      toast({
        title: t('common.success'),
        description: 'Account deleted successfully'
      })

      await signOut()
      navigate('/')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete account',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!userData) return null

  return (
    <div className="content-container py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center justify-between">
              {t('profile.title')}
              <Button
                onClick={() => setEditing(!editing)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                {editing ? t('common.cancel') : t('profile.edit')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo */}
            <div className="flex justify-center">
              {userData.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20">
                  <UserIcon className="h-16 w-16 text-white/50" />
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
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
                  <Label htmlFor="name" className="text-white">{t('auth.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    value={userData.email}
                    disabled
                    className="bg-white/5 border-white/20 text-white/50"
                  />
                  <p className="text-white/50 text-sm mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">{t('auth.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">{t('auth.description')}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-white">
                <div>
                  <Label className="text-white/70">{t('auth.name')}</Label>
                  <p className="text-lg">{userData.name}</p>
                </div>

                <div>
                  <Label className="text-white/70">{t('auth.email')}</Label>
                  <p className="text-lg">{userData.email}</p>
                </div>

                <div>
                  <Label className="text-white/70">{t('auth.phone')}</Label>
                  <p className="text-lg">{userData.phone}</p>
                </div>

                {userData.description && (
                  <div>
                    <Label className="text-white/70">{t('auth.description')}</Label>
                    <p className="text-lg">{userData.description}</p>
                  </div>
                )}

                <div>
                  <Label className="text-white/70">Role</Label>
                  <p className="text-lg capitalize">{userData.role}</p>
                </div>

                <div>
                  <Label className="text-white/70">Status</Label>
                  <p className="text-lg capitalize">{userData.status}</p>
                </div>
              </div>
            )}

            {/* Delete Account */}
            <div className="pt-6 border-t border-white/20">
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
                className="w-full"
              >
                {t('profile.deleteAccount')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{t('profile.deleteAccount')}</DialogTitle>
            <DialogDescription>
              {t('profile.deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}





