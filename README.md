# HealthyEnv

A tool to assist in health assessment of software repositories

🚀 **Live Demo:** [healthyenv.vercel.app](https://healthyenv.vercel.app/)

## 🏗️ Architecture

HealthyEnv é uma ferramenta de análise de repositórios com arquitetura de duas camadas:

- **Backend API** (`/api`): Flask + SQLAlchemy + MySQL + ML clustering
- **Frontend** (`/app`): Next.js + TypeScript + Plotly.js + GitHub OAuth

## 🚀 Quick Start

### Método 1: Docker (Recomendado)
```bash
# Clonar repositório
git clone <repo-url>
cd healthyEnv

# Iniciar com Docker
docker-compose up
```

### Método 2: Setup Manual
```bash
# Clonar repositório
git clone <repo-url>
cd healthyEnv

# Setup automatizado do backend
cd api
python dev-setup.py

# Setup do frontend (nova aba)
cd ../app
npm install
npm run dev
```

## 🔧 Development

### Backend (Flask API - Port 5000)
```bash
cd api
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python app.py
```

### Frontend (Next.js - Port 3000)
```bash
cd app
npm install
npm run dev
```

## 📊 Features

- **Repository Analysis**: Análise automatizada de métricas de repositórios GitHub
- **ML Clustering**: Agrupamento de repositórios similares usando PCA + StandardScaler
- **Interactive Visualizations**: Dashboards com Plotly.js
- **GitHub OAuth**: Integração completa com autenticação GitHub
- **Health Monitoring**: Endpoints de health check e logging estruturado

## 🛠️ Configuration

### Environment Variables

**Backend (`.env`):**
```bash
DB_USER=root
DB_PASSWORD=root
DB_HOST=localhost
DB_NAME=helthyenv
GH_CLIENT_ID=your_github_client_id
GH_CLIENT_SECRET=your_github_client_secret
```

**Frontend (`.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

## 🧪 Testing

```bash
# Backend
cd api
python -m pytest tests/

# Frontend
cd app
npm test

# Health Check
curl http://localhost:5000/health
```

## 📚 Documentation

- [API Documentation](/.github/copilot-instructions.md)
- [Development Roadmap](/.github/ROADMAP.md)
- [Quick Start Guide](/.github/QUICK_START.md)
- [Setup Guide](/.github/SETUP.md)

## 🤝 Contributing

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 License

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.
