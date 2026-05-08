import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, Sun, X } from 'lucide-react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const getDashboardLink = () => {
    if (!user) return '/login'
    return `/${user.role}`
  }

  const NavLinks = ({ mobile = false }) => (
    <div className={`nav-links ${mobile ? 'active' : ''}`}>
      <Link to="/" className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>Home</Link>
      <Link to="#" className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>About</Link>
      <Link to="#" className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>Program</Link>
      <Link to="#" className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>Five Pillars</Link>
      <Link to="#" className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>Campus</Link>
      
      {user ? (
        <>
          <Link to={getDashboardLink()} className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>Dashboard</Link>
          <button onClick={handleLogout} className="btn-logout-icon" title="Logout">
            <LogOut size={18} />
          </button>
        </>
      ) : (
        <Link to="/login" className="nav-link-item" onClick={() => mobile && setIsMenuOpen(false)}>Login</Link>
      )}
    </div>
  );

  return (
    <>
      {/* Dark Overlay when menu is open */}
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.5)', 
          zIndex: 999, 
          opacity: isMenuOpen ? 1 : 0,
          visibility: isMenuOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease, visibility 0.3s ease'
        }} 
        onClick={() => setIsMenuOpen(false)} 
      />

      <nav className="navbar">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="navbar-brand">
            <img src="/ltc.png" alt="LTC Logo" style={{ height: '40px' }} />
          </div>
        </Link>

        {/* Desktop Links */}
        {!isMobile && <NavLinks />}

        <div className="menu-icon" style={{ zIndex: 2001, position: 'relative' }} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} color="#ffffff" /> : <Menu size={24} color="#0f172a" />}
        </div>
      </nav>

      {/* Mobile Links */}
      {isMobile && isMenuOpen && <NavLinks mobile={true} />}
    </>
  )
}
