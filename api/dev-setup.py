#!/usr/bin/env python3
"""
Script para configuração do ambiente de desenvolvimento do HealthyEnv
"""
import os
import subprocess
import sys
import shutil

def check_python_version():
    """Verifica se a versão do Python é compatível"""
    if sys.version_info < (3, 11):
        print("❌ Python 3.11+ é necessário")
        print(f"Versão atual: {sys.version}")
        sys.exit(1)
    print("✅ Python version OK")

def check_node_version():
    """Verifica se Node.js está instalado"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        version = result.stdout.strip()
        print(f"✅ Node.js version: {version}")
        return True
    except FileNotFoundError:
        print("⚠️ Node.js não encontrado. Você pode:")
        print("   1. Instalar Node.js de https://nodejs.org/")
        print("   2. Ou usar Docker: docker-compose up")
        return False

def create_venv():
    """Cria virtual environment para Python"""
    if not os.path.exists('venv'):
        print("🔄 Criando virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'])
        print("✅ Virtual environment criado")
    else:
        print("✅ Virtual environment já existe")

def install_backend_dependencies():
    """Instala dependências do backend"""
    print("🔄 Instalando dependências do backend...")
    
    # Ativar venv e instalar dependências
    if os.name == 'nt':  # Windows
        pip_path = 'venv\\Scripts\\pip'
    else:  # Unix/Linux/Mac
        pip_path = 'venv/bin/pip'
    
    subprocess.run([pip_path, 'install', '-r', 'requirements.txt'])
    print("✅ Dependências do backend instaladas")

def install_frontend_dependencies():
    """Instala dependências do frontend"""
    print("🔄 Instalando dependências do frontend...")
    try:
        # Salvar diretório atual
        current_dir = os.getcwd()
        os.chdir('../app')
        
        # Tentar instalar dependências
        result = subprocess.run(['npm', 'install'], check=True, capture_output=True, text=True)
        
        # Voltar ao diretório original
        os.chdir(current_dir)
        print("✅ Dependências do frontend instaladas")
        return True
        
    except FileNotFoundError:
        # Voltar ao diretório original
        os.chdir(current_dir)
        print("❌ npm não encontrado. Pule esta etapa e instale manualmente:")
        print("   1. Instale Node.js de https://nodejs.org/")
        print("   2. Execute: cd ../app && npm install")
        print("   3. Ou use Docker: docker-compose up")
        return False
        
    except subprocess.CalledProcessError as e:
        # Voltar ao diretório original
        os.chdir(current_dir)
        print(f"❌ Erro ao instalar dependências do frontend:")
        print(f"   {e.stderr if e.stderr else 'Erro desconhecido'}")
        print("Execute manualmente: cd ../app && npm install")
        return False
        
    except Exception as e:
        # Voltar ao diretório original em caso de qualquer erro
        os.chdir(current_dir)
        print(f"❌ Erro inesperado: {e}")
        return False

def check_env_files():
    """Verifica se arquivos .env existem"""
    if not os.path.exists('.env'):
        if os.path.exists('.env.example'):
            shutil.copy('.env.example', '.env')
            print("⚠️  Arquivo .env criado - configure suas variáveis")
        else:
            print("❌ Arquivo .env.example não encontrado")
    else:
        print("✅ Arquivo .env encontrado")
    
    # Verificar frontend
    frontend_env = '../app/.env.local'
    if not os.path.exists(frontend_env):
        frontend_example = '../app/.env.example'
        if os.path.exists(frontend_example):
            shutil.copy(frontend_example, frontend_env)
            print("⚠️  Arquivo .env.local criado no frontend - configure suas variáveis")

def create_logs_directory():
    """Cria diretório de logs"""
    if not os.path.exists('logs'):
        os.makedirs('logs')
        print("✅ Diretório de logs criado")
    else:
        print("✅ Diretório de logs já existe")

def test_imports():
    """Testa se as importações funcionam"""
    try:
        print("🔄 Testando importações...")
        # Test basic imports
        import flask
        import sqlalchemy
        import requests
        print("✅ Importações básicas funcionando")
    except ImportError as e:
        print(f"❌ Erro nas importações: {e}")

def main():
    """Função principal"""
    print("🚀 Configurando ambiente de desenvolvimento do HealthyEnv...")
    print("="*60)
    
    # Verificar pré-requisitos
    check_python_version()
    node_available = check_node_version()
    
    # Configurar backend
    print("\\n📦 Configurando Backend...")
    create_venv()
    install_backend_dependencies()
    check_env_files()
    create_logs_directory()
    test_imports()
    
    # Configurar frontend (apenas se Node.js estiver disponível)
    print("\\n🌐 Configurando Frontend...")
    if node_available:
        frontend_success = install_frontend_dependencies()
    else:
        frontend_success = False
        print("⚠️ Pulando instalação do frontend - Node.js não encontrado")
    
    print("\\n🎉 Setup do Backend completo!")
    print("="*60)
    print("Para iniciar o desenvolvimento:")
    print("\\n🔧 Backend:")
    if os.name == 'nt':  # Windows
        print("  venv\\Scripts\\activate")
    else:
        print("  source venv/bin/activate")
    print("  python app.py")
    
    if frontend_success:
        print("\\n🌐 Frontend (nova aba):")
        print("  cd ../app")
        print("  npm run dev")
    else:
        print("\\n🌐 Frontend (instale Node.js primeiro):")
        print("  1. Baixe Node.js: https://nodejs.org/")
        print("  2. Execute: cd ../app && npm install && npm run dev")
    
    print("\\n🐳 Alternativa - Docker (recomendado):")
    print("  docker-compose up")
    
    if not frontend_success:
        print("\\n⚠️ ATENÇÃO: Setup do frontend incompleto!")
        print("   Instale Node.js ou use Docker para desenvolvimento completo.")

if __name__ == "__main__":
    main()
