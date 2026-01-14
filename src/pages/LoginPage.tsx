import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: t('common.error'),
        description: 'Please fill all fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      toast({
        title: t('common.success'),
        description: 'Logged in successfully'
      })
      navigate('/')
    } catch (error: any) {
      console.error('Login error:', error)
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to login',
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
            <CardTitle className="text-white text-2xl">{t('auth.login')}</CardTitle>
            <CardDescription className="text-white/70">
              Sign in to your trainer account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="trainer@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-white">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.signIn')}
              </Button>
              <div className="text-white/70 text-sm text-center">
                {t('auth.needAccount')}{' '}
                <Link to="/register" className="text-white underline hover:text-white/90">
                  {t('auth.register')}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}





