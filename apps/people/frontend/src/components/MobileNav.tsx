import { NavLink } from 'react-router-dom'
import { LayoutGrid, History, Shield, Compass, Map } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import './MobileNav.css'

/**
 * Barra de navegação inferior estilo app — renderiza SOMENTE no mobile
 * (controlado por CSS media query em MobileNav.css). Não afeta o desktop:
 * o elemento existe no DOM mas fica `display:none` acima de 768px.
 */
export default function MobileNav() {
  const { user } = useAuth()
  const t = useT()

  const item = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'mnav-item active' : 'mnav-item'

  return (
    <nav className="mnav" aria-label={t('nav.mainNav')}>
      <NavLink to="/" end className={item} data-tour="program" data-atlas-tour="people-program-mobile">
        <Compass size={22} /><span>{t('nav.program')}</span>
      </NavLink>
      <NavLink to="/rutas" className={item} data-tour="routes" data-atlas-tour="people-routes-mobile">
        <Map size={22} /><span>{t('nav.routes')}</span>
      </NavLink>
      <NavLink to="/simulacros" className={item} data-tour="practice" data-atlas-tour="people-practice-mobile">
        <LayoutGrid size={22} /><span>{t('nav.simulacros')}</span>
      </NavLink>
      <NavLink to="/historico" className={item} data-tour="history" data-atlas-tour="people-history-mobile">
        <History size={22} /><span>{t('nav.myHistory')}</span>
      </NavLink>
      {user?.is_admin && (
        <NavLink to="/admin" className={item} data-tour="admin" data-atlas-tour="people-admin-mobile">
          <Shield size={22} /><span>{t('nav.admin')}</span>
        </NavLink>
      )}
    </nav>
  )
}
