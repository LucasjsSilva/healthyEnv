import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons'
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from '../styles/Header.module.css'
import AccountMenuButton from './AccountMenuButton'
import axios from 'axios'
import Constants from '../utils/constants'
import Router from 'next/router'

interface SelectedIndex {
  selectedIndex: number
}

const Header = ({ selectedIndex }: SelectedIndex) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState<any>(() => {
    // Initialize from sessionStorage synchronously to avoid flicker
    try {
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('userData')
        if (raw) return JSON.parse(raw)
      }
    } catch {}
    return undefined // unknown yet
  })

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  useEffect(() => {
    // If unknown, try server session
    if (authUser === undefined) {
      axios.get(`${Constants.baseUrl}/me`, { withCredentials: true })
        .then(res => {
          const user = (res.data && res.data.user) ? res.data.user : null
          if (user && (user.login || user.name)) {
            const u = {
              login: user.login,
              name: user.name,
              email: user.email,
              profilePicture: user.profilePicture || user.avatar_url,
              timestamp: Date.now(),
            }
            try { sessionStorage.setItem('userData', JSON.stringify(u)) } catch {}
            setAuthUser(u)
          } else {
            setAuthUser(null)
          }
        })
        .catch(() => { setAuthUser(null) })
    }
  }, [authUser])

  async function handleLogout() {
    try {
      await axios.post(`${Constants.baseUrl}/logout`, {}, { withCredentials: true })
    } catch {}
    try { sessionStorage.removeItem('userData') } catch {}
    setAuthUser(null)
    Router.push('/auth')
  }

  return (
    <div className={styles.header}>
      <div style={{
        marginLeft: 'auto',
        marginRight: 'auto',
        maxWidth: '1280px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
        }}>
          <Link href='/'>
            <span className={styles.title}>HealthyEnv</span>
          </Link>
          
          <div className={styles.desktopNavigation}>
            <Link href='/about' id="about-link">
                {selectedIndex == 4
                  ? <span className={styles.link} style={{ color: '#2590DA', fontWeight: 'bold' }}>About</span>
                  : <span className={styles.link}>About</span>}
            </Link>
            <Link href='/admin'>
                {selectedIndex == 5
                  ? <span className={styles.link} style={{ color: '#2590DA', fontWeight: 'bold' }}>Admin</span>
                  : <span className={styles.link}>Admin</span>}
            </Link>
          </div>
        </div>
        
        <div className={styles.options}>
          <div className={styles.desktopOptions}>
            {authUser === undefined ? null : authUser ? (
              <AccountMenuButton
                profilePicture={authUser.profilePicture}
                userName={authUser.name || authUser.login}
                userEmail={authUser.email || `${authUser.login}@users.noreply.github.com`}
                onLogout={handleLogout}
              />
            ) : (
              <Link href='/auth'>
                <span className="px-3 py-1 mr-5 bg-blue-500 rounded-md cursor-pointer"><b>Log in</b></span>
              </Link>
            )}
            {/* <a href='https://github.com/SERG-UFPI/healthyEnv' className={styles.icon}>
              <FontAwesomeIcon icon={faGithub} />
            </a> */}
          </div>
          
          <button 
            className={styles.mobileMenuButton}
            onClick={toggleMobileMenu}
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} />
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <Link href='/about' onClick={() => setIsMobileMenuOpen(false)}>
              <span className={styles.mobileLink}>About</span>
            </Link>
            <Link href='/admin' onClick={() => setIsMobileMenuOpen(false)}>
              <span className={styles.mobileLink}>Admin</span>
            </Link>
            {authUser === undefined ? null : authUser ? (
              <>
                <Link href={`/dashboard/requests/${authUser.email || `${authUser.login}@users.noreply.github.com`}`} onClick={() => setIsMobileMenuOpen(false)}>
                  <span className={styles.mobileLink}>My submissions</span>
                </Link>
                <button className={styles.mobileLoginButton} onClick={() => { setIsMobileMenuOpen(false); handleLogout() }}>Logout</button>
              </>
            ) : (
              <Link href='/auth' onClick={() => setIsMobileMenuOpen(false)}>
                <span className={styles.mobileLoginButton}>Log in</span>
              </Link>
            )}
            {/* <a href='https://github.com/SERG-UFPI/healthyEnv' className={styles.mobileIcon}>
              <FontAwesomeIcon icon={faGithub} /> GitHub
            </a> */}
          </div>
        )}
      </div>
    </div >
  )
}

export default Header