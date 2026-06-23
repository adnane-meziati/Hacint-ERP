import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import hacintLogo from './assets/hacint-logo.png'
import {
  exportCsvUrl, fetchCsrf, getMe, getProjects, getSamples,
  login, logout, verifyOtp, resendOtp, changePassword, forgotPassword, resetPassword,
} from './api/client'
import AdminUsersPage from './components/production/AdminUsersPage'
import TechnicalStudyPage from './components/production/TechnicalStudyPage'
import AssemblyPage from './components/production/AssemblyPage'
import CncPage from './components/production/CncPage'
import DesignerPage from './components/production/DesignerPage'
import ProgrammerPage from './components/production/ProgrammerPage'
import QualityPage from './components/production/QualityPage'
import DetailModal from './components/production/DetailModal'
import SampleTable from './components/production/SampleTable'
import { StatCard } from './components/production/_shared'
import Topbar from './components/production/Topbar'
import Sidebar from './components/Sidebar'
import StoragePage from './components/storage/StoragePage'
import AccountingPage from './components/accounting/AccountingPage'
import HRPage from './components/hr/HrPage'
import LogisticsPage from './components/logistics/LogisticsPage'
import SalesPage from './components/sales/SalesPage'
import InstallationPage from './components/installation/InstallationPage'
import ProcurementPage from './components/procurement/ProcurementPage'
import ProductionFlowPage from './components/production/ProductionFlowPage'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'pending',  label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'archived', label: 'Archivé' },
]

// Admin production tabs (no storage — that's in the sidebar)
const PROD_TABS_ADMIN = [
  { id: 'technical-study', label: '🔬 Étude Technique' },
  { id: 'dashboard',  label: 'Échantillons' },
  { id: 'designer',   label: 'Vue Designer' },
  { id: 'programmer', label: 'Vue Programmateur' },
  { id: 'cnc',        label: 'Vue CNC' },
  { id: 'assembly',   label: 'Vue Assembly' },
  { id: 'quality',    label: 'Vue Qualité' },
]

// Storage section tabs
const STORAGE_TABS = [
  { id: 'stock',         label: 'Stock' },
  { id: 'articles',      label: 'Articles' },
  { id: 'mouvements',    label: 'Mouvements' },
  { id: 'lots',          label: 'Lots' },
  { id: 'entrepots',     label: 'Entrepôts' },
  { id: 'placements',    label: 'Placements' },
  { id: 'categories',    label: 'Catégories' },
  { id: 'tickets',       label: 'Tickets' },
  { id: 'bom-materiaux', label: 'BOM Matériaux' },
]

// Accounting section tabs
const ACCOUNTING_TABS = [
  { id: 'dashboard',   label: 'Tableau de bord' },
  { id: 'devis',       label: 'Devis' },
  { id: 'factures',    label: 'Factures' },
  { id: 'avoirs',      label: 'Avoirs' },
  { id: 'achats',      label: 'Achats' },
  { id: 'demandes',   label: 'Demandes d\'achat' },
  { id: 'paiements',   label: 'Paiements' },
  { id: 'tva',         label: 'TVA' },
  { id: 'ecritures',   label: 'Écritures' },
  { id: 'grand-livre', label: 'Grand livre' },
  { id: 'balance',     label: 'Balance & États' },
  { id: 'pcge',        label: 'Plan comptable' },
  { id: 'tiers',       label: 'Clients & Fournisseurs' },
  { id: 'actifs',      label: 'Durée de vie des actifs' },
  { id: 'parametres',  label: '⚙ Paramètres' },
]

// HR section tabs
const HR_TABS = [
  { id: 'tableau-de-bord', label: 'Tableau de bord' },
  { id: 'employes',        label: 'Employés' },
  { id: 'conges',          label: 'Congés' },
  { id: 'pointage',        label: 'Pointage' },
  { id: 'contrats',        label: 'Contrats' },
  { id: 'paie',            label: 'Paie' },
  { id: 'recrutement',     label: 'Recrutement' },
]

// Logistics section tabs
const LOGISTICS_TABS = [
  { id: 'tableau-de-bord', label: 'Tableau de bord' },
  { id: 'livraisons',      label: 'Livraisons' },
  { id: 'expeditions',     label: 'Expéditions' },
  { id: 'vehicules',       label: 'Véhicules' },
  { id: 'chauffeurs',      label: 'Chauffeurs' },
  { id: 'transferts',      label: 'Transferts' },
  { id: 'taches',          label: 'Tâches' },
  { id: 'rapports',        label: 'Rapports' },
  { id: 'notifications',   label: 'Notifications' },
]

