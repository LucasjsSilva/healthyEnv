import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import Link from 'next/link'
import styles from '../styles/Header.module.css'

interface SelectedIndex {
  selectedIndex: number
}

const Header = ({ selectedIndex }: SelectedIndex) => {
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
          {/* <Link href='/how-it-works'>
              {selectedIndex == 1
                ? <span className={styles.link} style={{ color: '#2590DA', fontWeight: 'bold' }}>How it works</span>
                : <span className={styles.link}>How it works</span>}
          </Link>
          <Link href='/api-docs'>
              {selectedIndex == 2
                ? <span className={styles.link} style={{ color: '#2590DA', fontWeight: 'bold' }}>API</span>
                : <span className={styles.link}>API</span>}
          </Link>
          <Link href='/docs'>
              {selectedIndex == 3
                ? <span className={styles.link} style={{ color: '#2590DA', fontWeight: 'bold' }}>Docs</span>
                : <span className={styles.link}>Docs</span>}
          </Link> */}
          <Link href='/about'>
              {selectedIndex == 4
                ? <span className={styles.link} style={{ color: '#2590DA', fontWeight: 'bold' }}>About</span>
                : <span className={styles.link}>About</span>}
          </Link>
        </div>
        <div className={styles.options}>
          <Link href='/auth'>
            <span className="px-3 py-1 mr-5 bg-blue-500 rounded-md cursor-pointer"><b>Log in</b></span>
          </Link>
          <a href='https://github.com/SERG-UFPI/healthyEnv' className={styles.icon}>
            <FontAwesomeIcon icon={faGithub} />
          </a>
        </div>
      </div>
    </div >
  )
}

export default Header