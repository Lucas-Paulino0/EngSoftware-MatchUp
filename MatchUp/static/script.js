const API_URL = "";
let atividadesCache = [];
let inscricoesCache = [];
let usuarioLogadoCache = null;

let atividadeDetalhesAtual = null;
let participantesDetalhesAtual = [];
let atividadeEmEdicaoId = null;
let ultimoPerfilCarregado = null;

const INTERESSES_PADRAO = [
  "Futebol",
  "Vôlei",
  "Corrida",
  "Jogos",
  "Estudos",
  "Academia",
  "Eventos",
  "Tecnologia",
];

async function verificarSessao() {
  try {
    const resposta = await fetch(`${API_URL}/sessao`, {
      method: "GET",
      credentials: "include",
    });

    const dados = await resposta.json();

    usuarioLogadoCache = dados.logado ? dados.usuario : null;

    const areaSessao = document.getElementById("areaSessao");
    const authCard = document.getElementById("authCard");
    const welcomeCard = document.getElementById("welcomeCard");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (!areaSessao) {
      console.error("Elemento areaSessao não encontrado no HTML.");
      return dados;
    }

    if (dados.logado) {
      const fotoSessao = dados.usuario.foto_perfil
        ? `<img src="${escaparHTML(dados.usuario.foto_perfil)}" alt="Foto de perfil">`
        : pegarInicial(dados.usuario.nome);

      areaSessao.innerHTML = `
          <div class="logged-user-mini">
              <div class="logged-avatar logged-avatar-img">${fotoSessao}</div>

              <div>
                  <strong>${escaparHTML(dados.usuario.nome)}</strong>
                  <span>${escaparHTML(dados.usuario.email)}</span>
              </div>

              <button class="mini-profile-btn" onclick="abrirModalMeuPerfil()">Perfil</button>
              <button class="mini-logout-btn" onclick="logout()">Sair</button>
          </div>
      `;

      if (authCard) authCard.classList.add("hidden");
      if (welcomeCard) welcomeCard.classList.remove("hidden");
      carregarRecomendacoes();
      if (welcomeTitle)
        welcomeTitle.textContent = `Bem-vindo, ${dados.usuario.nome}!`;
    } else {
      areaSessao.innerHTML = `<p>Você não está logado.</p>`;

      if (authCard) authCard.classList.remove("hidden");
      if (welcomeCard) welcomeCard.classList.add("hidden");
      renderizarRecomendacoes(null);
    }

    return dados;
  } catch (erro) {
    console.error("Erro ao verificar sessão:", erro);

    const areaSessao = document.getElementById("areaSessao");

    if (areaSessao) {
      areaSessao.innerHTML = `<p>Erro ao verificar sessão.</p>`;
    }
  }
}

async function cadastrarUsuario() {
  const nome = document.getElementById("authNome").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const senha = document.getElementById("authSenha").value.trim();
  const confirmar_senha = document.getElementById("authConfirmarSenha")
    ? document.getElementById("authConfirmarSenha").value.trim()
    : senha;
  const data_nascimento =
    document.getElementById("authDataNascimento").value || null;
  const apelido = document.getElementById("authApelido").value.trim();
  const fotoUrl = document.getElementById("authFotoPerfil")
    ? document.getElementById("authFotoPerfil").value.trim()
    : "";
  const fotoArquivo = document.getElementById("authFotoArquivo")
    ? document.getElementById("authFotoArquivo").files[0]
    : null;
  let foto_perfil = fotoUrl;

  if (fotoArquivo) {
    try {
      foto_perfil = await lerArquivoComoDataURL(fotoArquivo);
    } catch (erro) {
      mostrarMensagem(erro.message || "Não foi possível carregar a foto.", "warning");
      return;
    }
  }

  const interesses = obterInteressesSelecionados("authInteresses");

  if (!nome || !email || !senha) {
    mostrarMensagem("Preencha nome, e-mail e senha.", "warning");
    return;
  }

  if (!emailValido(email)) {
    mostrarMensagem("Informe um e-mail válido.", "warning");
    return;
  }

  if (senha.length < 8) {
    mostrarMensagem("A senha precisa ter no mínimo 8 caracteres.", "warning");
    return;
  }

  if (senha !== confirmar_senha) {
    mostrarMensagem("A confirmação de senha não confere.", "warning");
    return;
  }

  if (data_nascimento && !idadeMinimaValida(data_nascimento, 13)) {
    mostrarMensagem("A data de nascimento é inválida ou indica idade menor que 13 anos.", "warning");
    return;
  }

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
      confirmar_senha,
      data_nascimento,
      apelido,
      foto_perfil,
      interesses,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert("Conta criada com sucesso. Agora faça login.");

  document.getElementById("authNome").value = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authSenha").value = "";
  if (document.getElementById("authConfirmarSenha")) {
    document.getElementById("authConfirmarSenha").value = "";
  }
  document.getElementById("authDataNascimento").value = "";
  document.getElementById("authApelido").value = "";
  document.getElementById("authFotoPerfil").value = "";
  if (document.getElementById("authFotoArquivo")) {
    document.getElementById("authFotoArquivo").value = "";
  }
  limparInteressesSelecionados("authInteresses");

  mostrarLoginAuth();

  await listarUsuarios();
}

async function login() {
  const email = document.getElementById("authLoginEmail").value.trim();
  const senha = document.getElementById("authLoginSenha").value.trim();

  if (!email || !senha) {
    mostrarMensagem("Preencha e-mail e senha.", "warning");
    return;
  }

  if (!emailValido(email)) {
    mostrarMensagem("Informe um e-mail válido.", "warning");
    return;
  }

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

  document.getElementById("authLoginEmail").value = "";
  document.getElementById("authLoginSenha").value = "";

  fecharModalAuth();

  await verificarSessao();
  await listarAtividades();
  await listarInscricoes(false);
  await listarNotificacoes(false);
}

