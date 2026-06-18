import { Button } from '@chakra-ui/react'
import hacintLogo from '../../assets/hacint-logo.png'

const ALL_TABS = [
  { id: 'technical-study', label: '🔬 Étude Technique', roles: ['admin', 'etude_technique'] },
  { id: 'dashboard',   label: 'Échantillons',          roles: ['admin', 'designer'] },
  { id: 'designer',    label: 'Vue Designer',           roles: ['admin', 'designer'] },
  { id: 'programmer',  label: 'Vue Programmateur',      roles: ['admin', 'programmer'] },
  { id: 'cnc',         label: 'Vue CNC',                roles: ['admin', 'cnc'] },
  { id: 'assembly',    label: 'Vue Assembly',           roles: ['admin', 'assembly'] },
  { id: 'quality',     label: 'Vue Qualité',            roles: ['admin', 'quality'] },
  { id: 'users',       label: '👥 Utilisateurs',        roles: ['admin'] },
]

export default function Topbar({ user, onLogout, page, onPageChange }) {
  const role = user?.role ?? 'admin'
  const tabs = ALL_TABS.filter((t) => t.roles.includes(role))
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.username

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto">

        {/* ── Row 1 : Logo + user + logout ── */}
        <div className="flex items-center justify-between px-3 sm:px-4 h-11 sm:h-12 gap-2">
          <div className="flex items-center shrink-0">
            <img src={hacintLogo} alt="Hacint" className="h-6 sm:h-7 w-auto" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {displayName && (
              <span className="text-xs sm:text-sm text-slate-500 hidden xs:inline max-w-[100px] sm:max-w-none truncate">
                {displayName}
              </span>
            )}
            <Button
              size="xs"
              variant="outline"
              colorPalette="red"
              onClick={onLogout}
            >
              Déconnexion
            </Button>
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
              {tab.label}
            </button>
          ))}
        </nav>

      </div>
    </header>
  )
}
