const API_URL = "";
let atividadesCache = [];
let inscricoesCache = [];
let usuarioLogadoCache = null;

let atividadeDetalhesAtual = null;
let participantesDetalhesAtual = [];

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
      areaSessao.innerHTML = `
          <div class="logged-user-mini">
              <div class="logged-avatar">${pegarInicial(dados.usuario.nome)}</div>

              <div>
                  <strong>${dados.usuario.nome}</strong>
                  <span>${dados.usuario.email}</span>
              </div>

              <button class="mini-logout-btn" onclick="logout()">Sair</button>
          </div>
      `;

      if (authCard) authCard.classList.add("hidden");
      if (welcomeCard) welcomeCard.classList.remove("hidden");
      if (welcomeTitle)
        welcomeTitle.textContent = `Bem-vindo, ${dados.usuario.nome}!`;
    } else {
      areaSessao.innerHTML = `<p>Você não está logado.</p>`;

      if (authCard) authCard.classList.remove("hidden");
      if (welcomeCard) welcomeCard.classList.add("hidden");
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
  const data_nascimento =
    document.getElementById("authDataNascimento").value || null;
  const apelido = document.getElementById("authApelido").value.trim();
  const foto_perfil = document.getElementById("authFotoPerfil").value.trim();

  if (!nome || !email || !senha) {
    alert("Preencha nome, e-mail e senha.");
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

  alert("Conta criada com sucesso. Agora faça login.");

  document.getElementById("authNome").value = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authSenha").value = "";
  document.getElementById("authDataNascimento").value = "";
  document.getElementById("authApelido").value = "";
  document.getElementById("authFotoPerfil").value = "";

  mostrarLoginAuth();

  await listarUsuarios();
}

async function login() {
  const email = document.getElementById("authLoginEmail").value.trim();
  const senha = document.getElementById("authLoginSenha").value.trim();

  if (!email || !senha) {
    alert("Preencha e-mail e senha.");
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

  fecharModalCriarAtividade();

  await listarAtividades();
  await listarInscricoes(false);
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

  renderizarFeedAtividades(atividades);
  atualizarDropdownsAtividades(atividades);

  const statAtividades = document.getElementById("statAtividades");
  if (statAtividades) {
    statAtividades.textContent = atividades.length;
  }
}

function renderizarFeedAtividades(atividades) {
  const feed = document.getElementById("feedAtividades");

  if (!feed) return;

  feed.innerHTML = "";

  if (!atividades || atividades.length === 0) {
    feed.innerHTML = `
            <div class="empty-state">
                Nenhuma atividade publicada ainda. Seja o primeiro a criar uma!
            </div>
        `;
    return;
  }

  atividades.forEach((atividade) => {
    const organizador = atividade.usuarios
      ? atividade.usuarios.apelido || atividade.usuarios.nome
      : "Organizador";

    const inicial = organizador.charAt(0).toUpperCase();

    const descricao = atividade.descricao
      ? atividade.descricao
      : "Sem descrição informada.";

    const requisitos = atividade.requisitos
      ? atividade.requisitos
      : "Nenhum requisito informado.";

    const statusClass = `status-${atividade.status}`;

    const inscricoesDaAtividade = inscricoesCache.filter((i) => {
      return i.atividade_id === atividade.id;
    });

    const confirmados = inscricoesDaAtividade.filter(
      (i) => i.status === "Confirmado",
    ).length;
    const listaEspera = inscricoesDaAtividade.filter(
      (i) => i.status === "Lista de Espera",
    ).length;

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
      const textoStatus =
        minhaInscricao.status === "Confirmado"
          ? "Inscrito"
          : `Lista de espera #${minhaInscricao.posicao_espera}`;

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
                Participar
            </button>
        `;
    }

    if (!usuarioLogadoCache) {
      textoBotaoParticipar = "Faça login para participar";
      classeBotaoParticipar = "btn-disabled";
      disabledParticipar = "disabled";
    } else if (souOrganizador) {
      textoBotaoParticipar = "Você é o organizador";
      classeBotaoParticipar = "btn-disabled";
      disabledParticipar = "disabled";
    } else if (minhaInscricao) {
      textoBotaoParticipar =
        minhaInscricao.status === "Confirmado"
          ? "Inscrito"
          : `Na lista de espera #${minhaInscricao.posicao_espera}`;

      classeBotaoParticipar = "btn-disabled";
      disabledParticipar = "disabled";
    } else if (atividade.status !== "Aberta") {
      textoBotaoParticipar = "Indisponível";
      classeBotaoParticipar = "btn-disabled";
      disabledParticipar = "disabled";
    }

    let botoesOrganizador = "";

    if (souOrganizador && atividade.status === "Aberta") {
      botoesOrganizador = `
                <button class="btn-acao" onclick="encerrarAtividade('${atividade.id}')">
                    Encerrar
                </button>

                <button class="btn-del" onclick="cancelarAtividade('${atividade.id}')">
                    Cancelar
                </button>
            `;
    }

    const card = document.createElement("article");
    card.className = "activity-post";

    card.innerHTML = `
            <div class="post-header">
                <div class="organizer">
                    <div class="organizer-avatar">${inicial}</div>
                    <div>
                        <strong>${organizador}</strong>
                        <span>publicou uma nova atividade</span>
                    </div>
                </div>

                <span class="status-badge ${statusClass}">
                    ${atividade.status}
                </span>
            </div>

            <div class="post-body">
                <h3>${atividade.titulo}</h3>
                <p class="post-description">${descricao}</p>

                <div class="capacity-box">
                    <div class="capacity-header">
                        <span>Participantes confirmados</span>
                        <strong>${confirmados}/${atividade.limite_vagas}</strong>
                    </div>

                    <div class="capacity-bar">
                        <div class="capacity-fill" style="width: ${calcularPorcentagemVagas(confirmados, atividade.limite_vagas)}%;"></div>
                    </div>

                    <small>${listaEspera} pessoa(s) na lista de espera</small>
                </div>

                <div class="post-meta">
                    <div class="meta-item">🏷️ Categoria: <strong>${atividade.categoria}</strong></div>
                    <div class="meta-item">📍 Local: <strong>${atividade.local}</strong></div>
                    <div class="meta-item">📅 Data: <strong>${formatarData(atividade.data)}</strong></div>
                    <div class="meta-item">🕒 Horário: <strong>${formatarHorario(atividade.horario)}</strong></div>
                    <div class="meta-item">📌 Requisitos: <strong>${requisitos}</strong></div>
                    <div class="meta-item">👥 Lista de espera: <strong>${listaEspera}</strong></div>
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

function filtrarFeed() {
  const termo = document.getElementById("campoBusca").value.toLowerCase();

  const filtradas = atividadesCache.filter((atividade) => {
    const titulo = atividade.titulo ? atividade.titulo.toLowerCase() : "";
    const categoria = atividade.categoria
      ? atividade.categoria.toLowerCase()
      : "";
    const local = atividade.local ? atividade.local.toLowerCase() : "";

    return (
      titulo.includes(termo) ||
      categoria.includes(termo) ||
      local.includes(termo)
    );
  });

  renderizarFeedAtividades(filtradas);
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

  const resposta = await fetch(
    `${API_URL}/atividades/${atividade_id}/participantes`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  const participantes = await resposta.json();

  atividadeDetalhesAtual = atividade;
  participantesDetalhesAtual = participantes;

  renderizarDetalhesAtividade(atividade, participantes);
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

  const organizadorCard = {
    usuario_id: atividade.organizador_id,
    status: "Organizador",
    usuarios: atividade.usuarios,
  };

  const souOrganizador =
    usuarioLogadoCache && atividade.organizador_id === usuarioLogadoCache.id;

  conteudo.innerHTML = `
        <div class="activity-detail-grid">
            <div class="detail-box">
                <h3>Informações</h3>

                <p><strong>Organizador:</strong> ${organizador}</p>
                <p><strong>Status:</strong> ${atividade.status}</p>
                <p><strong>Local:</strong> ${atividade.local}</p>
                <p><strong>Data:</strong> ${formatarData(atividade.data)}</p>
                <p><strong>Horário:</strong> ${formatarHorario(atividade.horario)}</p>
                <p><strong>Vagas:</strong> ${confirmados.length}/${atividade.limite_vagas}</p>
                <p><strong>Descrição:</strong> ${atividade.descricao || "Sem descrição."}</p>
                <p><strong>Requisitos:</strong> ${atividade.requisitos || "Nenhum requisito informado."}</p>
            </div>

            <div class="detail-box">
                <h3>Ações</h3>

                <button class="btn-primary full" onclick="participarPeloFeed('${atividade.id}')">
                    Participar
                </button>

                ${
                  souOrganizador && atividade.status === "Aberta"
                    ? `
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
      const ehOrganizador = participante.status === "Organizador";
      const nome = usuario ? usuario.apelido || usuario.nome : "Usuário";

      const inicial = pegarInicial(nome);

      const podeAvaliar =
        atividade.status === "Encerrada" &&
        usuarioLogadoCache &&
        participante.usuario_id !== usuarioLogadoCache.id &&
        !ehOrganizador;

      return `
            <div class="participant-card">
                <div class="participant-info">
                    <div class="participant-avatar">${inicial}</div>
                    <div>
                        <strong>
                            ${nome}
                            ${ehOrganizador ? '<span class="role-badge">Organizador</span>' : ""}
                        </strong>
                        <span>${usuario ? usuario.email : ""}</span>
                    </div>
                </div>

                <div class="participant-actions">
                    ${
                      podeAvaliar
                        ? `
                            <button class="btn-primary" onclick="abrirFormularioAvaliacao('${atividade.id}', '${participante.usuario_id}', '${nome}')">
                                Avaliar
                            </button>
                        `
                        : ""
                    }

                    ${
                      usuarioLogadoCache &&
                      participante.usuario_id !== usuarioLogadoCache.id
                        ? `
                          ${
                            usuarioLogadoCache && participante.usuario_id !== usuarioLogadoCache.id
                              ? `
                                  <button class="btn-danger" onclick="abrirModalDenuncia('Usuario', '${participante.usuario_id}')">
                                      Denunciar
                                  </button>
                              `
                              : ""
                          }
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
                        <strong>
                            ${nome}
                            ${ehOrganizador ? '<span class="role-badge">Organizador</span>' : ""}
                        </strong>
                        <span>Posição ${participante.posicao_espera}</span>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

function abrirFormularioAvaliacao(atividade_id, avaliado_id, nomeAvaliado) {
  const conteudo = document.getElementById("modalConteudoAtividade");

  const formulario = document.createElement("div");
  formulario.className = "inline-review-box";

  formulario.innerHTML = `
        <h3>Avaliar ${nomeAvaliado}</h3>

        <label>Nota</label>
        <input id="notaInlineAvaliacao" type="number" min="0" max="10" placeholder="0 a 10">

        <label>Comentário</label>
        <input id="comentarioInlineAvaliacao" placeholder="Escreva um elogio ou comentário sobre o participante">

        <div class="button-row">
            <button class="btn-primary" onclick="enviarAvaliacaoInline('${atividade_id}', '${avaliado_id}')">
                Enviar avaliação
            </button>

            <button class="btn-danger" onclick="abrirDetalhesAtividade('${atividade_id}')">
                Cancelar
            </button>
        </div>
    `;

  conteudo.prepend(formulario);
}

async function enviarAvaliacaoInline(atividade_id, avaliado_id) {
  const nota = document.getElementById("notaInlineAvaliacao").value;
  const comentario = document.getElementById("comentarioInlineAvaliacao").value;

  if (nota === "") {
    alert("Informe uma nota.");
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

  abrirDetalhesAtividade(atividade_id);
  listarAvaliacao();
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

window.onload = async function () {
  await verificarSessao();
  await listarUsuarios();
  await listarAtividades();
  await listarInscricoes(false);
};
