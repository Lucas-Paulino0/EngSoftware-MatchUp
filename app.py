from flask import Flask, jsonify, request

app = Flask(__name__)

# Banco de dados em memória (simples para a Release 01)
usuarios = []

# [RF01] Cadastrar Usuário
@app.route('/usuarios', methods=['POST'])
def cadastrar():
    novo_usuario = request.json
    usuarios.append(novo_usuario)
    return jsonify({"mensagem": "Usuário cadastrado com sucesso!"}), 201

# [RF03] Consultar Usuário
@app.route('/usuarios', methods=['GET'])
def listar():
    return jsonify(usuarios)

if __name__ == '__main__':
    app.run(debug=True)