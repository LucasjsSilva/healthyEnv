import Head from "next/head"
import Header from "../components/Header"
import styles from '../styles/About.module.css'

const About = () => {
  return (
    <>
      <Head>
        <title>HealthyEnv - Sobre</title>
      </Head>
      <Header selectedIndex={4} />
      <div className={styles.container}>
        <h1>Sobre o healthyEnv</h1>
        <div className={styles.card}>
          <h2 id="sumario">Sumário</h2>
          <ul>
            <li><a href="#visao-geral">Visão geral</a></li>
            <li><a href="#creditos">Créditos e continuidade</a></li>
            <li><a href="#melhorias-recentes">Principais melhorias recentes</a></li>
            <li><a href="#metodologia">Metodologia (IC, mediana, escalas, interpretação)</a></li>
            <li><a href="#acessibilidade">Paleta, contraste e acessibilidade</a></li>
            <li><a href="#controles">Controles e preferências</a></li>
            <li><a href="#desempenho">Desempenho</a></li>
            <li><a href="#pca">Elipses no PCA (Near Repos)</a></li>
            <li><a href="#licencas">Licenças</a></li>
          </ul>
        </div>

        <div className={styles.grid}>
        <div className={styles.card}>
          <h2 id="visao-geral">Visão geral</h2>
          <p>
          O <b>healthyEnv</b> é uma evolução do projeto <i>Metrics OSS</i>, criado por Lucas Hiago Vilela,
          para coleta e análise de métricas de projetos hospedados no GitHub. A versão original do
          healthyEnv foi desenvolvida por <b>Diego Winter</b> (TCC/UFPI) sob orientação do Prof. Dr.
          Guilherme Amaral Avelino, introduzindo a <b>comparação por similaridade</b> entre repositórios.
          Em vez de comparar contra todo o dataset, os valores de referência passam a considerar apenas
          repositórios <b>semelhantes</b> ao avaliado.
          </p>
        </div>

        <div className={styles.card}>
          <h2 id="creditos">Créditos e continuidade</h2>
          <ul>
            <li><b>Ideia e base de dados:</b> Metrics OSS — Lucas Hiago Vilela.</li>
            <li><b>Primeira versão do healthyEnv:</b> Diego Winter (TCC/UFPI) — orientação Prof. Dr. Guilherme Amaral Avelino.</li>
            <li><b>Continuação e aprimoramentos recentes:</b> <u>Lucas Jesus Santos Silva</u> — melhorias de UX, acessibilidade, desempenho e robustez.</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2 id="melhorias-recentes">Principais melhorias recentes</h2>
          <ul>
            <li><b>Toggles persistentes</b> para exibir/ocultar IC e marcador de média (preferências salvas).</li>
            <li><b>Paleta por categoria (working group)</b>, com alto contraste e contorno de marcadores.</li>
            <li><b>Legibilidade em dados densos</b>: ajuste de jitter/boxpoints conforme o tamanho da amostra.</li>
            <li><b>Escala adaptativa</b>: troca automática log ⇄ linear quando há valores ≤ 0.</li>
            <li><b>Desempenho</b>: debounce de requisições, cache local dos ICs por assinatura, memoização de componentes e traces.</li>
            <li><b>Tooltips e títulos</b> mais informativos e layout sem corte de títulos/legendas.</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h1 id="metodologia">Metodologia dos gráficos e métricas</h1>
          <h2>Intervalo de Confiança (IC) via Bootstrap</h2>
          <p>
          Quando exibido, o <b>IC 95% da mediana</b> é calculado por <i>bootstrap</i> a partir dos valores
          observados da métrica em repositórios semelhantes. Em alto nível:
          </p>
          <ul>
            <li>Reamostramos com reposição o conjunto de valores N vezes (ex.: 5.000).</li>
            <li>Em cada reamostra, calculamos o estimador (por padrão, a mediana).</li>
            <li>O IC 95% é dado pelos percentis 2,5% e 97,5% da distribuição dos estimadores.</li>
          </ul>
          <p>
            O cálculo pode ser feito no servidor (para consistência e desempenho) e, em caso de falha,
            há <i>fallback</i> local no navegador usando o mesmo procedimento.
          </p>
          <h2>Por que mediana (vs. média)?</h2>
          <ul>
            <li><b>Robustez a outliers:</b> dados de engenharia de software costumam ser assimétricos e com valores extremos.</li>
            <li><b>Estabilidade:</b> a mediana representa melhor a tendência central quando a distribuição é pesada na cauda.</li>
            <li>Exibimos a <b>média</b> como marcador adicional para referência, mas a mediana guia o IC.</li>
          </ul>
          <h2>Escala log/linear e presença de zeros</h2>
          <ul>
            <li>O eixo Y usa <b>escala log</b> por padrão para acomodar faixas largas de valores.</li>
            <li>Se houver valores <b>não positivos</b> (≤ 0), a escala muda automaticamente para <b>linear</b>.</li>
            <li>O IC só é desenhado em log quando ambos os limites são positivos; em linear, zero é suportado.</li>
          </ul>
          <h2>Como interpretar o MetricPlot</h2>
          <ul>
            <li><b>Boxplot</b>: distribuição dos valores (quartis, mediana, possíveis outliers).</li>
            <li><b>Marcador da média (todas)</b>: um “X” indica a média do grupo.</li>
            <li><b>IC 95% (mediana)</b>: barra vertical espessa indicando o intervalo estimado para a mediana.</li>
            <li><b>Ponto do repositório</b>: valor do projeto selecionado para comparação com a referência.</li>
            <li>Eixo Y em <b>escala log</b> quando apropriado, para acomodar grande variação de valores.</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2 id="acessibilidade">Paleta, contraste e acessibilidade</h2>
          <ul>
            <li>Cores <b>consistentes por categoria</b> (working group) para o ponto do repositório e o marcador da média.</li>
            <li>Marcadores com <b>contorno escuro</b> e linha do IC reforçada para legibilidade em fundos claros/escuros.</li>
            <li>Textos e legendas ajustados para <b>alto contraste</b>, visando leitura em situações “RAZOÁVEL” e “RUIM”.</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2 id="controles">Controles e preferências</h2>
          <ul>
            <li><b>Toggles persistentes</b> em cada gráfico para exibir/ocultar IC e marcador da média (preferências salvas).</li>
            <li>Layout evita cortes de título/legenda e adapta densidade (jitter/boxpoints) conforme o número de pontos.</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2 id="desempenho">Desempenho</h2>
          <ul>
            <li><b>Debounce</b> de requisições de IC para reduzir carga no servidor durante interações rápidas.</li>
            <li><b>Cache local</b> de IC por assinatura dos dados para evitar recomputações redundantes.</li>
            <li>Componentes e dados <b>memoizados</b> para minimizar re-renderizações e custo de desenho (Plotly).</li>
            <li><b>Fallback local</b> para cálculo de IC caso o backend esteja indisponível.</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2 id="pca">Elipses no PCA (Near Repos)</h2>
          <p>
            No gráfico de repositórios semelhantes (PCA), as elipses representam <b>bandas de confiança</b>
            aproximadas da distribuição dos pontos projetados:
          </p>
          <ul>
            <li><b>68%</b>: região clara (1 desvio-padrão aproximado na projeção).</li>
            <li><b>95%</b>: região mais ampla (≈2 desvios-padrão).</li>
          </ul>
          <p>
            Elas ajudam a visualizar densidade e dispersão dos “near repos” ao redor do selecionado.
            Os controles permitem ligar/desligar as bandas e aplicar zoom/pan para inspeção.
          </p>
        </div>
        <div className={styles.card}>
          <h1 id="licencas">Licenças</h1>
          <div style={{ fontFamily: 'monospace' }}>
          <span>scikit-learn</span><br /><br />
          <span>
            BSD 3-Clause License<br /><br />

            Copyright (c) 2007-2021 The scikit-learn developers.<br />
            All rights reserved.<br /><br />

            Redistribution and use in source and binary forms, with or without<br />
            modification, are permitted provided that the following conditions are met:<br /><br />

            * Redistributions of source code must retain the above copyright notice, this<br />
            list of conditions and the following disclaimer.<br /><br />

            * Redistributions in binary form must reproduce the above copyright notice,<br />
            this list of conditions and the following disclaimer in the documentation<br />
            and/or other materials provided with the distribution.<br /><br />

            * Neither the name of the copyright holder nor the names of its<br />
            contributors may be used to endorse or promote products derived from<br />
            this software without specific prior written permission.<br /><br />

            THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS &quot;AS IS&quot;<br />
            AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE<br />
            IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE<br />
            DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE<br />
            FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL<br />
            DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR<br />
            SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER<br />
            CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,<br />
            OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE<br />
            OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.<br />
          </span>
          <br /><br />
          <span>Flask</span><br /><br />
          <span>
            BSD 3-Clause License<br /><br />

            Copyright 2010 Pallets<br /><br />

            Redistribution and use in source and binary forms, with or without<br />
            modification, are permitted provided that the following conditions are met:<br /><br />

            * Redistributions of source code must retain the above copyright notice, this<br />
            list of conditions and the following disclaimer.<br /><br />

            * Redistributions in binary form must reproduce the above copyright notice,<br />
            this list of conditions and the following disclaimer in the documentation<br />
            and/or other materials provided with the distribution.<br /><br />

            * Neither the name of the copyright holder nor the names of its<br />
            contributors may be used to endorse or promote products derived from<br />
            this software without specific prior written permission.<br /><br />

            THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS &quot;AS IS&quot;<br />
            AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE<br />
            IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE<br />
            DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE<br />
            FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL<br />
            DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR<br />
            SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER<br />
            CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,<br />
            OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE<br />
            OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.<br />
          </span>
          <br /><br />
          <span>Plotly.js</span><br /><br />
          <span>
            The MIT License (MIT)<br /><br />

            Copyright (c) 2021 Plotly, Inc<br /><br />

            Permission is hereby granted, free of charge, to any person obtaining a copy<br />
            of this software and associated documentation files (the &quot;Software&quot;), to deal<br />
            in the Software without restriction, including without limitation the rights<br />
            to use, copy, modify, merge, publish, distribute, sublicense, and/or sell<br />
            copies of the Software, and to permit persons to whom the Software is<br />
            furnished to do so, subject to the following conditions:<br /><br />

            The above copyright notice and this permission notice shall be included in<br />
            all copies or substantial portions of the Software.<br /><br />

            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR<br />
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,<br />
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE<br />
            AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER<br />
            LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,<br />
            OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN<br />
            THE SOFTWARE.<br />
          </span>
          <br /><br />
          <span>Next.js</span><br /><br />
          <span>
            The MIT License (MIT)<br /><br />

            Copyright (c) 2022 Vercel, Inc.<br /><br />

            Permission is hereby granted, free of charge, to any person obtaining a copy<br />
            of this software and associated documentation files (the &quot;Software&quot;), to deal<br />
            in the Software without restriction, including without limitation the rights<br />
            to use, copy, modify, merge, publish, distribute, sublicense, and/or sell<br />
            copies of the Software, and to permit persons to whom the Software is<br />
            furnished to do so, subject to the following conditions:<br /><br />

            The above copyright notice and this permission notice shall be included in<br />
            all copies or substantial portions of the Software.<br /><br />

            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR<br />
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,<br />
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE<br />
            AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER<br />
            LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,<br />
            OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN<br />
            THE SOFTWARE.<br />
          </span>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

export default About