// ─── Shared app header row (logo + section + user + logout) ──────────────────

const SECTION_CHIPS = {
  production:   { label: 'Production',    cls: 'bg-blue-100 text-blue-700' },
  storage:      { label: 'Stockage',      cls: 'bg-orange-100 text-orange-700' },
  accounting:   { label: 'Comptabilité',  cls: 'bg-emerald-100 text-emerald-700' },
  hr:           { label: 'RH',            cls: 'bg-purple-100 text-purple-700' },
  logistics:    { label: 'Logistique',    cls: 'bg-teal-100 text-teal-700' },
  sales:        { label: 'Ventes',        cls: 'bg-rose-100 text-rose-700' },
  installation: { label: 'Installation',  cls: 'bg-indigo-100 text-indigo-700' },
  users:        { label: 'Utilisateurs',  cls: 'bg-slate-100 text-slate-700' },
}

function AppHeader({ user, onLogout, section, showDrawer = false, onDrawerToggle = () => {} }) {
  const { t, i18n } = useTranslation()
  const chip = section ? SECTION_CHIPS[section] : null
  const currentLang = i18n.language
  const toggleLanguage = () => {
    const newLang = currentLang === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <div className="h-12 flex items-center justify-between px-3 sm:px-6">
      {/* Hamburger (mobile only) + Logo + section chip */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {showDrawer && (
          <button
            onClick={onDrawerToggle}
            className="inline-flex sm:hidden text-slate-500 hover:text-slate-700 transition-colors p-1 rounded"
            aria-label={t('app.openMenu')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <img src={hacintLogo} alt={t('app.logoAlt')} className="h-6 sm:h-7 w-auto" />
        {chip && (
          <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${chip.cls}`}>
            {chip.label}
          </span>
        )}
      </div>

      {/* User + language toggle + logout */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={toggleLanguage}
          className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-colors px-1.5 py-0.5 rounded border border-slate-200"
          aria-label={t('app.toggleLanguage')}
        >
          {currentLang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button
          onClick={onLogout}
          className="text-xs sm:text-sm text-slate-500 hover:text-red-600 transition-colors font-medium whitespace-nowrap"
        >
          {t('app.logout')}
        </button>
      </div>
    </div>
  )
}

// ─── Production tab bar (admin sidebar layout) ────────────────────────────────

function ProductionTabBar({ page, onPageChange }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'technical-study', label: t('app.tabs.technicalStudy') },
    { id: 'dashboard',       label: t('app.tabs.dashboard') },
    { id: 'designer',        label: t('app.tabs.designer') },
    { id: 'programmer',      label: t('app.tabs.programmer') },
    { id: 'cnc',             label: t('app.tabs.cnc') },
    { id: 'assembly',        label: t('app.tabs.assembly') },
    { id: 'quality',         label: t('app.tabs.quality') },
  ]
  return (
    <nav
      className="flex border-t border-slate-100 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map(tab => (
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
  )
}

// ─── Storage tab bar ──────────────────────────────────────────────────────────

function StorageTabBar({ storageTab, onTabChange }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'stock',         label: t('app.tabs.stock') },
    { id: 'articles',      label: t('app.tabs.articles') },
    { id: 'mouvements',    label: t('app.tabs.mouvements') },
    { id: 'lots',          label: t('app.tabs.lots') },
    { id: 'entrepots',     label: t('app.tabs.entrepots') },
    { id: 'placements',    label: t('app.tabs.placements') },
    { id: 'categories',    label: t('app.tabs.categories') },
    { id: 'tickets',       label: t('app.tabs.tickets') },
    { id: 'bom-materiaux', label: t('app.tabs.bom-materiaux') },
  ]
  return (
    <nav
      className="flex border-t border-slate-100 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            storageTab === tab.id
              ? 'border-orange-500 text-orange-600 bg-orange-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

// ─── Accounting tab bar ───────────────────────────────────────────────────────

function AccountingTabBar({ accountingTab, onTabChange }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'dashboard',   label: t('app.tabs.accountingDashboard') },
    { id: 'devis',       label: t('app.tabs.devis') },
    { id: 'factures',    label: t('app.tabs.factures') },
    { id: 'avoirs',      label: t('app.tabs.avoirs') },
    { id: 'achats',      label: t('app.tabs.achats') },
    { id: 'demandes',    label: "Demandes d'achat" },
    { id: 'paiements',   label: t('app.tabs.paiements') },
    { id: 'tva',         label: t('app.tabs.tva') },
    { id: 'ecritures',   label: t('app.tabs.ecritures') },
    { id: 'grand-livre', label: t('app.tabs.grandLivre') },
    { id: 'balance',     label: t('app.tabs.balance') },
    { id: 'pcge',        label: t('app.tabs.pcge') },
    { id: 'tiers',       label: t('app.tabs.tiers') },
    { id: 'actifs',      label: t('app.tabs.actifs') },
    { id: 'parametres',  label: t('app.tabs.parametres') },
  ]
  return (
    <nav
      className="flex border-t border-slate-100 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            accountingTab === tab.id
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

// ─── HR tab bar ───────────────────────────────────────────────────────────────

function HrTabBar({ hrTab, onTabChange }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'tableau-de-bord', label: t('app.tabs.hrTableauDeBord') },
    { id: 'employes',        label: t('app.tabs.employes') },
    { id: 'conges',          label: t('app.tabs.conges') },
    { id: 'pointage',        label: t('app.tabs.pointage') },
    { id: 'contrats',        label: t('app.tabs.contrats') },
    { id: 'paie',            label: t('app.tabs.paie') },
    { id: 'recrutement',     label: t('app.tabs.recrutement') },
  ]
  return (
    <nav
      className="flex border-t border-slate-100 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            hrTab === tab.id
              ? 'border-purple-500 text-purple-600 bg-purple-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

// ─── Logistics tab bar ─────────────────────────────────────────────────────────

function LogisticsTabBar({ logisticsTab, onTabChange }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'tableau-de-bord', label: t('app.tabs.logisticsTableauDeBord') },
    { id: 'livraisons',      label: t('app.tabs.livraisons') },
    { id: 'expeditions',     label: t('app.tabs.expeditions') },
    { id: 'vehicules',       label: t('app.tabs.vehicules') },
    { id: 'chauffeurs',      label: t('app.tabs.chauffeurs') },
    { id: 'transferts',      label: t('app.tabs.transferts') },
    { id: 'taches',          label: t('app.tabs.taches') },
    { id: 'rapports',        label: t('app.tabs.rapports') },
    { id: 'notifications',   label: t('app.tabs.notifications') },
  ]
  return (
    <nav
      className="flex border-t border-slate-100 overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            logisticsTab === tab.id
              ? 'border-teal-500 text-teal-600 bg-teal-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

// ─── Auth pages ───────────────────────────────────────────────────────────────

function AuthCard({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 w-full max-w-sm p-6 sm:p-8">
        <div className="text-center mb-8">
          <img src={hacintLogo} alt="Hacint" className="h-12 w-auto mx-auto mb-6" />
          <p className="text-sm text-slate-500">Gestion Industrielle</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function LoginPage({ onLogin }) {
  // stage: 'login' | 'otp' | 'forgot' | 'forgot_otp' | 'reset_password'
  const [stage, setStage] = useState('login')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Login stage
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // OTP stage (login)
  const [pendingUserId, setPendingUserId] = useState(null)
  const [emailHint, setEmailHint] = useState('')
  const [otpCode, setOtpCode] = useState('')

  // Forgot password stage
  const [forgotUsername, setForgotUsername] = useState('')
  const [resetUserId, setResetUserId] = useState(null)
  const [resetEmailHint, setResetEmailHint] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function startCooldown() {
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // ── Stage: login ─────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await login(username, password)
      if (res.requires_otp) {
        setPendingUserId(res.user_id)
        setEmailHint(res.email_hint)
        setOtpCode('')
        setStage('otp')
        startCooldown()
      } else {
        onLogin(res)
      }
    } catch (err) {
      const msg = err?.response?.data?.error
      if (msg) {
        setError(msg)
      } else if (err?.response?.status === 400) {
        setError('Identifiants incorrects. Veuillez réessayer.')
      } else {
        setError('Erreur serveur. Veuillez réessayer ou contacter l\'administrateur.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Stage: OTP (login) ───────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const user = await verifyOtp(pendingUserId, otpCode)
      onLogin(user)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Code invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return
    setError(null)
    try {
      await resendOtp(pendingUserId, 'login')
      startCooldown()
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Erreur lors du renvoi.')
    }
  }

  // ── Stage: forgot password ───────────────────────────────────────────────
  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await forgotPassword(forgotUsername)
      if (res.user_id) {
        setResetUserId(res.user_id)
        setResetEmailHint(res.email_hint)
        setResetCode('')
        setStage('forgot_otp')
        startCooldown()
      } else {
        // User not found — still show OTP screen (don't reveal)
        setError("Si ce compte existe, un code a été envoyé à l'adresse email associée.")
      }
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendReset() {
    if (resendCooldown > 0) return
    setError(null)
    try {
      await resendOtp(resetUserId, 'reset')
      startCooldown()
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Erreur lors du renvoi.')
    }
  }

  function handleVerifyResetCode(e) {
    e.preventDefault()
    if (!resetCode.trim()) { setError('Veuillez entrer le code.'); return }
    setError(null)
    setStage('reset_password')
  }

  // ── Stage: reset password ────────────────────────────────────────────────
  async function handleResetPassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true); setError(null)
    try {
      await resetPassword(resetUserId, resetCode, newPassword)
      setStage('login')
      setError(null)
      // show success message via error slot (green)
      setTimeout(() => setError('__success__Mot de passe réinitialisé. Vous pouvez vous connecter.'), 0)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Code invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  const isSuccess = error?.startsWith('__success__')
  const displayError = isSuccess ? error.slice(11) : error

  function ErrorMsg() {
    if (!error) return null
    return (
      <p className={`text-sm rounded-lg p-2.5 border ${
        isSuccess
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-red-600 bg-red-50 border-red-200'
      }`}>{displayError}</p>
    )
  }

  // ── Render stages ────────────────────────────────────────────────────────

  if (stage === 'login') {
    return (
      <AuthCard>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Email / Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="utilisateur@hacint.com"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          <ErrorMsg />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setStage('forgot'); setError(null) }}
              className="text-sm text-blue-600 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
        </form>
      </AuthCard>
    )
  }

  if (stage === 'otp') {
    return (
      <AuthCard>
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-semibold text-slate-800 mb-1">Code de vérification</h2>
          <p className="text-sm text-slate-500">
            Un code à 6 chiffres a été envoyé à<br />
            <span className="font-medium text-slate-700">{emailHint}</span>
          </p>
        </div>
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="label">Code de vérification</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="input text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="000000"
              autoFocus
            />
          </div>
          <ErrorMsg />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading || otpCode.length < 6}>
            {loading ? 'Vérification…' : 'Vérifier'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStage('login'); setError(null) }} className="text-slate-500 hover:text-slate-700">
              ← Retour
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              className={`text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline`}
            >
              {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
            </button>
          </div>
        </form>
      </AuthCard>
    )
  }

  if (stage === 'forgot') {
    return (
      <AuthCard>
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-1">Mot de passe oublié</h2>
          <p className="text-sm text-slate-500">Entrez votre nom d'utilisateur. Un code de réinitialisation sera envoyé à votre email.</p>
        </div>
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <label className="label">Email / Nom d'utilisateur</label>
            <input
              type="text"
              value={forgotUsername}
              onChange={(e) => setForgotUsername(e.target.value)}
              className="input"
              placeholder="utilisateur@hacint.com"
              autoFocus
            />
          </div>
          <ErrorMsg />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? 'Envoi…' : 'Envoyer le code'}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => { setStage('login'); setError(null) }} className="text-sm text-slate-500 hover:text-slate-700">
              ← Retour à la connexion
            </button>
          </div>
        </form>
      </AuthCard>
    )
  }

  if (stage === 'forgot_otp') {
    return (
      <AuthCard>
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="font-semibold text-slate-800 mb-1">Code de réinitialisation</h2>
          <p className="text-sm text-slate-500">
            Code envoyé à<br />
            <span className="font-medium text-slate-700">{resetEmailHint}</span>
          </p>
        </div>
        <form onSubmit={handleVerifyResetCode} className="space-y-4">
          <div>
            <label className="label">Code à 6 chiffres</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
              className="input text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="000000"
              autoFocus
            />
          </div>
          <ErrorMsg />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={resetCode.length < 6}>
            Confirmer
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStage('forgot'); setError(null) }} className="text-slate-500 hover:text-slate-700">
              ← Retour
            </button>
            <button
              type="button"
              onClick={handleResendReset}
              disabled={resendCooldown > 0}
              className="text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
            </button>
          </div>
        </form>
      </AuthCard>
    )
  }

  if (stage === 'reset_password') {
    return (
      <AuthCard>
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-1">Nouveau mot de passe</h2>
          <p className="text-sm text-slate-500">Choisissez un nouveau mot de passe sécurisé.</p>
        </div>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Au moins 6 caractères"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Répétez le mot de passe"
            />
          </div>
          <ErrorMsg />
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </AuthCard>
    )
  }

  return null
}

// ─── Forced password change (first login) ─────────────────────────────────────

function ChangePasswordPage({ user, onComplete }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true); setError(null)
    try {
      const updated = await changePassword(newPassword)
      onComplete(updated)
    } catch (err) {
      setError(err?.response?.data?.error ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const name = user?.firstName || user?.username || ''

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 w-full max-w-sm p-6 sm:p-8">
        <div className="text-center mb-8">
          <img src={hacintLogo} alt="Hacint" className="h-12 w-auto mx-auto mb-4" />
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="font-semibold text-slate-800 mb-1">Bienvenue{name ? `, ${name}` : ''} !</h2>
          <p className="text-sm text-slate-500">Créez votre mot de passe personnel pour sécuriser votre compte.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Au moins 6 caractères"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Répétez le mot de passe"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>
          )}
          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? 'Enregistrement…' : 'Créer mon mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // ── Production section state ──────────────────────────────────────────────
  const [page, setPage] = useState(() => sessionStorage.getItem('hacint_page') || 'dashboard')
  const [projectOptions, setProjectOptions] = useState([])
  const [samples, setSamples] = useState([])
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null, page: 1 })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [modal, setModal] = useState(null)
  const [selectedSample, setSelectedSample] = useState(null)
  const searchDebounce = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Admin sidebar + storage section state ─────────────────────────────────
  const [section, setSection] = useState(
    () => sessionStorage.getItem('hacint_section') || 'production'
  )
  const [storageTab, setStorageTab] = useState(
    () => sessionStorage.getItem('hacint_storage_tab') || 'stock'
  )
  const [accountingTab, setAccountingTab] = useState(
    () => sessionStorage.getItem('hacint_accounting_tab') || 'dashboard'
  )
  const [hrTab, setHrTab] = useState(
    () => sessionStorage.getItem('hacint_hr_tab') || 'tableau-de-bord'
  )
  const [logisticsTab, setLogisticsTab] = useState(
    () => sessionStorage.getItem('hacint_logistics_tab') || 'tableau-de-bord'
  )
  const [installationTab, setInstallationTab] = useState(
    () => sessionStorage.getItem('hacint_installation_tab') || 'dashboard'
  )
  const [managerTab, setManagerTab] = useState('module')

  // ── Helpers ───────────────────────────────────────────────────────────────

  function landingPage(role) {
    if (role === 'storage')          return null               // goes to storage layout
    if (role === 'accounting')       return null               // goes to accounting layout
    if (role === 'sales_manager')    return null               // goes to sales layout
    if (role === 'sales_employee')   return null               // goes to sales layout
    if (role === 'etude_technique')  return 'technical-study'
    if (role === 'designer')         return 'designer'
    if (role === 'programmer')       return 'programmer'
    if (role === 'cnc')              return 'cnc'
    if (role === 'assembly')         return 'assembly'
    if (role === 'quality')          return 'quality'
    return 'dashboard'
  }

  function getAccessiblePages(role) {
    const tabs = [
      { id: 'technical-study', roles: ['admin', 'etude_technique'] },
      { id: 'dashboard',   roles: ['admin', 'designer'] },
      { id: 'designer',    roles: ['admin', 'designer'] },
      { id: 'programmer',  roles: ['admin', 'programmer'] },
      { id: 'cnc',         roles: ['admin', 'cnc'] },
      { id: 'assembly',    roles: ['admin', 'assembly'] },
      { id: 'quality',     roles: ['admin', 'quality'] },
    ]
    return tabs.filter(t => t.roles.includes(role)).map(t => t.id)
  }

  function changePage(p) {
    setPage(p)
    sessionStorage.setItem('hacint_page', p)
  }

  function changeSection(s) {
    setSection(s)
    sessionStorage.setItem('hacint_section', s)
  }

  function changeStorageTab(t) {
    setStorageTab(t)
    sessionStorage.setItem('hacint_storage_tab', t)
  }

  function changeAccountingTab(t) {
    setAccountingTab(t)
    sessionStorage.setItem('hacint_accounting_tab', t)
  }

  function changeHrTab(t) {
    setHrTab(t)
    sessionStorage.setItem('hacint_hr_tab', t)
  }

  function changeLogisticsTab(t) {
    setLogisticsTab(t)
    sessionStorage.setItem('hacint_logistics_tab', t)
  }

  function changeInstallationTab(t) {
    setInstallationTab(t)
    sessionStorage.setItem('hacint_installation_tab', t)
  }

  // ── Auth check on mount ───────────────────────────────────────────────────

  useEffect(() => {
    fetchCsrf()
      .then(() => getMe())
      .then((u) => {
        setUser(u)
        const isSalesRole = u.role === 'sales_manager' || u.role === 'sales_employee'
        if (u.role !== 'storage' && u.role !== 'accounting' && !isSalesRole) {
          const storedPage = sessionStorage.getItem('hacint_page')
          const accessible = getAccessiblePages(u.role)
          const startPage = (storedPage && accessible.includes(storedPage))
            ? storedPage
            : (landingPage(u.role) || 'dashboard')
          changePage(startPage)
        }
        return getProjects()
      })
      .then(setProjectOptions)
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounce search ───────────────────────────────────────────────────────

  useEffect(() => {
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(searchDebounce.current)
  }, [search])

  // ── Sample data fetching (production dashboard) ───────────────────────────

  const fetchSamples = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, approved_only: 'true' }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterProject)   params.project = filterProject
      if (filterStatus)    params.status = filterStatus
      if (filterDateFrom)  params.date_from = filterDateFrom
      if (filterDateTo)    params.date_to = filterDateTo
      const data = await getSamples(params)
      setSamples(data.results)
      setPagination({ count: data.count, next: data.next, previous: data.previous, page: p })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filterProject, filterStatus, filterDateFrom, filterDateTo])

  useEffect(() => {
    const isSalesRole = user?.role === 'sales_manager' || user?.role === 'sales_employee'
    if (user && user.role !== 'storage' && user.role !== 'accounting' && !isSalesRole) fetchSamples(1)
  }, [user, fetchSamples, page])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleLogout() {
    await logout()
    setUser(null)
  }

  function openDetail(s) { setSelectedSample(s); setModal('detail') }

  function buildExportUrl() {
    const params = {}
    if (debouncedSearch) params.search = debouncedSearch
    if (filterProject)   params.project = filterProject
    if (filterStatus)    params.status = filterStatus
    if (filterDateFrom)  params.date_from = filterDateFrom
    if (filterDateTo)    params.date_to = filterDateTo
    return exportCsvUrl(params)
  }

  // ── Early returns ─────────────────────────────────────────────────────────

  if (!authChecked) return null

  if (!user) {
    return (
      <LoginPage
        onLogin={(u) => {
          setUser(u)
          const isSalesRole = u.role === 'sales_manager' || u.role === 'sales_employee'
          if (u.role !== 'storage' && u.role !== 'accounting' && !isSalesRole) {
            changePage(landingPage(u.role) || 'dashboard')
          }
        }}
      />
    )
  }

  if (user.must_change_password) {
    return (
      <ChangePasswordPage
        user={user}
        onComplete={(updated) => setUser(updated)}
      />
    )
  }

  // ── Shared modals (production section) ───────────────────────────────────

  const modals = (
    <>
      {modal === 'detail' && selectedSample && (
        <DetailModal
          sampleId={selectedSample.id}
          onClose={() => { setModal(null); setSelectedSample(null) }}
        />
      )}
    </>
  )

  // ── Production page content (shared by admin + production roles) ──────────

  const totalPages = Math.ceil(pagination.count / 20)

  const productionContent = (
    <>
      {page === 'technical-study' && <TechnicalStudyPage currentUser={user} />}
      {page === 'designer'   && <DesignerPage currentUser={user} />}
      {page === 'programmer' && <ProgrammerPage currentUser={user} />}
      {page === 'cnc'        && <CncPage currentUser={user} />}
      {page === 'assembly'   && <AssemblyPage currentUser={user} />}
      {page === 'quality'    && <QualityPage currentUser={user} />}
      {page === 'users'      && <AdminUsersPage currentUser={user} />}

      {page === 'dashboard' && (
        <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 space-y-3">
            {/* Row 1: search + actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher… (APN, #série, projet, placement, client)"
                className="input flex-1 min-w-0"
              />
              <div className="flex flex-wrap gap-2 shrink-0">
                <a href={buildExportUrl()} className="btn-success whitespace-nowrap" download>
                  Exporter CSV
                </a>
              </div>
            </div>

            {/* Row 2: filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="input w-auto max-w-[160px]"
              >
                <option value="">Tous les projets</option>
                {projectOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input w-auto"
              >
                <option value="">Tous les statuts</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-sm text-slate-500">
                <span className="shrink-0">Du</span>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="input w-auto"
                />
                <span className="shrink-0">au</span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="input w-auto"
                />
              </div>

              {(filterProject || filterStatus || filterDateFrom || filterDateTo || search) && (
                <button
                  onClick={() => {
                    setSearch(''); setFilterProject(''); setFilterStatus('')
                    setFilterDateFrom(''); setFilterDateTo('')
                  }}
                  className="btn-secondary text-xs"
                >
                  ✕ Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Échantillons (total)" value={pagination.count} color="text-blue-700" />
              <StatCard label="Projets distincts" value={new Set(samples.map(s => s.project)).size} color="text-slate-700" note="page courante" />
              <StatCard label="Quantité totale" value={samples.reduce((n, s) => n + (s.quantity ?? 1), 0)} color="text-emerald-700" note="page courante" />
              <StatCard label="Connecteurs complets" value={samples.filter(s => s.connector_fill === 'full').length} color="text-orange-600" note="page courante" />
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-slate-500">
                {pagination.count} échantillon{pagination.count !== 1 ? 's' : ''}
              </p>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ✓ Projets approuvés uniquement
              </span>
            </div>

            <SampleTable
              samples={samples}
              loading={loading}
              onRowClick={openDetail}
            />

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} sur {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchSamples(pagination.page - 1)}
                    disabled={!pagination.previous}
                    className="btn-secondary disabled:opacity-40"
                  >
                    ← Préc.
                  </button>
                  <button
                    onClick={() => fetchSamples(pagination.page + 1)}
                    disabled={!pagination.next}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Suiv. →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </>
  )

  // ── ADMIN LAYOUT — sidebar + section topbars ──────────────────────────────
  if (user.role === 'admin') {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        {/* ── Sticky header: logo/logout row + section tab bar ── */}
        <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-30">
          <AppHeader
            user={user}
            onLogout={handleLogout}
            section={section}
            showDrawer={true}
            onDrawerToggle={() => setDrawerOpen(o => !o)}
          />
          {section === 'production' && (
            <ProductionTabBar page={page} onPageChange={changePage} />
          )}
          {section === 'storage' && (
            <StorageTabBar storageTab={storageTab} onTabChange={changeStorageTab} />
          )}
          {section === 'accounting' && (
            <AccountingTabBar accountingTab={accountingTab} onTabChange={changeAccountingTab} />
          )}
          {section === 'hr' && (
            <HrTabBar hrTab={hrTab} onTabChange={changeHrTab} />
          )}
          {section === 'logistics' && (
            <LogisticsTabBar logisticsTab={logisticsTab} onTabChange={changeLogisticsTab} />
          )}
        </header>

        {/* ── Sidebar + scrollable main content ── */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile drawer backdrop */}
          {drawerOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/40 sm:hidden"
              onClick={() => setDrawerOpen(false)}
            />
          )}
          {/* Mobile sidebar drawer */}
          <div className={`fixed left-0 top-0 bottom-0 z-30 sm:hidden transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar section={section} onSectionChange={(s) => { changeSection(s); setDrawerOpen(false) }} />
          </div>
          {/* Permanent sidebar (sm+) */}
          <div className="hidden sm:block flex-shrink-0">
            <Sidebar section={section} onSectionChange={changeSection} />
          </div>

          <main className="flex-1 overflow-y-auto">
            {section === 'production' && productionContent}
            {section === 'storage' && (
              <StoragePage tab={storageTab} currentUser={user} />
            )}
            {section === 'accounting' && (
              <AccountingPage tab={accountingTab} currentUser={user} />
            )}
            {section === 'hr' && (
              <HRPage tab={hrTab} currentUser={user} />
            )}
            {section === 'logistics' && (
              <LogisticsPage
                tab={logisticsTab}
                currentUser={user}
                onTabChange={changeLogisticsTab}
              />
            )}
            {section === 'sales' && (
              <SalesPage currentUser={user} />
            )}
            {section === 'installation' && (
              <InstallationPage installationTab={installationTab} onTabChange={changeInstallationTab} currentUser={user} />
            )}
            {section === 'users' && (
              <AdminUsersPage currentUser={user} />
            )}
          </main>
        </div>

        {modals}
      </div>
    )
  }

  // ── SALES ROLES — header + sales page, no sidebar ─────────────────────────
  if (user.role === 'sales_manager' || user.role === 'sales_employee') {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
          <AppHeader user={user} onLogout={handleLogout} section="sales" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <SalesPage currentUser={user} />
        </main>
      </div>
    )
  }

  // ── STORAGE ROLE — header + storage tab bar, no sidebar ───────────────────
  if (user.role === 'storage') {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
          <AppHeader user={user} onLogout={handleLogout} section="storage" />
          <StorageTabBar storageTab={storageTab} onTabChange={changeStorageTab} />
        </header>
        <main className="flex-1 overflow-y-auto">
          <StoragePage tab={storageTab} currentUser={user} />
        </main>
      </div>
    )
  }

  // ── ACCOUNTING ROLE — header + accounting tab bar, no sidebar ─────────────
  if (user.role === 'accounting') {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
          <AppHeader user={user} onLogout={handleLogout} section="accounting" />
          <AccountingTabBar accountingTab={accountingTab} onTabChange={changeAccountingTab} />
        </header>
        <main className="flex-1 overflow-y-auto">
          <AccountingPage tab={accountingTab} currentUser={user} />
        </main>
      </div>
    )
  }

  // ── MANAGER ROLES — module page + procurement tab ────────────────────────
  const MANAGER_MODULE_PAGE = {
    production_manager:   <>{productionContent}</>,
    storage_manager:      <StoragePage tab={storageTab} currentUser={user} />,
    hr_manager:           <HRPage tab={hrTab} currentUser={user} />,
    logistics_manager:    <LogisticsPage tab={logisticsTab} currentUser={user} onTabChange={changeLogisticsTab} />,
    installation_manager: <InstallationPage installationTab={installationTab} onTabChange={changeInstallationTab} currentUser={user} />,
    accounting_manager:   <AccountingPage tab={accountingTab} currentUser={user} />,
    sales_manager:        <SalesPage currentUser={user} />,
  }

  if (MANAGER_MODULE_PAGE[user.role] !== undefined) {
    const SECTION_LABEL = {
      production_manager:   'Production',
      storage_manager:      'Stockage',
      hr_manager:           'RH',
      logistics_manager:    'Logistique',
      installation_manager: 'Installation',
      accounting_manager:   'Comptabilité',
      sales_manager:        'Ventes',
    }
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
          <AppHeader user={user} onLogout={handleLogout} section={user.role.replace('_manager', '')} />
          {/* Manager tab bar */}
          <nav className="flex border-t border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'module',      label: SECTION_LABEL[user.role] },
              ...(user.role === 'production_manager' ? [{ id: 'flow', label: '📊 Flux de Production' }] : []),
              { id: 'procurement', label: '🛒 Demandes d\'achat' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setManagerTab(t.id)}
                className={`flex-shrink-0 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  managerTab === t.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {/* Module sub-tab bar — gives the responsable full navigation within their module */}
          {managerTab === 'module' && user.role === 'production_manager' && (
            <ProductionTabBar page={page} onPageChange={changePage} />
          )}
          {managerTab === 'module' && user.role === 'storage_manager' && (
            <StorageTabBar storageTab={storageTab} onTabChange={changeStorageTab} />
          )}
          {managerTab === 'module' && user.role === 'accounting_manager' && (
            <AccountingTabBar accountingTab={accountingTab} onTabChange={changeAccountingTab} />
          )}
          {managerTab === 'module' && user.role === 'hr_manager' && (
            <HrTabBar hrTab={hrTab} onTabChange={changeHrTab} />
          )}
          {managerTab === 'module' && user.role === 'logistics_manager' && (
            <LogisticsTabBar logisticsTab={logisticsTab} onTabChange={changeLogisticsTab} />
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          {managerTab === 'module'      && MANAGER_MODULE_PAGE[user.role]}
          {managerTab === 'flow'        && <ProductionFlowPage currentUser={user} />}
          {managerTab === 'procurement' && <ProcurementPage currentUser={user} />}
        </main>
      </div>
    )
  }

  // ── PRODUCTION ROLES (designer / programmer / cnc / assembly / quality) ───
  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar user={user} onLogout={handleLogout} page={page} onPageChange={changePage} />
      {productionContent}
      {modals}
    </div>
  )
}
