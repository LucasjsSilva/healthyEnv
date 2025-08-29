import Head from "next/head";
import { useEffect } from "react";
import DashboardHeader from "../../../components/DashboardHeader";
import Router, { useRouter } from "next/router";

const RequestsRedirect = () => {
  const router = useRouter()

  useEffect(() => {
    let data: any = null
    try { data = JSON.parse(sessionStorage.getItem('userData') as any) } catch {}
    if (!data || (Date.now() - (data['timestamp'] || 0)) > 86400000) {
      Router.push(`/auth?next=${router.asPath}`)
      return
    }
    const email = data['email'] || `${data['login']}@users.noreply.github.com`
    Router.replace(`/dashboard/requests/${encodeURIComponent(email)}`)
  }, [router.asPath])

  return (
    <>
      <Head>
        <title>HealthyEnv - My submissions</title>
      </Head>
      <DashboardHeader selectedIndex={2} />
      <div className="bg-[#f0f1f3] h-full p-[16px] w-[1280px] ml-auto mr-auto">
        <div className="flex flex-col px-4 pt-6 pb-4 mb-4 bg-white rounded-md">
          <span className="mb-3 text-2xl font-semibold">Redirecting to My submissions…</span>
          <span>Please wait.</span>
        </div>
      </div>
    </>
  )
}

export default RequestsRedirect;