const API_URL = "";

async function verificarSessao() {
  const resposta = await fetch(`${API_URL}/sessao`, {
    method: "GET",
    credentials: "include",
  });

  const dados = await resposta.json();

  const areaSessao = document.getElementById("areaSessao");

  if (dados.logado) {
    areaSessao.innerHTML = `
            <p>Logado como: <strong>${dados.usuario.nome}</strong> (${dados.usuario.email})</p>
        `;
  } else {
    areaSessao.innerHTML = `<p>Você não está logado.</p>`;
  }

  return dados;
}

async function cadastrarUsuario() {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const data_nascimento =
    document.getElementById("data_nascimento").value || null;
  const apelido = document.getElementById("apelido").value;
  const foto_perfil = document.getElementById("foto_perfil").value;

  const resposta = await fetch(`${API_URL}/usuarios`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nome,
      email,
      senha,
      data_nascimento,
      apelido,
      foto_perfil,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  document.getElementById("nome").value = "";
  document.getElementById("email").value = "";
  document.getElementById("senha").value = "";
  document.getElementById("data_nascimento").value = "";
  document.getElementById("apelido").value = "";
  document.getElementById("foto_perfil").value = "";

  listarUsuarios();
}

async function login() {
  const email = document.getElementById("loginEmail").value;
  const senha = document.getElementById("loginSenha").value;

  const resposta = await fetch(`${API_URL}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      senha,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);
  verificarSessao();
}

async function logout() {
  const resposta = await fetch(`${API_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });

  const dados = await resposta.json();

  alert(dados.mensagem);
  verificarSessao();
}

async function listarUsuarios() {
  const resposta = await fetch(`${API_URL}/usuarios`, {
    method: "GET",
    credentials: "include",
  });

  const usuarios = await resposta.json();

  const tabela = document.querySelector("#tabUsuarios tbody");
  tabela.innerHTML = "";

  usuarios.forEach((usuario) => {
    tabela.innerHTML += `
            <tr>
                <td>${usuario.nome}</td>
                <td>${usuario.email}</td>
                <td>${usuario.apelido || "-"}</td>
            </tr>
        `;
  });

  atualizarDropdownsUsuarios(usuarios);
}

function atualizarDropdownsUsuarios(usuarios) {
  let opcoes = '<option value="">Selecione o Usuário...</option>';

  usuarios.forEach((usuario) => {
    opcoes += `<option value="${usuario.id}">${usuario.nome} (${usuario.email})</option>`;
  });

  const iEmail = document.getElementById("i_email");
  const avEmail = document.getElementById("av_email");
  const avAvaliado = document.getElementById("av_avaliado");

  if (iEmail) iEmail.innerHTML = opcoes;
  if (avEmail) avEmail.innerHTML = opcoes;
  if (avAvaliado) avAvaliado.innerHTML = opcoes;
}

async function cadastrarAtividade() {
  const titulo = document.getElementById("tituloAtividade").value;
  const categoria = document.getElementById("categoriaAtividade").value;
  const data = document.getElementById("dataAtividade").value;
  const horario = document.getElementById("horarioAtividade").value;
  const local = document.getElementById("localAtividade").value;
  const limite_vagas = document.getElementById("limiteVagas").value;
  const descricao = document.getElementById("descricaoAtividade").value;
  const requisitos = document.getElementById("requisitosAtividade").value;

  const resposta = await fetch(`${API_URL}/atividades`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      titulo,
      categoria,
      data,
      horario,
      local,
      limite_vagas,
      descricao,
      requisitos,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  document.getElementById("tituloAtividade").value = "";
  document.getElementById("categoriaAtividade").value = "";
  document.getElementById("dataAtividade").value = "";
  document.getElementById("horarioAtividade").value = "";
  document.getElementById("localAtividade").value = "";
  document.getElementById("limiteVagas").value = "";
  document.getElementById("descricaoAtividade").value = "";
  document.getElementById("requisitosAtividade").value = "";

  listarAtividades();
}

async function listarAtividades() {
  const resposta = await fetch(`${API_URL}/atividades`, {
    method: "GET",
    credentials: "include",
  });

  const atividades = await resposta.json();

  const tabela = document.querySelector("#tabAtividades tbody");
  tabela.innerHTML = "";

  atividades.forEach((atividade) => {
    tabela.innerHTML += `
            <tr>
                <td>${atividade.titulo}</td>
                <td>${atividade.data}</td>
                <td>${atividade.horario}</td>
                <td>${atividade.local}</td>
                <td>${atividade.limite_vagas}</td>
                <td>${atividade.status}</td>
                <td>
                    <button class="btn-del" onclick="cancelarAtividade('${atividade.id}')">
                        Cancelar
                    </button>
                </td>
            </tr>
        `;
  });

  atualizarDropdownsAtividades(atividades);
}

function atualizarDropdownsAtividades(atividades) {
  let opcoes = '<option value="">Selecione a Atividade...</option>';

  atividades.forEach((atividade) => {
    opcoes += `<option value="${atividade.id}">${atividade.titulo}</option>`;
  });

  const iTitulo = document.getElementById("i_titulo");
  const avTitulo = document.getElementById("av_titulo");

  if (iTitulo) iTitulo.innerHTML = opcoes;
  if (avTitulo) avTitulo.innerHTML = opcoes;
}

async function cancelarAtividade(id) {
  if (!confirm("Tem certeza que deseja cancelar esta atividade?")) {
    return;
  }

  const resposta = await fetch(`${API_URL}/atividades/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);
  listarAtividades();
}

async function listarInscricoes() {
    const resposta = await fetch(`${API_URL}/inscricoes`, {
    method: "GET",
    credentials: "include",
    });

    const inscricoes = await resposta.json();

    const tabela = document.querySelector("#tabInscricoes tbody");

    if (!tabela) return;

    tabela.innerHTML = "";

    inscricoes.forEach((inscricao) => {
    const usuario = inscricao.usuarios
        ? inscricao.usuarios.apelido || inscricao.usuarios.nome
        : "Usuário não encontrado";

    const atividade = inscricao.atividades
        ? inscricao.atividades.titulo
        : "Atividade não encontrada";

    let status = inscricao.status;

    if (inscricao.status === "Lista de Espera") {
        status += ` - posição ${inscricao.posicao_espera}`;
    }

    tabela.innerHTML += `
            <tr>
                <td>${usuario}</td>
                <td>${atividade}</td>
                <td>${status}</td>
                <td>
                    <button class="btn-del" onclick="cancelarInscricao('${inscricao.id}')">
                        Cancelar
                    </button>
                </td>
            </tr>
        `;
    });
}

async function cadastrarInscricao() {
    const atividade_id = document.getElementById("i_titulo").value;

    if (!atividade_id) {
    alert("Selecione uma atividade.");
    return;
    }

    const resposta = await fetch(`${API_URL}/inscricoes`, {
    method: "POST",
    credentials: "include",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        atividade_id,
    }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
    alert(dados.erro);
    return;
    }

    alert(dados.mensagem);
    listarInscricoes();
    listarAtividades();
}

async function cancelarInscricao(id) {
  if (!confirm("Tem certeza que deseja cancelar esta inscrição?")) {
    return;
  }

  const resposta = await fetch(`${API_URL}/inscricoes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);
  listarInscricoes();
  listarAtividades();
}

async function cadastrarAvaliacao() {
  alert("O módulo de avaliações será implementado depois das inscrições.");
}

window.onload = function () {
  verificarSessao();
  listarUsuarios();
  listarAtividades();
  listarInscricoes();
  listarAvaliacao();
};
