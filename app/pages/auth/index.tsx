import styles from '../../styles/Auth.module.css'
import Head from 'next/head'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import { useEffect, useMemo, useState } from 'react';
import { Dots } from 'react-activity'
import "react-activity/dist/Dots.css";
import Router, { useRouter } from "next/router";
import Constants from '../../utils/constants';

export default function Auth() {
  const router = useRouter()
  const [showAuthOptions, setShowAuthOptions] = useState(false);

  // Generate a cryptographically random state to protect the OAuth flow
  const oauthState = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const arr = new Uint8Array(16)
    window.crypto.getRandomValues(arr)
    // base64url
    const raw = Array.from(arr).map(b => String.fromCharCode(b)).join('')
    const b64 = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    try { sessionStorage.setItem('oauth_state', b64) } catch {}
    return b64
  }, [])

  const authorizeHref = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const next = router.query.next ? encodeURIComponent(String(router.query.next)) : ''
    const redirect = encodeURIComponent(`${origin}/auth/github?next=${next}`)
    const scope = encodeURIComponent('read:user user:email')
    return `https://github.com/login/oauth/authorize?client_id=${Constants.ghCliendId}&scope=${scope}&redirect_uri=${redirect}&state=${oauthState}`
  }, [router.query.next, oauthState])

  function checkCurrentAuth() {
    let data: any = null
    try { data = JSON.parse(sessionStorage.getItem('userData') as any) } catch {}

    if (data == undefined) {
      setShowAuthOptions(true)
    } else {
      if ((Date.now() - data['timestamp']) > 86400000) {
        setShowAuthOptions(true)
      } else {
        Router.push('/dashboard/datasets')
      }
    }
  }

  useEffect(
    () => {
      checkCurrentAuth()
    }, [])

  return (
    <>
      <Head>
        <title>HealthyEnv - Auth</title>
      </Head>
      {showAuthOptions ? (
        <div className={styles.auth}>
          <span className={styles.title}>Welcome to <b>HealthyEnv</b></span>
          <span className={styles.subtitle}>
            Log in or sign up with one of the following options:
          </span>
          <Link href={authorizeHref}>
            <div className={styles.option}>
              <FontAwesomeIcon icon={faGithub} />
              <span className={styles.optionLabel}>GitHub</span>
            </div>
          </Link>
          <Link href='/' className={styles.backHomeButton}>
            Go back to HealthyEnv home
          </Link>
        </div>
      ) : (
        <div className={styles.auth}>
          <Dots color='#000000' size={18} speed={1} animating={true} />
        </div>)
      }
    </>
  );
}