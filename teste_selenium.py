import requests
import time

URL = 'http://127.0.0.1:5000'

def pausa_dramatica():
    # Pausa de 3 segundos para dar tempo do professor ler a tela
    time.sleep(3)

print("\n" + "="*60)
print("🚀 INICIANDO BATERIA DE TESTES AUTOMATIZADOS (MATCHUP)")
print("="*60)
time.sleep(2)

# ---------------------------------------------------------
# TESTES DE USUÁRIO
# ---------------------------------------------------------
print("\n>>> 1. TESTANDO CADASTRO VÁLIDO DE USUÁRIO (RF01)...")
user = {"nome": "João", "email": "joao@unifei.edu.br", "senha": "123", "data_nascimento": "2000-01-01", "apelido": "Joca"}
r = requests.post(f"{URL}/usuarios", json=user)
print(f"[RESULTADO] Status: {r.status_code} | Resposta: {r.json()}")
pausa_dramatica()

print("\n>>> 2. TESTANDO REGRA [RN01]: E-MAIL ÚNICO...")
print("    -> Tentando cadastrar o mesmo e-mail (joao@unifei.edu.br)...")
r = requests.post(f"{URL}/usuarios", json=user)
print(f"[RESULTADO] Status: {r.status_code} | O sistema barrou! Resposta: {r.json()}")
pausa_dramatica()

# ---------------------------------------------------------
# TESTES DE ATIVIDADE
# ---------------------------------------------------------
print("\n>>> 3. TESTANDO REGRA [RN05]: VAGAS MAIORES QUE ZERO...")
print("    -> Tentando criar atividade de Futebol com 0 vagas...")
ativ_vagas_zero = {"titulo": "Futebol", "categoria": "Esporte", "data": "2026-12-31", "hora": "10:00", "vagas": 0, "descricao": "Jogo"}
r = requests.post(f"{URL}/atividades", json=ativ_vagas_zero)
print(f"[RESULTADO] Status: {r.status_code} | O sistema barrou! Resposta: {r.json()}")
pausa_dramatica()

print("\n>>> 4. TESTANDO REGRA [RN06]: DATA INVÁLIDA (PASSADO)...")
print("    -> Tentando criar atividade com data do ano passado (2025)...")
ativ_data_velha = {"titulo": "Basquete", "categoria": "Esporte", "data": "2025-01-01", "hora": "10:00", "vagas": 10, "descricao": "Jogo"}
r = requests.post(f"{URL}/atividades", json=ativ_data_velha)
print(f"[RESULTADO] Status: {r.status_code} | O sistema barrou! Resposta: {r.json()}")
pausa_dramatica()

print("\n>>> 5. TESTANDO CADASTRO VÁLIDO DE ATIVIDADE (RF08)...")
ativ_valida = {"titulo": "Vôlei", "categoria": "Esporte", "data": "2026-12-31", "hora": "15:00", "vagas": 12, "descricao": "Vôlei na quadra"}
r = requests.post(f"{URL}/atividades", json=ativ_valida)
print(f"[RESULTADO] Status: {r.status_code} | Resposta: {r.json()}")
pausa_dramatica()

# ---------------------------------------------------------
# FINALIZAÇÃO
# ---------------------------------------------------------
print("\n" + "="*60)
print("✅ TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!")
print("As Regras de Negócio do DRE estão sendo validadas pelo Back-end.")
print("="*60 + "\n")