async function logout() {
  const resposta = await fetch(`${API_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });

  const dados = await resposta.json();

  alert(dados.mensagem);

  await verificarSessao();
  await listarAtividades();
  await listarInscricoes(false);
  await listarNotificacoes(false);
}

async function listarUsuarios() {
  const resposta = await fetch(`${API_URL}/usuarios`, {
    method: "GET",
    credentials: "include",
  });

  const usuarios = await resposta.json();

  const tabela = document.querySelector("#tabUsuarios tbody");

  if (tabela) {
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
  }

  renderizarCardsUsuarios(usuarios);
  atualizarDropdownsUsuarios(usuarios);

  const statUsuarios = document.getElementById("statUsuarios");
  if (statUsuarios) {
    statUsuarios.textContent = usuarios.length;
  }
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
  const camposObrigatorios = [
    { id: "tituloAtividade", nome: "título" },
    { id: "categoriaAtividade", nome: "categoria" },
    { id: "dataAtividade", nome: "data" },
    { id: "horarioAtividade", nome: "horário" },
    { id: "localAtividade", nome: "local" },
    { id: "limiteVagas", nome: "limite de vagas" },
  ];

  const camposNaoEncontrados = camposObrigatorios
    .filter((campo) => !document.getElementById(campo.id))
    .map((campo) => campo.id);

  if (camposNaoEncontrados.length > 0) {
    mostrarMensagem(
      `Erro no HTML: os campos ${camposNaoEncontrados.join(", ")} não foram encontrados.`,
      "warning",
    );
    return;
  }

  const titulo = document.getElementById("tituloAtividade").value.trim();
  const categoria = document.getElementById("categoriaAtividade").value.trim();
  const data = document.getElementById("dataAtividade").value;
  const horario = document.getElementById("horarioAtividade").value;
  const local = document.getElementById("localAtividade").value.trim();
  const limite_vagas = document.getElementById("limiteVagas").value;
  const descricao = document.getElementById("descricaoAtividade").value.trim();
  const requisitos = document.getElementById("requisitosAtividade").value.trim();
  const endereco = obterValorCampo("enderecoAtividade");
  const cidade = obterValorCampo("cidadeAtividade");
  const bairro = obterValorCampo("bairroAtividade");
  const link_mapa = obterValorCampo("linkMapaAtividade");
  const nivel = obterValorCampo("nivelAtividade");
  const visibilidade = obterValorCampo("visibilidadeAtividade") || "Pública";

  const camposFaltando = [];
  if (!titulo) camposFaltando.push("título");
  if (!categoria) camposFaltando.push("categoria");
  if (!data) camposFaltando.push("data");
  if (!horario) camposFaltando.push("horário");
  if (!local) camposFaltando.push("local");
  if (!limite_vagas) camposFaltando.push("limite de vagas");

  if (camposFaltando.length > 0) {
    mostrarMensagem(
      `Preencha os seguintes campos: ${camposFaltando.join(", ")}.`,
      "warning",
    );
    return;
  }

  if (Number(limite_vagas) <= 0) {
    mostrarMensagem("O limite de vagas deve ser maior que zero.", "warning");
    return;
  }

  const dataHora = new Date(`${data}T${horario}`);
  if (Number.isNaN(dataHora.getTime()) || dataHora <= new Date()) {
    mostrarMensagem("A atividade precisa ter data e horário futuros.", "warning");
    return;
  }

  const editando = Boolean(atividadeEmEdicaoId);
  const mensagemConfirmacao = editando
    ? `Salvar alterações da atividade "${titulo}"?`
    : `Publicar a atividade "${titulo}" para a comunidade?`;

  if (!confirm(mensagemConfirmacao)) {
    return;
  }

  const resposta = await fetch(
    editando ? `${API_URL}/atividades/${atividadeEmEdicaoId}` : `${API_URL}/atividades`,
    {
      method: editando ? "PUT" : "POST",
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
        endereco,
        cidade,
        bairro,
        link_mapa,
        nivel,
        visibilidade,
      }),
    },
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro || "Erro ao salvar atividade.", "warning");
    return;
  }

  mostrarMensagem(dados.mensagem || "Atividade salva com sucesso.", "success");

  limparFormularioAtividade();
  fecharModalCriarAtividade();

  await listarAtividades();
  await listarInscricoes(false);

  if (atividadeDetalhesAtual && atividadeDetalhesAtual.id === atividadeEmEdicaoId) {
    fecharDetalhesAtividade();
  }

  atividadeEmEdicaoId = null;
}


async function listarAtividades() {
  const resposta = await fetch(`${API_URL}/atividades`, {
    method: "GET",
    credentials: "include",
  });

  const atividades = await resposta.json();

  atividades.sort((a, b) => {
    const prioridadeStatus = {
      Aberta: 1,
      Encerrada: 2,
      Cancelada: 3,
    };

    const prioridadeA = prioridadeStatus[a.status] || 99;
    const prioridadeB = prioridadeStatus[b.status] || 99;

    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }

    return new Date(b.criado_em) - new Date(a.criado_em);
  });

  atividadesCache = atividades;

  await listarInscricoes(false);

  atualizarDropdownsAtividades(atividades);
  atualizarFiltroCategorias(atividades);
  atualizarCategoriasPopularesDinamicas(atividades);
  filtrarFeed();

  const statAtividades = document.getElementById("statAtividades");
  if (statAtividades) {
    statAtividades.textContent = atividades.length;
  }

  carregarRecomendacoes();
}

function renderizarFeedAtividades(atividades) {
  const feed = document.getElementById("feedAtividades");

  if (!feed) return;

  feed.innerHTML = "";

  if (!atividades || atividades.length === 0) {
    const existemAtividades = atividadesCache && atividadesCache.length > 0;

    feed.innerHTML = `
      <div class="empty-state empty-state-action">
        <strong>${existemAtividades ? "Nenhuma atividade encontrada com esses filtros." : "Nenhuma atividade publicada ainda."}</strong>
        <p>${existemAtividades ? "Tente limpar os filtros ou usar outros termos de busca." : "Seja o primeiro a criar uma atividade para a comunidade."}</p>
        <div class="empty-actions">
          ${existemAtividades ? `<button class="btn-secondary" onclick="limparFiltrosFeed()">Limpar filtros</button>` : ""}
          <button class="btn-primary" onclick="abrirModalCriarAtividade()">Criar atividade</button>
        </div>
      </div>
    `;
    return;
  }

  atividades.forEach((atividade) => {
    const organizador = atividade.usuarios
      ? atividade.usuarios.apelido || atividade.usuarios.nome
      : "Organizador";

    const inicial = pegarInicial(organizador);
    const descricao = atividade.descricao || "Sem descrição informada.";
    const requisitos = atividade.requisitos || "Nenhum requisito informado.";
    const statusClass = `status-${atividade.status}`;
    const inscricoesDaAtividade = obterInscricoesDaAtividade(atividade.id);
    const confirmados = contarConfirmadosAtividade(atividade);
    const listaEspera = inscricoesDaAtividade.filter(
      (i) => i.status === "Lista de Espera",
    ).length;
    const vagasRestantes = Math.max(Number(atividade.limite_vagas || 0) - confirmados, 0);

    const minhaInscricao = usuarioLogadoCache
      ? inscricoesDaAtividade.find(
          (i) => i.usuario_id === usuarioLogadoCache.id,
        )
      : null;

    const souOrganizador =
      usuarioLogadoCache && atividade.organizador_id === usuarioLogadoCache.id;

    let botaoParticipacao = "";

    if (!usuarioLogadoCache) {
      botaoParticipacao = `
        <button class="btn-disabled" disabled>
          Faça login para participar
        </button>
      `;
    } else if (souOrganizador) {
      botaoParticipacao = `
        <button class="btn-disabled" disabled>
          Você é o organizador
        </button>
      `;
    } else if (minhaInscricao) {
      const textoStatus = formatarStatusInscricao(minhaInscricao);

      botaoParticipacao = `
        <button class="btn-disabled" disabled>
          ${textoStatus}
        </button>

        <button class="btn-danger" onclick="sairDaAtividade('${atividade.id}')">
          Sair da atividade
        </button>
      `;
    } else if (atividade.status !== "Aberta") {
      botaoParticipacao = `
        <button class="btn-disabled" disabled>
          Indisponível
        </button>
      `;
    } else {
      botaoParticipacao = `
        <button class="btn-primary" onclick="participarPeloFeed('${atividade.id}')">
          ${vagasRestantes > 0 ? "Participar" : "Entrar na lista de espera"}
        </button>
      `;
    }

    let botoesOrganizador = "";

    if (souOrganizador && atividade.status === "Aberta") {
      botoesOrganizador = `
        <button class="btn-secondary" onclick="abrirModalEditarAtividade('${atividade.id}')">
          Editar
        </button>

        <button class="btn-acao" onclick="encerrarAtividade('${atividade.id}')">
          Encerrar
        </button>

        <button class="btn-del" onclick="cancelarAtividade('${atividade.id}')">
          Cancelar
        </button>
      `;
    }

    const meuStatus = minhaInscricao
      ? `<span class="personal-status">${formatarStatusInscricao(minhaInscricao)}</span>`
      : "";

    const infoLocalComplementar = montarInfoLocalAtividade(atividade);
    const linkMapa = obterLinkMapaAtividade(atividade);

    const card = document.createElement("article");
    card.className = "activity-post";

    card.innerHTML = `
      <div class="post-header">
        <div class="organizer clickable-user" onclick="abrirPerfilUsuario('${atividade.organizador_id}')">
          <div class="organizer-avatar">${inicial}</div>
          <div>
            <strong>${escaparHTML(organizador)}</strong>
            <span>publicou uma nova atividade</span>
          </div>
        </div>

        <div class="badge-stack">
          ${meuStatus}
          <span class="status-badge ${statusClass}">
            ${escaparHTML(atividade.status)}
          </span>
        </div>
      </div>

      <div class="post-body">
        <div class="activity-title-row">
          <h3>${escaparHTML(atividade.titulo)}</h3>
          <span class="category-pill">${escaparHTML(atividade.categoria)}</span>
        </div>

        <p class="post-description">${escaparHTML(descricao)}</p>

        <div class="capacity-box">
          <div class="capacity-header">
            <span>Participantes confirmados</span>
            <strong>${confirmados}/${atividade.limite_vagas}</strong>
          </div>

          <div class="capacity-bar">
            <div class="capacity-fill" style="width: ${calcularPorcentagemVagas(confirmados, atividade.limite_vagas)}%;"></div>
          </div>

          <small>${vagasRestantes > 0 ? `${vagasRestantes} vaga(s) disponível(is)` : "Sem vagas diretas"} • ${listaEspera} pessoa(s) na lista de espera</small>
        </div>

        <div class="post-meta">
          <div class="meta-item">🏷️ Categoria: <strong>${escaparHTML(atividade.categoria)}</strong></div>
          <div class="meta-item">📍 Local: <strong>${escaparHTML(atividade.local)}</strong>${infoLocalComplementar}</div>
          <div class="meta-item">📅 Data: <strong>${formatarData(atividade.data)}</strong></div>
          <div class="meta-item">🕒 Horário: <strong>${formatarHorario(atividade.horario)}</strong></div>
          <div class="meta-item">📌 Requisitos: <strong>${escaparHTML(requisitos)}</strong></div>
          <div class="meta-item">🎚️ Nível: <strong>${escaparHTML(atividade.nivel || "Livre")}</strong></div>
          <div class="meta-item">👥 Lista de espera: <strong>${listaEspera}</strong></div>
          <div class="meta-item">🗺️ Mapa: <strong>${linkMapa ? `<a href="${escaparHTML(linkMapa)}" target="_blank" rel="noopener">Abrir localização</a>` : "Não informado"}</strong></div>
        </div>
      </div>

      <div class="post-actions">
        <button class="btn-secondary" onclick="abrirDetalhesAtividade('${atividade.id}')">
          Ver detalhes
        </button>

        ${botaoParticipacao}

        ${botoesOrganizador}
      </div>
    `;

    feed.appendChild(card);
  });
}

function obterInscricoesDaAtividade(atividadeId) {
  return inscricoesCache.filter((i) => i.atividade_id === atividadeId);
}

function contarConfirmadosAtividade(atividade) {
  const confirmadosInscritos = obterInscricoesDaAtividade(atividade.id).filter(
    (i) => i.status === "Confirmado",
  ).length;

  return confirmadosInscritos + 1;
}

function atividadeTemVagas(atividade) {
  return atividade.status === "Aberta" && contarConfirmadosAtividade(atividade) < Number(atividade.limite_vagas || 0);
}

function formatarStatusInscricao(inscricao) {
  if (!inscricao) return "";

  if (inscricao.status === "Lista de Espera") {
    return `Lista de espera #${inscricao.posicao_espera}`;
  }

  if (inscricao.status === "Confirmado") {
    return "Inscrito";
  }

  return inscricao.status;
}

function formatarData(data) {
  if (!data) return "-";

  const partes = data.split("-");
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function calcularPorcentagemVagas(confirmados, limite) {
  if (!limite || limite <= 0) return 0;

  const porcentagem = (confirmados / limite) * 100;

  if (porcentagem > 100) return 100;

  return porcentagem;
}

function formatarHorario(horario) {
  if (!horario) return "-";
  return horario.substring(0, 5);
}

function pegarInicial(nome) {
  if (!nome || nome.length === 0) {
    return "?";
  }

  return nome.charAt(0).toUpperCase();
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function idadeMinimaValida(dataNascimento, idadeMinima) {
  const nascimento = new Date(`${dataNascimento}T00:00:00`);

  if (Number.isNaN(nascimento.getTime())) {
    return false;
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade >= idadeMinima;
}

function normalizarTexto(valor) {
  return (valor || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obterValorCampo(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : "";
}

function definirValorCampo(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.value = valor || "";
}

function obterInteressesSelecionados(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];

  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(
    (input) => input.value,
  );
}

function limparInteressesSelecionados(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
}

function marcarInteressesSelecionados(containerId, interesses = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const normalizados = interesses.map((item) => normalizarTexto(item));

  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = normalizados.includes(normalizarTexto(input.value));
  });
}

function renderizarCheckboxesInteresses(containerId, selecionados = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const selecionadosNormalizados = selecionados.map((item) => normalizarTexto(item));

  container.innerHTML = INTERESSES_PADRAO.map((interesse) => {
    const checked = selecionadosNormalizados.includes(normalizarTexto(interesse))
      ? "checked"
      : "";

    return `
      <label class="interest-chip">
        <input type="checkbox" value="${escaparHTML(interesse)}" ${checked}>
        <span>${escaparHTML(interesse)}</span>
      </label>
    `;
  }).join("");
}

function lerArquivoComoDataURL(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo) {
      resolve("");
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem."));
      return;
    }

    if (arquivo.size > 1024 * 1024) {
      reject(new Error("A imagem deve ter no máximo 1 MB."));
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    leitor.readAsDataURL(arquivo);
  });
}

