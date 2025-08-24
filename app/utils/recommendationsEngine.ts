// Utility functions to generate recommendations based on metric analysis

interface MetricData {
  id: string
  name: string
  description: string
  is_upper: boolean
  situation: 'OK' | 'REASONABLE' | 'BAD'
  values: {
    selected: { value: number }
    reference: Array<{ value: number }>
  }
}

interface Recommendation {
  type: 'warning' | 'critical' | 'info'
  metric: string
  title: string
  description: string
  actionItems: string[]
}

// Database of metric-specific recommendations
const METRIC_RECOMMENDATIONS = {
  'GbQLAZ3Cqt': { // contributors
    bad: {
      title: 'Baixa Diversidade de Contribuidores',
      description: 'Seu projeto tem poucos contribuidores ativos, o que pode indicar baixa colaboração e risco de dependência de poucos desenvolvedores.',
      actionItems: [
        'Melhore a documentação para facilitar contribuições',
        'Crie issues com label "good first issue" para novos colaboradores',
        'Organize eventos ou hackathons para atrair desenvolvedores',
        'Implemente guias de contribuição claros (CONTRIBUTING.md)'
      ]
    },
    reasonable: {
      title: 'Diversidade de Contribuidores Moderada',
      description: 'Seu projeto tem um número razoável de contribuidores, mas ainda pode melhorar.',
      actionItems: [
        'Reconheça publicamente contribuições importantes',
        'Crie canais de comunicação (Discord, Slack) para a comunidade',
        'Mentore novos contribuidores'
      ]
    }
  },
  'bOwjK67qRi': { // truck_factor
    bad: {
      title: 'Risco de Dependência Crítica',
      description: 'Poucos desenvolvedores controlam a maior parte do código, criando risco caso eles deixem o projeto.',
      actionItems: [
        'Distribua conhecimento através de documentação técnica',
        'Implemente revisões de código obrigatórias',
        'Crie sessões de pair programming',
        'Documente decisões arquiteturais importantes'
      ]
    },
    reasonable: {
      title: 'Distribuição de Conhecimento Limitada',
      description: 'O conhecimento está concentrado em poucos desenvolvedores.',
      actionItems: [
        'Rotacione responsabilidades entre membros da equipe',
        'Mantenha documentação atualizada'
      ]
    }
  },
  'fwClNGBocC': { // avg_time_to_close
    bad: {
      title: 'Tempo Excessivo para Resolução de Issues',
      description: 'Issues demoram muito para serem resolvidas, prejudicando a percepção de responsividade do projeto.',
      actionItems: [
        'Implemente triagem regular de issues',
        'Defina SLAs claros para diferentes tipos de issues',
        'Use templates para issues mais estruturadas',
        'Automatize fechamento de issues obsoletas'
      ]
    },
    reasonable: {
      title: 'Tempo de Resolução Aceitável',
      description: 'Issues são resolvidas em tempo razoável, mas pode melhorar.',
      actionItems: [
        'Categorize issues por prioridade',
        'Responda rapidamente mesmo que não resolva imediatamente'
      ]
    }
  },
  'sK4Xhc5xpg': { // avg_time_to_first_response
    bad: {
      title: 'Baixa Responsividade da Comunidade',
      description: 'Issues e PRs demoram muito para receber a primeira resposta, desencorajando contribuições.',
      actionItems: [
        'Configure notificações para issues/PRs novos',
        'Implemente bots para resposta automática inicial',
        'Designe responsáveis por monitoramento diário',
        'Use templates de resposta para agilizar comunicação'
      ]
    },
    reasonable: {
      title: 'Responsividade Moderada',
      description: 'A primeira resposta acontece em tempo aceitável, mas pode ser mais rápida.',
      actionItems: [
        'Configure alertas para issues críticas',
        'Mantenha comunicação consistente'
      ]
    }
  },
  'sRIxBbBEDf': { // issues_active
    bad: {
      title: 'Muitas Issues Abertas Acumuladas',
      description: 'Grande quantidade de issues abertas pode indicar falta de manutenção ou sobrecarga da equipe.',
      actionItems: [
        'Faça limpeza de issues obsoletas',
        'Implemente processo de triagem semanal',
        'Priorize issues críticas e de segurança',
        'Use milestones para organizar trabalho'
      ]
    },
    reasonable: {
      title: 'Volume de Issues Controlável',
      description: 'Número de issues abertas está em nível gerenciável.',
      actionItems: [
        'Mantenha organização por labels',
        'Revise periodicamente issues antigas'
      ]
    }
  },
  'FNhzIJAQkt': { // code_changes_commits
    bad: {
      title: 'Baixa Atividade de Desenvolvimento',
      description: 'Poucos commits podem indicar desenvolvimento estagnado ou infrequente.',
      actionItems: [
        'Estabeleça cronograma regular de releases',
        'Encoraje commits menores e mais frequentes',
        'Implemente integração contínua',
        'Defina roadmap público de desenvolvimento'
      ]
    },
    reasonable: {
      title: 'Atividade de Desenvolvimento Moderada',
      description: 'Frequência de commits é aceitável, mas pode ser mais consistente.',
      actionItems: [
        'Mantenha commits pequenos e focados',
        'Use conventional commits para melhor histórico'
      ]
    }
  },
  'VLPRbFJ12z': { // median_time_to_close
    bad: {
      title: 'Mediana de Tempo de Fechamento Elevada',
      description: 'A maioria das issues demora muito para ser resolvida.',
      actionItems: [
        'Priorize issues por impacto e esforço',
        'Implemente processo de triagem mais eficiente',
        'Considere automatizar resoluções simples'
      ]
    },
    reasonable: {
      title: 'Tempo Mediano de Resolução Razoável',
      description: 'O tempo mediano está controlado, mas pode melhorar.',
      actionItems: [
        'Monitore outliers que demoram muito',
        'Mantenha comunicação sobre progresso'
      ]
    }
  },
  'wPi1_kxvHc': { // issues_closed
    bad: {
      title: 'Baixa Taxa de Resolução de Issues',
      description: 'Poucas issues são fechadas, indicando possível acúmulo ou baixa atividade de manutenção.',
      actionItems: [
        'Revise issues antigas para fechamento',
        'Implemente processo regular de cleanup',
        'Melhore processo de triagem e priorização',
        'Considere fechar issues obsoletas ou duplicadas'
      ]
    },
    reasonable: {
      title: 'Taxa de Resolução Moderada',
      description: 'Issues são fechadas em ritmo aceitável.',
      actionItems: [
        'Continue monitorando taxa de resolução',
        'Mantenha equilibrio entre novas issues e resoluções'
      ]
    }
  },
  'U7S5Hh5Ojg': { // max_change_set
    bad: {
      title: 'Changeset Muito Grande',
      description: 'Commits com muitas alterações podem indicar falta de granularidade e dificultar revisões.',
      actionItems: [
        'Encoraje commits menores e mais focados',
        'Implemente revisões de código obrigatórias',
        'Use feature branches para mudanças grandes',
        'Considere refatoração incremental'
      ]
    },
    reasonable: {
      title: 'Tamanho de Changeset Moderado',
      description: 'Tamanho dos commits está controlado, mas pode melhorar.',
      actionItems: [
        'Continue incentivando commits atômicos',
        'Monitore PRs muito grandes'
      ]
    }
  },
  'A79za5LrkK': { // avg_change_set
    bad: {
      title: 'Changeset Médio Muito Grande',
      description: 'Commits em média são muito grandes, dificultando revisões e aumentando risco.',
      actionItems: [
        'Treine equipe em atomic commits',
        'Implemente limites de tamanho de PR',
        'Use ferramentas de análise de diff',
        'Encoraje refatoração contínua'
      ]
    },
    reasonable: {
      title: 'Tamanho Médio de Changeset Aceitável',
      description: 'Tamanho médio dos commits está em nível gerenciável.',
      actionItems: [
        'Mantenha práticas de commits pequenos',
        'Revise periodicamente PRs grandes'
      ]
    }
  }
}

