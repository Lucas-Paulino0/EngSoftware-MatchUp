from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Bancos de dados em memória
usuarios = []
atividades = []
inscricoes = []
avaliacoes = []

@app.route('/')
def index():
    # O HTML será carregado separadamente para não poluir o código Python
    return "<h1>Servidor MatchUp Rodando! Abra o arquivo index.html no navegador.</h1>"

# ==========================================
# 1. CRUD USUÁRIO
# ==========================================
@app.route('/usuarios', methods=['POST'])
def criar_usuario():
    data = request.json
    if any(u['email'] == data['email'] for u in usuarios): return jsonify({"erro": "E-mail já cadastrado!"}), 400
    usuarios.append(data)
    return jsonify({"mensagem": "Usuário criado!"}), 201

@app.route('/usuarios', methods=['GET'])
def listar_usuarios(): return jsonify(usuarios)

@app.route('/usuarios/<email>', methods=['PUT'])
def atualizar_usuario(email):
    data = request.json
    for u in usuarios:
        if u['email'] == email:
            u.update(data)
            return jsonify({"mensagem": "Usuário atualizado!"})
    return jsonify({"erro": "Usuário não encontrado"}), 404

@app.route('/usuarios/<email>', methods=['DELETE'])
def deletar_usuario(email):
    global usuarios
    usuarios = [u for u in usuarios if u['email'] != email]
    return jsonify({"mensagem": "Usuário deletado!"})

# ==========================================
# 2. CRUD ATIVIDADE & BUSCA
# ==========================================
@app.route('/atividades', methods=['POST'])
def criar_atividade():
    data = request.json
    if data['vagas'] <= 0: return jsonify({"erro": "Vagas deve ser > 0"}), 400
    atividades.append(data)
    return jsonify({"mensagem": "Atividade criada!"}), 201

@app.route('/atividades', methods=['GET'])
def listar_atividades(): return jsonify(atividades)

@app.route('/atividades/buscar', methods=['GET'])
def buscar_atividades():
    titulo = request.args.get('titulo')
    if titulo:
        resultado = [a for a in atividades if titulo.lower() in a['titulo'].lower()]
        return jsonify(resultado)
    return jsonify(atividades)

@app.route('/atividades/<titulo>', methods=['PUT'])
def atualizar_atividade(titulo):
    data = request.json
    for a in atividades:
        if a['titulo'] == titulo:
            a.update(data)
            return jsonify({"mensagem": "Atividade atualizada!"})
    return jsonify({"erro": "Atividade não encontrada"}), 404

@app.route('/atividades/<titulo>', methods=['DELETE'])
def deletar_atividade(titulo):
    global atividades
    atividades = [a for a in atividades if a['titulo'] != titulo]
    return jsonify({"mensagem": "Atividade cancelada!"})

# ==========================================
# 3. CRUD INSCRIÇÃO (Novo)
# ==========================================
@app.route('/inscricoes', methods=['POST'])
def criar_inscricao():
    data = request.json
    # Regra de Negócio: Não pode se inscrever duas vezes na mesma atividade
    for i in inscricoes:
        if i['email'] == data['email'] and i['titulo_atividade'] == data['titulo_atividade']:
            return jsonify({"erro": "Usuário já inscrito nesta atividade!"}), 400
    inscricoes.append(data)
    return jsonify({"mensagem": "Inscrição realizada!"}), 201

@app.route('/inscricoes', methods=['GET'])
def listar_inscricoes(): return jsonify(inscricoes)

@app.route('/inscricoes/<email>/<titulo>', methods=['PUT'])
def atualizar_inscricao(email, titulo):
    data = request.json
    for i in inscricoes:
        if i['email'] == email and i['titulo_atividade'] == titulo:
            i.update(data)
            return jsonify({"mensagem": "Inscrição atualizada!"})
    return jsonify({"erro": "Inscrição não encontrada"}), 404

@app.route('/inscricoes/<email>/<titulo>', methods=['DELETE'])
def deletar_inscricao(email, titulo):
    global inscricoes
    inscricoes = [i for i in inscricoes if not (i['email'] == email and i['titulo_atividade'] == titulo)]
    return jsonify({"mensagem": "Inscrição cancelada!"})

# ==========================================
# 4. CRUD AVALIAÇÃO (Novo)
# ==========================================
@app.route('/avaliacoes', methods=['POST'])
def criar_avaliacao():
    data = request.json
    # Regra de Negócio: Nota deve ser entre 1 e 5
    nota = int(data.get('nota', 0))
    if nota < 1 or nota > 5:
        return jsonify({"erro": "A nota deve ser entre 1 e 5!"}), 400
    avaliacoes.append(data)
    return jsonify({"mensagem": "Avaliação registrada!"}), 201

@app.route('/avaliacoes', methods=['GET'])
def listar_avaliacoes(): return jsonify(avaliacoes)

@app.route('/avaliacoes/<email>/<titulo>', methods=['PUT'])
def atualizar_avaliacao(email, titulo):
    data = request.json
    if 'nota' in data and (int(data['nota']) < 1 or int(data['nota']) > 5):
        return jsonify({"erro": "A nota deve ser entre 1 e 5!"}), 400
    for a in avaliacoes:
        if a['email'] == email and a['titulo_atividade'] == titulo:
            a.update(data)
            return jsonify({"mensagem": "Avaliação atualizada!"})
    return jsonify({"erro": "Avaliação não encontrada"}), 404

@app.route('/avaliacoes/<email>/<titulo>', methods=['DELETE'])
def deletar_avaliacao(email, titulo):
    global avaliacoes
    avaliacoes = [a for a in avaliacoes if not (a['email'] == email and a['titulo_atividade'] == titulo)]
    return jsonify({"mensagem": "Avaliação deletada!"})

if __name__ == '__main__':
    app.run(debug=True)