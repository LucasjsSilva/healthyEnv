import styles from '../styles/Header.module.css'
import Link from 'next/link'
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket, faBars, faClose } from '@fortawesome/free-solid-svg-icons';
import AccountMenuButton from './AccountMenuButton';
import Router, { useRouter } from "next/router"

interface SelectedIndex {
  selectedIndex: number
}

export default function DashboardHeader({ selectedIndex }: SelectedIndex) {

  const [userInfo, setUserInfo] = useState({})
  const [showDrawer, setShowDrawer] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const router = useRouter()

  function getUserInfo() {
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem('userData')
        setUserInfo(JSON.parse(data))
        setIsLoggedIn(true)
      } catch (e) { }
    }
  }

  function logout() {
    localStorage.removeItem('userData')
    Router.push('/')
  }

  function verifyAuth() {
    const data = JSON.parse(localStorage.getItem('userData'))

    if (data == undefined) {
      return
    } else {
      if ((Date.now() - data['timestamp']) > 86400000) {
        return
      }
    }

    getUserInfo()
  }

  useEffect(() => {
    if (!router.isReady) return
    verifyAuth()
  }, [])

  const drawerClassName = showDrawer ? `${styles.drawer} ${styles.show}` : styles.drawer

  return (
    <div className={styles.header}>
      <div id="mySidenav" className={styles.sidenav} style={showDrawer ? { minWidth: '300px' } : { minWidth: '0px' }}>
        <a href="javascript:void(0)" className={styles.closebtn} onClick={() => setShowDrawer(!showDrawer)}>&times;</a>
        <Link href='/dashboard/datasets'>
            {selectedIndex == 1
              ? <span className={styles.navLink} style={{ color: '#111', fontWeight: 'bold' }}>Repository analysis</span>
              : <span className={styles.navLink}>Repository analysis</span>}
        </Link>
        <Link href='/dashboard/requests'>
            {selectedIndex == 2
              ? <span className={styles.navLink} style={{ color: '#111', fontWeight: 'bold' }}>Submit a repository</span>
              : <span className={styles.navLink}>Submit a repository</span>}
        </Link>
        {/* <Link href='/dashboard/help'>
          <a>
            {selectedIndex == 3
              ? <span className={styles.navLink} style={{ color: '#111', fontWeight: 'bold' }}>Help</span>
              : <span className={styles.navLink}>Help</span>}
          </a>
        </Link> */}
      </div>

      {/* <div className={styles.drawer} style={showDrawer ? { display: 'block' } : { display: 'none' }}>
        <div className={styles.drawerCloseButton}>
          <FontAwesomeIcon icon={faClose} />
        </div>
        Diegodiegodiego
      </div> */}
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
          <div className={styles.drawerButton} onClick={() => setShowDrawer(!showDrawer)}>
            <FontAwesomeIcon icon={faBars} />
          </div>
          <Link href='/'>
            <span className={styles.title}>HealthyEnv</span>
          </Link>
          <Link href='/dashboard/datasets'>
              {selectedIndex == 1
                ? <span className={styles.link} style={{ color: '#FFF', fontWeight: 'bold' }}>Repository analysis</span>
                : <span className={styles.link}>Repository analysis</span>}
          </Link>
          <Link href='/dashboard/requests'>
              {selectedIndex == 2
                ? <span className={styles.link} style={{ color: '#FFF', fontWeight: 'bold' }}>Submit a repository</span>
                : <span className={styles.link}>Submit a repository</span>}
          </Link>
          {/* <Link href='/dashboard/help'>
            <a>
              {selectedIndex == 3
                ? <span className={styles.link} style={{ color: '#FFF', fontWeight: 'bold' }}>Help</span>
                : <span className={styles.link}>Help</span>}
            </a>
          </Link> */}
        </div>
        {/* <div className={styles.authUserArea}>
          {userInfo['profilePicture'] && (
            <Image src={userInfo['profilePicture']} width={30} height={30} className={styles.userAvatar} alt='Profile picture' />
          )}
          <div className={styles.authUserInfo}>
            <span className={styles.userName}>{userInfo['name']}</span>
            <span className={styles.userEmail}>{userInfo['email']}</span>
          </div>
          <FontAwesomeIcon icon={faArrowRightFromBracket} style={{
            marginLeft: '10px',
            fontSize: 14,
            cursor: 'pointer',
          }} onClick={() => logout()} />
        </div> */}
        {isLoggedIn ? (
          <AccountMenuButton profilePicture={userInfo['profilePicture']} userName={userInfo['name']} userEmail={userInfo['email']} onLogout={logout} />
        ) : (
          <div onClick={() => Router.push(`/auth?next=${router.asPath}`)} className={`
              bg-blue-500 px-3 py-1 rounded-md cursor-pointer
            `}>Log in</div>
        )
        }
      </div>
    </div >
  );
}