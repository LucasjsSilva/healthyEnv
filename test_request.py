#!/usr/bin/env python3
"""
Script para testar a requisição POST /datasets/{id}/request
"""
import requests
import json

def test_request():
    # URL do endpoint
    url = "http://localhost:5000/datasets/9v5Hdr5YG7/request"
    
    # Dados da requisição
    data = {
        "name": "test_user",
        "email": "test@example.com",
        "repo_url": "https://github.com/test/repo"
    }
    
    print(f"🔍 Testando requisição POST para: {url}")
    print(f"📤 Dados: {json.dumps(data, indent=2)}")
    
    try:
        # Fazer a requisição
        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.text:
            try:
                print(f"📄 Response: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"📄 Response (raw): {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor. Verifique se está rodando na porta 5000.")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    test_request()
