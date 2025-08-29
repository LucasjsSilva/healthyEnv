import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import RequestListItem from '../../../components/RequestListItem';
import { Dots } from 'react-activity';
import "react-activity/dist/Dots.css";
import Head from 'next/head';
import Constants from '../../../utils/constants';
import DashboardHeader from '../../../components/DashboardHeader';
import styles from '../../../styles/RequestsByEmail.module.css';

const SubmissionsPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [userData, setUserData] = useState<any | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [datasetRepoCount, setDatasetRepoCount] = useState<number>(0);

  useEffect(() => {
    if (!router.isReady) return;
    verifyAuth();
  }, [router.isReady]);

  useEffect(() => {
    if (!userData) return;
    loadDatasets();
    loadRequests();
  }, [userData]);

  useEffect(() => {
    if (!selectedDataset) return;
    loadDatasetRepoCount(selectedDataset);
  }, [selectedDataset]);

  function verifyAuth() {
    let data: any = null;
    try { 
      data = JSON.parse(sessionStorage.getItem('userData') as any); 
    } catch {}
    
    if (!data || (Date.now() - (data['timestamp'] || 0)) > 86400000) {
      router.push(`/auth?next=${router.asPath}`);
      return;
    }
    setUserData(data);
  }

  async function loadRequests() {
    if (!userData?.email) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(`${Constants.baseUrl}/requests/${userData.email}`);
      if (response.status === 200) {
        setRequests(response.data['items'] || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDatasets() {
    try {
      const res = await axios.get(`${Constants.baseUrl}/datasets`);
      if (res.status === 200) {
        const items = res.data.items || [];
        setDatasets(items);
        if (items.length > 0) {
          setSelectedDataset(items[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  }

  async function loadDatasetRepoCount(datasetId: string) {
    try {
      const r = await axios.get(`${Constants.baseUrl}/datasets/${datasetId}/repos`);
      if (r.status === 200) {
        const total = Number(r.data.total_count ?? (r.data.items?.length ?? 0));
        setDatasetRepoCount(Number.isFinite(total) ? total : 0);
      }
    } catch (error) {
      console.error('Error loading dataset repo count:', error);
      setDatasetRepoCount(0);
    }
  }

  const visibleRequests = useMemo(() => {
    if (!selectedDataset) return [];
    return (requests || []).filter((req: any) => 
      String(req.dataset_id || '') === String(selectedDataset)
    );
  }, [requests, selectedDataset]);

  const renderRequests = () => {
    if (!visibleRequests.length) {
      return <span>No submissions found for this dataset.</span>;
    }

    return visibleRequests.map((request) => {
      const isDone = String(request['status']).toUpperCase() === 'DONE';
      const repoUrl: string = request['repo_url'] || '';
      const parts = repoUrl.split('/').filter(Boolean);
      const repo = parts[parts.length - 1];
      const owner = parts[parts.length - 2];

      return (
        <div key={request.id} className="mb-2">
          <RequestListItem
            name={request['name']}
            email={request['email']}
            url={repoUrl}
            status={request['status']}
            action={
              isDone && selectedDataset && owner && repo ? (
                datasetRepoCount >= 10 ? (
                  <a
                    href={`/dashboard/datasets/${encodeURIComponent(String(selectedDataset))}/analyze/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?near=10`}
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                  >
                    View metrics
                  </a>
                ) : (
                  <button
                    className="px-3 py-1 rounded bg-gray-300 text-gray-600 text-sm cursor-not-allowed"
                    title={`Dataset very small (${datasetRepoCount}/10). Add more repos to view metrics.`}
                    disabled
                  >
                    View metrics
                  </button>
                )
              ) : null
            }
          />
        </div>
      );
    });
  };

  return (
    <div className={styles.requestByEmail}>
      <Head>
        <title>My Submissions | HealthyEnv</title>
      </Head>
      <DashboardHeader selectedIndex={2} />
      
      <div className={styles.info}>
        <span className={styles.title}>
          My Submissions
        </span>
        <span className={styles.subtitle}>
          Track your submitted repositories
        </span>
        <span className={styles.description}>
          View the status of your repository submissions and access analysis results.
        </span>
        
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="dataset" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset
            </label>
            <select
              id="dataset"
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-gray-600 mb-1">
              {datasetRepoCount > 0 ? (
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-md">
                  {datasetRepoCount} {datasetRepoCount === 1 ? 'repository' : 'repositories'} in this dataset
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Dots />
          </div>
        ) : visibleRequests.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {visibleRequests.map((request) => {
              const isDone = String(request['status']).toUpperCase() === 'DONE';
              const repoUrl: string = request['repo_url'] || '';
              const parts = repoUrl.split('/').filter(Boolean);
              const repo = parts[parts.length - 1];
              const owner = parts[parts.length - 2];

              return (
                <li key={request.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {request['name'] || repoUrl}
                      </p>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="truncate">{repoUrl}</span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request['status'] === 'DONE' 
                            ? 'bg-green-100 text-green-800' 
                            : request['status'] === 'ERROR' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request['status'] || 'PENDING'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {isDone && selectedDataset && owner && repo ? (
                        datasetRepoCount >= 10 ? (
                          <a
                            href={`/dashboard/datasets/${encodeURIComponent(String(selectedDataset))}/analyze/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?near=10`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                          >
                            View Metrics
                          </a>
                        ) : (
                          <button
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 cursor-not-allowed opacity-50"
                            title={`Dataset very small (${datasetRepoCount}/10). Add more repos to view metrics.`}
                            disabled
                          >
                            View Metrics
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven't submitted any repositories for analysis yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionsPage;
