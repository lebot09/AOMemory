import { Link, NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
import './layout.css'

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="site-header__home"><Brand /></Link>
        <nav aria-label="Main">
          <NavLink to="/play">Play</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1}><Outlet /></main>
    </>
  )
}