function limparFormularioAtividade() {
  [
    "tituloAtividade",
    "categoriaAtividade",
    "dataAtividade",
    "horarioAtividade",
    "localAtividade",
    "limiteVagas",
    "descricaoAtividade",
    "requisitosAtividade",
    "enderecoAtividade",
    "cidadeAtividade",
    "bairroAtividade",
    "linkMapaAtividade",
    "nivelAtividade",
    "visibilidadeAtividade",
  ].forEach((id) => definirValorCampo(id, ""));

  definirValorCampo("visibilidadeAtividade", "Pública");
}

function preencherFormularioAtividade(atividade) {
  definirValorCampo("tituloAtividade", atividade.titulo);
  definirValorCampo("categoriaAtividade", atividade.categoria);
  definirValorCampo("dataAtividade", atividade.data);
  definirValorCampo("horarioAtividade", formatarHorario(atividade.horario));
  definirValorCampo("localAtividade", atividade.local);
  definirValorCampo("limiteVagas", atividade.limite_vagas);
  definirValorCampo("descricaoAtividade", atividade.descricao);
  definirValorCampo("requisitosAtividade", atividade.requisitos);
  definirValorCampo("enderecoAtividade", atividade.endereco);
  definirValorCampo("cidadeAtividade", atividade.cidade);
  definirValorCampo("bairroAtividade", atividade.bairro);
  definirValorCampo("linkMapaAtividade", atividade.link_mapa);
  definirValorCampo("nivelAtividade", atividade.nivel);
  definirValorCampo("visibilidadeAtividade", atividade.visibilidade || "Pública");
}

function configurarModalAtividade(modo) {
  const titulo = document.getElementById("modalCriarAtividadeTitulo");
  const subtitulo = document.getElementById("modalCriarAtividadeSubtitulo");
  const botao = document.getElementById("btnSalvarAtividade");

  if (modo === "editar") {
    if (titulo) titulo.textContent = "Editar atividade";
    if (subtitulo) subtitulo.textContent = "Atualize as informações da atividade publicada.";
    if (botao) botao.textContent = "Salvar alterações";
  } else {
    if (titulo) titulo.textContent = "Criar nova atividade";
    if (subtitulo) subtitulo.textContent = "Publique uma atividade para a comunidade participar.";
    if (botao) botao.textContent = "Publicar atividade";
  }
}

function obterLinkMapaAtividade(atividade) {
  if (atividade.link_mapa || atividade.link_mapa_calculado) {
    return atividade.link_mapa || atividade.link_mapa_calculado;
  }

  const partes = [atividade.endereco, atividade.local, atividade.bairro, atividade.cidade]
    .filter(Boolean)
    .join(", ");

  if (!partes) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes)}`;
}

function montarInfoLocalAtividade(atividade) {
  const partes = [atividade.endereco, atividade.bairro, atividade.cidade].filter(Boolean);

  if (partes.length === 0) return "";

  return `<br><small>${escaparHTML(partes.join(" • "))}</small>`;
}


async function participarPeloFeed(atividade_id) {
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

  await listarInscricoes(false);
  listarAtividades();
}

function obterValorFiltro(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value : "";
}

function ordenarAtividades(atividades, ordenacao) {
  const ordenadas = [...atividades];

  ordenadas.sort((a, b) => {
    if (ordenacao === "data_proxima") {
      return new Date(`${a.data}T${a.horario || "00:00"}`) - new Date(`${b.data}T${b.horario || "00:00"}`);
    }

    if (ordenacao === "data_distante") {
      return new Date(`${b.data}T${b.horario || "00:00"}`) - new Date(`${a.data}T${a.horario || "00:00"}`);
    }

    if (ordenacao === "mais_vagas") {
      const vagasA = Number(a.limite_vagas || 0) - contarConfirmadosAtividade(a);
      const vagasB = Number(b.limite_vagas || 0) - contarConfirmadosAtividade(b);
      return vagasB - vagasA;
    }

    return new Date(b.criado_em || b.data) - new Date(a.criado_em || a.data);
  });

  return ordenadas;
}

function filtrarFeed() {
  const termo = normalizarTexto(obterValorFiltro("campoBusca"));
  const categoriaFiltro = normalizarTexto(obterValorFiltro("filtroCategoria"));
  const dataFiltro = obterValorFiltro("filtroData");
  const statusFiltro = obterValorFiltro("filtroStatus");
  const somenteComVagas = document.getElementById("filtroVagas")
    ? document.getElementById("filtroVagas").checked
    : false;
  const ordenacao = obterValorFiltro("filtroOrdenacao") || "recentes";

  const filtradas = atividadesCache.filter((atividade) => {
    const textoAtividade = normalizarTexto(
      `${atividade.titulo || ""} ${atividade.categoria || ""} ${atividade.local || ""} ${atividade.descricao || ""} ${atividade.requisitos || ""}`,
    );

    const bateTermo = !termo || textoAtividade.includes(termo);
    const bateCategoria =
      !categoriaFiltro || normalizarTexto(atividade.categoria) === categoriaFiltro;
    const bateData = !dataFiltro || atividade.data === dataFiltro;
    const bateStatus = !statusFiltro || atividade.status === statusFiltro;
    const bateVagas = !somenteComVagas || atividadeTemVagas(atividade);

    return bateTermo && bateCategoria && bateData && bateStatus && bateVagas;
  });

  renderizarFeedAtividades(ordenarAtividades(filtradas, ordenacao));
}

function limparFiltrosFeed() {
  const ids = ["campoBusca", "filtroCategoria", "filtroData", "filtroStatus", "filtroOrdenacao"];

  ids.forEach((id) => {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    if (id === "filtroOrdenacao") {
      elemento.value = "recentes";
    } else {
      elemento.value = "";
    }
  });

  const filtroVagas = document.getElementById("filtroVagas");
  if (filtroVagas) filtroVagas.checked = false;

  filtrarFeed();
}

function atualizarFiltroCategorias(atividades) {
  const select = document.getElementById("filtroCategoria");

  if (!select) return;

  const selecionada = select.value;
  const categorias = [...new Set(
    atividades
      .map((atividade) => atividade.categoria)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
  )];

  select.innerHTML = `<option value="">Todas as categorias</option>`;

  categorias.forEach((categoria) => {
    select.innerHTML += `<option value="${escaparHTML(categoria)}">${escaparHTML(categoria)}</option>`;
  });

  select.value = selecionada;
}

function atualizarCategoriasPopularesDinamicas(atividades) {
  const area = document.getElementById("categoriasPopulares");

  if (!area) return;

  const contagem = {};

  atividades.forEach((atividade) => {
    if (!atividade.categoria) return;
    contagem[atividade.categoria] = (contagem[atividade.categoria] || 0) + 1;
  });

  const populares = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (populares.length === 0) {
    area.innerHTML = `
      <span>Futebol</span>
      <span>Vôlei</span>
      <span>Corrida</span>
      <span>Jogos</span>
    `;
    return;
  }

  area.innerHTML = populares
    .map(([categoria, total]) => `<span>${escaparHTML(categoria)} (${total})</span>`)
    .join("");
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

function renderizarCardsUsuarios(usuarios) {
  const area = document.getElementById("cardsUsuarios");

  if (!area) return;

  area.innerHTML = "";

  if (!usuarios || usuarios.length === 0) {
    area.innerHTML = `
            <div class="empty-state">
                Nenhum usuário cadastrado ainda.
            </div>
        `;
    return;
  }

  usuarios.forEach((usuario) => {
    const nomePublico = usuario.apelido || usuario.nome;
    const inicial = nomePublico.charAt(0).toUpperCase();

    const card = document.createElement("div");
    card.className = "person-card";

    card.innerHTML = `
            <div class="person-avatar">${inicial}</div>
            <h3>${nomePublico}</h3>
            <p>${usuario.email}</p>
        `;

    area.appendChild(card);
  });
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

  await listarAtividades();
  await listarInscricoes();

  const modal = document.getElementById("modalDetalhesAtividade");
  if (modal && !modal.classList.contains("hidden")) {
    fecharDetalhesAtividade();
  }
}

async function encerrarAtividade(id) {
  if (!confirm("Tem certeza que deseja encerrar esta atividade?")) {
    return;
  }

  const resposta = await fetch(`${API_URL}/atividades/${id}/encerrar`, {
    method: "PUT",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  await listarAtividades();
  await listarInscricoes();

  abrirDetalhesAtividade(id);
}

async function sairDaAtividade(atividade_id) {
  if (!usuarioLogadoCache) {
    alert("Você precisa estar logado.");
    return;
  }

  const minhaInscricao = inscricoesCache.find((i) => {
    return (
      i.atividade_id === atividade_id && i.usuario_id === usuarioLogadoCache.id
    );
  });

  if (!minhaInscricao) {
    alert("Você não está inscrito nesta atividade.");
    return;
  }

  if (!confirm("Tem certeza que deseja sair desta atividade?")) {
    return;
  }

  const resposta = await fetch(`${API_URL}/inscricoes/${minhaInscricao.id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  await listarInscricoes(false);
  await listarAtividades();
}

