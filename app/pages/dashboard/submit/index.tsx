import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Dots } from 'react-activity';
import "react-activity/dist/Dots.css";
import Head from 'next/head';
import Constants from '../../../utils/constants';
import DashboardHeader from '../../../components/DashboardHeader';
import styles from '../../../styles/RequestsByEmail.module.css';

const SubmitRepositoryPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [submittingRepoKey, setSubmittingRepoKey] = useState('');
  const [submitNotice, setSubmitNotice] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDsName, setNewDsName] = useState('');
  const [newDsDesc, setNewDsDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    verifyAuth();
  }, [router.isReady]);

  useEffect(() => {
    if (!userData) return;
    loadDatasets();
    loadGithubRepos();
  }, [userData]);

  useEffect(() => {
    if (!selectedDataset || !repos.length) return;
    filterRepos();
  }, [selectedDataset, repos, searchTerm]);

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
    setIsLoading(false);
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

  async function loadGithubRepos() {
    setIsLoadingRepos(true);
    try {
      const resp = await axios.get(`${Constants.baseUrl}/me/repos`, { withCredentials: true });
      if (resp.status === 200) {
        setRepos(resp.data || []);
      }
    } catch (error) {
      console.error('Error loading GitHub repos:', error);
      setSubmitNotice({ type: 'error', text: 'Failed to load your GitHub repositories. Please try again.' });
    } finally {
      setIsLoadingRepos(false);
    }
  }

  async function filterRepos() {
    if (!selectedDataset) return;
    
    try {
      // Get existing repository names in the selected dataset
      const response = await axios.get(`${Constants.baseUrl}/datasets/${selectedDataset}/repos`);
      const existingRepos = new Set(
        (response.data.items || []).map((r: any) => r.name?.toLowerCase())
      );

      // Filter out already submitted repos and apply search filter
      const filtered = repos.filter((repo) => {
        const isSubmitted = [repo.full_name, repo.name, repo.svn_url, repo.html_url]
          .filter(Boolean)
          .some((val: any) => existingRepos.has(String(val).toLowerCase()));
          
        const matchesSearch = [repo.full_name, repo.name, repo.description]
          .filter(Boolean)
          .some((val: any) => val.toLowerCase().includes(searchTerm.toLowerCase()));
          
        return !isSubmitted && (searchTerm ? matchesSearch : true);
      });

      setFilteredRepos(filtered);
    } catch (error) {
      console.error('Error filtering repositories:', error);
      setFilteredRepos([]);
    }
  }

  async function createDataset() {
    if (!newDsName.trim()) {
      alert('Dataset name is required.');
      return;
    }
    
    try {
      setIsCreatingDataset(true);
      const resp = await axios.post(
        `${Constants.baseUrl}/datasets`,
        { name: newDsName.trim(), description: newDsDesc.trim() },
        { withCredentials: true }
      );
      
      if (resp.status === 201) {
        setShowCreateModal(false);
        setNewDsName('');
        setNewDsDesc('');
        await loadDatasets();
        const created = resp.data;
        if (created?.id) {
          setSelectedDataset(created.id);
        }
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error creating dataset');
    } finally {
      setIsCreatingDataset(false);
    }
  }

  async function submitRepository(repo: any) {
    if (!selectedDataset) {
      setSubmitNotice({ type: 'error', text: 'Please select a target dataset.' });
      return;
    }
    
    try {
      const key = String(repo.full_name || repo.name || repo.svn_url || repo.html_url);
      setSubmitNotice(null);
      setSubmittingRepoKey(key);
      
      const repoUrl = repo.svn_url || repo.html_url;
      const response = await axios.post(
        `${Constants.baseUrl}/datasets/${selectedDataset}/request_and_process`,
        { repo_url: repoUrl },
        { withCredentials: true }
      );
      
      if (response.status >= 200 && response.status < 300) {
        setSubmitNotice({ 
          type: 'success', 
          text: 'Repository submitted successfully! Processing has started.' 
        });
        // Refresh the repos list to reflect the submission
        await loadGithubRepos();
      }
    } catch (error) {
      setSubmitNotice({ 
        type: 'error', 
        text: 'Failed to submit repository. Please check your authentication and try again.' 
      });
    } finally {
      setSubmittingRepoKey('');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Dots color="#000000" size={32} speed={1} animating={true} />
      </div>
    );
  }

  return (
    <div className={styles.requestByEmail}>
      <Head>
        <title>Submit Repository | HealthyEnv</title>
      </Head>
      <DashboardHeader selectedIndex={3} />
      
      <div className={styles.info}>
        <span className={styles.title}>
          Submit Repository
        </span>
        <span className={styles.subtitle}>
          Submit a new repository for analysis
        </span>
        <span className={styles.description}>
          Select a dataset and choose a repository from your GitHub account to analyze.
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
              disabled={isLoading || datasets.length === 0}
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search repositories
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {submitNotice && (
        <div className={`${styles.notice} ${submitNotice.type === 'success' ? styles.success : styles.error}`}>
          {submitNotice.text}
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoadingRepos ? (
          <div className="flex justify-center py-12">
            <Dots />
          </div>
        ) : filteredRepos.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredRepos.map((repo) => (
              <li key={repo.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-600 truncate">
                      {repo.full_name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {repo.description || 'No description'}
                    </p>
                    <div className="mt-2 flex space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                        </svg>
                        {repo.language || 'N/A'}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {repo.stargazers_count.toLocaleString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {repo.forks_count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                      onClick={() => submitRepository(repo)}
                      disabled={!!submittingRepoKey || !selectedDataset}
                    >
                      {submittingRepoKey === repo.full_name ? 'Submitting...' : 'Submit for Analysis'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'No repositories match your search criteria.'
                : 'You need to connect your GitHub account to see your repositories.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Create Dataset Modal */}
      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Dataset</h3>
                  <div className="mt-4">
                    <div className="mb-4">
                      <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-700 text-left mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="dataset-name"
                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Enter dataset name"
                        value={newDsName}
                        onChange={(e) => setNewDsName(e.target.value)}
                        disabled={isCreatingDataset}
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="dataset-desc" className="block text-sm font-medium text-gray-700 text-left mb-1">
                        Description
                      </label>
                      <textarea
                        id="dataset-desc"
                        rows={3}
                        className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                        placeholder="Enter dataset description (optional)"
                        value={newDsDesc}
                        onChange={(e) => setNewDsDesc(e.target.value)}
                        disabled={isCreatingDataset}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                  onClick={createDataset}
                  disabled={isCreatingDataset || !newDsName.trim()}
                >
                  {isCreatingDataset ? 'Creating...' : 'Create Dataset'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingDataset}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitRepositoryPage;
