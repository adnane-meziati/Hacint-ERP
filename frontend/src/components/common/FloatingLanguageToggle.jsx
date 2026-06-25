import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function FloatingLanguageToggle() {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'fr'
  const activeLanguage = currentLanguage.startsWith('en') ? 'en' : 'fr'

  useEffect(() => {
    localStorage.setItem('language', activeLanguage)
  }, [activeLanguage])

  return (
    <div
      data-language-switcher="true"
      className="fixed right-2 top-1 z-[70] inline-flex h-9 items-center rounded-full border border-slate-200 bg-white p-1 shadow-md sm:right-4 sm:top-1.5"
      role="group"
      aria-label={t('app.selectLanguage')}
    >
      {['en', 'fr'].map((language) => {
        const active = activeLanguage === language
        return (
          <button
            key={language}
            type="button"
            onClick={() => i18n.changeLanguage(language)}
            className={`min-w-9 rounded-full px-2 py-1 text-[11px] font-bold transition-colors sm:min-w-10 sm:text-xs ${
              active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            aria-pressed={active}
            aria-label={language === 'en' ? 'English' : 'Français'}
          >
            {language.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