export function generateRecommendations(metricsData: MetricData[]): Recommendation[] {
  const recommendations: Recommendation[] = []

  console.log('🔍 Generating recommendations for metrics:', metricsData.length)

  metricsData.forEach(metric => {
    console.log(`📊 Metric ${metric.id} (${metric.name}): ${metric.situation}`)
    
    if (metric.situation === 'OK') return

    const metricRecommendations = METRIC_RECOMMENDATIONS[metric.id]
    if (!metricRecommendations) {
      console.log(`⚠️ No recommendations found for metric ID: ${metric.id}`)
      return
    }

    const severityLevel = metric.situation === 'BAD' ? 'bad' : 'reasonable'
    const recommendation = metricRecommendations[severityLevel]
    
    if (recommendation) {
      console.log(`✅ Adding recommendation for ${metric.name}`)
      recommendations.push({
        type: metric.situation === 'BAD' ? 'critical' : 'warning',
        metric: metric.name,
        title: recommendation.title,
        description: recommendation.description,
        actionItems: recommendation.actionItems
      })
    }
  })

  console.log(`📋 Total recommendations generated: ${recommendations.length}`)

  // Sort by severity (critical first)
  recommendations.sort((a, b) => {
    if (a.type === 'critical' && b.type !== 'critical') return -1
    if (a.type !== 'critical' && b.type === 'critical') return 1
    return 0
  })

  return recommendations
}

export default generateRecommendations
