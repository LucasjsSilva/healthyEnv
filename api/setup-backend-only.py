#!/usr/bin/env python3
"""
Script simplificado para configuração apenas do backend do HealthyEnv
"""
import os
import subprocess
import sys
import shutil

def setup_backend_only():
    """Setup apenas do backend"""
    print("🚀 Configurando apenas o Backend do HealthyEnv...")
    print("="*50)
    
    # Verificar Python
    if sys.version_info < (3, 11):
        print("❌ Python 3.11+ é necessário")
        print(f"Versão atual: {sys.version}")
        sys.exit(1)
    print("✅ Python version OK")
    
    # Criar venv
    if not os.path.exists('venv'):
        print("🔄 Criando virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'])
        print("✅ Virtual environment criado")
    else:
        print("✅ Virtual environment já existe")
    
    # Instalar dependências
    print("🔄 Instalando dependências...")
    pip_path = 'venv\\Scripts\\pip' if os.name == 'nt' else 'venv/bin/pip'
    subprocess.run([pip_path, 'install', '--upgrade', 'pip'])
    subprocess.run([pip_path, 'install', '-r', 'requirements.txt'])
    print("✅ Dependências instaladas")
    
    # Verificar .env
    if not os.path.exists('.env'):
        if os.path.exists('.env.example'):
            shutil.copy('.env.example', '.env')
            print("⚠️ Arquivo .env criado - configure suas variáveis")
        else:
            print("❌ Arquivo .env.example não encontrado")
    else:
        print("✅ Arquivo .env encontrado")
    
    # Criar logs
    if not os.path.exists('logs'):
        os.makedirs('logs')
        print("✅ Diretório de logs criado")
    
    print("\\n🎉 Backend configurado com sucesso!")
    print("="*50)
    print("Para iniciar:")
    if os.name == 'nt':
        print("  venv\\Scripts\\activate")
    else:
        print("  source venv/bin/activate")
    print("  python app.py")
    print("\\nAPI estará disponível em: http://localhost:5000")
    print("Health check: http://localhost:5000/health")

if __name__ == "__main__":
    setup_backend_only()
