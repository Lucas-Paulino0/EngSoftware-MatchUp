from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from database import supabase
from datetime import datetime
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

def login_obrigatorio():
    usuario = usuario_logado()

    if not usuario:
        return None, (jsonify({
            "erro": "É necessário estar logado para acessar esta funcionalidade."
        }), 401)

    return usuario, None


def data_horario_futuros(data_str, horario_str):
    try:
        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
        horario_obj = datetime.strptime(horario_str[:5], "%H:%M").time()
        data_hora_atividade = datetime.combine(data_obj, horario_obj)

        return data_hora_atividade > datetime.now()
    except ValueError:
        return False


@app.route("/atividades", methods=["POST"])
def cadastrar_atividade():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    dados = request.get_json()

    titulo = dados.get("titulo")
    categoria = dados.get("categoria")
    data_atividade = dados.get("data")
    horario = dados.get("horario")
    local = dados.get("local")
    limite_vagas = dados.get("limite_vagas")
    descricao = dados.get("descricao")
    requisitos = dados.get("requisitos")

    if not titulo or not categoria or not data_atividade or not horario or not local or not limite_vagas:
        return jsonify({
            "erro": "Título, categoria, data, horário, local e limite de vagas são obrigatórios."
        }), 400

    try:
        limite_vagas = int(limite_vagas)
    except ValueError:
        return jsonify({"erro": "O limite de vagas deve ser um número inteiro."}), 400

    if limite_vagas <= 0:
        return jsonify({"erro": "O limite de vagas deve ser maior que zero."}), 400

    if not data_horario_futuros(data_atividade, horario):
        return jsonify({
            "erro": "A data e o horário da atividade devem ser posteriores ao momento atual."
        }), 400

    nova_atividade = {
        "titulo": titulo,
        "categoria": categoria,
        "data": data_atividade,
        "horario": horario,
        "local": local,
        "limite_vagas": limite_vagas,
        "descricao": descricao,
        "requisitos": requisitos,
        "status": "Aberta",
        "organizador_id": usuario["id"]
    }

    resposta = supabase.table("atividades").insert(nova_atividade).execute()

    return jsonify({
        "mensagem": "Atividade cadastrada com sucesso.",
        "atividade": resposta.data[0]
    }), 201


@app.route("/atividades", methods=["GET"])
def listar_atividades():
    resposta = supabase.table("atividades").select(
        "*, usuarios!atividades_organizador_id_fkey(nome, email, apelido)"
    ).order("data", desc=False).execute()

    return jsonify(resposta.data), 200


@app.route("/atividades/buscar", methods=["GET"])
def buscar_atividades():
    categoria = request.args.get("categoria")
    data_atividade = request.args.get("data")
    local = request.args.get("local")
    titulo = request.args.get("titulo")
    status = request.args.get("status")

    consulta = supabase.table("atividades").select(
        "*, usuarios!atividades_organizador_id_fkey(nome, email, apelido)"
    )

    if categoria:
        consulta = consulta.eq("categoria", categoria)

    if data_atividade:
        consulta = consulta.eq("data", data_atividade)

    if local:
        consulta = consulta.ilike("local", f"%{local}%")

    if titulo:
        consulta = consulta.ilike("titulo", f"%{titulo}%")

    if status:
        consulta = consulta.eq("status", status)

    resposta = consulta.order("data", desc=False).execute()

    return jsonify(resposta.data), 200


@app.route("/atividades/<atividade_id>", methods=["GET"])
def consultar_atividade(atividade_id):
    resposta = supabase.table("atividades").select(
        "*, usuarios!atividades_organizador_id_fkey(nome, email, apelido)"
    ).eq("id", atividade_id).execute()

    if not resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    return jsonify(resposta.data[0]), 200


@app.route("/atividades/<atividade_id>", methods=["PUT"])
def alterar_atividade(atividade_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    atividade_resposta = supabase.table("atividades").select("*").eq("id", atividade_id).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if atividade["organizador_id"] != usuario["id"]:
        return jsonify({
            "erro": "Somente o organizador responsável pode alterar esta atividade."
        }), 403

    if atividade["status"] != "Aberta":
        return jsonify({
            "erro": "Atividades encerradas ou canceladas não podem ser alteradas."
        }), 400

    dados = request.get_json()
    dados_atualizados = {}

    campos_permitidos = [
        "titulo",
        "categoria",
        "data",
        "horario",
        "local",
        "limite_vagas",
        "descricao",
        "requisitos"
    ]

    for campo in campos_permitidos:
        if campo in dados:
            dados_atualizados[campo] = dados.get(campo)

    if "limite_vagas" in dados_atualizados:
        try:
            dados_atualizados["limite_vagas"] = int(dados_atualizados["limite_vagas"])
        except ValueError:
            return jsonify({"erro": "O limite de vagas deve ser um número inteiro."}), 400

        if dados_atualizados["limite_vagas"] <= 0:
            return jsonify({"erro": "O limite de vagas deve ser maior que zero."}), 400

        participantes_confirmados = supabase.table("inscricoes").select("*").eq(
            "atividade_id", atividade_id
        ).eq("status", "Confirmado").execute()

        if dados_atualizados["limite_vagas"] < len(participantes_confirmados.data):
            return jsonify({
                "erro": "O novo limite de vagas é menor que o número atual de participantes confirmados."
            }), 400

    data_final = dados_atualizados.get("data", atividade["data"])
    horario_final = dados_atualizados.get("horario", atividade["horario"])

    if "data" in dados_atualizados or "horario" in dados_atualizados:
        if not data_horario_futuros(data_final, horario_final):
            return jsonify({
                "erro": "A data e o horário da atividade devem ser posteriores ao momento atual."
            }), 400

    if not dados_atualizados:
        return jsonify({"erro": "Nenhum dado enviado para alteração."}), 400

    resposta = supabase.table("atividades").update(dados_atualizados).eq("id", atividade_id).execute()

    return jsonify({
        "mensagem": "Atividade alterada com sucesso.",
        "atividade": resposta.data[0]
    }), 200


@app.route("/atividades/<atividade_id>", methods=["DELETE"])
def cancelar_atividade(atividade_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    atividade_resposta = supabase.table("atividades").select("*").eq("id", atividade_id).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if atividade["organizador_id"] != usuario["id"]:
        return jsonify({"erro": "Somente o organizador pode cancelar esta atividade."}), 403

    if atividade["status"] == "Encerrada":
        return jsonify({"erro": "Atividades encerradas não podem ser canceladas."}), 400

    if atividade["status"] == "Cancelada":
        return jsonify({"erro": "Esta atividade já está cancelada."}), 400

    resposta = supabase.table("atividades").update({
        "status": "Cancelada"
    }).eq("id", atividade_id).execute()

    inscricoes = supabase.table("inscricoes").select("*").eq("atividade_id", atividade_id).execute()

    for inscricao in inscricoes.data:
        supabase.table("notificacoes").insert({
            "usuario_id": inscricao["usuario_id"],
            "titulo": "Atividade cancelada",
            "mensagem": f"A atividade '{atividade['titulo']}' foi cancelada pelo organizador."
        }).execute()

    return jsonify({
        "mensagem": "Atividade cancelada com sucesso.",
        "atividade": resposta.data[0]
    }), 200

if __name__ == "__main__":
    app.run(debug=True)