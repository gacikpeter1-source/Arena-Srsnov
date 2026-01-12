import { ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import { Menu, X, ArrowLeft, Globe } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation()
  const { userData, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    // Load background image from settings
    const loadBackground = async () => {
      const settingsDoc = await getDoc(doc(db, 'settings', 'app'))
      if (settingsDoc.exists()) {
        const data = settingsDoc.data()
        if (data.backgroundImageUrl) {
          setBackgroundUrl(data.backgroundImageUrl)
        }
      }
    }
    loadBackground()

    // Check if we can go back in history
    setShowBack(window.history.length > 1)
  }, [])

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sk' ? 'en' : 'sk'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const goBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div 
        className="bg-container" 
        style={{
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)'
        }}
      />

      {/* Header */}
      <header className="relative z-10 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="content-container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goBack}
                  className="text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Link to="/" className="text-white">
                <h1 className="text-xl md:text-2xl font-bold">{t('app.title')}</h1>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  {t('nav.home')}
                </Button>
              </Link>
              <Link to="/calendar">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  {t('nav.calendar')}
                </Button>
              </Link>
              <Link to="/trainers">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  {t('nav.trainers')}
                </Button>
              </Link>
              
              {userData ? (
                <>
                  {userData.role === 'admin' && (
                    <Link to="/admin">
                      <Button variant="ghost" className="text-white hover:bg-white/10">
                        {t('nav.admin')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/settings">
                    <Button variant="ghost" className="text-white hover:bg-white/10">
                      {t('nav.settings')}
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" className="text-white hover:bg-white/10">
                      {t('nav.profile')}
                    </Button>
                  </Link>
                  <Button onClick={handleSignOut} variant="outline" className="text-white border-white/20 hover:bg-white/10">
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                    {t('nav.login')}
                  </Button>
                </Link>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                className="text-white hover:bg-white/10"
                title={i18n.language === 'sk' ? 'English' : 'Slovenčina'}
              >
                <Globe className="h-5 w-5" />
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                className="text-white hover:bg-white/10"
              >
                <Globe className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white hover:bg-white/10"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start">
                  {t('nav.home')}
                </Button>
              </Link>
              <Link to="/calendar" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start">
                  {t('nav.calendar')}
                </Button>
              </Link>
              <Link to="/trainers" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start">
                  {t('nav.trainers')}
                </Button>
              </Link>
              
              {userData ? (
                <>
                  {userData.role === 'admin' && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start">
                        {t('nav.admin')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start">
                      {t('nav.settings')}
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start">
                      {t('nav.profile')}
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} 
                    variant="outline" 
                    className="w-full text-white border-white/20 hover:bg-white/10 justify-start"
                  >
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10 justify-start">
                    {t('nav.login')}
                  </Button>
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}



