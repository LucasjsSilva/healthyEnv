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
      
      if (!code) {
        throw new Error('Authorization code not received');
      }

      // Autentica o usuário para obter token
      const response = await axios.get(`${Constants.baseUrl}/auth/github_token?code=${code}`);
      
      if (!response.data.access_token) {
        throw new Error('Failed to obtain access token');
      }

      // Obter dados do usuário
      const userDataRes = await axios.get(`https://api.github.com/user`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${response.data.access_token}`
        }
      });

      if (!userDataRes.data.login) {
        throw new Error('Failed to fetch user data');
      }

      // Tentar obter email do usuário (pode ser null se privado)
      let userEmail = userDataRes.data.email;
      
      // Se o email não estiver disponível, buscar emails do usuário
      if (!userEmail) {
        try {
          const emailsRes = await axios.get(`https://api.github.com/user/emails`, {
            headers: {
              'Accept': 'application/vnd.github+json',
              'Authorization': `token ${response.data.access_token}`
            }
          });
          
          // Procurar pelo email primário ou o primeiro verificado
          const primaryEmail = emailsRes.data.find(email => email.primary);
          const verifiedEmail = emailsRes.data.find(email => email.verified);
          userEmail = primaryEmail?.email || verifiedEmail?.email || emailsRes.data[0]?.email;
        } catch (emailError) {
          console.warn('Could not fetch user emails:', emailError);
        }
      }

      saveUserInfo('userData', JSON.stringify({
        'token': response.data.access_token,
        'login': userDataRes.data.login,
        'name': userDataRes.data.name,
        'email': userEmail,
        'profilePicture': userDataRes.data.avatar_url,
        'timestamp': Date.now(),
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
      localStorage.setItem(key, value)
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