async function listarInscricoes(renderizarTabela = true) {
  const resposta = await fetch(`${API_URL}/inscricoes`, {
    method: "GET",
    credentials: "include",
  });

  const inscricoes = await resposta.json();

  inscricoesCache = inscricoes;

  const statInscricoes = document.getElementById("statInscricoes");
  if (statInscricoes) {
    statInscricoes.textContent = inscricoes.length;
  }

  if (!renderizarTabela) return;

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
  const avaliado_id = document.getElementById("av_avaliado").value;
  const atividade_id = document.getElementById("av_titulo").value;
  const nota = document.getElementById("av_nota").value;
  const comentario = document.getElementById("av_comentario").value;

  if (!avaliado_id || !atividade_id || nota === "") {
    alert("Selecione o avaliado, a atividade e informe a nota.");
    return;
  }

  const resposta = await fetch(`${API_URL}/avaliacoes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      avaliado_id,
      atividade_id,
      nota,
      comentario,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  document.getElementById("av_nota").value = "";
  document.getElementById("av_comentario").value = "";

  listarAvaliacao();
}

async function listarAvaliacao() {
  const resposta = await fetch(`${API_URL}/avaliacoes`, {
    method: "GET",
    credentials: "include",
  });

  const avaliacoes = await resposta.json();

  const tabela = document.querySelector("#tabAvaliacoes tbody");

  if (!tabela) return;

  tabela.innerHTML = "";

  avaliacoes.forEach((avaliacao) => {
    const avaliador = avaliacao.avaliador
      ? avaliacao.avaliador.apelido || avaliacao.avaliador.nome
      : "Avaliador não encontrado";

    const avaliado = avaliacao.avaliado
      ? avaliacao.avaliado.apelido || avaliacao.avaliado.nome
      : "Avaliado não encontrado";

    const atividade = avaliacao.atividades
      ? avaliacao.atividades.titulo
      : "Atividade não encontrada";

    tabela.innerHTML += `
            <tr>
                <td>${avaliador}</td>
                <td>${avaliado}</td>
                <td>${atividade}</td>
                <td>${avaliacao.nota}</td>
                <td>
                    <button class="btn-del" onclick="excluirAvaliacao('${avaliacao.id}')">
                        Excluir
                    </button>
                </td>
            </tr>
        `;
  });
}

async function excluirAvaliacao(id) {
  if (!confirm("Tem certeza que deseja excluir esta avaliação?")) {
    return;
  }

  const resposta = await fetch(`${API_URL}/avaliacoes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);
  listarAvaliacao();
}

async function abrirDetalhesAtividade(atividade_id) {
  const atividade = atividadesCache.find((a) => a.id === atividade_id);

  if (!atividade) {
    alert("Atividade não encontrada no feed.");
    return;
  }

  const modal = document.getElementById("modalDetalhesAtividade");
  const titulo = document.getElementById("modalTituloAtividade");
  const subtitulo = document.getElementById("modalSubtituloAtividade");
  const conteudo = document.getElementById("modalConteudoAtividade");

  titulo.textContent = atividade.titulo;
  subtitulo.textContent = `${atividade.categoria} • ${formatarData(atividade.data)} às ${formatarHorario(atividade.horario)}`;

  conteudo.innerHTML = `
    <div class="empty-state">
      Carregando participantes...
    </div>
  `;

  modal.classList.remove("hidden");

  try {
    const resposta = await fetch(
      `${API_URL}/atividades/${atividade_id}/participantes`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    const participantes = await resposta.json();

    if (!resposta.ok) {
      conteudo.innerHTML = `
        <div class="empty-state">
          ${participantes.erro || "Erro ao carregar participantes."}
        </div>
      `;
      return;
    }

    atividadeDetalhesAtual = atividade;
    participantesDetalhesAtual = participantes;

    renderizarDetalhesAtividade(atividade, participantes);
  } catch (erro) {
    console.error("Erro ao abrir detalhes da atividade:", erro);

    conteudo.innerHTML = `
      <div class="empty-state">
        Erro ao carregar os detalhes da atividade. Verifique o console do navegador.
      </div>
    `;
  }
}

function fecharDetalhesAtividade() {
  const modal = document.getElementById("modalDetalhesAtividade");
  modal.classList.add("hidden");
}

function renderizarDetalhesAtividade(atividade, participantes) {
  const conteudo = document.getElementById("modalConteudoAtividade");

  const organizador = atividade.usuarios
    ? atividade.usuarios.apelido || atividade.usuarios.nome
    : "Organizador";

  const confirmados = participantes.filter((p) => p.status === "Confirmado");
  const listaEspera = participantes.filter(
    (p) => p.status === "Lista de Espera",
  );
  const totalJogadores = confirmados.length + 1;

  const souOrganizador =
    usuarioLogadoCache && atividade.organizador_id === usuarioLogadoCache.id;

  const usuarioEhParticipanteConfirmado = usuarioLogadoCache
    ? confirmados.some((p) => p.usuario_id === usuarioLogadoCache.id)
    : false;

  const usuarioPodeVerChat =
    usuarioLogadoCache && (souOrganizador || usuarioEhParticipanteConfirmado);

  const minhaInscricaoDetalhes = usuarioLogadoCache
    ? participantes.find((p) => p.usuario_id === usuarioLogadoCache.id)
    : null;

  let botaoParticipacaoDetalhes = "";

  if (!usuarioLogadoCache) {
    botaoParticipacaoDetalhes = `
      <button class="btn-disabled full" disabled>
        Faça login para participar
      </button>
    `;
  } else if (souOrganizador) {
    botaoParticipacaoDetalhes = `
      <button class="btn-disabled full" disabled>
        Você é o organizador
      </button>
    `;
  } else if (minhaInscricaoDetalhes) {
    botaoParticipacaoDetalhes = `
      <button class="btn-disabled full" disabled>
        ${formatarStatusInscricao(minhaInscricaoDetalhes)}
      </button>

      <button class="btn-danger full" onclick="sairDaAtividade('${atividade.id}')">
        Sair da atividade
      </button>
    `;
  } else if (atividade.status !== "Aberta") {
    botaoParticipacaoDetalhes = `
      <button class="btn-disabled full" disabled>
        Atividade indisponível
      </button>
    `;
  } else {
    botaoParticipacaoDetalhes = `
      <button class="btn-primary full" onclick="participarPeloFeed('${atividade.id}')">
        ${atividadeTemVagas(atividade) ? "Participar" : "Entrar na lista de espera"}
      </button>
    `;
  }

  const organizadorCard = {
    usuario_id: atividade.organizador_id,
    status: "Organizador",
    compareceu: true,
    usuarios: atividade.usuarios,
  };

  const linkMapa = obterLinkMapaAtividade(atividade);
  const presencasConfirmadas = confirmados.filter((p) => p.compareceu === true).length;
  const presencasPendentes = atividade.status === "Encerrada"
    ? confirmados.filter((p) => p.compareceu === null || typeof p.compareceu === "undefined").length
    : 0;

  conteudo.innerHTML = `
        <div class="activity-detail-grid">
            <div class="detail-box">
                <h3>Informações</h3>

                <p><strong>Organizador:</strong> ${organizador}</p>
                <p><strong>Status:</strong> ${atividade.status}</p>
                <p><strong>Local:</strong> ${escaparHTML(atividade.local)}</p>
                <p><strong>Endereço:</strong> ${escaparHTML(atividade.endereco || "Não informado")}</p>
                <p><strong>Bairro/Cidade:</strong> ${escaparHTML([atividade.bairro, atividade.cidade].filter(Boolean).join(" - ") || "Não informado")}</p>
                <p><strong>Mapa:</strong> ${linkMapa ? `<a href="${escaparHTML(linkMapa)}" target="_blank" rel="noopener">Abrir localização</a>` : "Não informado"}</p>
                <p><strong>Data:</strong> ${formatarData(atividade.data)}</p>
                <p><strong>Horário:</strong> ${formatarHorario(atividade.horario)}</p>
                <p><strong>Vagas:</strong> ${totalJogadores}/${atividade.limite_vagas}</p>
                <p><strong>Nível:</strong> ${escaparHTML(atividade.nivel || "Livre")}</p>
                <p><strong>Visibilidade:</strong> ${escaparHTML(atividade.visibilidade || "Pública")}</p>
                <p><strong>Presenças confirmadas:</strong> ${presencasConfirmadas}/${confirmados.length}${presencasPendentes ? ` • ${presencasPendentes} pendente(s)` : ""}</p>
                <p><strong>Descrição:</strong> ${escaparHTML(atividade.descricao || "Sem descrição.")}</p>
                <p><strong>Requisitos:</strong> ${escaparHTML(atividade.requisitos || "Nenhum requisito informado.")}</p>
            </div>

            <div class="detail-box">
                <h3>Ações</h3>

                ${botaoParticipacaoDetalhes}

                ${
                  souOrganizador && atividade.status === "Aberta"
                    ? `
                        <button class="btn-secondary full" onclick="abrirModalEditarAtividade('${atividade.id}')">
                            Editar atividade
                        </button>

                        <button class="btn-acao full" onclick="encerrarAtividade('${atividade.id}')">
                            Encerrar atividade
                        </button>

                        <button class="btn-del full" onclick="cancelarAtividade('${atividade.id}')">
                            Cancelar atividade
                        </button>
                    `
                    : ""
                }

                <button class="btn-danger full" onclick="abrirModalDenuncia('Atividade', '${atividade.id}')">
                    Denunciar atividade
                </button>
            </div>
        </div>

        ${renderizarBlocoChatAtividade(atividade, usuarioPodeVerChat)}

        ${renderizarControlePresencas(confirmados, atividade, souOrganizador)}

        <div class="detail-section">
            <h3>Participantes confirmados</h3>
            <div class="participants-list">
                ${renderizarListaParticipantes([organizadorCard, ...confirmados], atividade)}
            </div>
        </div>

        <div class="detail-section">
            <h3>Lista de espera</h3>
            <div class="participants-list">
                ${renderizarListaEspera(listaEspera)}
            </div>
        </div>
    `;
  if (usuarioPodeVerChat) {
    carregarChatAtividade(atividade.id);
  }
}

function renderizarControlePresencas(confirmados, atividade, souOrganizador) {
  if (!souOrganizador || atividade.status !== "Encerrada") {
    return "";
  }

  if (!confirmados || confirmados.length === 0) {
    return `
      <div class="detail-section">
        <h3>Confirmação de presença</h3>
        <div class="empty-state">Nenhum participante para confirmar presença.</div>
      </div>
    `;
  }

  return `
    <div class="detail-section attendance-section">
      <div class="chat-header">
        <div>
          <h3>Confirmação de presença</h3>
          <p>Marque quem realmente compareceu. Somente presentes podem ser avaliados.</p>
        </div>

        <button class="btn-primary" onclick="salvarPresencasAtividade('${atividade.id}')">
          Salvar presenças
        </button>
      </div>

      <div class="attendance-list">
        ${confirmados
          .map((participante) => {
            const usuario = participante.usuarios || {};
            const nome = usuario.apelido || usuario.nome || "Usuário";
            const compareceu = participante.compareceu === true;
            const naoCompareceu = participante.compareceu === false;

            return `
              <div class="attendance-item">
                <div>
                  <strong>${escaparHTML(nome)}</strong>
                  <span>${escaparHTML(usuario.email || "")}</span>
                </div>

                <select data-inscricao-id="${participante.id}" class="attendance-select">
                  <option value="" ${!compareceu && !naoCompareceu ? "selected" : ""}>Pendente</option>
                  <option value="true" ${compareceu ? "selected" : ""}>Compareceu</option>
                  <option value="false" ${naoCompareceu ? "selected" : ""}>Não compareceu</option>
                </select>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

async function salvarPresencasAtividade(atividadeId) {
  const selects = document.querySelectorAll('.attendance-select[data-inscricao-id]');
  const presencas = Array.from(selects)
    .filter((select) => select.value !== "")
    .map((select) => ({
      inscricao_id: select.dataset.inscricaoId,
      compareceu: select.value === "true",
    }));

  if (presencas.length === 0) {
    mostrarMensagem("Marque pelo menos uma presença antes de salvar.", "warning");
    return;
  }

  const resposta = await fetch(`${API_URL}/atividades/${atividadeId}/presencas`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ presencas }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro || "Erro ao salvar presenças.", "warning");
    return;
  }

  mostrarMensagem(dados.mensagem || "Presenças salvas com sucesso.", "success");

  await listarInscricoes(false);
  await listarAtividades();
  await abrirDetalhesAtividade(atividadeId);
}

