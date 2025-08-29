import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardHeader from '../../../components/DashboardHeader';

const RequestsByEmail = () => {
  const router = useRouter()
  
  // Redirect to the new submissions page

  useEffect(() => {
    if (router.isReady) {
      router.replace('/dashboard/submissions');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Redirecting... | HealthyEnv</title>
      </Head>
      <DashboardHeader selectedIndex={3} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Redirecting to submissions page...</p>
        </div>
      </div>
    </div>
  );
}

export default RequestsByEmail;