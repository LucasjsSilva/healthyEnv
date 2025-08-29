import styles from '../styles/Header.module.css'
import Link from 'next/link'
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket, faBars, faClose } from '@fortawesome/free-solid-svg-icons';
import AccountMenuButton from './AccountMenuButton';
import Router, { useRouter } from "next/router"
import axios from 'axios';
import Constants from '../utils/constants';

interface UserInfo {
  profilePicture?: string;
  name?: string;
  login?: string;
  email?: string;
  [key: string]: any;
}

interface SelectedIndex {
  selectedIndex: number;
}

export default function DashboardHeader({ selectedIndex }: SelectedIndex) {

  const [userInfo, setUserInfo] = useState<UserInfo>({})
  const [showDrawer, setShowDrawer] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const router = useRouter()

  function getUserInfo() {
    if (typeof window !== "undefined") {
      try {
        const data = sessionStorage.getItem('userData')
        if (data) {
          const userData: UserInfo = JSON.parse(data)
          setUserInfo(userData)
          setIsLoggedIn(true)
        }
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }

  async function logout() {
    try {
      // invalidate server session (HttpOnly cookie)
      await axios.post(`${Constants.baseUrl}/auth/logout`, {}, { withCredentials: true })
    } catch (e) { /* ignore */ }
    try { sessionStorage.removeItem('userData') } catch {}
    Router.push('/')
  }

  function verifyAuth() {
    let data: any = null
    try { data = JSON.parse(sessionStorage.getItem('userData') as any) } catch {}

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
        <Link href='/dashboard/submit'>
            {selectedIndex == 2
              ? <span className={styles.navLink} style={{ color: '#111', fontWeight: 'bold' }}>Submit repository</span>
              : <span className={styles.navLink}>Submit repository</span>}
        </Link>
        <Link href='/dashboard/submissions'>
            {selectedIndex == 3
              ? <span className={styles.navLink} style={{ color: '#111', fontWeight: 'bold' }}>My submissions</span>
              : <span className={styles.navLink}>My submissions</span>}
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
        <div className={styles.mobileMenu}>
          <div className={styles.menuButton} onClick={() => setShowDrawer(!showDrawer)}>
            <FontAwesomeIcon icon={faBars} style={{ fontSize: '20px' }} />
          </div>
          <div className={styles.logo}>
            <Link href='/dashboard/datasets'>
              <Image src="/logo.svg" alt="Logo" width={150} height={30} />
            </Link>
          </div>
          <div className={styles.accountMenu}>
            {isLoggedIn && userInfo && (
              <AccountMenuButton 
                profilePicture={userInfo?.profilePicture || ''}
                userName={userInfo?.name || userInfo?.login || 'User'}
                userEmail={userInfo?.email || ''}
                onLogout={logout}
              />
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
        }}>
          <Link href='/'>
            <span className={styles.title}>HealthyEnv</span>
          </Link>
          <Link href='/dashboard/datasets'>
              {selectedIndex == 1
                ? <span className={styles.link} style={{ color: '#FFF', fontWeight: 'bold' }}>Repository analysis</span>
                : <span className={styles.link}>Repository analysis</span>}
          </Link>
          <Link href='/dashboard/submit'>
              {selectedIndex == 3
                ? <span className={styles.link} style={{ color: '#FFF', fontWeight: 'bold' }}>Submit repository</span>
                : <span className={styles.link}>Submit repository</span>}
          </Link>
          <Link href='/dashboard/submissions'>
              {selectedIndex == 2
                ? <span className={styles.link} style={{ color: '#FFF', fontWeight: 'bold' }}>My submissions</span>
                : <span className={styles.link}>My submissions</span>}
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