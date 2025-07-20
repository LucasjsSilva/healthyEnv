import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardHeader from "../../../components/DashboardHeader";
import Header from "../../../components/Header";
import styles from '../../../styles/Request.module.css'
import Constants from "../../../utils/constants";
import Router, { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const Requests = () => {
  const router = useRouter()
  const [datasetsOptions, setDatasetsOptions] = useState([])
  const [selectedDataset, setSelectedDataset] = useState()
  const datasetsIdList = []


  const [isLoadingRepositories, setIsLoadingRepositories] = useState(true)
  const [userData, setUserData] = useState({})
  const [repositories, setRepositories] = useState([])

  async function loadRepositories() {
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem('userData')
        console.log('userData do localStorage:', data);
        
        if (!data) {
          console.error('Nenhum userData encontrado no localStorage');
          router.push('/auth');
          return;
        }
        
        const parsedData = JSON.parse(data);
        console.log('userData parseado:', parsedData);
        setUserData(parsedData)

        if (!parsedData.login) {
          console.error('Login não encontrado no userData');
          return;
        }

        const response = await axios.get(`https://api.github.com/users/${parsedData.login}/repos`)

        if (response.status == 200) {
          setRepositories(response.data)
          setIsLoadingRepositories(false)
        }
      } catch (e) { 
        console.error('Erro ao carregar repositórios:', e);
      }
    }
  }

  useEffect(() => {
    verifyAuth()
    loadDatasets()
    loadRepositories()
  }, [])

  function verifyAuth() {
    const data = JSON.parse(localStorage.getItem('userData'))

    if (data == undefined) {
      Router.push(`/auth?next=${router.asPath}`)
    } else {
      if ((Date.now() - data['timestamp']) > 86400000) {
        Router.push(`/auth?next=${router.asPath}`)
      }
    }
  }

  async function loadDatasets() {
    try {
      console.log('Carregando datasets...');
      const response = await axios.get(`${Constants.baseUrl}/datasets`)
      console.log('Resposta dos datasets:', response.data);
      
      const optionList = []
      response.data.items.forEach((dataset) => {
        datasetsIdList.push(dataset.id)
        optionList.push(
          <option value={dataset.id} key={dataset.id}>
            {Buffer.from(dataset['name'], 'utf-8').toString()}
          </option>
        )
      })
      setSelectedDataset(datasetsIdList[0])
      setDatasetsOptions([...optionList])
      console.log('Dataset selecionado:', datasetsIdList[0]);
    } catch (error) {
      console.error('Erro ao carregar datasets:', error);
      if (error.response) {
        console.error('Detalhes do erro:', error.response.status, error.response.data);
      }
    }
  }

  async function submitRequest(username, email, repo) {
    console.log('Dados sendo enviados:', { username, email, repo, selectedDataset });
    
    // Se o email não estiver disponível, usar o login como fallback
    const userEmail = email || `${username}@users.noreply.github.com`;
    
    if (!userEmail) {
      alert('Email não encontrado. Faça login novamente.');
      return;
    }
    
    if (!selectedDataset) {
      alert('Nenhum dataset selecionado.');
      return;
    }
    
    try {
      const response = await axios.post(
        `${Constants.baseUrl}/datasets/${selectedDataset}/request`, {
        name: username,
        email: userEmail,
        repo_url: repo,
      }
      )
      if (response.status >= 200) {
        console.log('Requisição enviada com sucesso:', response.data);
      } else {
        alert('Algo deu errado. Verifique os dados digitados e tente novamente.')
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      if (error.response) {
        console.error('Detalhes do erro:', error.response.data);
        alert(`Erro: ${error.response.data.error || 'Erro desconhecido'}`);
      } else {
        alert('Erro de conexão. Verifique se o servidor está rodando.');
      }
    }
  }

  function renederSkeletonLoader() {
    const skeletonItemList = []
    for (var i = 0; i < 30; i++) {
      skeletonItemList.push(
        <div className="bg-white h-[45px] rounded-md animate-pulse mb-2" key={`skeleton_${i}`} />
      )
    }

    return skeletonItemList
  }

  function renderRepositories() {
    const repoItemList = []
    repositories.forEach((repository, index) => {
      repoItemList.push(
        <div className="bg-white h-[45px] rounded-md mb-2 px-4 py-2 flex flex-row items-center justify-between cursor-pointer hover:shadow-md" key={`repo_${index}`} onClick={() => {
          const userEmail = userData['email'] || `${userData['login']}@users.noreply.github.com`;
          submitRequest(userData['login'], userData['email'], repository['svn_url']).then(() => {
            router.push(`/dashboard/requests/${userEmail}`)
          })
        }} >
          <span className="text-lg">{repository['name']}</span>
          <FontAwesomeIcon icon={faChevronRight} />
        </div>
      )
    })

    return repoItemList
  }

  return (
    <>
      <Head>
        <title>HealthyEnv - Solicitar inclusão de repositório</title>
      </Head>
      <DashboardHeader selectedIndex={2} />
      <div className="bg-[#f0f1f3] h-full p-[16px] w-[1280px] ml-auto mr-auto">
        <div className="flex flex-col px-4 pt-6 pb-4 mb-4 bg-white rounded-md">
          <span className="mb-3 text-3xl font-bold">Repository submission</span>
          <span>Select a repository to perform an analysis and contribute to HealthyEnv dataset.</span>
        </div>
        {isLoadingRepositories ? (
          <div>
            {renederSkeletonLoader()}
          </div>
        ) : (
          <div>
            {renderRepositories()}
          </div>
        )}
      </div>
    </>
  );
}

export default Requests;