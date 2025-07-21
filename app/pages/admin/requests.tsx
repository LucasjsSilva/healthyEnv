import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Constants from '../../utils/constants';
import styles from '../../styles/AdminRequests.module.css';

interface AnalysisRequest {
  id: string;
  id_dataset: string;
  name: string;
  email: string;
  repo_url: string;
  status: 'RECEIVED' | 'IN PROGRESS' | 'DONE';
  created_at: string;
  updated_at: string;
}

const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [updating, setUpdating] = useState<string>(''); // ID of request being updated

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${Constants.baseUrl}/admin/requests`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError('Error loading requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      setUpdating(requestId);
      
      const response = await fetch(`${Constants.baseUrl}/admin/requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: newStatus as any, updated_at: new Date().toISOString() }
          : req
      ));

    } catch (err) {
      setError('Error updating request status');
      console.error('Error updating status:', err);
    } finally {
      setUpdating('');
    }
  };

  const deleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      const response = await fetch(`${Constants.baseUrl}/admin/requests/${requestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete request');
      }

      // Remove from local state
      setRequests(requests.filter(req => req.id !== requestId));

    } catch (err) {
      setError('Error deleting request');
      console.error('Error deleting request:', err);
    }
  };

  const processRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to process this repository? This will add it to the dataset.')) {
      return;
    }

    try {
      setUpdating(requestId);
      
      const response = await fetch(`${Constants.baseUrl}/admin/requests/${requestId}/process`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to process request');
      }

      const result = await response.json();
      
      // Update local state to DONE
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'DONE', updated_at: new Date().toISOString() }
          : req
      ));

      alert(`Repository processed successfully!\nRepository ID: ${result.repository_id}\nName: ${result.repository_name}`);

    } catch (err) {
      setError('Error processing request');
      console.error('Error processing request:', err);
    } finally {
      setUpdating('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED': return '#fbbf24'; // yellow
      case 'IN PROGRESS': return '#3b82f6'; // blue
      case 'DONE': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header selectedIndex={5} />
        <div className={styles.content}>
          <div className={styles.loading}>Loading requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header selectedIndex={5} />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Analysis Requests</h1>
          <button onClick={fetchRequests} className={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError('')} className={styles.closeError}>×</button>
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>Total Requests</h3>
            <span>{requests.length}</span>
          </div>
          <div className={styles.statCard}>
            <h3>Pending</h3>
            <span>{requests.filter(r => r.status === 'RECEIVED').length}</span>
          </div>
          <div className={styles.statCard}>
            <h3>Processing</h3>
            <span>{requests.filter(r => r.status === 'IN PROGRESS').length}</span>
          </div>
          <div className={styles.statCard}>
            <h3>Completed</h3>
            <span>{requests.filter(r => r.status === 'DONE').length}</span>
          </div>
        </div>

        <div className={styles.requestsTable}>
          {requests.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No requests found</h3>
              <p>When users submit repositories for analysis, they will appear here.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Repository</th>
                  <th>Submitter</th>
                  <th>Dataset</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className={styles.idCell}>{request.id}</td>
                    <td>
                      <div className={styles.repoCell}>
                        <a 
                          href={request.repo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.repoLink}
                        >
                          {request.repo_url.replace('https://github.com/', '')}
                        </a>
                        <div className={styles.repoName}>{request.name}</div>
                      </div>
                    </td>
                    <td>{request.email}</td>
                    <td className={styles.idCell}>{request.id_dataset}</td>
                    <td>
                      <select
                        value={request.status}
                        onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                        disabled={updating === request.id}
                        className={styles.statusSelect}
                        style={{ borderColor: getStatusColor(request.status) }}
                      >
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="IN PROGRESS">IN PROGRESS</option>
                        <option value="DONE">DONE</option>
                      </select>
                    </td>
                    <td className={styles.dateCell}>{formatDate(request.created_at)}</td>
                    <td className={styles.dateCell}>{formatDate(request.updated_at)}</td>
                    <td>
                      <div className={styles.actions}>
                        {request.status === 'RECEIVED' && (
                          <button
                            onClick={() => processRequest(request.id)}
                            disabled={updating === request.id}
                            className={styles.processBtn}
                            title="Process repository and add to dataset"
                          >
                            {updating === request.id ? '⏳' : '⚡'}
                          </button>
                        )}
                        <button
                          onClick={() => deleteRequest(request.id)}
                          className={styles.deleteBtn}
                          title="Delete request"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequests;
