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

    const confirmadosInscritos = inscricoesDaAtividade.filter(
      (i) => i.status === "Confirmado",
    ).length;

    // O organizador também conta como jogador
    const confirmados = confirmadosInscritos + 1;
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
                <div class="organizer clickable-user" onclick="abrirPerfilUsuario('${atividade.organizador_id}')">
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

  const organizadorCard = {
    usuario_id: atividade.organizador_id,
    status: "Organizador",
    usuarios: atividade.usuarios,
  };

  conteudo.innerHTML = `
        <div class="activity-detail-grid">
            <div class="detail-box">
                <h3>Informações</h3>

                <p><strong>Organizador:</strong> ${organizador}</p>
                <p><strong>Status:</strong> ${atividade.status}</p>
                <p><strong>Local:</strong> ${atividade.local}</p>
                <p><strong>Data:</strong> ${formatarData(atividade.data)}</p>
                <p><strong>Horário:</strong> ${formatarHorario(atividade.horario)}</p>
                <p><strong>Vagas:</strong> ${totalJogadores}/${atividade.limite_vagas}</p>
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

        ${renderizarBlocoChatAtividade(atividade, usuarioPodeVerChat)}

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
        usuarioLogadoCache &&
        atividade.organizador_id === usuarioLogadoCache.id;

      const usuarioAtualEhParticipanteConfirmado =
        usuarioLogadoCache &&
        participantesDetalhesAtual.some((p) => {
          return (
            p.usuario_id === usuarioLogadoCache.id && p.status === "Confirmado"
          );
        });

      const usuarioPodeAvaliar =
        usuarioAtualEhOrganizador || usuarioAtualEhParticipanteConfirmado;

      const podeAvaliar =
        atividade.status === "Encerrada" &&
        usuarioLogadoCache &&
        usuarioPodeAvaliar &&
        participante.usuario_id !== usuarioLogadoCache.id;

      return `
      <div class="participant-card">
        <div class="participant-info clickable-user" onclick="abrirPerfilUsuario('${participante.usuario_id}')">
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

window.onload = async function () {
  await verificarSessao();
  await listarUsuarios();
  await listarAtividades();
  await listarInscricoes(false);
};