function renderizarListaParticipantes(participantes, atividade) {
  if (!participantes || participantes.length === 0) {
    return `
      <div class="empty-state">
        Nenhum participante confirmado ainda.
      </div>
    `;
  }

  return participantes
    .map((participante) => {
      const usuario = participante.usuarios;
      const nome = usuario ? usuario.apelido || usuario.nome : "Usuário";
      const inicial = pegarInicial(nome);
      const ehOrganizador = participante.status === "Organizador";

      const usuarioAtualEhOrganizador =
        usuarioLogadoCache && atividade.organizador_id === usuarioLogadoCache.id;

      const inscricaoUsuarioAtual = usuarioLogadoCache
        ? participantesDetalhesAtual.find((p) => {
            return p.usuario_id === usuarioLogadoCache.id && p.status === "Confirmado";
          })
        : null;

      const usuarioAtualPresente =
        usuarioAtualEhOrganizador ||
        !inscricaoUsuarioAtual ||
        !atividade.status ||
        atividade.status !== "Encerrada" ||
        inscricaoUsuarioAtual.compareceu === true ||
        typeof inscricaoUsuarioAtual.compareceu === "undefined";

      const participantePresente =
        ehOrganizador ||
        atividade.status !== "Encerrada" ||
        participante.compareceu === true ||
        typeof participante.compareceu === "undefined";

      const usuarioPodeAvaliar =
        usuarioAtualEhOrganizador || Boolean(inscricaoUsuarioAtual && usuarioAtualPresente);

      const podeAvaliar =
        atividade.status === "Encerrada" &&
        usuarioLogadoCache &&
        usuarioPodeAvaliar &&
        participantePresente &&
        participante.usuario_id !== usuarioLogadoCache.id;

      let presencaBadge = "";

      if (atividade.status === "Encerrada" && !ehOrganizador) {
        if (participante.compareceu === true) {
          presencaBadge = '<span class="presence-badge presence-ok">Presença confirmada</span>';
        } else if (participante.compareceu === false) {
          presencaBadge = '<span class="presence-badge presence-no">Não compareceu</span>';
        } else {
          presencaBadge = '<span class="presence-badge presence-pending">Presença pendente</span>';
        }
      }

      return `
      <div class="participant-card">
        <div class="participant-info clickable-user" onclick="abrirPerfilUsuario('${participante.usuario_id}')">
          <div class="participant-avatar">${inicial}</div>

          <div>
            <strong>
              ${escaparHTML(nome)}
              ${ehOrganizador ? '<span class="role-badge">Organizador</span>' : ""}
            </strong>

            <span>${usuario ? escaparHTML(usuario.email || "") : ""}</span>
            ${presencaBadge}
          </div>
        </div>

        <div class="participant-actions">
          ${
            podeAvaliar
              ? `
                <button class="btn-primary" onclick="abrirModalAvaliacao('${atividade.id}', '${participante.usuario_id}')">
                  Avaliar
                </button>
              `
              : ""
          }

          ${
            usuarioLogadoCache &&
            participante.usuario_id !== usuarioLogadoCache.id
              ? `
                <button class="btn-danger" onclick="abrirModalDenuncia('Usuario', '${participante.usuario_id}')">
                  Denunciar
                </button>
              `
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");
}

function renderizarListaEspera(listaEspera) {
  if (!listaEspera || listaEspera.length === 0) {
    return `
      <div class="empty-state">
        Ninguém na lista de espera.
      </div>
    `;
  }

  return listaEspera
    .map((participante) => {
      const usuario = participante.usuarios;

      const nome = usuario ? usuario.apelido || usuario.nome : "Usuário";

      return `
      <div class="participant-card">
        <div class="participant-info">
          <div class="participant-avatar">${pegarInicial(nome)}</div>

          <div>
            <strong>${nome}</strong>
            <span>Posição ${participante.posicao_espera}</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function buscarNomeUsuarioNoModal(usuarioId) {
  if (
    atividadeDetalhesAtual &&
    atividadeDetalhesAtual.organizador_id === usuarioId &&
    atividadeDetalhesAtual.usuarios
  ) {
    return (
      atividadeDetalhesAtual.usuarios.apelido ||
      atividadeDetalhesAtual.usuarios.nome ||
      "Organizador"
    );
  }

  const participante = participantesDetalhesAtual.find((p) => {
    return p.usuario_id === usuarioId;
  });

  if (participante && participante.usuarios) {
    return participante.usuarios.apelido || participante.usuarios.nome;
  }

  return "usuário selecionado";
}

function obterNomeAlvoDenuncia(tipoAlvo, alvoId) {
  if (tipoAlvo === "Atividade") {
    return atividadeDetalhesAtual
      ? atividadeDetalhesAtual.titulo
      : "atividade selecionada";
  }

  const participante = participantesDetalhesAtual.find((p) => {
    return p.usuario_id === alvoId;
  });

  if (participante && participante.usuarios) {
    return participante.usuarios.apelido || participante.usuarios.nome;
  }

  if (
    atividadeDetalhesAtual &&
    atividadeDetalhesAtual.organizador_id === alvoId &&
    atividadeDetalhesAtual.usuarios
  ) {
    return (
      atividadeDetalhesAtual.usuarios.apelido ||
      atividadeDetalhesAtual.usuarios.nome
    );
  }

  return "usuário selecionado";
}

function abrirModalDenuncia(tipoAlvo, alvoId) {
  if (!usuarioLogadoCache) {
    alert("Você precisa estar logado para fazer uma denúncia.");
    return;
  }

  if (tipoAlvo === "Usuario" && alvoId === usuarioLogadoCache.id) {
    alert("Você não pode denunciar a si próprio.");
    return;
  }

  const modal = document.getElementById("modalDenuncia");
  const subtitulo = document.getElementById("modalDenunciaSubtitulo");

  const tipoInput = document.getElementById("denunciaTipoAlvo");
  const alvoInput = document.getElementById("denunciaAlvoId");
  const motivoInput = document.getElementById("denunciaMotivo");
  const descricaoInput = document.getElementById("denunciaDescricao");

  const nomeAlvo = obterNomeAlvoDenuncia(tipoAlvo, alvoId);

  tipoInput.value = tipoAlvo;
  alvoInput.value = alvoId;
  motivoInput.value = "";
  descricaoInput.value = "";

  subtitulo.textContent =
    tipoAlvo === "Atividade"
      ? `Você está denunciando a atividade: ${nomeAlvo}`
      : `Você está denunciando o usuário: ${nomeAlvo}`;

  modal.classList.remove("hidden");
}

function fecharModalDenuncia() {
  const modal = document.getElementById("modalDenuncia");

  if (modal) {
    modal.classList.add("hidden");
  }
}

async function enviarDenuncia() {
  const tipo_alvo = document.getElementById("denunciaTipoAlvo").value;
  const alvo_id = document.getElementById("denunciaAlvoId").value;
  const motivo = document.getElementById("denunciaMotivo").value;
  const descricao = document.getElementById("denunciaDescricao").value;

  if (!motivo) {
    alert("Selecione um motivo para a denúncia.");
    return;
  }

  const resposta = await fetch(`${API_URL}/denuncias`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tipo_alvo,
      alvo_id,
      motivo,
      descricao,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  fecharModalDenuncia();
}

function denunciarAtividadeEmBreve() {
  if (!atividadeDetalhesAtual) {
    alert("Abra os detalhes de uma atividade primeiro.");
    return;
  }

  abrirModalDenuncia("Atividade", atividadeDetalhesAtual.id);
}

function denunciarUsuarioEmBreve(usuarioId) {
  if (!usuarioId) {
    alert("Usuário não encontrado para denúncia.");
    return;
  }

  abrirModalDenuncia("Usuario", usuarioId);
}

function abrirModalCriarAtividade() {
  if (!usuarioLogadoCache) {
    alert("Você precisa estar logado para criar uma atividade.");
    return;
  }

  atividadeEmEdicaoId = null;
  limparFormularioAtividade();
  configurarModalAtividade("criar");

  const modal = document.getElementById("modalCriarAtividade");

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function abrirModalEditarAtividade(atividadeId) {
  if (!usuarioLogadoCache) {
    alert("Você precisa estar logado para editar uma atividade.");
    return;
  }

  const atividade = atividadesCache.find((item) => item.id === atividadeId);

  if (!atividade) {
    alert("Atividade não encontrada para edição.");
    return;
  }

  if (atividade.organizador_id !== usuarioLogadoCache.id) {
    alert("Somente o organizador pode editar esta atividade.");
    return;
  }

  if (atividade.status !== "Aberta") {
    alert("Somente atividades abertas podem ser editadas.");
    return;
  }

  atividadeEmEdicaoId = atividadeId;
  preencherFormularioAtividade(atividade);
  configurarModalAtividade("editar");

  const modal = document.getElementById("modalCriarAtividade");

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function fecharModalCriarAtividade() {
  const modal = document.getElementById("modalCriarAtividade");

  if (modal) {
    modal.classList.add("hidden");
  }

  atividadeEmEdicaoId = null;
}

function abrirModalAuth(tipo = "login") {
  const modal = document.getElementById("modalAuth");

  if (!modal) return;

  modal.classList.remove("hidden");

  if (tipo === "cadastro") {
    mostrarCadastroAuth();
  } else {
    mostrarLoginAuth();
  }
}

function fecharModalAuth() {
  const modal = document.getElementById("modalAuth");

  if (modal) {
    modal.classList.add("hidden");
  }
}

function mostrarLoginAuth() {
  const boxLogin = document.getElementById("boxLogin");
  const boxCadastro = document.getElementById("boxCadastro");
  const titulo = document.getElementById("modalAuthTitulo");
  const subtitulo = document.getElementById("modalAuthSubtitulo");

  if (boxLogin) boxLogin.classList.remove("hidden");
  if (boxCadastro) boxCadastro.classList.add("hidden");

  if (titulo) titulo.textContent = "Entrar no MatchUp";
  if (subtitulo)
    subtitulo.textContent = "Acesse sua conta para participar da comunidade.";
}

function mostrarCadastroAuth() {
  const boxLogin = document.getElementById("boxLogin");
  const boxCadastro = document.getElementById("boxCadastro");
  const titulo = document.getElementById("modalAuthTitulo");
  const subtitulo = document.getElementById("modalAuthSubtitulo");

  if (boxLogin) boxLogin.classList.add("hidden");
  if (boxCadastro) boxCadastro.classList.remove("hidden");

  if (titulo) titulo.textContent = "Criar conta";
  if (subtitulo)
    subtitulo.textContent =
      "Crie seu perfil para publicar e participar de atividades.";
}

function renderizarBlocoChatAtividade(atividade, usuarioPodeVerChat) {
  if (!usuarioPodeVerChat) {
    return `
      <div class="detail-section chat-section">
        <h3>Chat da atividade</h3>
        <div class="empty-state">
          O chat fica disponível apenas para o organizador e participantes confirmados.
        </div>
      </div>
    `;
  }

  const chatAberto = atividade.status === "Aberta";

  return `
    <div class="detail-section chat-section">
      <div class="chat-header">
        <div>
          <h3>Chat da atividade</h3>
          <p>Converse com o organizador e participantes confirmados.</p>
        </div>

        <button class="btn-secondary" onclick="carregarChatAtividade('${atividade.id}')">
          Atualizar chat
        </button>
      </div>

      <div id="chatMensagens" class="chat-messages">
        <div class="empty-state">
          Carregando mensagens...
        </div>
      </div>

      ${
        chatAberto
          ? `
            <div class="chat-input-row">
              <input id="chatMensagemInput" maxlength="500" placeholder="Escreva uma mensagem para o grupo...">

              <button class="btn-primary" onclick="enviarMensagemChat('${atividade.id}')">
                Enviar
              </button>
            </div>
          `
          : `
            <div class="chat-closed">
              Chat fechado porque a atividade não está mais aberta.
            </div>
          `
      }
    </div>
  `;
}

async function carregarChatAtividade(atividade_id) {
  const area = document.getElementById("chatMensagens");

  if (!area) return;

  area.innerHTML = `
    <div class="empty-state">
      Carregando mensagens...
    </div>
  `;

  const resposta = await fetch(`${API_URL}/atividades/${atividade_id}/chat`, {
    method: "GET",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    area.innerHTML = `
      <div class="empty-state">
        ${dados.erro}
      </div>
    `;
    return;
  }

  if (!dados || dados.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        Nenhuma mensagem enviada ainda. Seja o primeiro a falar!
      </div>
    `;
    return;
  }

  area.innerHTML = "";

  dados.forEach((msg) => {
    const usuario = msg.usuarios;
    const nome = usuario ? usuario.apelido || usuario.nome : "Usuário";
    const minhaMensagem =
      usuarioLogadoCache && msg.usuario_id === usuarioLogadoCache.id;

    const div = document.createElement("div");
    div.className = minhaMensagem ? "chat-message mine" : "chat-message";

    div.innerHTML = `
      <div class="chat-message-top">
        <strong>${nome}</strong>
        <span>${formatarDataHora(msg.criado_em)}</span>
      </div>

      <p>${msg.mensagem}</p>
    `;

    area.appendChild(div);
  });

  area.scrollTop = area.scrollHeight;
}

async function enviarMensagemChat(atividade_id) {
  const input = document.getElementById("chatMensagemInput");

  if (!input) return;

  const mensagem = input.value.trim();

  if (!mensagem) {
    alert("Digite uma mensagem antes de enviar.");
    return;
  }

  const resposta = await fetch(`${API_URL}/atividades/${atividade_id}/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mensagem,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  input.value = "";

  await carregarChatAtividade(atividade_id);
}

function formatarDataHora(valor) {
  if (!valor) return "";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function abrirModalAvaliacao(atividadeId, avaliadoId) {
  if (!usuarioLogadoCache) {
    alert("Você precisa estar logado para avaliar.");
    return;
  }

  if (!avaliadoId || avaliadoId === "undefined") {
    alert("Usuário avaliado não encontrado.");
    return;
  }

  if (avaliadoId === usuarioLogadoCache.id) {
    alert("Você não pode avaliar a si próprio.");
    return;
  }

  const modal = document.getElementById("modalAvaliacao");
  const subtitulo = document.getElementById("modalAvaliacaoSubtitulo");
  const atividadeInput = document.getElementById("avaliacaoAtividadeId");
  const avaliadoInput = document.getElementById("avaliacaoAvaliadoId");
  const notaInput = document.getElementById("avaliacaoNota");
  const comentarioInput = document.getElementById("avaliacaoComentario");

  const nomeAvaliado = buscarNomeUsuarioNoModal(avaliadoId);

  atividadeInput.value = atividadeId;
  avaliadoInput.value = avaliadoId;
  notaInput.value = "";
  comentarioInput.value = "";

  subtitulo.textContent = `Você está avaliando: ${nomeAvaliado}`;

  modal.classList.remove("hidden");
}

function fecharModalAvaliacao() {
  const modal = document.getElementById("modalAvaliacao");

  if (modal) {
    modal.classList.add("hidden");
  }
}

async function enviarAvaliacaoModal() {
  const atividade_id = document.getElementById("avaliacaoAtividadeId").value;
  const avaliado_id = document.getElementById("avaliacaoAvaliadoId").value;
  const nota = document.getElementById("avaliacaoNota").value;
  const comentario = document.getElementById("avaliacaoComentario").value;

  if (nota === "") {
    alert("Informe uma nota.");
    return;
  }

  const notaNumero = Number(nota);

  if (notaNumero < 0 || notaNumero > 10) {
    alert("A nota deve estar entre 0 e 10.");
    return;
  }

  const resposta = await fetch(`${API_URL}/avaliacoes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      atividade_id,
      avaliado_id,
      nota,
      comentario,
    }),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    alert(dados.erro);
    return;
  }

  alert(dados.mensagem);

  fecharModalAvaliacao();

  if (typeof listarAvaliacao === "function") {
    await listarAvaliacao();
  }
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function abrirPerfilUsuario(usuarioId) {
  if (!usuarioId || usuarioId === "undefined") {
    alert("Usuário não encontrado.");
    return;
  }

  const modal = document.getElementById("modalPerfilUsuario");
  const conteudo = document.getElementById("modalPerfilConteudo");

  conteudo.innerHTML = `
    <div class="empty-state">
      Carregando perfil...
    </div>
  `;

  modal.classList.remove("hidden");

  const resposta = await fetch(`${API_URL}/usuarios/${usuarioId}/perfil`, {
    method: "GET",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    conteudo.innerHTML = `
      <div class="empty-state">
        ${dados.erro || "Erro ao carregar perfil."}
      </div>
    `;
    return;
  }

  renderizarPerfilUsuario(dados);
}

function fecharModalPerfilUsuario() {
  const modal = document.getElementById("modalPerfilUsuario");

  if (modal) {
    modal.classList.add("hidden");
  }
}

function renderizarPerfilUsuario(perfil) {
  const conteudo = document.getElementById("modalPerfilConteudo");

  const usuario = perfil.usuario;

  const nomePublico = usuario.apelido || usuario.nome;
  const inicial = pegarInicial(nomePublico);

  const fotoPerfil = usuario.foto_perfil
    ? `<img src="${escaparHTML(usuario.foto_perfil)}" alt="Foto de perfil">`
    : `<span>${inicial}</span>`;

  const media =
    perfil.media_avaliacoes !== null ? perfil.media_avaliacoes : "Sem nota";

  const atividadesOrganizadas = perfil.atividades_organizadas || [];
  const atividadesParticipadas = perfil.atividades_participadas || [];
  const avaliacoes = perfil.avaliacoes || [];
  const selos = perfil.selos || [];

  conteudo.innerHTML = `
    <div class="public-profile-header">
      <div class="public-profile-avatar">
        ${fotoPerfil}
      </div>

      <div>
        <h2>${escaparHTML(nomePublico)}</h2>
        <p>Membro da comunidade MatchUp</p>
      </div>
    </div>

    <div class="reputation-badges">
      ${renderizarSelosReputacao(selos)}
    </div>

    <div class="profile-stats-grid">
      <div class="profile-stat-box">
        <strong>${media}</strong>
        <span>Média</span>
      </div>

      <div class="profile-stat-box">
        <strong>${perfil.total_avaliacoes}</strong>
        <span>Avaliações</span>
      </div>

      <div class="profile-stat-box">
        <strong>${atividadesOrganizadas.length}</strong>
        <span>Organizadas</span>
      </div>

      <div class="profile-stat-box">
        <strong>${atividadesParticipadas.length}</strong>
        <span>Participações</span>
      </div>
    </div>

    <div class="profile-section">
      <h3>Comentários recebidos</h3>
      ${renderizarComentariosPerfil(avaliacoes)}
    </div>

    <div class="profile-section">
      <h3>Atividades organizadas</h3>
      ${renderizarAtividadesOrganizadasPerfil(atividadesOrganizadas)}
    </div>

    <div class="profile-section">
      <h3>Atividades participadas</h3>
      ${renderizarAtividadesParticipadasPerfil(atividadesParticipadas)}
    </div>
  `;
}

function renderizarSelosReputacao(selos) {
  if (!selos || selos.length === 0) {
    return `<span class="reputation-badge neutral">Sem selos ainda</span>`;
  }

  return selos
    .map((selo) => {
      return `<span class="reputation-badge">${escaparHTML(selo.icone || "⭐")} ${escaparHTML(selo.titulo || "Selo")}</span>`;
    })
    .join("");
}

function renderizarComentariosPerfil(avaliacoes) {
  if (!avaliacoes || avaliacoes.length === 0) {
    return `
      <div class="empty-state">
        Este usuário ainda não recebeu avaliações.
      </div>
    `;
  }

  return `
    <div class="profile-list">
      ${avaliacoes
        .map((avaliacao) => {
          const avaliador = avaliacao.usuarios
            ? avaliacao.usuarios.apelido || avaliacao.usuarios.nome
            : "Usuário";

          const atividade = avaliacao.atividades
            ? avaliacao.atividades.titulo
            : "Atividade";

          return `
          <div class="profile-list-item">
            <div>
              <strong>Nota ${avaliacao.nota}/10</strong>
              <span>por ${escaparHTML(avaliador)} em ${escaparHTML(atividade)}</span>
            </div>

            <p>${escaparHTML(avaliacao.comentario || "Sem comentário.")}</p>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderizarAtividadesOrganizadasPerfil(atividades) {
  if (!atividades || atividades.length === 0) {
    return `
      <div class="empty-state">
        Nenhuma atividade organizada ainda.
      </div>
    `;
  }

  return `
    <div class="profile-list">
      ${atividades
        .map((atividade) => {
          return `
          <div class="profile-list-item">
            <div>
              <strong>${escaparHTML(atividade.titulo)}</strong>
              <span>${escaparHTML(atividade.categoria)} • ${formatarData(atividade.data)} • ${atividade.status}</span>
            </div>

            <p>${escaparHTML(atividade.local)}</p>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderizarAtividadesParticipadasPerfil(participacoes) {
  if (!participacoes || participacoes.length === 0) {
    return `
      <div class="empty-state">
        Nenhuma participação confirmada ainda.
      </div>
    `;
  }

  return `
    <div class="profile-list">
      ${participacoes
        .map((participacao) => {
          const atividade = participacao.atividades;

          if (!atividade) {
            return "";
          }

          return `
          <div class="profile-list-item">
            <div>
              <strong>${escaparHTML(atividade.titulo)}</strong>
              <span>${escaparHTML(atividade.categoria)} • ${formatarData(atividade.data)} • ${atividade.status}</span>
            </div>

            <p>${escaparHTML(atividade.local)}</p>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}


/* =========================
   MELHORIAS: PERFIL, RECOMENDAÇÕES E PRESENÇAS
   ========================= */

async function carregarRecomendacoes() {
  const card = document.getElementById("recomendacoesCard");
  const area = document.getElementById("listaRecomendacoes");

  if (!card || !area) return;

  if (!usuarioLogadoCache) {
    renderizarRecomendacoes(null);
    return;
  }

  card.classList.remove("hidden");
  area.innerHTML = `<div class="empty-state">Carregando recomendações...</div>`;

  try {
    const resposta = await fetch(`${API_URL}/atividades/recomendadas`, {
      method: "GET",
      credentials: "include",
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      area.innerHTML = `<div class="empty-state">${escaparHTML(dados.erro || "Erro ao carregar recomendações.")}</div>`;
      return;
    }

    renderizarRecomendacoes(dados);
  } catch (erro) {
    console.error("Erro ao carregar recomendações:", erro);
    area.innerHTML = `<div class="empty-state">Erro ao carregar recomendações.</div>`;
  }
}

function renderizarRecomendacoes(dados) {
  const card = document.getElementById("recomendacoesCard");
  const area = document.getElementById("listaRecomendacoes");

  if (!card || !area) return;

  if (!dados || !usuarioLogadoCache) {
    card.classList.add("hidden");
    return;
  }

  const atividades = dados.atividades || [];

  if (atividades.length === 0) {
    area.innerHTML = `
      <div class="empty-state small-empty">
        Nenhuma recomendação disponível agora. Atualize seus interesses no perfil ou explore o feed.
      </div>
    `;
    return;
  }

  area.innerHTML = atividades
    .map((atividade) => {
      const linkMapa = obterLinkMapaAtividade(atividade);
      return `
        <div class="recommendation-card">
          <div>
            <strong>${escaparHTML(atividade.titulo)}</strong>
            <span>${escaparHTML(atividade.categoria || "-")} • ${formatarData(atividade.data)} às ${formatarHorario(atividade.horario)}</span>
            <p>📍 ${escaparHTML(atividade.local || "-")}${atividade.cidade ? ` • ${escaparHTML(atividade.cidade)}` : ""}</p>
          </div>

          <div class="recommendation-actions">
            ${linkMapa ? `<a class="btn-secondary as-link" href="${escaparHTML(linkMapa)}" target="_blank" rel="noopener">Mapa</a>` : ""}
            <button class="btn-primary" onclick="abrirDetalhesAtividade('${atividade.id}')">Ver</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function abrirModalMeuPerfil() {
  if (!usuarioLogadoCache) {
    mostrarMensagem("Faça login para editar seu perfil.", "warning");
    abrirModalAuth("login");
    return;
  }

  const modal = document.getElementById("modalMeuPerfil");
  if (!modal) return;

  modal.classList.remove("hidden");
  renderizarCheckboxesInteresses("meuPerfilInteresses", []);

  try {
    const resposta = await fetch(`${API_URL}/meu-perfil`, {
      method: "GET",
      credentials: "include",
    });

    const perfil = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem(perfil.erro || "Erro ao carregar perfil.", "warning");
      return;
    }

    ultimoPerfilCarregado = perfil;
    preencherModalMeuPerfil(perfil);
  } catch (erro) {
    console.error("Erro ao abrir perfil:", erro);
    mostrarMensagem("Erro ao carregar perfil.", "warning");
  }
}

function preencherModalMeuPerfil(perfil) {
  definirValorCampo("meuPerfilNome", perfil.nome);
  definirValorCampo("meuPerfilApelido", perfil.apelido);
  definirValorCampo("meuPerfilEmail", perfil.email);
  definirValorCampo("meuPerfilDataNascimento", perfil.data_nascimento);
  definirValorCampo("meuPerfilFotoUrl", perfil.foto_perfil);
  definirValorCampo("meuPerfilSenhaAtual", "");
  definirValorCampo("meuPerfilNovaSenha", "");
  definirValorCampo("meuPerfilConfirmarSenha", "");

  renderizarCheckboxesInteresses("meuPerfilInteresses", perfil.interesses || []);

  const preview = document.getElementById("meuPerfilFotoPreview");
  const nomePublico = perfil.apelido || perfil.nome || "Usuário";

  if (preview) {
    preview.innerHTML = perfil.foto_perfil
      ? `<img src="${escaparHTML(perfil.foto_perfil)}" alt="Foto de perfil">`
      : `<span>${pegarInicial(nomePublico)}</span>`;
  }
}

function fecharModalMeuPerfil() {
  const modal = document.getElementById("modalMeuPerfil");
  if (modal) modal.classList.add("hidden");
}

async function salvarMeuPerfil() {
  if (!usuarioLogadoCache) {
    mostrarMensagem("Faça login para editar seu perfil.", "warning");
    return;
  }

  const nome = obterValorCampo("meuPerfilNome");
  const apelido = obterValorCampo("meuPerfilApelido");
  const email = obterValorCampo("meuPerfilEmail");
  const data_nascimento = obterValorCampo("meuPerfilDataNascimento") || null;
  const foto_perfil = obterValorCampo("meuPerfilFotoUrl") || null;
  const senha_atual = obterValorCampo("meuPerfilSenhaAtual");
  const senha = obterValorCampo("meuPerfilNovaSenha");
  const confirmar_senha = obterValorCampo("meuPerfilConfirmarSenha");
  const interesses = obterInteressesSelecionados("meuPerfilInteresses");

  if (!nome || !email) {
    mostrarMensagem("Nome e e-mail são obrigatórios.", "warning");
    return;
  }

  if (!emailValido(email)) {
    mostrarMensagem("Informe um e-mail válido.", "warning");
    return;
  }

  if (senha && senha.length < 8) {
    mostrarMensagem("A nova senha deve ter no mínimo 8 caracteres.", "warning");
    return;
  }

  if (senha && senha !== confirmar_senha) {
    mostrarMensagem("A confirmação da nova senha não confere.", "warning");
    return;
  }

  const corpo = {
    nome,
    apelido,
    email,
    data_nascimento,
    foto_perfil,
    interesses,
  };

  if (senha_atual) corpo.senha_atual = senha_atual;
  if (senha) {
    corpo.senha = senha;
    corpo.confirmar_senha = confirmar_senha;
  }

  const resposta = await fetch(`${API_URL}/meu-perfil`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corpo),
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro || "Erro ao salvar perfil.", "warning");
    return;
  }

  const arquivo = document.getElementById("meuPerfilFotoArquivo")
    ? document.getElementById("meuPerfilFotoArquivo").files[0]
    : null;

  if (arquivo) {
    const formData = new FormData();
    formData.append("foto", arquivo);

    const respostaFoto = await fetch(`${API_URL}/meu-perfil/foto`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const dadosFoto = await respostaFoto.json();

    if (!respostaFoto.ok) {
      mostrarMensagem(dadosFoto.erro || "Perfil salvo, mas a foto não foi enviada.", "warning");
    }
  }

  mostrarMensagem(dados.mensagem || "Perfil salvo com sucesso.", "success");

  await verificarSessao();
  await listarUsuarios();
  await carregarRecomendacoes();

  fecharModalMeuPerfil();
}

async function excluirMinhaConta() {
  if (!usuarioLogadoCache) return;

  if (!confirm("Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.")) {
    return;
  }

  const resposta = await fetch(`${API_URL}/meu-perfil`, {
    method: "DELETE",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro || "Erro ao excluir conta.", "warning");
    return;
  }

  mostrarMensagem(dados.mensagem || "Conta excluída com sucesso.", "success");
  fecharModalMeuPerfil();

  await verificarSessao();
  await listarAtividades();
  await listarInscricoes(false);
}

/* =========================
   MELHORIAS: TOASTS, MINHAS ATIVIDADES E NOTIFICAÇÕES
   ========================= */

function mostrarMensagem(mensagem, tipo = "info") {
  const container = document.getElementById("toastContainer");

  if (!container) {
    console.log(mensagem);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast-message toast-${tipo}`;
  toast.textContent = mensagem || "Operação concluída.";

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 50);

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 3500);
}

window.alert = function (mensagem) {
  mostrarMensagem(mensagem, "info");
};

function obterAtividadeDaInscricao(inscricao) {
  return inscricao && inscricao.atividades ? inscricao.atividades : null;
}

function renderizarResumoMinhasAtividades(dados) {
  const totalOrganizadas = dados.organizadas ? dados.organizadas.length : 0;
  const totalParticipando = dados.participando ? dados.participando.length : 0;
  const totalEspera = dados.lista_espera ? dados.lista_espera.length : 0;
  const totalAvaliar = dados.encerradas_para_avaliar
    ? dados.encerradas_para_avaliar.length
    : 0;

  return `
    <div class="dashboard-grid">
      <div class="dashboard-card">
        <span>Organizadas</span>
        <strong>${totalOrganizadas}</strong>
      </div>

      <div class="dashboard-card">
        <span>Participando</span>
        <strong>${totalParticipando}</strong>
      </div>

      <div class="dashboard-card">
        <span>Lista de espera</span>
        <strong>${totalEspera}</strong>
      </div>

      <div class="dashboard-card">
        <span>Para avaliar</span>
        <strong>${totalAvaliar}</strong>
      </div>
    </div>
  `;
}

function renderizarAtividadesSimples(atividades, tipo = "atividade") {
  if (!atividades || atividades.length === 0) {
    return `
      <div class="empty-state small-empty">
        Nenhum registro encontrado.
      </div>
    `;
  }

  return `
    <div class="my-activity-list">
      ${atividades
        .map((item) => {
          const atividade = tipo === "inscricao" ? obterAtividadeDaInscricao(item) : item;

          if (!atividade) {
            return "";
          }

          const statusInscricao =
            tipo === "inscricao"
              ? item.status === "Lista de Espera"
                ? `Lista de espera #${item.posicao_espera}`
                : item.status
              : atividade.status;

          return `
            <div class="my-activity-item">
              <div>
                <strong>${escaparHTML(atividade.titulo)}</strong>
                <span>
                  ${escaparHTML(atividade.categoria || "-")} •
                  ${formatarData(atividade.data)} às ${formatarHorario(atividade.horario)}
                </span>
                <p>📍 ${escaparHTML(atividade.local || "-")}</p>
              </div>

              <div class="my-activity-actions">
                <span class="status-badge status-${atividade.status}">
                  ${statusInscricao}
                </span>

                ${tipo === "atividade" && atividade.status === "Aberta" ? `
                  <button class="btn-secondary" onclick="abrirModalEditarAtividade('${atividade.id}')">
                    Editar
                  </button>
                ` : ""}

                <button class="btn-secondary" onclick="abrirDetalhesAtividade('${atividade.id}')">
                  Ver detalhes
                </button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderizarMinhasAtividades(dados) {
  return `
    ${renderizarResumoMinhasAtividades(dados)}

    <div class="my-sections">
      <section class="my-section">
        <h3>📌 Atividades que organizei</h3>
        ${renderizarAtividadesSimples(dados.organizadas, "atividade")}
      </section>

      <section class="my-section">
        <h3>✅ Atividades em que estou participando</h3>
        ${renderizarAtividadesSimples(dados.participando, "inscricao")}
      </section>

      <section class="my-section">
        <h3>⏳ Lista de espera</h3>
        ${renderizarAtividadesSimples(dados.lista_espera, "inscricao")}
      </section>

      <section class="my-section">
        <h3>⭐ Encerradas para avaliar</h3>
        ${renderizarAtividadesSimples(dados.encerradas_para_avaliar, "inscricao")}
      </section>
    </div>
  `;
}

async function abrirModalMinhasAtividades() {
  if (!usuarioLogadoCache) {
    mostrarMensagem("Faça login para ver suas atividades.", "warning");
    abrirModalAuth("login");
    return;
  }

  const modal = document.getElementById("modalMinhasAtividades");
  const conteudo = document.getElementById("modalMinhasAtividadesConteudo");

  if (!modal || !conteudo) return;

  conteudo.innerHTML = "Carregando suas atividades...";
  modal.classList.remove("hidden");

  try {
    const resposta = await fetch(`${API_URL}/minhas-atividades`, {
      method: "GET",
      credentials: "include",
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      conteudo.innerHTML = `<div class="empty-state">${dados.erro || "Erro ao carregar suas atividades."}</div>`;
      return;
    }

    conteudo.innerHTML = renderizarMinhasAtividades(dados);
  } catch (erro) {
    console.error("Erro ao carregar minhas atividades:", erro);
    conteudo.innerHTML = `<div class="empty-state">Erro ao carregar suas atividades.</div>`;
  }
}

function fecharModalMinhasAtividades() {
  const modal = document.getElementById("modalMinhasAtividades");
  if (modal) modal.classList.add("hidden");
}

async function listarNotificacoes(renderizarModal = false) {
  const badge = document.getElementById("badgeNotificacoes");
  const conteudo = document.getElementById("modalNotificacoesConteudo");

  if (!usuarioLogadoCache) {
    if (badge) {
      badge.textContent = "0";
      badge.classList.add("hidden");
    }

    if (renderizarModal && conteudo) {
      conteudo.innerHTML = `<div class="empty-state">Faça login para ver suas notificações.</div>`;
    }

    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/notificacoes`, {
      method: "GET",
      credentials: "include",
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      if (renderizarModal && conteudo) {
        conteudo.innerHTML = `<div class="empty-state">${dados.erro || "Erro ao carregar notificações."}</div>`;
      }
      return;
    }

    if (badge) {
      badge.textContent = dados.nao_lidas;

      if (dados.nao_lidas > 0) {
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }

    if (renderizarModal && conteudo) {
      conteudo.innerHTML = renderizarNotificacoes(dados.notificacoes);
    }
  } catch (erro) {
    console.error("Erro ao carregar notificações:", erro);

    if (renderizarModal && conteudo) {
      conteudo.innerHTML = `<div class="empty-state">Erro ao carregar notificações.</div>`;
    }
  }
}

function renderizarNotificacoes(notificacoes) {
  if (!notificacoes || notificacoes.length === 0) {
    return `
      <div class="empty-state">
        Nenhuma notificação por enquanto.
      </div>
    `;
  }

  return `
    <div class="notification-list">
      ${notificacoes
        .map((notificacao) => {
          const classe = notificacao.lida
            ? "notification-item read"
            : "notification-item unread";

          return `
            <div class="${classe}">
              <div>
                <strong>${escaparHTML(notificacao.titulo)}</strong>
                <p>${escaparHTML(notificacao.mensagem)}</p>
                <span>${formatarDataHora(notificacao.criado_em)}</span>
              </div>

              ${
                notificacao.lida
                  ? `<span class="read-label">Lida</span>`
                  : `<button class="btn-secondary" onclick="marcarNotificacaoComoLida('${notificacao.id}')">Marcar como lida</button>`
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

async function abrirModalNotificacoes() {
  if (!usuarioLogadoCache) {
    mostrarMensagem("Faça login para ver suas notificações.", "warning");
    abrirModalAuth("login");
    return;
  }

  const modal = document.getElementById("modalNotificacoes");
  const conteudo = document.getElementById("modalNotificacoesConteudo");

  if (!modal || !conteudo) return;

  conteudo.innerHTML = "Carregando notificações...";
  modal.classList.remove("hidden");

  await listarNotificacoes(true);
}

function fecharModalNotificacoes() {
  const modal = document.getElementById("modalNotificacoes");
  if (modal) modal.classList.add("hidden");
}

async function marcarNotificacaoComoLida(notificacaoId) {
  const resposta = await fetch(`${API_URL}/notificacoes/${notificacaoId}/lida`, {
    method: "PUT",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro || "Erro ao marcar notificação.", "warning");
    return;
  }

  mostrarMensagem(dados.mensagem, "success");
  await listarNotificacoes(true);
}

async function marcarTodasNotificacoesComoLidas() {
  const resposta = await fetch(`${API_URL}/notificacoes/marcar-todas-lidas`, {
    method: "PUT",
    credentials: "include",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro || "Erro ao atualizar notificações.", "warning");
    return;
  }

  mostrarMensagem(dados.mensagem, "success");
  await listarNotificacoes(true);
}

document.addEventListener("keydown", function (evento) {
  if (evento.key !== "Escape") return;

  fecharModalMinhasAtividades();
  fecharModalNotificacoes();
  fecharModalAuth();
  fecharModalCriarAtividade();
  fecharDetalhesAtividade();
  fecharModalAvaliacao();
  fecharModalDenuncia();
  fecharModalPerfilUsuario();
  fecharModalMeuPerfil();
});

document.addEventListener("click", function (evento) {
  if (!evento.target.classList || !evento.target.classList.contains("modal-overlay")) {
    return;
  }

  evento.target.classList.add("hidden");
});

window.onload = async function () {
  renderizarCheckboxesInteresses("authInteresses", []);
  renderizarCheckboxesInteresses("meuPerfilInteresses", []);

  await verificarSessao();
  await listarUsuarios();
  await listarAtividades();
  await listarInscricoes(false);
  await listarNotificacoes(false);
};
