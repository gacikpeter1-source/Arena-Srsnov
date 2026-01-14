import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import sk from './locales/sk.json'
import en from './locales/en.json'

// Detect browser language
const getBrowserLanguage = (): string => {
  const savedLang = localStorage.getItem('language')
  if (savedLang) return savedLang

  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'sk' || browserLang === 'en' ? browserLang : 'sk'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      sk: { translation: sk },
      en: { translation: en }
    },
    lng: getBrowserLanguage(),
    fallbackLng: 'sk',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n





