from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from database import supabase
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os


load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv("SECRET_KEY", "matchup_secret_key")
app.permanent_session_lifetime = timedelta(days=7)

app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SECURE"] = False

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

    session.permanent = True

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

        total_jogadores_atual = len(participantes_confirmados.data) + 1

        if dados_atualizados["limite_vagas"] < total_jogadores_atual:
            return jsonify({
                "erro": "O novo limite de vagas é menor que o número atual de jogadores, incluindo o organizador."
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

def contar_confirmados(atividade_id):
    resposta = supabase.table("inscricoes").select("*").eq(
        "atividade_id", atividade_id
    ).eq("status", "Confirmado").execute()

    return len(resposta.data)


def proxima_posicao_lista_espera(atividade_id):
    resposta = supabase.table("inscricoes").select("*").eq(
        "atividade_id", atividade_id
    ).eq("status", "Lista de Espera").execute()

    return len(resposta.data) + 1


def promover_primeiro_da_lista_espera(atividade_id):
    lista_espera = supabase.table("inscricoes").select("*").eq(
        "atividade_id", atividade_id
    ).eq("status", "Lista de Espera").order(
        "posicao_espera", desc=False
    ).execute()

    if not lista_espera.data:
        return None

    primeiro = lista_espera.data[0]

    resposta = supabase.table("inscricoes").update({
        "status": "Confirmado",
        "posicao_espera": None
    }).eq("id", primeiro["id"]).execute()

    supabase.table("notificacoes").insert({
        "usuario_id": primeiro["usuario_id"],
        "titulo": "Inscrição confirmada",
        "mensagem": "Você foi promovido da lista de espera para participante confirmado."
    }).execute()

    reorganizar_lista_espera(atividade_id)

    return resposta.data[0]


def reorganizar_lista_espera(atividade_id):
    lista_espera = supabase.table("inscricoes").select("*").eq(
        "atividade_id", atividade_id
    ).eq("status", "Lista de Espera").order(
        "posicao_espera", desc=False
    ).execute()

    posicao = 1

    for inscricao in lista_espera.data:
        supabase.table("inscricoes").update({
            "posicao_espera": posicao
        }).eq("id", inscricao["id"]).execute()

        posicao += 1


@app.route("/inscricoes", methods=["POST"])
def cadastrar_inscricao():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    dados = request.get_json()
    atividade_id = dados.get("atividade_id")

    if not atividade_id:
        return jsonify({"erro": "A atividade é obrigatória."}), 400

    atividade_resposta = supabase.table("atividades").select("*").eq("id", atividade_id).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if atividade["status"] != "Aberta":
        return jsonify({"erro": "Não é possível se inscrever em atividades encerradas ou canceladas."}), 400

    if atividade["organizador_id"] == usuario["id"]:
        return jsonify({"erro": "O organizador não pode se inscrever na própria atividade."}), 400

    inscricao_existente = supabase.table("inscricoes").select("*").eq(
        "usuario_id", usuario["id"]
    ).eq("atividade_id", atividade_id).execute()

    if inscricao_existente.data:
        return jsonify({"erro": "Você já está inscrito nesta atividade."}), 400

    total_confirmados = contar_confirmados(atividade_id)

    # O organizador também conta como jogador da atividade
    total_jogadores = total_confirmados + 1

    if total_jogadores < atividade["limite_vagas"]:
        status = "Confirmado"
        posicao_espera = None
        mensagem = "Inscrição confirmada com sucesso."
    else:
        status = "Lista de Espera"
        posicao_espera = proxima_posicao_lista_espera(atividade_id)
        mensagem = f"Atividade cheia. Você entrou na lista de espera na posição {posicao_espera}."

    nova_inscricao = {
        "usuario_id": usuario["id"],
        "atividade_id": atividade_id,
        "status": status,
        "posicao_espera": posicao_espera
    }

    resposta = supabase.table("inscricoes").insert(nova_inscricao).execute()

    supabase.table("notificacoes").insert({
        "usuario_id": usuario["id"],
        "titulo": "Inscrição em atividade",
        "mensagem": mensagem
    }).execute()

    return jsonify({
        "mensagem": mensagem,
        "inscricao": resposta.data[0]
    }), 201


@app.route("/inscricoes", methods=["GET"])
def listar_inscricoes():
    resposta = supabase.table("inscricoes").select(
        "*, usuarios!inscricoes_usuario_id_fkey(nome, email, apelido), atividades!inscricoes_atividade_id_fkey(titulo, data, horario, local)"
    ).order("criado_em", desc=True).execute()

    return jsonify(resposta.data), 200


@app.route("/minhas-inscricoes", methods=["GET"])
def minhas_inscricoes():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    resposta = supabase.table("inscricoes").select(
        "*, atividades!inscricoes_atividade_id_fkey(titulo, data, horario, local, status)"
    ).eq("usuario_id", usuario["id"]).order("criado_em", desc=True).execute()

    return jsonify(resposta.data), 200


@app.route("/atividades/<atividade_id>/participantes", methods=["GET"])
def consultar_participantes_atividade(atividade_id):
    resposta = supabase.table("inscricoes").select(
        "*, usuarios!inscricoes_usuario_id_fkey(nome, email, apelido)"
    ).eq("atividade_id", atividade_id).order("status", desc=False).order(
        "posicao_espera", desc=False
    ).execute()

    return jsonify(resposta.data), 200


@app.route("/inscricoes/<inscricao_id>", methods=["DELETE"])
def cancelar_inscricao(inscricao_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    inscricao_resposta = supabase.table("inscricoes").select("*").eq("id", inscricao_id).execute()

    if not inscricao_resposta.data:
        return jsonify({"erro": "Inscrição não encontrada."}), 404

    inscricao = inscricao_resposta.data[0]

    atividade_resposta = supabase.table("atividades").select("*").eq(
        "id", inscricao["atividade_id"]
    ).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if inscricao["usuario_id"] != usuario["id"] and atividade["organizador_id"] != usuario["id"]:
        return jsonify({"erro": "Você não tem permissão para cancelar esta inscrição."}), 403

    if atividade["status"] == "Encerrada":
        return jsonify({"erro": "Não é possível cancelar inscrição de atividade encerrada."}), 400

    status_cancelado = inscricao["status"]
    atividade_id = inscricao["atividade_id"]

    supabase.table("inscricoes").delete().eq("id", inscricao_id).execute()

    promovido = None

    if status_cancelado == "Confirmado":
        promovido = promover_primeiro_da_lista_espera(atividade_id)
    else:
        reorganizar_lista_espera(atividade_id)

    supabase.table("notificacoes").insert({
        "usuario_id": inscricao["usuario_id"],
        "titulo": "Inscrição cancelada",
        "mensagem": f"Sua inscrição na atividade '{atividade['titulo']}' foi cancelada."
    }).execute()

    return jsonify({
        "mensagem": "Inscrição cancelada com sucesso.",
        "promovido_da_lista_espera": promovido
    }), 200
    
def usuario_participou_atividade(usuario_id, atividade_id):
    atividade_resposta = supabase.table("atividades").select(
        "id, organizador_id"
    ).eq("id", atividade_id).execute()

    if not atividade_resposta.data:
        return False

    atividade = atividade_resposta.data[0]

    # O organizador também é considerado participante da atividade
    if atividade["organizador_id"] == usuario_id:
        return True

    inscricao = supabase.table("inscricoes").select("*").eq(
        "usuario_id", usuario_id
    ).eq(
        "atividade_id", atividade_id
    ).eq(
        "status", "Confirmado"
    ).execute()

    return bool(inscricao.data)


def avaliacao_dentro_do_prazo(avaliacao):
    criado_em = avaliacao.get("criado_em")

    if not criado_em:
        return False

    try:
        criado_em = criado_em.replace("Z", "+00:00")
        data_criacao = datetime.fromisoformat(criado_em)

        if data_criacao.tzinfo is None:
            data_criacao = data_criacao.replace(tzinfo=timezone.utc)

        agora = datetime.now(timezone.utc)

        return agora <= data_criacao + timedelta(days=7)
    except ValueError:
        return False


@app.route("/avaliacoes", methods=["POST"])
def cadastrar_avaliacao():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    dados = request.get_json()

    avaliado_id = dados.get("avaliado_id")
    atividade_id = dados.get("atividade_id")
    nota = dados.get("nota")
    comentario = dados.get("comentario")

    if not avaliado_id or not atividade_id or nota is None:
        return jsonify({"erro": "Avaliado, atividade e nota são obrigatórios."}), 400

    try:
        nota = int(nota)
    except ValueError:
        return jsonify({"erro": "A nota deve ser um número inteiro."}), 400

    if nota < 0 or nota > 10:
        return jsonify({"erro": "A nota deve estar entre 0 e 10."}), 400

    if avaliado_id == usuario["id"]:
        return jsonify({"erro": "Você não pode avaliar a si próprio."}), 400

    atividade_resposta = supabase.table("atividades").select("*").eq("id", atividade_id).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if atividade["status"] != "Encerrada":
        return jsonify({"erro": "Avaliações só podem ser feitas após o encerramento da atividade."}), 400

    if not usuario_participou_atividade(usuario["id"], atividade_id):
        return jsonify({"erro": "Você só pode avaliar atividades em que participou."}), 400

    if not usuario_participou_atividade(avaliado_id, atividade_id):
        return jsonify({"erro": "O avaliado precisa ser participante confirmado da mesma atividade."}), 400

    avaliacao_existente = supabase.table("avaliacoes").select("*").eq(
        "avaliador_id", usuario["id"]
    ).eq("avaliado_id", avaliado_id).eq(
        "atividade_id", atividade_id
    ).execute()

    if avaliacao_existente.data:
        return jsonify({"erro": "Você já avaliou este participante nesta atividade."}), 400

    nova_avaliacao = {
        "avaliador_id": usuario["id"],
        "avaliado_id": avaliado_id,
        "atividade_id": atividade_id,
        "nota": nota,
        "comentario": comentario
    }

    resposta = supabase.table("avaliacoes").insert(nova_avaliacao).execute()

    supabase.table("notificacoes").insert({
        "usuario_id": avaliado_id,
        "titulo": "Nova avaliação recebida",
        "mensagem": f"Você recebeu uma nova avaliação na atividade '{atividade['titulo']}'."
    }).execute()

    return jsonify({
        "mensagem": "Avaliação cadastrada com sucesso.",
        "avaliacao": resposta.data[0]
    }), 201


@app.route("/avaliacoes", methods=["GET"])
def listar_avaliacoes():
    resposta = supabase.table("avaliacoes").select(
        "*, avaliador:usuarios!avaliacoes_avaliador_id_fkey(nome, email, apelido), avaliado:usuarios!avaliacoes_avaliado_id_fkey(nome, email, apelido), atividades!avaliacoes_atividade_id_fkey(titulo, data, horario)"
    ).order("criado_em", desc=True).execute()

    return jsonify(resposta.data), 200


@app.route("/minhas-avaliacoes", methods=["GET"])
def minhas_avaliacoes():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    resposta = supabase.table("avaliacoes").select(
        "*, avaliador:usuarios!avaliacoes_avaliador_id_fkey(nome, email, apelido), atividades!avaliacoes_atividade_id_fkey(titulo, data, horario)"
    ).eq("avaliado_id", usuario["id"]).order("criado_em", desc=True).execute()

    return jsonify(resposta.data), 200


@app.route("/avaliacoes/<avaliacao_id>", methods=["PUT"])
def alterar_avaliacao(avaliacao_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    avaliacao_resposta = supabase.table("avaliacoes").select("*").eq("id", avaliacao_id).execute()

    if not avaliacao_resposta.data:
        return jsonify({"erro": "Avaliação não encontrada."}), 404

    avaliacao = avaliacao_resposta.data[0]

    if avaliacao["avaliador_id"] != usuario["id"]:
        return jsonify({"erro": "Somente o autor da avaliação pode alterá-la."}), 403

    if not avaliacao_dentro_do_prazo(avaliacao):
        return jsonify({"erro": "Avaliações só podem ser alteradas dentro do prazo de 7 dias."}), 400

    dados = request.get_json()
    dados_atualizados = {}

    if "nota" in dados:
        try:
            nota = int(dados.get("nota"))
        except ValueError:
            return jsonify({"erro": "A nota deve ser um número inteiro."}), 400

        if nota < 0 or nota > 10:
            return jsonify({"erro": "A nota deve estar entre 0 e 10."}), 400

        dados_atualizados["nota"] = nota

    if "comentario" in dados:
        dados_atualizados["comentario"] = dados.get("comentario")

    if not dados_atualizados:
        return jsonify({"erro": "Nenhum dado enviado para alteração."}), 400

    dados_atualizados["atualizado_em"] = datetime.now(timezone.utc).isoformat()

    resposta = supabase.table("avaliacoes").update(dados_atualizados).eq("id", avaliacao_id).execute()

    return jsonify({
        "mensagem": "Avaliação alterada com sucesso.",
        "avaliacao": resposta.data[0]
    }), 200


@app.route("/avaliacoes/<avaliacao_id>", methods=["DELETE"])
def excluir_avaliacao(avaliacao_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    avaliacao_resposta = supabase.table("avaliacoes").select("*").eq("id", avaliacao_id).execute()

    if not avaliacao_resposta.data:
        return jsonify({"erro": "Avaliação não encontrada."}), 404

    avaliacao = avaliacao_resposta.data[0]

    if avaliacao["avaliador_id"] != usuario["id"]:
        return jsonify({"erro": "Somente o autor da avaliação pode excluí-la."}), 403

    if not avaliacao_dentro_do_prazo(avaliacao):
        return jsonify({"erro": "Avaliações só podem ser excluídas dentro do prazo de 7 dias."}), 400

    supabase.table("avaliacoes").delete().eq("id", avaliacao_id).execute()

    return jsonify({"mensagem": "Avaliação excluída com sucesso."}), 200

@app.route("/atividades/<atividade_id>/encerrar", methods=["PUT"])
def encerrar_atividade(atividade_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    atividade_resposta = supabase.table("atividades").select("*").eq("id", atividade_id).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if atividade["organizador_id"] != usuario["id"]:
        return jsonify({"erro": "Somente o organizador pode encerrar esta atividade."}), 403

    if atividade["status"] == "Cancelada":
        return jsonify({"erro": "Atividades canceladas não podem ser encerradas."}), 400

    if atividade["status"] == "Encerrada":
        return jsonify({"erro": "Esta atividade já está encerrada."}), 400

    resposta = supabase.table("atividades").update({
        "status": "Encerrada"
    }).eq("id", atividade_id).execute()

    inscricoes = supabase.table("inscricoes").select("*").eq(
        "atividade_id", atividade_id
    ).eq("status", "Confirmado").execute()

    for inscricao in inscricoes.data:
        supabase.table("notificacoes").insert({
            "usuario_id": inscricao["usuario_id"],
            "titulo": "Atividade encerrada",
            "mensagem": f"A atividade '{atividade['titulo']}' foi encerrada. As avaliações estão liberadas."
        }).execute()

    return jsonify({
        "mensagem": "Atividade encerrada com sucesso.",
        "atividade": resposta.data[0]
    }), 200
    
@app.route("/denuncias", methods=["POST"])
def cadastrar_denuncia():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    dados = request.get_json()

    tipo_alvo = dados.get("tipo_alvo")
    alvo_id = dados.get("alvo_id")
    motivo = dados.get("motivo")
    descricao = dados.get("descricao")

    if not tipo_alvo or not alvo_id or not motivo:
        return jsonify({
            "erro": "Tipo do alvo, alvo e motivo são obrigatórios."
        }), 400

    if tipo_alvo not in ["Usuario", "Atividade"]:
        return jsonify({
            "erro": "Tipo de alvo inválido."
        }), 400

    if tipo_alvo == "Usuario" and alvo_id == usuario["id"]:
        return jsonify({
            "erro": "Você não pode denunciar a si próprio."
        }), 400

    if tipo_alvo == "Usuario":
        alvo_resposta = supabase.table("usuarios").select("id").eq("id", alvo_id).execute()
    else:
        alvo_resposta = supabase.table("atividades").select("id").eq("id", alvo_id).execute()

    if not alvo_resposta.data:
        return jsonify({
            "erro": "Alvo da denúncia não encontrado."
        }), 404

    limite_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    denuncia_existente = supabase.table("denuncias").select("id").eq(
        "denunciante_id", usuario["id"]
    ).eq(
        "tipo_alvo", tipo_alvo
    ).eq(
        "alvo_id", alvo_id
    ).gte(
        "criado_em", limite_24h
    ).execute()

    if denuncia_existente.data:
        return jsonify({
            "erro": "Você já fez uma denúncia para este alvo nas últimas 24 horas."
        }), 400

    nova_denuncia = {
        "denunciante_id": usuario["id"],
        "tipo_alvo": tipo_alvo,
        "alvo_id": alvo_id,
        "motivo": motivo,
        "descricao": descricao,
        "status": "Pendente"
    }

    resposta = supabase.table("denuncias").insert(nova_denuncia).execute()

    return jsonify({
        "mensagem": "Denúncia registrada com sucesso.",
        "denuncia": resposta.data[0]
    }), 201


@app.route("/minhas-denuncias", methods=["GET"])
def minhas_denuncias():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    resposta = supabase.table("denuncias").select("*").eq(
        "denunciante_id", usuario["id"]
    ).order(
        "criado_em", desc=True
    ).execute()

    return jsonify(resposta.data), 200


@app.route("/denuncias/<denuncia_id>", methods=["DELETE"])
def cancelar_denuncia(denuncia_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    resposta = supabase.table("denuncias").select("*").eq("id", denuncia_id).execute()

    if not resposta.data:
        return jsonify({
            "erro": "Denúncia não encontrada."
        }), 404

    denuncia = resposta.data[0]

    if denuncia["denunciante_id"] != usuario["id"]:
        return jsonify({
            "erro": "Você não tem permissão para cancelar esta denúncia."
        }), 403

    if denuncia["status"] != "Pendente":
        return jsonify({
            "erro": "Somente denúncias pendentes podem ser canceladas."
        }), 400

    atualizada = supabase.table("denuncias").update({
        "status": "Arquivada"
    }).eq("id", denuncia_id).execute()

    return jsonify({
        "mensagem": "Denúncia cancelada com sucesso.",
        "denuncia": atualizada.data[0]
    }), 200
    
def usuario_tem_acesso_chat(usuario_id, atividade):
    if atividade["organizador_id"] == usuario_id:
        return True

    inscricao = supabase.table("inscricoes").select("*").eq(
        "usuario_id", usuario_id
    ).eq(
        "atividade_id", atividade["id"]
    ).eq(
        "status", "Confirmado"
    ).execute()

    return bool(inscricao.data)


@app.route("/atividades/<atividade_id>/chat", methods=["GET"])
def listar_mensagens_chat(atividade_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    atividade_resposta = supabase.table("atividades").select("*").eq(
        "id", atividade_id
    ).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if not usuario_tem_acesso_chat(usuario["id"], atividade):
        return jsonify({
            "erro": "Você não tem acesso ao chat desta atividade."
        }), 403

    resposta = supabase.table("mensagens_chat").select(
        "*, usuarios!mensagens_chat_usuario_id_fkey(nome, email, apelido)"
    ).eq(
        "atividade_id", atividade_id
    ).order(
        "criado_em", desc=False
    ).execute()

    return jsonify(resposta.data), 200


@app.route("/atividades/<atividade_id>/chat", methods=["POST"])
def enviar_mensagem_chat(atividade_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    dados = request.get_json() or {}
    mensagem = dados.get("mensagem", "").strip()

    if not mensagem:
        return jsonify({"erro": "A mensagem não pode estar vazia."}), 400

    if len(mensagem) > 500:
        return jsonify({"erro": "A mensagem deve ter no máximo 500 caracteres."}), 400

    atividade_resposta = supabase.table("atividades").select("*").eq(
        "id", atividade_id
    ).execute()

    if not atividade_resposta.data:
        return jsonify({"erro": "Atividade não encontrada."}), 404

    atividade = atividade_resposta.data[0]

    if atividade["status"] != "Aberta":
        return jsonify({
            "erro": "O chat só permite novas mensagens enquanto a atividade está aberta."
        }), 400

    if not usuario_tem_acesso_chat(usuario["id"], atividade):
        return jsonify({
            "erro": "Você não tem acesso ao chat desta atividade."
        }), 403

    nova_mensagem = {
        "atividade_id": atividade_id,
        "usuario_id": usuario["id"],
        "mensagem": mensagem
    }

    resposta = supabase.table("mensagens_chat").insert(nova_mensagem).execute()

    return jsonify({
        "mensagem": "Mensagem enviada com sucesso.",
        "chat": resposta.data[0]
    }), 201


@app.route("/minhas-atividades", methods=["GET"])
def consultar_minhas_atividades():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    atividades_organizadas = supabase.table("atividades").select(
        "*, usuarios!atividades_organizador_id_fkey(nome, email, apelido)"
    ).eq("organizador_id", usuario["id"]).order("data", desc=True).execute()

    minhas_inscricoes = supabase.table("inscricoes").select(
        "*, atividades!inscricoes_atividade_id_fkey(id, titulo, categoria, data, horario, local, limite_vagas, descricao, requisitos, status, organizador_id)"
    ).eq("usuario_id", usuario["id"]).order("criado_em", desc=True).execute()

    participando = []
    lista_espera = []
    encerradas_para_avaliar = []

    for inscricao in minhas_inscricoes.data:
        atividade = inscricao.get("atividades")

        if inscricao.get("status") == "Confirmado":
            participando.append(inscricao)

            if atividade and atividade.get("status") == "Encerrada":
                encerradas_para_avaliar.append(inscricao)

        elif inscricao.get("status") == "Lista de Espera":
            lista_espera.append(inscricao)

    organizadas_encerradas = [
        atividade for atividade in atividades_organizadas.data
        if atividade.get("status") == "Encerrada"
    ]

    return jsonify({
        "organizadas": atividades_organizadas.data,
        "participando": participando,
        "lista_espera": lista_espera,
        "encerradas_para_avaliar": encerradas_para_avaliar,
        "organizadas_encerradas": organizadas_encerradas
    }), 200


@app.route("/notificacoes", methods=["GET"])
def listar_notificacoes():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    resposta = supabase.table("notificacoes").select("*").eq(
        "usuario_id", usuario["id"]
    ).order("criado_em", desc=True).limit(30).execute()

    nao_lidas = [notificacao for notificacao in resposta.data if not notificacao.get("lida")]

    return jsonify({
        "notificacoes": resposta.data,
        "nao_lidas": len(nao_lidas)
    }), 200


@app.route("/notificacoes/marcar-todas-lidas", methods=["PUT"])
def marcar_todas_notificacoes_como_lidas():
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    supabase.table("notificacoes").update({
        "lida": True
    }).eq("usuario_id", usuario["id"]).execute()

    return jsonify({
        "mensagem": "Todas as notificações foram marcadas como lidas."
    }), 200


@app.route("/notificacoes/<notificacao_id>/lida", methods=["PUT"])
def marcar_notificacao_como_lida(notificacao_id):
    usuario, erro = login_obrigatorio()

    if erro:
        return erro

    notificacao_resposta = supabase.table("notificacoes").select("*").eq(
        "id", notificacao_id
    ).eq("usuario_id", usuario["id"]).execute()

    if not notificacao_resposta.data:
        return jsonify({"erro": "Notificação não encontrada."}), 404

    supabase.table("notificacoes").update({
        "lida": True
    }).eq("id", notificacao_id).execute()

    return jsonify({
        "mensagem": "Notificação marcada como lida."
    }), 200

@app.route("/usuarios/<usuario_id>/perfil", methods=["GET"])
def consultar_perfil_publico(usuario_id):
    usuario_resposta = supabase.table("usuarios").select(
        "id, nome, apelido, foto_perfil, criado_em"
    ).eq("id", usuario_id).execute()

    if not usuario_resposta.data:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    usuario = usuario_resposta.data[0]

    avaliacoes_resposta = supabase.table("avaliacoes").select(
        "id, nota, comentario, criado_em, "
        "usuarios!avaliacoes_avaliador_id_fkey(nome, apelido), "
        "atividades!avaliacoes_atividade_id_fkey(titulo, data)"
    ).eq("avaliado_id", usuario_id).order("criado_em", desc=True).execute()

    avaliacoes = avaliacoes_resposta.data

    if avaliacoes:
        soma_notas = sum([avaliacao["nota"] for avaliacao in avaliacoes])
        media_avaliacoes = round(soma_notas / len(avaliacoes), 1)
    else:
        media_avaliacoes = None

    atividades_organizadas = supabase.table("atividades").select(
        "id, titulo, categoria, data, horario, local, status"
    ).eq("organizador_id", usuario_id).order("data", desc=True).execute()

    atividades_participadas = supabase.table("inscricoes").select(
        "status, criado_em, "
        "atividades!inscricoes_atividade_id_fkey(id, titulo, categoria, data, horario, local, status)"
    ).eq("usuario_id", usuario_id).eq("status", "Confirmado").order(
        "criado_em", desc=True
    ).execute()

    return jsonify({
        "usuario": usuario,
        "media_avaliacoes": media_avaliacoes,
        "total_avaliacoes": len(avaliacoes),
        "avaliacoes": avaliacoes,
        "atividades_organizadas": atividades_organizadas.data,
        "atividades_participadas": atividades_participadas.data
    }), 200

if __name__ == "__main__":
    app.run(debug=True)