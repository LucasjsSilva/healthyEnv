import Router, { useRouter } from "next/router";
import Head from "next/head";
import { useEffect } from "react";
import axios from "axios";
import { Dots } from 'react-activity'
import "react-activity/dist/Dots.css";
import Constants from "../../utils/constants";

export default function GitHub() {
  const router = useRouter()

  // useEffect(() => {
  //   requestGitHubToken()
  // }, [])

  useEffect(() => {
    if (!router.isReady) return
    requestGitHubToken()
  }, [router.isReady])

  async function requestGitHubToken() {
    try {
      const code = router.query.code;
      const state = router.query.state;

      if (!code) {
        throw new Error('Authorization code not received');
      }

      // CSRF protection: validate state from sessionStorage
      let expectedState: string | null = null
      try { expectedState = sessionStorage.getItem('oauth_state') } catch {}
      if (!state || !expectedState || state !== expectedState) {
        throw new Error('Invalid OAuth state');
      }
      // Clear the state once used
      try { sessionStorage.removeItem('oauth_state') } catch {}

      // Establish server-side session and receive public user info
      const sessionRes = await axios.get(
        `${Constants.baseUrl}/auth/github_session?code=${code}&state=${state}`,
        { withCredentials: true }
      );
      const user = sessionRes.data || {};
      if (!user.login) {
        throw new Error('Failed to establish session');
      }

      // Store only non-sensitive user info in sessionStorage
      saveUserInfo('userData', JSON.stringify({
        login: user.login,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        timestamp: Date.now(),
      }));

      const path = router.query.next && router.query.next !== 'undefined'
        ? `${router.query.next}`
        : '/dashboard/datasets';

      Router.push(path);
    } catch (error) {
      console.error('Authentication error:', error);
      // Redirecionar para página de erro ou login
      Router.push('/auth?error=authentication_failed');
    }
  }

  function saveUserInfo(key: string, value: string) {
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem(key, value) } catch {}
    }
  }

  return (
    <>
      <Head>
        <title>Please wait</title>
      </Head>
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Dots color='#000000' size={18} speed={1} animating={true} />
        <span>Please wait...</span>
      </div>
    </>
  );
}