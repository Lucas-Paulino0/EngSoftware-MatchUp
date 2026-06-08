from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from database import supabase
import os


app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "matchup_secret_key")
CORS(app, supports_credentials=True)


@app.route("/")
def home():
    return render_template("index.html")


def usuario_logado():
    return session.get("usuario")


@app.route("/sessao", methods=["GET"])
def verificar_sessao():
    usuario = usuario_logado()

    if not usuario:
        return jsonify({
            "logado": False,
            "usuario": None
        }), 200

    return jsonify({
        "logado": True,
        "usuario": usuario
    }), 200


@app.route("/usuarios", methods=["POST"])
def cadastrar_usuario():
    dados = request.get_json()

    nome = dados.get("nome")
    email = dados.get("email")
    senha = dados.get("senha")
    data_nascimento = dados.get("data_nascimento")
    apelido = dados.get("apelido")
    foto_perfil = dados.get("foto_perfil")

    if not nome or not email or not senha:
        return jsonify({"erro": "Nome, e-mail e senha são obrigatórios."}), 400

    if len(senha) < 8:
        return jsonify({"erro": "A senha deve ter no mínimo 8 caracteres."}), 400

    usuario_existente = supabase.table("usuarios").select("*").eq("email", email).execute()

    if usuario_existente.data:
        return jsonify({"erro": "E-mail já cadastrado."}), 400

    senha_hash = generate_password_hash(senha)

    novo_usuario = {
        "nome": nome,
        "email": email,
        "senha": senha_hash,
        "data_nascimento": data_nascimento if data_nascimento else None,
        "apelido": apelido,
        "foto_perfil": foto_perfil
    }

    resposta = supabase.table("usuarios").insert(novo_usuario).execute()

    usuario_criado = resposta.data[0]

    usuario_criado.pop("senha", None)

    return jsonify({
        "mensagem": "Usuário cadastrado com sucesso.",
        "usuario": usuario_criado
    }), 201


@app.route("/usuarios", methods=["GET"])
def listar_usuarios():
    resposta = supabase.table("usuarios").select(
        "id, nome, email, data_nascimento, apelido, foto_perfil, criado_em"
    ).order("criado_em", desc=True).execute()

    return jsonify(resposta.data), 200


@app.route("/usuarios/<email>", methods=["PUT"])
def alterar_usuario(email):
    dados = request.get_json()

    usuario_existente = supabase.table("usuarios").select("*").eq("email", email).execute()

    if not usuario_existente.data:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    usuario = usuario_existente.data[0]

    dados_atualizados = {}

    if "nome" in dados:
        dados_atualizados["nome"] = dados.get("nome")

    if "apelido" in dados:
        dados_atualizados["apelido"] = dados.get("apelido")

    if "data_nascimento" in dados:
        dados_atualizados["data_nascimento"] = dados.get("data_nascimento") or None

    if "foto_perfil" in dados:
        dados_atualizados["foto_perfil"] = dados.get("foto_perfil")

    if "email" in dados:
        novo_email = dados.get("email")
        senha_atual = dados.get("senha_atual")

        if not senha_atual:
            return jsonify({"erro": "Para alterar o e-mail, informe a senha atual."}), 400

        if not check_password_hash(usuario["senha"], senha_atual):
            return jsonify({"erro": "Senha atual incorreta."}), 401

        email_em_uso = supabase.table("usuarios").select("*").eq("email", novo_email).execute()

        if email_em_uso.data and email_em_uso.data[0]["id"] != usuario["id"]:
            return jsonify({"erro": "Este novo e-mail já está em uso."}), 400

        dados_atualizados["email"] = novo_email

    if "senha" in dados:
        nova_senha = dados.get("senha")

        if len(nova_senha) < 8:
            return jsonify({"erro": "A nova senha deve ter no mínimo 8 caracteres."}), 400

        dados_atualizados["senha"] = generate_password_hash(nova_senha)

    if not dados_atualizados:
        return jsonify({"erro": "Nenhum dado enviado para alteração."}), 400

    resposta = supabase.table("usuarios").update(dados_atualizados).eq("email", email).execute()

    usuario_atualizado = resposta.data[0]
    usuario_atualizado.pop("senha", None)

    return jsonify({
        "mensagem": "Usuário alterado com sucesso.",
        "usuario": usuario_atualizado
    }), 200


@app.route("/usuarios/<email>", methods=["DELETE"])
def excluir_usuario(email):
    usuario_existente = supabase.table("usuarios").select("*").eq("email", email).execute()

    if not usuario_existente.data:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    usuario = usuario_existente.data[0]

    atividades_futuras = supabase.table("atividades").select("*").eq(
        "organizador_id", usuario["id"]
    ).eq("status", "Aberta").execute()

    if atividades_futuras.data:
        return jsonify({
            "erro": "Usuário possui atividades abertas. Cancele ou encerre as atividades antes de excluir a conta."
        }), 400

    supabase.table("usuarios").delete().eq("email", email).execute()

    if usuario_logado() and usuario_logado().get("email") == email:
        session.clear()

    return jsonify({"mensagem": "Usuário excluído com sucesso."}), 200


@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json()

    email = dados.get("email")
    senha = dados.get("senha")

    if not email or not senha:
        return jsonify({"erro": "E-mail e senha são obrigatórios."}), 400

    resposta = supabase.table("usuarios").select("*").eq("email", email).execute()

    if not resposta.data:
        return jsonify({"erro": "E-mail ou senha inválidos."}), 401

    usuario = resposta.data[0]

    if not check_password_hash(usuario["senha"], senha):
        return jsonify({"erro": "E-mail ou senha inválidos."}), 401

    session["usuario"] = {
        "id": usuario["id"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "apelido": usuario.get("apelido")
    }

    return jsonify({
        "mensagem": "Login realizado com sucesso.",
        "usuario": session["usuario"]
    }), 200


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({"mensagem": "Logout realizado com sucesso."}), 200


if __name__ == "__main__":
    app.run(debug=True)