import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import axios from 'axios';
import { parseCookies } from 'nookies';

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to submissions page by default
    router.replace('/dashboard/submissions');
  }, [router]);

  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const cookies = parseCookies(context);
  const token = cookies.token;

  if (!token) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
