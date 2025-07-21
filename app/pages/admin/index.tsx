import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';
import styles from '../../styles/Admin.module.css';

const AdminDashboard: React.FC = () => {
  const router = useRouter();

  return (
    <div className={styles.adminContainer}>
      <Header selectedIndex={5} />
      
      <div className={styles.adminContent}>
        <div className={styles.adminHeader}>
          <h1>Admin Dashboard</h1>
          <p>Manage repository analysis requests and system administration</p>
        </div>

        <div className={styles.adminGrid}>
          <Link href="/admin/requests" className={styles.adminCard}>
            <div className={styles.cardIcon}>📝</div>
            <h3>Analysis Requests</h3>
            <p>View and manage repository analysis submissions</p>
          </Link>

          <div className={styles.adminCard} style={{ opacity: 0.6 }}>
            <div className={styles.cardIcon}>📊</div>
            <h3>Analytics</h3>
            <p>System metrics and usage statistics (Coming Soon)</p>
          </div>

          <div className={styles.adminCard} style={{ opacity: 0.6 }}>
            <div className={styles.cardIcon}>⚙️</div>
            <h3>Settings</h3>
            <p>System configuration and preferences (Coming Soon)</p>
          </div>

          <div className={styles.adminCard} style={{ opacity: 0.6 }}>
            <div className={styles.cardIcon}>👥</div>
            <h3>Users</h3>
            <p>User management and permissions (Coming Soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
