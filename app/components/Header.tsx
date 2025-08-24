import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons'
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useState } from 'react'
import styles from '../styles/Header.module.css'

interface SelectedIndex {
  selectedIndex: number
}

const Header = ({ selectedIndex }: SelectedIndex) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
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
            <Link href='/auth'>
              <span className="px-3 py-1 mr-5 bg-blue-500 rounded-md cursor-pointer"><b>Log in</b></span>
            </Link>
            <a href='https://github.com/SERG-UFPI/healthyEnv' className={styles.icon}>
              <FontAwesomeIcon icon={faGithub} />
            </a>
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
            <Link href='/auth' onClick={() => setIsMobileMenuOpen(false)}>
              <span className={styles.mobileLoginButton}>Log in</span>
            </Link>
            <a href='https://github.com/SERG-UFPI/healthyEnv' className={styles.mobileIcon}>
              <FontAwesomeIcon icon={faGithub} /> GitHub
            </a>
          </div>
        )}
      </div>
    </div >
  )
}

export default Header