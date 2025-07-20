#!/usr/bin/env python3
"""
Script para verificar se ainda há problemas de Link no projeto
"""
import os
import re

def check_link_issues():
    """Verifica problemas de Link nos arquivos TSX"""
    print("🔍 Verificando problemas de Link no projeto...")
    
    issues_found = []
    
    for root, dirs, files in os.walk('../app'):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Verificar padrão problemático: <Link><a>
                    link_a_pattern = r'<Link[^>]*>\s*<a[^>]*>'
                    matches = re.findall(link_a_pattern, content, re.MULTILINE)
                    
                    if matches:
                        issues_found.append({
                            'file': filepath,
                            'issues': matches
                        })
                        
                except Exception as e:
                    print(f"Erro ao ler {filepath}: {e}")
    
    if issues_found:
        print("❌ Problemas encontrados:")
        for issue in issues_found:
            print(f"  📄 {issue['file']}")
            for match in issue['issues']:
                print(f"    🔸 {match}")
    else:
        print("✅ Nenhum problema de Link encontrado!")
    
    return len(issues_found) == 0

if __name__ == "__main__":
    check_link_issues()
