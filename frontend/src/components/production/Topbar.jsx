import { useTranslation } from 'react-i18next'
import hacintLogo from '../../assets/hacint-logo.png'

const ALL_TABS = [
  { id: 'technical-study', labelKey: 'app.tabs.technicalStudy', roles: ['admin', 'etude_technique'] },
  { id: 'dashboard',       labelKey: 'app.tabs.dashboard',      roles: ['admin', 'designer'] },
  { id: 'designer',        labelKey: 'app.tabs.designer',       roles: ['admin', 'designer'] },
  { id: 'programmer',      labelKey: 'app.tabs.programmer',     roles: ['admin', 'programmer'] },
  { id: 'cnc',             labelKey: 'app.tabs.cnc',            roles: ['admin', 'cnc'] },
  { id: 'assembly',        labelKey: 'app.tabs.assembly',       roles: ['admin', 'assembly'] },
  { id: 'quality',         labelKey: 'app.tabs.quality',        roles: ['admin', 'quality'] },
]

export default function Topbar({ user, onLogout, page, onPageChange }) {
  const { t, i18n } = useTranslation()
  const role = user?.role ?? 'admin'
  const tabs = ALL_TABS.filter((tab) => tab.roles.includes(role))
  const currentLang = i18n.language
  const toggleLanguage = () => {
    const newLang = currentLang === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto">

        {/* ── Row 1 : Logo + user + language + logout ── */}
        <div className="flex items-center justify-between px-3 sm:px-4 h-11 sm:h-12 gap-2">
          <div className="flex items-center shrink-0">
            <img src={hacintLogo} alt={t('app.logoAlt')} className="h-6 sm:h-7 w-auto" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleLanguage}
              className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-colors px-1.5 py-0.5 rounded border border-slate-200"
            >
              {currentLang === 'fr' ? 'EN' : 'FR'}
            </button>
            <button
              onClick={onLogout}
              className="text-xs sm:text-sm text-red-500 hover:text-red-700 transition-colors font-medium border border-red-200 hover:border-red-400 px-2 py-0.5 rounded"
            >
              {t('app.logout')}
            </button>
          </div>
        </div>

        {/* ── Row 2 : Scrollable tabs ── */}
        <nav
          className="flex border-t border-slate-100 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onPageChange(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                page === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

      </div>
    </header>
  )
}
