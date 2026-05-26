// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogado = null;

// Referência Firebase para Monitoria
let firebaseApp = null;
let firebaseDB = null;
let firebaseFirestore = null;
let firebaseStorage = null;
let monitoriaListenerAtivo = null;
let salaMoniAtual = null;

// WebRTC — chamada de voz/vídeo na monitoria
let rtcPeerConnection = null;
let localMediaStream = null;
let remoteMediaStream = null;
let rtcListenersAtivos = [];
let rtcCandidatosProcessados = new Set();
let chamadaMonitoriaAtiva = false;
let tipoChamadaMonitoriaAtual = null; // "video" ou "voz"

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

const SERIES_PADRAO = ["1º Ano EF", "2º Ano EF", "3º Ano EF", "4º Ano EF", "5º Ano EF", "6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "1ª Série EM", "2ª Série EM", "3ª Série EM"];
const PREMIOS_PADRAO = ["Ouro", "Prata", "Bronze", "Menção Honrosa"];

document.addEventListener("DOMContentLoaded", async () => {
    initFirebase();
    garantirCadastrosBasicos();
    await carregarDadosFirebaseInicial();
    dadosTrabalho = carregarPremiados();
    initLogin();
    initDragAndDrop();
    initDragAndDropCronograma();
    initResultadoManual();

    document.getElementById("filterMunicipio").addEventListener("change", renderizarPlataformaDashboard);
    document.getElementById("filterEscola").addEventListener("change", renderizarPlataformaDashboard);
    document.getElementById("filterOlimpiada").addEventListener("change", renderizarPlataformaDashboard);
    document.getElementById("filterResultadoNome")?.addEventListener("input", renderizarResultadosImportacao);
    document.getElementById("filterResultadoCidade")?.addEventListener("change", renderizarResultadosImportacao);
    document.getElementById("filterResultadoEscola")?.addEventListener("change", renderizarResultadosImportacao);
    document.getElementById("filterResultadoPremio")?.addEventListener("change", renderizarResultadosImportacao);
    document.getElementById("btnLogout").addEventListener("click", logout);
    verificarSessao();
});

// ==================== SISTEMA DE AUTENTICAÇÃO ====================
function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userInput = document.getElementById("auth-user").value.trim().toLowerCase();
        const passInput = document.getElementById("auth-pass").value.trim();
        const btn = form.querySelector('button[type="submit"]');

        try {
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Entrando...'; }
            await sincronizarUsuariosFirebaseInicial();
            const usuariosCadastrados = getStorage("app_usuarios");
            const contaEncontrada = usuariosCadastrados.find(u => normalizarTexto(u.login) === userInput && String(u.senha) === passInput);

            if (contaEncontrada) {
                usuarioLogado = contaEncontrada;
                sessionStorage.setItem("avance_session", JSON.stringify(contaEncontrada));
                logarSucesso(contaEncontrada);
            } else {
                alert("Erro de Autenticação: Login inválido.");
            }
        } catch (erro) {
            console.error("Erro ao tentar login", erro);
            alert(`Erro ao tentar login. Verifique conexão/Firebase.\n\n${erro.message || erro}`);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Acessar Painel'; }
        }
    });
}

function verificarSessao() {
    const sessaoGuardada = sessionStorage.getItem("avance_session");
    if (sessaoGuardada) {
        usuarioLogado = JSON.parse(sessaoGuardada);
        logarSucesso(usuarioLogado);
    }
}

function logarSucesso(usuario) {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainPanel").classList.remove("hidden");
    document.getElementById("userLoggedNome").innerText = usuario.nome;
    document.getElementById("userLoggedNivel").innerText = usuario.nivel;

    aplicarPermissoesNavegacao(usuario);
    popularSeletores();
    renderizarPlataformaDashboard();
    renderizarCronograma();
    renderizarTabelasGerenciais();
    renderizarResultadosImportacao();
    ajustarCamposFormUsuario();
    renderizarPlataformaEnsino();
    ativarPrimeiraAbaPermitida();
}

// ==================== SISTEMA DE PERMISSÕES ====================
function permissao(chave) {
    if (!usuarioLogado) return null;
    const nivel = usuarioLogado.nivel;
    const perms = PERMISSOES[nivel];
    if (!perms) return null;
    // suporte a chave aninhada ex: "usuarios.podeGerenciar"
    return chave.split(".").reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), perms);
}

function aplicarPermissoesNavegacao(usuario) {
    const nivel = usuario.nivel;
    const perms = PERMISSOES[nivel];
    if (!perms) return;

    // Mapeamento nav botão -> aba
    const todosNavBotoes = {
        "btnNav-dashboard": "dashboard",
        "btnNav-calendario": "calendario",
        "btnNav-importar": "importar",
        "btnNav-plataforma": "plataforma",
        "btnNav-monitoria": "monitoria",
        "btnNavUsuarios": "usuarios",
        "btnNavOlimpiadas": "olimpiadas",
        "btnNavCidades": "cidades",
        "btnNavEscolas": "escolas"
    };

    Object.entries(todosNavBotoes).forEach(([btnId, aba]) => {
        const el = document.getElementById(btnId);
        if (!el) return;
        if (perms.abas.includes(aba)) {
            el.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
        }
    });

    // Painel de cronograma ADM
    const admCro = document.getElementById("admCronogramaPanel");
    if (admCro) {
        if (nivel === "ADM") admCro.classList.remove("hidden");
        else admCro.classList.add("hidden");
    }

    // Filtros do dashboard travados para Gestor/Escola/Aluno
    const filtroMunicipio = document.getElementById("filterMunicipio");
    if (perms.dashboard.filtroTravado) {
        if (filtroMunicipio) filtroMunicipio.disabled = true;
        document.getElementById("filterEscola").disabled = true;
        document.getElementById("filterOlimpiada").disabled = true;
    } else {
        if (filtroMunicipio) filtroMunicipio.disabled = false;
        document.getElementById("filterEscola").disabled = false;
        document.getElementById("filterOlimpiada").disabled = false;
    }

    // Controles de Plataforma de Ensino (adicionar material)
    const painelAddMaterial = document.getElementById("painelAddMaterial");
    if (painelAddMaterial) {
        if (perms.plataforma.podeGerenciar) painelAddMaterial.classList.remove("hidden");
        else painelAddMaterial.classList.add("hidden");
    }

    // Controles na aba de Resultados (botão adicionar manual)
    const secaoAddManual = document.getElementById("secaoAddManualResultado");
    if (secaoAddManual) {
        if (perms.resultados.podeEditar) secaoAddManual.classList.remove("hidden");
        else secaoAddManual.classList.add("hidden");
    }

    // Controles na aba de Olimpíadas (somente ADM adiciona/edita)
    const painelAddOlimpiada = document.getElementById("painelAddOlimpiada");
    if (painelAddOlimpiada) {
        if (nivel === "ADM") painelAddOlimpiada.classList.remove("hidden");
        else painelAddOlimpiada.classList.add("hidden");
    }

    // Formulário de usuários — ajustar quais níveis o usuário logado pode criar
    ajustarFormUsuariosPorNivel(nivel);
}

function ajustarFormUsuariosPorNivel(nivel) {
    const selectNivel = document.getElementById("addUserNivel");
    if (!selectNivel) return;
    const perms = PERMISSOES[nivel];
    if (!perms || !perms.usuarios.podeGerenciar) return;

    const niveisPermitidos = perms.usuarios.niveisPermitidos;
    Array.from(selectNivel.options).forEach(opt => {
        opt.hidden = !niveisPermitidos.includes(opt.value);
    });
    // Selecionar primeiro visível
    const primeiroVisivel = Array.from(selectNivel.options).find(opt => !opt.hidden);
    if (primeiroVisivel) selectNivel.value = primeiroVisivel.value;
    ajustarCamposFormUsuario();
}

function podeVerAba(aba) {
    if (!usuarioLogado) return false;
    const perms = PERMISSOES[usuarioLogado.nivel];
    return perms && perms.abas.includes(aba);
}

function primeiraAbaPermitida() {
    const perms = usuarioLogado ? PERMISSOES[usuarioLogado.nivel] : null;
    return perms?.abas?.[0] || "dashboard";
}

function ativarPrimeiraAbaPermitida() {
    const aba = primeiraAbaPermitida();
    document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
    const view = document.getElementById(`view-${aba}`);
    if (view) view.classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.remove("text-blue-400", "bg-blue-500/10");
        btn.classList.add("text-gray-400");
    });
    const btn = document.getElementById(`btnNav-${aba}`) || ({
        usuarios: document.getElementById("btnNavUsuarios"),
        olimpiadas: document.getElementById("btnNavOlimpiadas"),
        cidades: document.getElementById("btnNavCidades"),
        escolas: document.getElementById("btnNavEscolas")
    })[aba];
    if (btn) {
        btn.classList.remove("text-gray-400");
        btn.classList.add("text-blue-400", "bg-blue-500/10");
    }

    const titulos = {
        dashboard: "Dashboard Analítico", calendario: "Calendário Oficial de Olimpíadas",
        importar: "Importar Resultados", usuarios: "Gerenciar Usuários e Permissões",
        olimpiadas: "Olimpíadas Cadastradas", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)",
        plataforma: "Plataforma de Ensino", monitoria: "Monitoria — Salas de Atendimento"
    };
    const titulo = document.getElementById("pageTitleDisplay");
    if (titulo) titulo.innerText = titulos[aba] || "Painel Operacional";

    if (aba === "plataforma") renderizarPlataformaEnsino();
    if (aba === "monitoria") renderizarSalasMonitoria();
    if (aba === "importar") renderizarResultadosImportacao();
}

function getCidadeGestor() {
    if (!usuarioLogado) return null;
    if (usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Monitor") return null;
    if (usuarioLogado.nivel === "Gestor") {
        const cidades = getStorage("app_cidades");
        return cidades.find(c => c.id === usuarioLogado.vinculoId) || null;
    }
    if (usuarioLogado.nivel === "Escola" || usuarioLogado.nivel === "Aluno") {
        const escolas = getStorage("app_escolas");
        const escola = escolas.find(e => e.id === usuarioLogado.vinculoId);
        if (!escola) return null;
        const cidades = getStorage("app_cidades");
        return cidades.find(c => c.id === escola.cidadeId) || null;
    }
    return null;
}

function getMunicipioFiltradoUsuario() {
    const cidade = getCidadeGestor();
    if (!cidade) return "TODOS";
    return `${cidade.nome} - ${cidade.uf}`;
}

function getEscolaVinculadaUsuario() {
    if (!usuarioLogado) return null;
    if (usuarioLogado.nivel === "Escola" || usuarioLogado.nivel === "Aluno") {
        const escolas = getStorage("app_escolas");
        return escolas.find(e => e.id === usuarioLogado.vinculoId) || null;
    }
    return null;
}

function usuarioPodeGerenciarUsuarioAlvo(usuarioAlvo) {
    if (!usuarioLogado || !usuarioAlvo) return false;
    const perms = PERMISSOES[usuarioLogado.nivel];
    if (!perms?.usuarios.podeGerenciar) return false;

    if (usuarioLogado.nivel === "ADM") return true;

    if (usuarioLogado.nivel === "Gestor") {
        if (!["Escola", "Aluno"].includes(usuarioAlvo.nivel)) return false;
        const escolas = getStorage("app_escolas");
        const escolaUser = escolas.find(e => e.id === usuarioAlvo.vinculoId);
        return !!escolaUser && escolaUser.cidadeId === usuarioLogado.vinculoId;
    }

    if (usuarioLogado.nivel === "Escola") {
        return usuarioAlvo.nivel === "Aluno" && usuarioAlvo.vinculoId === usuarioLogado.vinculoId;
    }

    return false;
}

function escolasPermitidasParaCadastroUsuario() {
    const escolas = getStorage("app_escolas");
    if (!usuarioLogado) return [];
    if (usuarioLogado.nivel === "ADM") return escolas;
    if (usuarioLogado.nivel === "Gestor") return escolas.filter(e => e.cidadeId === usuarioLogado.vinculoId);
    if (usuarioLogado.nivel === "Escola") return escolas.filter(e => e.id === usuarioLogado.vinculoId);
    return [];
}

function opcoesVinculoUsuario(nivelUsuario) {
    const cidades = getStorage("app_cidades");
    const escolasPermitidas = escolasPermitidasParaCadastroUsuario();

    if (usuarioLogado?.nivel === "ADM") {
        if (nivelUsuario === "Gestor") return cidades.map(c => ({ value: c.id, text: `Cidade: ${c.nome} (${c.uf})` }));
        if (nivelUsuario === "Escola" || nivelUsuario === "Aluno") return escolasPermitidas.map(e => ({ value: e.id, text: `Escola: ${e.nome}` }));
        return [{ value: "", text: "Acesso Global" }];
    }

    if (usuarioLogado?.nivel === "Gestor") {
        if (nivelUsuario === "Escola" || nivelUsuario === "Aluno") return escolasPermitidas.map(e => ({ value: e.id, text: `Escola: ${e.nome}` }));
        return [];
    }

    if (usuarioLogado?.nivel === "Escola") {
        if (nivelUsuario === "Aluno") return escolasPermitidas.map(e => ({ value: e.id, text: `Escola: ${e.nome}` }));
        return [];
    }

    return [];
}

function resultadoDentroDoEscopoUsuario(resultado) {
    if (!usuarioLogado) return false;
    if (usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Monitor") return true;

    const municipioTravado = getMunicipioFiltradoUsuario();
    if (municipioTravado !== "TODOS" && normalizarTexto(resultado.municipio) !== normalizarTexto(municipioTravado)) return false;

    if (usuarioLogado.nivel === "Escola" || usuarioLogado.nivel === "Aluno") {
        const escola = getEscolaVinculadaUsuario();
        if (!escola) return false;
        return normalizarTexto(resultado.escola) === normalizarTexto(escola.nome);
    }

    return true;
}

function resultadoDentroDoEscopoResultadosUsuario(resultado) {
    if (!usuarioLogado) return false;
    if (usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Monitor") return true;
    const municipioTravado = getMunicipioFiltradoUsuario();
    return municipioTravado === "TODOS" || normalizarTexto(resultado.municipio) === normalizarTexto(municipioTravado);
}

function logout() {
    sessionStorage.removeItem("avance_session");
    usuarioLogado = null;
    if (monitoriaListenerAtivo) {
        monitoriaListenerAtivo();
        monitoriaListenerAtivo = null;
    }
    salaMoniAtual = null;
    document.getElementById("mainPanel").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("loginForm").reset();
}

function getStorage(chave, fallback = []) {
    try {
        const salvo = localStorage.getItem(chave);
        return salvo ? JSON.parse(salvo) : fallback;
    } catch (e) {
        console.warn(`Falha ao ler ${chave}`, e);
        return fallback;
    }
}

function setStorage(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
    salvarChaveFirebase(chave, valor);
}

function setStorageLocal(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
}

function normalizarListaFirebase(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean);
    if (typeof valor === "object") return Object.values(valor).filter(Boolean);
    return [];
}

function getFirebasePath(chave) {
    if (typeof FIREBASE_DATA_PATHS !== "undefined" && FIREBASE_DATA_PATHS[chave]) return FIREBASE_DATA_PATHS[chave];
    if (chave === "app_usuarios" && typeof FIREBASE_USUARIOS_PATH !== "undefined") return FIREBASE_USUARIOS_PATH;
    return `avance_olimpico/${chave}`;
}

function salvarChaveFirebase(chave, valor) {
    initFirebase();
    if (!firebaseDB) return Promise.resolve();
    const path = getFirebasePath(chave);
    return firebaseDB.ref(path).set(valor).catch(erro => {
        console.warn(`${chave} salvo localmente, mas não sincronizado no Firebase.`, erro);
    });
}

async function carregarChaveFirebase(chave, fallback = []) {
    initFirebase();
    const locais = getStorage(chave, fallback);
    if (!firebaseDB) return locais;

    try {
        const snap = await firebaseDB.ref(getFirebasePath(chave)).once("value");
        const remotoBruto = snap.val();
        const remotos = normalizarListaFirebase(remotoBruto);

        if (remotos.length > 0) {
            let finais = remotos;

            // Regra de segurança do login: nunca deixar o Firebase apagar o usuário admin local.
            // Se o Firebase já tem usuários, mescla por id/login para evitar login quebrado.
            if (chave === "app_usuarios" && Array.isArray(locais) && locais.length > 0) {
                const mapa = new Map();
                remotos.forEach(item => mapa.set(item.id || item.login || novoId(), item));
                locais.forEach(item => {
                    const id = item.id || item.login || novoId();
                    const loginJaExiste = Array.from(mapa.values()).some(x => normalizarTexto(x.login) === normalizarTexto(item.login));
                    if (!mapa.has(id) && !loginJaExiste) mapa.set(id, item);
                });
                finais = Array.from(mapa.values()).filter(Boolean);
                if (finais.length !== remotos.length) await firebaseDB.ref(getFirebasePath(chave)).set(finais);
            }

            setStorageLocal(chave, finais);
            return finais;
        }

        if (Array.isArray(locais) && locais.length > 0) {
            await firebaseDB.ref(getFirebasePath(chave)).set(locais);
        }
        return locais;
    } catch (erro) {
        console.warn(`Não foi possível carregar ${chave} do Firebase. Usando dados locais.`, erro);
        return locais;
    }
}

async function carregarDadosFirebaseInicial() {
    const chaves = [
        "app_usuarios",
        "app_cidades",
        "app_escolas",
        "app_olimpiadas",
        "app_cronograma",
        "app_premiados",
        "app_plataforma"
    ];

    for (const chave of chaves) {
        await carregarChaveFirebase(chave, []);
    }
}

async function sincronizarUsuariosFirebaseInicial() {
    return await carregarChaveFirebase("app_usuarios", []);
}

function salvarUsuariosFirebase(usuarios) {
    return salvarChaveFirebase("app_usuarios", usuarios);
}

function salvarUsuariosSistema(usuarios) {
    setStorage("app_usuarios", usuarios);
}

function garantirCadastrosBasicos() {
    const sementes = [
        { chave: "app_usuarios", dados: typeof DATABASE !== "undefined" ? DATABASE.usuarios : [] },
        { chave: "app_cidades", dados: typeof CONFIG_CIDADES_INICIAIS !== "undefined" ? CONFIG_CIDADES_INICIAIS : [] },
        { chave: "app_escolas", dados: typeof CONFIG_ESCOLAS_INICIAIS !== "undefined" ? CONFIG_ESCOLAS_INICIAIS : [] },
        { chave: "app_olimpiadas", dados: typeof DATABASE !== "undefined" ? DATABASE.olimpiadas : [] },
        { chave: "app_cronograma", dados: typeof DATABASE !== "undefined" ? DATABASE.cronograma : [] },
        { chave: "app_plataforma", dados: [] }
    ];

    sementes.forEach(({ chave, dados }) => {
        const atual = getStorage(chave, null);
        if (!Array.isArray(atual) || atual.length === 0) {
            setStorage(chave, Array.isArray(dados) ? [...dados] : []);
        }
    });

    // Garantir que novo usuário Monitor existe
    const usuarios = getStorage("app_usuarios");
    if (!usuarios.some(u => u.nivel === "Monitor")) {
        const monitorBase = typeof DATABASE !== "undefined" ? DATABASE.usuarios.find(u => u.nivel === "Monitor") : null;
        if (monitorBase && !usuarios.some(u => u.id === monitorBase.id)) {
            usuarios.push(monitorBase);
            salvarUsuariosSistema(usuarios);
        }
    }
}

function carregarPremiados() {
    const salvos = getStorage("app_premiados", null);
    if (Array.isArray(salvos) && salvos.length > 0) return salvos;
    const base = (typeof DATABASE !== "undefined" && Array.isArray(DATABASE.premiados)) ? [...DATABASE.premiados] : [];
    setStorage("app_premiados", base);
    return base;
}

function salvarPremiados() {
    setStorage("app_premiados", dadosTrabalho);
}

function novoId() {
    return String(Date.now() + Math.floor(Math.random() * 10000));
}

function textoSeguro(valor) {
    return String(valor ?? "").replace(/[&<>'"]/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function confirmarExclusao(tipo, nome) {
    return confirm(`Tem certeza que deseja apagar ${tipo}: ${nome}?\n\nEssa ação não pode ser desfeita.`);
}

function existeResultadoParaCampo(campo, valor) {
    const alvo = normalizarTexto(valor);
    return dadosTrabalho.some(item => normalizarTexto(item[campo]) === alvo);
}

// ==================== CRUD USUÁRIOS ====================
function excluirUsuario(id) {
    const usuarios = getStorage("app_usuarios");
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return alert("Usuário não encontrado.");
    if (!usuarioPodeGerenciarUsuarioAlvo(usuario)) return alert("Você não tem permissão para apagar este usuário.");
    if (usuarioLogado?.id === id) return alert("Segurança: você não pode apagar o próprio usuário enquanto está logado.");
    const admins = usuarios.filter(u => u.nivel === "ADM");
    if (usuario.nivel === "ADM" && admins.length <= 1) return alert("Segurança: não é permitido apagar o último administrador do sistema.");
    if (!confirmarExclusao("o usuário", usuario.nome)) return;
    salvarUsuariosSistema(usuarios.filter(u => u.id !== id));
    renderizarTabelasGerenciais();
}

function excluirCidade(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const usuarios = getStorage("app_usuarios");
    const cidade = cidades.find(c => c.id === id);
    if (!cidade) return alert("Cidade não encontrada.");
    const nomeMunicipio = `${cidade.nome} - ${cidade.uf}`;
    if (escolas.some(e => e.cidadeId === id)) return alert("Segurança: não é possível apagar esta cidade porque existem escolas cadastradas nela.");
    if (usuarios.some(u => u.nivel === "Gestor" && u.vinculoId === id)) return alert("Segurança: não é possível apagar esta cidade porque existem gestores vinculados a ela.");
    if (existeResultadoParaCampo("municipio", nomeMunicipio)) return alert("Segurança: não é possível apagar esta cidade porque existem resultados vinculados a ela.");
    if (!confirmarExclusao("a cidade", nomeMunicipio)) return;
    setStorage("app_cidades", cidades.filter(c => c.id !== id));
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataformaDashboard();
}

function excluirEscola(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const escolas = getStorage("app_escolas");
    const usuarios = getStorage("app_usuarios");
    const escola = escolas.find(e => e.id === id);
    if (!escola) return alert("Escola não encontrada.");
    if (usuarios.some(u => (u.nivel === "Escola" || u.nivel === "Aluno") && u.vinculoId === id)) return alert("Segurança: não é possível apagar esta escola porque existem usuários vinculados a ela.");
    if (existeResultadoParaCampo("escola", escola.nome)) return alert("Segurança: não é possível apagar esta escola porque existem resultados vinculados a ela.");
    if (!confirmarExclusao("a escola", escola.nome)) return;
    setStorage("app_escolas", escolas.filter(e => e.id !== id));
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataformaDashboard();
}

function excluirOlimpiada(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const olimpiadas = getStorage("app_olimpiadas");
    const cronograma = getStorage("app_cronograma");
    const olimpiada = olimpiadas.find(o => o.id === id);
    if (!olimpiada) return alert("Olimpíada não encontrada.");
    if (existeResultadoParaCampo("olimpiada", olimpiada.nome) || existeResultadoParaCampo("olimpiada", olimpiada.categoria)) return alert("Segurança: não é possível apagar esta olimpíada porque existem resultados cadastrados para ela.");
    if (cronograma.some(c => c.olimpiadaId === id)) return alert("Segurança: não é possível apagar esta olimpíada porque existem etapas de cronograma vinculadas a ela.");
    if (!confirmarExclusao("a olimpíada", olimpiada.nome)) return;
    setStorage("app_olimpiadas", olimpiadas.filter(o => o.id !== id));
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarCronograma();
    renderizarPlataformaDashboard();
}

// ==================== MODAIS DE EDIÇÃO ====================
function abrirModalEdicao({ titulo, campos, onSalvar, onApagar, onDepoisMontar }) {
    document.getElementById("modalEdicaoTitulo").innerText = titulo;
    const corpo = document.getElementById("modalEdicaoCampos");
    corpo.innerHTML = "";

    campos.forEach(campo => {
        const wrap = document.createElement("div");
        wrap.className = "space-y-1";
        const label = document.createElement("label");
        label.className = "block text-xs font-semibold text-gray-400 uppercase tracking-wider";
        label.innerText = campo.label;
        wrap.appendChild(label);

        let input;
        if (campo.tipo === "select") {
            input = document.createElement("select");
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none";
            const opts = Array.isArray(campo.options) ? campo.options : [];
            opts.forEach(opt => {
                const o = document.createElement("option");
                if (typeof opt === "object") { o.value = opt.value; o.text = opt.text; }
                else { o.value = opt; o.text = opt; }
                if (o.value == campo.valor) o.selected = true;
                input.appendChild(o);
            });
        } else if (campo.tipo === "textarea") {
            input = document.createElement("textarea");
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none resize-none";
            input.rows = 3;
            input.value = campo.valor ?? "";
        } else {
            input = document.createElement("input");
            input.type = campo.tipo || "text";
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none";
            input.value = campo.valor ?? "";
        }
        input.id = `modalCampo_${campo.nome}`;
        wrap.appendChild(input);
        corpo.appendChild(wrap);
    });

    const modal = document.getElementById("modalEdicao");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (onDepoisMontar) onDepoisMontar();

    document.getElementById("modalEdicaoBtnSalvar").onclick = () => {
        const dados = {};
        campos.forEach(c => { dados[c.nome] = document.getElementById(`modalCampo_${c.nome}`)?.value ?? ""; });
        const resultado = onSalvar(dados);
        if (resultado !== false) fecharModalEdicao();
    };

    const btnApagar = document.getElementById("modalEdicaoBtnApagar");
    if (btnApagar) {
        if (onApagar) {
            btnApagar.classList.remove("hidden");
            btnApagar.onclick = () => { onApagar(); fecharModalEdicao(); };
        } else {
            btnApagar.classList.add("hidden");
            btnApagar.onclick = null;
        }
    }

    document.getElementById("modalEdicaoBtnCancelar").onclick = fecharModalEdicao;
    document.getElementById("modalEdicaoOverlay").onclick = fecharModalEdicao;
}

function fecharModalEdicao() {
    const modal = document.getElementById("modalEdicao");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function atualizarSelectEscolasModal(cidadeNomeUf) {
    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(cidadeNomeUf));
    const escolasFiltradas = cidade ? escolas.filter(e => e.cidadeId === cidade.id) : escolas;
    const sel = document.getElementById("modalCampo_escola");
    if (!sel) return;
    sel.innerHTML = "";
    escolasFiltradas.forEach(e => {
        const o = document.createElement("option");
        o.value = e.nome; o.text = e.nome;
        sel.appendChild(o);
    });
}

function opcoesCidadesComId() {
    return getStorage("app_cidades").map(c => ({ value: c.id, text: `${c.nome} (${c.uf})` }));
}

function opcoesCidadesNomeUf() {
    return getStorage("app_cidades").map(c => ({ value: `${c.nome} - ${c.uf}`, text: `${c.nome} - ${c.uf}` }));
}

function opcoesEscolasNome(municipio) {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio));
    const lista = cidade ? escolas.filter(e => e.cidadeId === cidade.id) : escolas;
    return lista.map(e => ({ value: e.nome, text: e.nome }));
}

function opcoesOlimpiadasNome() {
    return getStorage("app_olimpiadas").map(o => ({ value: o.nome, text: o.nome }));
}

// ==================== EDITAR REGISTROS ====================
function atualizarSessaoUsuario(usuarioAtualizado) {
    if (usuarioLogado?.id === usuarioAtualizado.id) {
        usuarioLogado = usuarioAtualizado;
        sessionStorage.setItem("avance_session", JSON.stringify(usuarioAtualizado));
        document.getElementById("userLoggedNome").innerText = usuarioAtualizado.nome;
        document.getElementById("userLoggedNivel").innerText = usuarioAtualizado.nivel;
    }
}

function atualizarResultadosCampo(campo, valorAntigo, valorNovo) {
    const antigo = normalizarTexto(valorAntigo);
    dadosTrabalho = dadosTrabalho.map(item => {
        if (normalizarTexto(item[campo]) === antigo) return { ...item, [campo]: valorNovo };
        return item;
    });
    salvarPremiados();
}

function editarUsuario(id) {
    const nivel = usuarioLogado?.nivel;
    const perms = PERMISSOES[nivel];
    if (!perms?.usuarios.podeGerenciar) return alert("Sem permissão para editar usuários.");

    const usuarios = getStorage("app_usuarios");
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return alert("Usuário não encontrado.");
    const atual = usuarios[idx];

    if (!usuarioPodeGerenciarUsuarioAlvo(atual)) return alert("Você não tem permissão para editar este usuário.");

    const niveisPermitidos = perms.usuarios.niveisPermitidos;
    const nivelInicial = niveisPermitidos.includes(atual.nivel) ? atual.nivel : niveisPermitidos[0];

    const campos = [
        { nome: "nome", label: "Nome completo", valor: atual.nome },
        { nome: "login", label: "Login", valor: atual.login },
        { nome: "nivel", label: "Nível de acesso", tipo: "select", valor: nivelInicial, options: niveisPermitidos.map(n => ({ value: n, text: n })) },
        { nome: "email", label: "E-mail", tipo: "email", valor: atual.email || "" },
        { nome: "telefone", label: "Telefone", valor: atual.telefone || "" },
        { nome: "novaSenha", label: "Nova senha (deixe em branco para manter)", tipo: "password", valor: "" },
        { nome: "vinculoId", label: "Vínculo permitido", tipo: "select", valor: atual.vinculoId, options: opcoesVinculoUsuario(nivelInicial) }
    ];

    abrirModalEdicao({
        titulo: "Editar usuário",
        campos,
        onDepoisMontar: () => {
            const nivelSelect = document.getElementById("modalCampo_nivel");
            const vinculoSelect = document.getElementById("modalCampo_vinculoId");
            if (!nivelSelect || !vinculoSelect) return;
            nivelSelect.onchange = () => {
                const opcoes = opcoesVinculoUsuario(nivelSelect.value);
                vinculoSelect.innerHTML = opcoes.map(o => `<option value="${textoSeguro(o.value)}">${textoSeguro(o.text)}</option>`).join("");
            };
        },
        onSalvar: (d) => {
            if (!d.nome || !d.login) return alert("Nome e login são obrigatórios."), false;
            if (!perms.usuarios.niveisPermitidos.includes(d.nivel)) return alert("Você não pode atribuir esse nível de acesso."), false;

            const vinculosPermitidos = opcoesVinculoUsuario(d.nivel).map(o => o.value);
            const precisaVinculo = d.nivel === "Gestor" || d.nivel === "Escola" || d.nivel === "Aluno";
            if (precisaVinculo && !vinculosPermitidos.includes(d.vinculoId)) return alert("Vínculo fora do seu escopo de permissão."), false;

            const lista = getStorage("app_usuarios");
            if (lista.some(u => u.id !== id && normalizarTexto(u.login) === normalizarTexto(d.login))) return alert("Já existe outro usuário com esse login."), false;
            const i = lista.findIndex(u => u.id === id);
            const senhaFinal = d.novaSenha ? d.novaSenha : lista[i].senha;
            lista[i] = { ...lista[i], nome: d.nome, login: d.login.toLowerCase(), senha: senhaFinal, nivel: d.nivel, email: d.email, telefone: d.telefone, vinculoId: precisaVinculo ? d.vinculoId : "" };
            salvarUsuariosSistema(lista);
            atualizarSessaoUsuario(lista[i]);
            renderizarTabelasGerenciais();
            alert("Usuário atualizado com sucesso.");
        },
        onApagar: usuarioLogado?.nivel === "ADM" ? () => excluirUsuario(id) : null
    });
}

function editarCidade(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar cidades.");
    const cidades = getStorage("app_cidades");
    const idx = cidades.findIndex(c => c.id === id);
    if (idx === -1) return alert("Cidade não encontrada.");
    const atual = cidades[idx];
    const municipioAntigo = `${atual.nome} - ${atual.uf}`;

    abrirModalEdicao({
        titulo: "Editar cidade",
        campos: [
            { nome: "nome", label: "Nome", valor: atual.nome },
            { nome: "sigla", label: "Sigla", valor: atual.sigla },
            { nome: "uf", label: "UF", valor: atual.uf }
        ],
        onSalvar: (d) => {
            if (!d.nome || !d.sigla || !d.uf) return alert("Todos os campos são obrigatórios."), false;
            const lista = getStorage("app_cidades");
            const i = lista.findIndex(c => c.id === id);
            lista[i] = { ...lista[i], nome: d.nome, sigla: d.sigla.toUpperCase(), uf: d.uf.toUpperCase() };
            setStorage("app_cidades", lista);
            atualizarResultadosCampo("municipio", municipioAntigo, `${d.nome} - ${d.uf.toUpperCase()}`);
            popularSeletores(); renderizarTabelasGerenciais(); renderizarPlataformaDashboard(); renderizarResultadosImportacao();
            alert("Cidade atualizada com sucesso.");
        },
        onApagar: () => excluirCidade(id)
    });
}

function editarEscola(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar escolas.");
    const escolas = getStorage("app_escolas");
    const idx = escolas.findIndex(e => e.id === id);
    if (idx === -1) return alert("Escola não encontrada.");
    const atual = escolas[idx];
    const nomeAntigo = atual.nome;

    abrirModalEdicao({
        titulo: "Editar escola",
        campos: [
            { nome: "nome", label: "Nome da escola", valor: atual.nome },
            { nome: "razaoSocial", label: "Razão social", valor: atual.razaoSocial || "" },
            { nome: "cnpj", label: "CNPJ", valor: atual.cnpj || "" },
            { nome: "inep", label: "INEP", valor: atual.inep || "" },
            { nome: "endereco", label: "Endereço", valor: atual.endereco || "" },
            { nome: "cep", label: "CEP", valor: atual.cep || "" },
            { nome: "diretor", label: "Diretor", valor: atual.diretor || "" },
            { nome: "email", label: "E-mail", tipo: "email", valor: atual.email || "" },
            { nome: "cidadeId", label: "Cidade vinculada", tipo: "select", valor: atual.cidadeId, options: opcoesCidadesComId() }
        ],
        onSalvar: (d) => {
            if (!d.nome || !d.razaoSocial || !d.cnpj || !d.inep || !d.cidadeId) return alert("Nome, razão social, CNPJ, INEP e cidade são obrigatórios."), false;
            const lista = getStorage("app_escolas");
            if (lista.some(e => e.id !== id && normalizarTexto(e.inep) === normalizarTexto(d.inep))) return alert("Já existe outra escola com esse INEP."), false;
            if (lista.some(e => e.id !== id && normalizarTexto(e.nome) === normalizarTexto(d.nome))) return alert("Já existe outra escola com esse nome."), false;
            const i = lista.findIndex(e => e.id === id);
            lista[i] = { ...lista[i], nome: d.nome, razaoSocial: d.razaoSocial, cnpj: d.cnpj, inep: d.inep, endereco: d.endereco, cep: d.cep, diretor: d.diretor, email: d.email, cidadeId: d.cidadeId };
            setStorage("app_escolas", lista);
            const cidade = getStorage("app_cidades").find(c => c.id === d.cidadeId);
            dadosTrabalho = dadosTrabalho.map(r => normalizarTexto(r.escola) === normalizarTexto(nomeAntigo) ? { ...r, escola: d.nome, municipio: cidade ? `${cidade.nome} - ${cidade.uf}` : r.municipio } : r);
            salvarPremiados(); popularSeletores(); renderizarTabelasGerenciais(); renderizarPlataformaDashboard(); renderizarResultadosImportacao();
            alert("Escola atualizada com sucesso.");
        },
        onApagar: () => excluirEscola(id)
    });
}

function editarOlimpiada(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar olimpíadas.");
    const olimpiadas = getStorage("app_olimpiadas");
    const idx = olimpiadas.findIndex(o => o.id === id);
    if (idx === -1) return alert("Olimpíada não encontrada.");
    const atual = olimpiadas[idx];
    const nomeAntigo = atual.nome;
    const categoriaAntiga = atual.categoria;

    abrirModalEdicao({
        titulo: "Editar olimpíada",
        campos: [
            { nome: "nome", label: "Nome da olimpíada", valor: atual.nome },
            { nome: "categoria", label: "Frente / sigla", valor: atual.categoria || "" },
            { nome: "series", label: "Séries atendidas", valor: atual.series || "" }
        ],
        onSalvar: (d) => {
            if (!d.nome || !d.categoria || !d.series) return alert("Nome, frente e séries são obrigatórios."), false;
            const lista = getStorage("app_olimpiadas");
            if (lista.some(o => o.id !== id && normalizarTexto(o.nome) === normalizarTexto(d.nome))) return alert("Já existe outra olimpíada com esse nome."), false;
            const i = lista.findIndex(o => o.id === id);
            lista[i] = { ...lista[i], nome: d.nome, categoria: d.categoria.toUpperCase(), series: d.series };
            setStorage("app_olimpiadas", lista);
            atualizarResultadosCampo("olimpiada", nomeAntigo, d.nome);
            atualizarResultadosCampo("olimpiada", categoriaAntiga, d.nome);
            popularSeletores(); renderizarTabelasGerenciais(); renderizarCronograma(); renderizarPlataformaDashboard(); renderizarResultadosImportacao();
            alert("Olimpíada atualizada com sucesso.");
        },
        onApagar: () => excluirOlimpiada(id)
    });
}

function editarCronograma(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar eventos.");
    const cronograma = getStorage("app_cronograma");
    const idx = cronograma.findIndex(c => c.id === id);
    if (idx === -1) return alert("Evento não encontrado.");
    const atual = cronograma[idx];

    abrirModalEdicao({
        titulo: "Editar evento do calendário",
        campos: [
            { nome: "olimpiadaId", label: "Olimpíada vinculada", tipo: "select", valor: atual.olimpiadaId, options: getStorage("app_olimpiadas").map(o => ({ value: o.id, text: o.nome })) },
            { nome: "etapa", label: "Etapa / fase", valor: atual.etapa || "" },
            { nome: "data", label: "Data / janela crítica", valor: atual.data || "" },
            { nome: "segmento", label: "Público-alvo / séries elegíveis", valor: atual.segmento || "" },
            { nome: "acao", label: "Diretriz operacional", tipo: "textarea", valor: atual.acao || "" }
        ],
        onSalvar: (d) => {
            if (!d.olimpiadaId || !d.etapa || !d.data || !d.segmento || !d.acao) return alert("Todos os campos do evento são obrigatórios."), false;
            const lista = getStorage("app_cronograma");
            const i = lista.findIndex(c => c.id === id);
            lista[i] = { ...lista[i], olimpiadaId: d.olimpiadaId, etapa: d.etapa, data: d.data, segmento: d.segmento, acao: d.acao };
            setStorage("app_cronograma", lista);
            renderizarCronograma();
            alert("Evento atualizado com sucesso.");
        },
        onApagar: () => excluirCronograma(id)
    });
}

function editarResultado(chaveCodificada) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar resultados.");
    const chaveOriginal = decodeURIComponent(chaveCodificada);
    const idx = dadosTrabalho.findIndex(r => chaveResultado(r) === chaveOriginal);
    if (idx === -1) return alert("Resultado não encontrado.");
    const atual = dadosTrabalho[idx];

    abrirModalEdicao({
        titulo: "Editar resultado olímpico",
        campos: [
            { nome: "aluno", label: "Nome do aluno", valor: atual.aluno || "" },
            { nome: "municipio", label: "Cidade", tipo: "select", valor: atual.municipio || "", options: opcoesCidadesNomeUf() },
            { nome: "escola", label: "Escola", tipo: "select", valor: atual.escola || "", options: opcoesEscolasNome(atual.municipio || "") },
            { nome: "olimpiada", label: "Olimpíada", tipo: "select", valor: atual.olimpiada || "", options: opcoesOlimpiadasNome() },
            { nome: "serie", label: "Série", tipo: "select", valor: atual.serie || "", options: SERIES_PADRAO },
            { nome: "premio", label: "Premiação", tipo: "select", valor: atual.premio || "", options: PREMIOS_PADRAO }
        ],
        onDepoisMontar: () => {
            const cidadeSelect = document.getElementById("modalCampo_municipio");
            cidadeSelect.onchange = () => atualizarSelectEscolasModal(cidadeSelect.value);
        },
        onSalvar: (d) => {
            if (!d.aluno || !d.municipio || !d.escola || !d.olimpiada || !d.serie || !d.premio) return alert("Todos os campos do resultado são obrigatórios."), false;
            const cidades = getStorage("app_cidades");
            const escolas = getStorage("app_escolas");
            const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(d.municipio));
            const escola = escolas.find(e => normalizarTexto(e.nome) === normalizarTexto(d.escola));
            if (!cidade) return alert("Cidade inválida."), false;
            if (!escola) return alert("Escola inválida."), false;
            if (escola.cidadeId !== cidade.id) return alert("A escola selecionada não pertence à cidade escolhida."), false;
            dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chaveOriginal);
            gravarResultadoComSobrescrita({ aluno: d.aluno, municipio: d.municipio, escola: d.escola, olimpiada: d.olimpiada, serie: d.serie, premio: d.premio });
            salvarPremiados(); popularSeletores(); renderizarPlataformaDashboard(); renderizarResultadosImportacao();
            alert("Resultado atualizado com sucesso.");
        },
        onApagar: () => excluirResultado(chaveCodificada)
    });
}

// ==================== NAVEGAÇÃO ENTRE ABAS ====================
function navegarAba(abaId, botaoTarget) {
    if (!podeVerAba(abaId)) return;

    document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
    document.getElementById(`view-${abaId}`).classList.remove("hidden");

    const titulos = {
        dashboard: "Dashboard Analítico", calendario: "Calendário Oficial de Olimpíadas",
        importar: "Importar Resultados", usuarios: "Gerenciar Usuários e Permissões",
        olimpiadas: "Olimpíadas Cadastradas", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)",
        plataforma: "Plataforma de Ensino", monitoria: "Monitoria — Salas de Atendimento"
    };
    document.getElementById("pageTitleDisplay").innerText = titulos[abaId] || "Painel Operacional";

    if (abaId === "importar") {
        popularSeletores();
        renderizarResultadosImportacao();
    }
    if (abaId === "plataforma") {
        renderizarPlataformaEnsino();
    }
    if (abaId === "monitoria") {
        renderizarSalasMonitoria();
    }

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.remove("text-blue-400", "bg-blue-500/10");
        btn.classList.add("text-gray-400");
    });
    if (botaoTarget) {
        botaoTarget.classList.remove("text-gray-400");
        botaoTarget.classList.add("text-blue-400", "bg-blue-500/10");
    }
}

// ==================== FORMULÁRIO USUÁRIOS DINÂMICO ====================
function ajustarCamposFormUsuario() {
    const nivel = document.getElementById("addUserNivel")?.value;
    const divCidade = document.getElementById("divVinculoCidade");
    const divEscola = document.getElementById("divVinculoEscola");
    if (!divCidade || !divEscola) return;

    divCidade.classList.add("hidden");
    divEscola.classList.add("hidden");

    if (nivel === "Gestor") {
        divCidade.classList.remove("hidden");
    } else if (nivel === "Escola" || nivel === "Aluno") {
        divEscola.classList.remove("hidden");
    }
}

function salvarNovoUsuario(event) {
    event.preventDefault();
    const nivel = usuarioLogado?.nivel;
    const perms = PERMISSOES[nivel];
    if (!perms?.usuarios.podeGerenciar) return;

    const nivelNovo = document.getElementById("addUserNivel").value;
    if (!perms.usuarios.niveisPermitidos.includes(nivelNovo)) return alert("Sem permissão para criar esse nível de usuário.");

    const nome = document.getElementById("addUserNome").value.trim();
    const login = document.getElementById("addUserLogin").value.trim().toLowerCase();
    const senha = document.getElementById("addUserSenha").value.trim();
    const email = document.getElementById("addUserEmail").value.trim();
    const telefone = document.getElementById("addUserTelefone").value.trim();

    let vinculoId = "";
    if (nivelNovo === "Gestor") {
        if (nivel !== "ADM") return alert("Apenas administradores podem criar gestores municipais.");
        vinculoId = document.getElementById("addUserCidadeSelect").value;
        if (!vinculoId) return alert("Gestores precisam estar vinculados a uma cidade!");
    } else if (nivelNovo === "Escola" || nivelNovo === "Aluno") {
        vinculoId = document.getElementById("addUserEscolaSelect").value;
        if (!vinculoId) return alert("Perfis de Escola/Aluno precisam ser associados a uma escola!");

        const escolasPermitidas = escolasPermitidasParaCadastroUsuario().map(e => e.id);
        if (!escolasPermitidas.includes(vinculoId)) return alert("Você só pode criar usuários vinculados ao seu próprio escopo.");

        if (nivel === "Escola" && nivelNovo !== "Aluno") return alert("A escola só pode criar usuários do nível Aluno.");
    } else if (nivelNovo === "ADM" || nivelNovo === "Monitor") {
        if (nivel !== "ADM") return alert("Apenas administradores podem criar esse nível de usuário.");
    }

    const usuarios = getStorage("app_usuarios");
    if (usuarios.some(u => normalizarTexto(u.login) === login)) return alert("Erro: já existe um usuário com esse login.");
    usuarios.push({ id: novoId(), login, senha, nivel: nivelNovo, nome, email, telefone, vinculoId });

    salvarUsuariosSistema(usuarios);
    document.getElementById("formCadUsuario").reset();
    ajustarCamposFormUsuario();
    renderizarTabelasGerenciais();
    alert("Usuário criado com sucesso.");
}

// ==================== CADASTROS ADM ====================
function salvarNovaOlimpiada(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;
    const nome = document.getElementById("addOliNome").value.trim();
    const categoria = document.getElementById("addOliCategoria").value.trim().toUpperCase();
    const series = document.getElementById("addOliSeries").value.trim();
    const olimpiadas = getStorage("app_olimpiadas");
    if (olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(nome))) return alert("Erro: esta olimpíada já está cadastrada.");
    olimpiadas.push({ id: novoId(), nome, categoria, series });
    setStorage("app_olimpiadas", olimpiadas);
    document.getElementById("formCadOlimpiada").reset();
    popularSeletores();
    renderizarTabelasGerenciais();
}

function salvarNovoCronograma(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;
    const olimpiadaId = document.getElementById("addCroOlimpiadaSelect").value;
    const etapa = document.getElementById("addCroEtapa").value.trim();
    const data = document.getElementById("addCroData").value.trim();
    const segmento = document.getElementById("addCroSegmento").value.trim();
    const acao = document.getElementById("addCroAcao").value.trim();
    const cronograma = getStorage("app_cronograma");
    cronograma.push({ id: novoId(), olimpiadaId, etapa, data, segmento, acao });
    setStorage("app_cronograma", cronograma);
    document.getElementById("formCadCronograma").reset();
    renderizarCronograma();
}

function salvarNovaCidade(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;
    const nome = document.getElementById("addCidNome").value.trim();
    const sigla = document.getElementById("addCidSigla").value.trim().toUpperCase();
    const uf = document.getElementById("addCidUf").value.trim().toUpperCase();
    const cidades = getStorage("app_cidades");
    if (cidades.some(c => normalizarTexto(c.nome) === normalizarTexto(nome) && normalizarTexto(c.uf) === normalizarTexto(uf))) return alert("Erro: esta cidade já está cadastrada.");
    cidades.push({ id: novoId(), nome, sigla, uf });
    setStorage("app_cidades", cidades);
    document.getElementById("formCadCidade").reset();
    popularSeletores();
    renderizarTabelasGerenciais();
}

function salvarNovaEscola(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;
    const nome = document.getElementById("addEscNome").value.trim();
    const razaoSocial = document.getElementById("addEscRazao").value.trim();
    const cnpj = document.getElementById("addEscCnpj").value.trim();
    const inep = document.getElementById("addEscInep").value.trim();
    const endereco = document.getElementById("addEscEndereco").value.trim();
    const cep = document.getElementById("addEscCep").value.trim();
    const diretor = document.getElementById("addEscDiretor").value.trim();
    const email = document.getElementById("addEscEmail").value.trim();
    const cidadeId = document.getElementById("addEscCidadeSelect").value;
    const escolas = getStorage("app_escolas");
    if (escolas.some(e => normalizarTexto(e.inep) === normalizarTexto(inep))) return alert("Erro: já existe uma escola com esse INEP.");
    if (escolas.some(e => normalizarTexto(e.nome) === normalizarTexto(nome))) return alert("Erro: já existe uma escola com esse nome.");
    escolas.push({ id: novoId(), nome, razaoSocial, cnpj, inep, endereco, cep, diretor, email, cidadeId });
    setStorage("app_escolas", escolas);
    document.getElementById("formCadEscola").reset();
    popularSeletores();
    renderizarTabelasGerenciais();
}

// ==================== RESULTADO MANUAL ====================
function initResultadoManual() {
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    if (cidadeSelect) cidadeSelect.addEventListener("change", popularSeletoresResultadosManuais);
    if (escolaSelect) escolaSelect.addEventListener("change", preencherCidadePelaEscolaManual);

    const formManual = document.getElementById("formResultadoManual");
    if (formManual) {
        formManual.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!permissao("resultados.podeEditar")) return alert("Sem permissão para adicionar resultados.");

            const aluno = document.getElementById("addResAluno").value.trim();
            const municipio = document.getElementById("addResCidadeSelect").value;
            const escola = document.getElementById("addResEscolaSelect").value;
            const olimpiada = document.getElementById("addResOlimpiadaSelect").value;
            const serie = document.getElementById("addResSerieSelect").value;
            const premio = document.getElementById("addResPremioSelect").value;

            if (!aluno || !municipio || !escola || !olimpiada || !serie || !premio) return alert("Preencha todos os campos.");

            const escolas = getStorage("app_escolas");
            const cidades = getStorage("app_cidades");
            const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio));
            const escolaObj = escolas.find(ex => normalizarTexto(ex.nome) === normalizarTexto(escola));
            if (!cidade || !escolaObj) return alert("Cidade ou escola inválida.");
            if (escolaObj.cidadeId !== cidade.id) return alert("A escola não pertence à cidade selecionada.");

            gravarResultadoComSobrescrita({ aluno, escola, municipio, olimpiada, serie, premio });
            salvarPremiados();
            popularSeletores();
            renderizarPlataformaDashboard();
            renderizarResultadosImportacao();
            formManual.reset();
            popularSeletoresResultadosManuais();
            alert("Resultado registrado com sucesso.");
        });
    }
}

function preencherCidadePelaEscolaManual() {
    const escolaNome = document.getElementById("addResEscolaSelect")?.value;
    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const escola = escolas.find(e => normalizarTexto(e.nome) === normalizarTexto(escolaNome));
    if (!escola) return;
    const cidade = cidades.find(c => c.id === escola.cidadeId);
    if (!cidade) return;
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    if (cidadeSelect) {
        const val = `${cidade.nome} - ${cidade.uf}`;
        const opt = [...cidadeSelect.options].find(o => normalizarTexto(o.value) === normalizarTexto(val));
        if (opt) cidadeSelect.value = opt.value;
    }
}

function chaveResultado(r) {
    return `${normalizarTexto(r.aluno)}|${normalizarTexto(r.escola)}|${normalizarTexto(r.olimpiada)}|${normalizarTexto(r.serie)}`;
}

function gravarResultadoComSobrescrita(novo) {
    const chave = chaveResultado(novo);
    dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chave);
    dadosTrabalho.push(novo);
}

// ==================== RENDERS COMPONENTES ====================
function renderizarCronograma() {
    const cronograma = getStorage("app_cronograma");
    const olimpiadas = getStorage("app_olimpiadas");
    const tbody = document.getElementById("tableCronogramaCorpo");
    if (!tbody) return;
    const podeEditar = permissao("calendario.podeEditar");

    tbody.innerHTML = cronograma.map(c => {
        const oli = olimpiadas.find(o => o.id === c.olimpiadaId);
        return `
            <tr class="hover:bg-gray-800/40 transition">
                <td class="p-4 font-bold text-white">${oli ? textoSeguro(oli.nome) : "Desconhecida"}</td>
                <td class="p-4 text-xs font-semibold"><span class="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-gray-300">${textoSeguro(c.etapa)}</span></td>
                <td class="p-4 text-amber-400 font-mono text-xs"><i class="fa-regular fa-clock mr-1"></i> ${textoSeguro(c.data)}</td>
                <td class="p-4 text-xs text-gray-400 font-medium">${textoSeguro(c.segmento)}</td>
                <td class="p-4 text-gray-400 text-xs leading-relaxed">${textoSeguro(c.acao)}</td>
                <td class="p-4 text-right">${podeEditar ? `<button onclick="editarCronograma('${textoSeguro(c.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td>
            </tr>
        `;
    }).join("");
}

function renderizarTabelasGerenciais() {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");
    let usuarios = getStorage("app_usuarios");
    const nivel = usuarioLogado?.nivel;

    // Gestor só vê Escola/Aluno da sua cidade; Escola só vê Alunos da própria escola
    if (nivel === "Gestor") {
        const cidadeId = usuarioLogado.vinculoId;
        const escolasDaCidade = escolas.filter(e => e.cidadeId === cidadeId).map(e => e.id);
        usuarios = usuarios.filter(u => (u.nivel === "Escola" || u.nivel === "Aluno") && escolasDaCidade.includes(u.vinculoId));
    } else if (nivel === "Escola") {
        usuarios = usuarios.filter(u => u.nivel === "Aluno" && u.vinculoId === usuarioLogado.vinculoId);
    }

    if (document.getElementById("tableCidadesCorpo")) {
        document.getElementById("tableCidadesCorpo").innerHTML = cidades.map(c => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(c.id)}</td><td class="p-4 font-semibold text-white">${textoSeguro(c.nome)}</td><td class="p-4 font-mono text-blue-400">${textoSeguro(c.sigla)}</td><td class="p-4 font-bold text-gray-400">${textoSeguro(c.uf)}</td><td class="p-4 text-right"><button onclick="editarCidade('${textoSeguro(c.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td></tr>
        `).join("");
    }
    if (document.getElementById("tableEscolasCorpo")) {
        document.getElementById("tableEscolasCorpo").innerHTML = escolas.map(e => {
            const cid = cidades.find(c => c.id === e.cidadeId);
            return `<tr class="hover:bg-gray-700/30 text-xs"><td class="p-4 font-mono text-purple-400">${textoSeguro(e.inep)}</td><td class="p-4"><div class="font-bold text-white text-sm">${textoSeguro(e.nome)}</div><div class="text-gray-500">${textoSeguro(e.razaoSocial)}</div></td><td class="p-4 font-mono">${textoSeguro(e.cnpj)}</td><td class="p-4"><div>${textoSeguro(e.diretor)}</div><div class="text-blue-400 font-mono">${textoSeguro(e.email)}</div></td><td class="p-4 font-semibold text-emerald-400">${cid ? `${textoSeguro(cid.nome)} - ${textoSeguro(cid.uf)}` : "Desconhecido"}</td><td class="p-4 text-right"><button onclick="editarEscola('${textoSeguro(e.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td></tr>`;
        }).join("");
    }
    if (document.getElementById("tableOlimpiadasCorpo")) {
        const podeEditar = nivel === "ADM";
        document.getElementById("tableOlimpiadasCorpo").innerHTML = olimpiadas.map(o => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(o.id)}</td><td class="p-4 font-bold text-white">${textoSeguro(o.nome)}</td><td class="p-4 text-blue-400 font-mono font-semibold">${textoSeguro(o.categoria)}</td><td class="p-4 text-gray-400 font-medium">${textoSeguro(o.series)}</td><td class="p-4 text-right">${podeEditar ? `<button onclick="editarOlimpiada('${textoSeguro(o.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td></tr>
        `).join("");
    }
    if (document.getElementById("tableUsuariosCorpo")) {
        document.getElementById("tableUsuariosCorpo").innerHTML = usuarios.map(u => {
            let descVinculo = "Acesso Global";
            if (u.nivel === "Gestor") {
                const targetCid = cidades.find(c => c.id === u.vinculoId);
                descVinculo = targetCid ? `Polo: ${targetCid.nome} - ${targetCid.uf}` : "Falta Vincular";
            } else if (u.nivel === "Escola" || u.nivel === "Aluno") {
                const targetEsc = escolas.find(e => e.id === u.vinculoId);
                descVinculo = targetEsc ? `Unidade: ${targetEsc.nome}` : "Falta Vincular";
            }
            const permsUser = PERMISSOES[usuarioLogado?.nivel];
            const podeEditar = permsUser?.usuarios.podeGerenciar;
            return `
                <tr class="hover:bg-gray-750 text-xs">
                    <td class="p-4 font-bold text-white">${textoSeguro(u.nome)}</td>
                    <td class="p-4"><div class="font-mono text-blue-400 font-bold">${textoSeguro(u.login)}</div><div class="text-gray-500 font-medium text-[10px] uppercase">${textoSeguro(u.nivel)}</div></td>
                    <td class="p-4"><div>${textoSeguro(u.email)}</div><div class="text-gray-500 font-mono">${textoSeguro(u.telefone)}</div></td>
                    <td class="p-4 font-semibold ${u.nivel === 'ADM' ? 'text-blue-400' : 'text-amber-400'}">${textoSeguro(descVinculo)}</td>
                    <td class="p-4 text-right">${podeEditar ? `<button onclick="editarUsuario('${textoSeguro(u.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td>
                </tr>
            `;
        }).join("");
    }

    // Selects dinâmicos
    if (document.getElementById("addEscCidadeSelect")) {
        document.getElementById("addEscCidadeSelect").innerHTML = '<option value="">Selecione uma cidade...</option>' + cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
    }
    if (document.getElementById("addCroOlimpiadaSelect")) {
        document.getElementById("addCroOlimpiadaSelect").innerHTML = '<option value="">Selecione a olimpíada alvo...</option>' + olimpiadas.map(o => `<option value="${o.id}">${o.nome}</option>`).join("");
    }
    if (document.getElementById("addUserCidadeSelect")) {
        document.getElementById("addUserCidadeSelect").innerHTML = '<option value="">Selecione a cidade polo...</option>' + cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
    }
    if (document.getElementById("addUserEscolaSelect")) {
        const escolasFiltradas = escolasPermitidasParaCadastroUsuario();
        document.getElementById("addUserEscolaSelect").innerHTML = '<option value="">Selecione a unidade escolar...</option>' + escolasFiltradas.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
    }
}

function montarOptions(placeholder, itens, getValor, getTexto) {
    const linhas = [`<option value="">${placeholder}</option>`];
    itens.forEach(item => {
        const valor = typeof getValor === "function" ? getValor(item) : item;
        const texto = typeof getTexto === "function" ? getTexto(item) : valor;
        linhas.push(`<option value="${textoSeguro(valor)}">${textoSeguro(texto)}</option>`);
    });
    return linhas.join("");
}

function montarOptionsTodos(label, itens) {
    const unicos = [...new Set(itens.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
    return `<option value="TODOS">${label}</option>` + unicos.map(item => `<option value="${textoSeguro(item)}">${textoSeguro(item)}</option>`).join("");
}

function popularSeletoresResultadosManuais() {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    const olimpiadaSelect = document.getElementById("addResOlimpiadaSelect");
    const serieSelect = document.getElementById("addResSerieSelect");
    const premioSelect = document.getElementById("addResPremioSelect");

    if (cidadeSelect) {
        const valorAtual = cidadeSelect.value;
        cidadeSelect.innerHTML = montarOptions("Selecione a cidade...", cidades, c => `${c.nome} - ${c.uf}`, c => `${c.nome} - ${c.uf}`);
        if ([...cidadeSelect.options].some(opt => opt.value === valorAtual)) cidadeSelect.value = valorAtual;
    }
    if (escolaSelect) {
        const valorAtual = escolaSelect.value;
        const cidadeSelecionada = cidadeSelect?.value || "";
        const cidadeObj = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(cidadeSelecionada));
        const escolasFiltradas = cidadeObj ? escolas.filter(e => e.cidadeId === cidadeObj.id) : escolas;
        escolaSelect.innerHTML = montarOptions("Selecione a escola...", escolasFiltradas, e => e.nome, e => e.nome);
        if ([...escolaSelect.options].some(opt => opt.value === valorAtual)) escolaSelect.value = valorAtual;
    }
    if (olimpiadaSelect) olimpiadaSelect.innerHTML = montarOptions("Selecione a olimpíada...", olimpiadas, o => o.nome, o => o.nome);
    if (serieSelect) serieSelect.innerHTML = montarOptions("Selecione a série...", SERIES_PADRAO);
    if (premioSelect) premioSelect.innerHTML = montarOptions("Selecione a premiação...", PREMIOS_PADRAO);
}

function preencherFiltrosResultadosImportacao() {
    let cidades = getStorage("app_cidades");
    let escolas = getStorage("app_escolas");
    if (usuarioLogado?.nivel === "Gestor") {
        cidades = cidades.filter(c => c.id === usuarioLogado.vinculoId);
        escolas = escolas.filter(e => e.cidadeId === usuarioLogado.vinculoId);
    } else if (usuarioLogado?.nivel === "Escola") {
        const escolaUser = getEscolaVinculadaUsuario();
        escolas = escolaUser ? escolas.filter(e => e.cidadeId === escolaUser.cidadeId) : [];
        cidades = escolaUser ? cidades.filter(c => c.id === escolaUser.cidadeId) : [];
    } else if (usuarioLogado?.nivel === "Aluno") {
        const escolaUser = getEscolaVinculadaUsuario();
        escolas = escolaUser ? [escolaUser] : [];
        cidades = escolaUser ? cidades.filter(c => c.id === escolaUser.cidadeId) : [];
    }
    const filtroMuni = document.getElementById("filterResultadoCidade");
    const filtroEsc = document.getElementById("filterResultadoEscola");
    const filtroPremio = document.getElementById("filterResultadoPremio");
    if (filtroMuni) filtroMuni.innerHTML = montarOptionsTodos("-- Todas --", cidades.map(c => `${c.nome} - ${c.uf}`));
    if (filtroEsc) filtroEsc.innerHTML = montarOptionsTodos("-- Todas --", escolas.map(e => e.nome));
    if (filtroPremio) filtroPremio.innerHTML = montarOptionsTodos("-- Todos --", PREMIOS_PADRAO);
}

function popularSeletores() {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");
    let cidadesDashboard = cidades;
    let escolasDashboardBase = escolas;
    if (usuarioLogado?.nivel === "Gestor") {
        cidadesDashboard = cidades.filter(c => c.id === usuarioLogado.vinculoId);
        escolasDashboardBase = escolas.filter(e => e.cidadeId === usuarioLogado.vinculoId);
    } else if (usuarioLogado?.nivel === "Escola" || usuarioLogado?.nivel === "Aluno") {
        const escolaUser = getEscolaVinculadaUsuario();
        escolasDashboardBase = escolaUser ? [escolaUser] : [];
        cidadesDashboard = escolaUser ? cidades.filter(c => c.id === escolaUser.cidadeId) : [];
    }
    const municipiosDashboard = cidadesDashboard.map(c => `${c.nome} - ${c.uf}`);
    const escolasDashboard = escolasDashboardBase.map(e => e.nome);
    const olimpiadasDashboard = olimpiadas.map(o => o.nome);

    const filterMunicipio = document.getElementById("filterMunicipio");
    const filterEscola = document.getElementById("filterEscola");
    const filterOlimpiada = document.getElementById("filterOlimpiada");

    if (filterMunicipio) filterMunicipio.innerHTML = montarOptionsTodos("-- Todos os Municípios --", municipiosDashboard);
    if (filterEscola) filterEscola.innerHTML = montarOptionsTodos("-- Todas as Escolas --", escolasDashboard);
    if (filterOlimpiada) filterOlimpiada.innerHTML = montarOptionsTodos("-- Todas as Olimpíadas --", olimpiadasDashboard);

    // Travar filtro para Gestor/Escola/Aluno
    const municipioFiltrado = getMunicipioFiltradoUsuario();
    if (municipioFiltrado !== "TODOS" && filterMunicipio) {
        filterMunicipio.value = municipioFiltrado;
    }
    const escolaFiltrada = getEscolaVinculadaUsuario();
    if (escolaFiltrada && filterEscola) {
        filterEscola.value = escolaFiltrada.nome;
    }

    popularSeletoresResultadosManuais();
    preencherFiltrosResultadosImportacao();
}

function renderizarPlataformaDashboard() {
    const mFiltro = document.getElementById("filterMunicipio")?.value || "TODOS";
    const eFiltro = document.getElementById("filterEscola")?.value || "TODOS";
    const oFiltro = document.getElementById("filterOlimpiada")?.value || "TODOS";

    const dadosFiltrados = dadosTrabalho.filter(item => {
        return resultadoDentroDoEscopoUsuario(item) &&
               (mFiltro === "TODOS" || item.municipio === mFiltro) &&
               (eFiltro === "TODOS" || item.escola === eFiltro) &&
               (oFiltro === "TODOS" || item.olimpiada === oFiltro);
    });

    const tbody = document.getElementById("tablePremiadosCorpo");
    if (tbody) {
        tbody.innerHTML = dadosFiltrados.map(d => `
            <tr class="hover:bg-gray-800/60 transition"><td class="p-4 font-semibold text-white"><i class="fa-solid fa-user text-blue-400 mr-2"></i>${textoSeguro(d.aluno)}</td><td class="p-4 text-gray-300">${textoSeguro(d.escola)}</td><td class="p-4 text-blue-400 font-semibold text-xs">${textoSeguro(d.municipio)}</td><td class="p-4 text-gray-300 text-xs font-semibold">${textoSeguro(d.serie || "Não informada")}</td><td class="p-4 text-gray-400 text-xs">${textoSeguro(d.olimpiada)}</td><td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">${textoSeguro(d.premio)}</span></td></tr>
        `).join("");
    }

    let cidadesVisiveis = getStorage("app_cidades");
    let escolasVisiveis = getStorage("app_escolas");
    if (usuarioLogado?.nivel === "Gestor") {
        cidadesVisiveis = cidadesVisiveis.filter(c => c.id === usuarioLogado.vinculoId);
        escolasVisiveis = escolasVisiveis.filter(e => e.cidadeId === usuarioLogado.vinculoId);
    } else if (usuarioLogado?.nivel === "Escola" || usuarioLogado?.nivel === "Aluno") {
        const escolaUser = getEscolaVinculadaUsuario();
        escolasVisiveis = escolaUser ? [escolaUser] : [];
        cidadesVisiveis = escolaUser ? cidadesVisiveis.filter(c => c.id === escolaUser.cidadeId) : [];
    }
    const tCidades = cidadesVisiveis.length;
    const tEscolas = escolasVisiveis.length;
    if (document.getElementById("cardTotalMedalhas")) document.getElementById("cardTotalMedalhas").innerText = dadosFiltrados.length;
    if (document.getElementById("cardTotalOuro")) document.getElementById("cardTotalOuro").innerText = dadosFiltrados.filter(x => x.premio.toLowerCase() === "ouro").length;
    if (document.getElementById("cardTotalEscolas")) document.getElementById("cardTotalEscolas").innerText = tEscolas;
    if (document.getElementById("cardTotalCidades")) document.getElementById("cardTotalCidades").innerText = tCidades;
    atualizarGraficoPremios(dadosFiltrados);
}

function atualizarGraficoPremios(dados) {
    const ctx = document.getElementById("chartPremios");
    if (!ctx) return;
    const count = { Ouro: 0, Prata: 0, Bronze: 0, Outros: 0 };
    dados.forEach(d => {
        const p = String(d.premio || "").trim();
        if (p === "Ouro") count.Ouro++;
        else if (p === "Prata") count.Prata++;
        else if (p === "Bronze") count.Bronze++;
        else count.Outros++;
    });
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Ouro", "Prata", "Bronze", "Outros"],
            datasets: [{ data: [count.Ouro, count.Prata, count.Bronze, count.Outros], backgroundColor: ["#f59e0b", "#9ca3af", "#b45309", "#374151"], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#9ca3af", font: { size: 11 } } } } }
    });
}

// ==================== IMPORTAR RESULTADOS ====================
function renderizarResultadosImportacao() {
    const nFiltro = document.getElementById("filterResultadoNome")?.value?.trim().toLowerCase() || "";
    const cFiltro = document.getElementById("filterResultadoCidade")?.value || "TODOS";
    const eFiltro = document.getElementById("filterResultadoEscola")?.value || "TODOS";
    const pFiltro = document.getElementById("filterResultadoPremio")?.value || "TODOS";

    const municipioTravado = getMunicipioFiltradoUsuario();
    const podeEditar = permissao("resultados.podeEditar");

    const filtrados = dadosTrabalho.filter(r => {
        const porMuni = resultadoDentroDoEscopoResultadosUsuario(r);
        const porNome = !nFiltro || normalizarTexto(r.aluno).includes(nFiltro);
        const porCidade = cFiltro === "TODOS" || normalizarTexto(r.municipio) === normalizarTexto(cFiltro);
        const porEscola = eFiltro === "TODOS" || normalizarTexto(r.escola) === normalizarTexto(eFiltro);
        const porPremio = pFiltro === "TODOS" || normalizarTexto(r.premio) === normalizarTexto(pFiltro);
        return porMuni && porNome && porCidade && porEscola && porPremio;
    });

    const tbody = document.getElementById("tableResultadosImportacaoCorpo");
    if (!tbody) return;
    if (!filtrados.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500 text-sm">Nenhum resultado encontrado para os filtros selecionados.</td></tr>`;
        return;
    }
    tbody.innerHTML = filtrados.map(r => {
        const chave = encodeURIComponent(chaveResultado(r));
        return `
            <tr class="hover:bg-gray-700/30 text-xs">
                <td class="p-4 font-bold text-white">${textoSeguro(r.aluno)}</td>
                <td class="p-4 text-gray-300">${textoSeguro(r.escola)}</td>
                <td class="p-4 text-blue-400 font-semibold">${textoSeguro(r.municipio)}</td>
                <td class="p-4 text-gray-300 font-medium">${textoSeguro(r.serie || "Não informada")}</td>
                <td class="p-4 text-gray-400">${textoSeguro(r.olimpiada)}</td>
                <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">${textoSeguro(r.premio)}</span></td>
                <td class="p-4 text-right">${podeEditar ? `<button onclick="editarResultado('${chave}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td>
            </tr>
        `;
    }).join("");
}

function excluirResultado(chaveCodificada) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem apagar resultados.");
    const chave = decodeURIComponent(chaveCodificada);
    const resultado = dadosTrabalho.find(r => chaveResultado(r) === chave);
    if (!resultado) return alert("Resultado não encontrado.");
    if (!confirmarExclusao("o resultado", `${resultado.aluno} - ${resultado.olimpiada}`)) return;
    dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chave);
    salvarPremiados();
    popularSeletores();
    renderizarPlataformaDashboard();
    renderizarResultadosImportacao();
}

// ==================== CRONOGRAMA POR EXCEL ====================
function initDragAndDropCronograma() {
    const dropZone = document.getElementById("dropZoneCronograma");
    const fileInput = document.getElementById("fileInputCronograma");
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("border-blue-500"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-blue-500"));
    dropZone.addEventListener("drop", (e) => { e.preventDefault(); dropZone.classList.remove("border-blue-500"); if (e.dataTransfer.files.length) processarPlanilhaCronograma(e.dataTransfer.files[0]); });
    fileInput.addEventListener("change", (e) => { if (e.target.files.length) processarPlanilhaCronograma(e.target.files[0]); });
}

function processarPlanilhaCronograma(arquivo) {
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            const olimpiadas = getStorage("app_olimpiadas");
            const cronograma = getStorage("app_cronograma");
            let inseridos = 0;
            linhas.forEach(linha => {
                const siglaOuNome = (linha.SIGLA || linha.Olimpiada || "").trim().toLowerCase();
                const foundOli = olimpiadas.find(o => o.nome.toLowerCase().includes(siglaOuNome) || o.categoria.toLowerCase() === siglaOuNome);
                if (foundOli) {
                    cronograma.push({ id: String(Date.now() + inseridos), olimpiadaId: foundOli.id, etapa: linha["FASE / ETAPA"] || linha.Etapa || "Fase Escolar", data: linha["DATA / PERÍODO 2026"] || linha.Data || "A confirmar", segmento: linha["SÉRIES ELEGÍVEIS"] || linha.Segmento || "Geral", acao: linha["OBSERVAÇÃO CRÍTICA"] || linha.Diretriz || "Mapeamento em análise." });
                    inseridos++;
                }
            });
            setStorage("app_cronograma", cronograma);
            alert(`${inseridos} etapas mapeadas com sucesso!`);
            renderizarCronograma();
        } catch (err) { alert("Erro ao processar planilha de cronograma."); }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function downloadCronogramaTemplate() {
    const wb = XLSX.utils.book_new();
    const dadosModelo = [
        { SIGLA: "OBMEP", "FASE / ETAPA": "Fase 1 - Escolar (Prova Objetiva)", "DATA / PERÍODO 2026": "09/06/2026", "SÉRIES ELEGÍVEIS": "6º EF a 3ª EM", "OBSERVAÇÃO CRÍTICA": "Imprimir cadernos de prova; recolher cartões." },
        { SIGLA: "CANGURU", "FASE / ETAPA": "Prova Única (múltipla escolha)", "DATA / PERÍODO 2026": "19/03 a 25/03/2026", "SÉRIES ELEGÍVEIS": "3º EF a 3ª EM", "OBSERVAÇÃO CRÍTICA": "Aplicação nas salas sob fiscalização." }
    ];
    const ws = XLSX.utils.json_to_sheet(dadosModelo);
    XLSX.utils.book_append_sheet(wb, ws, "ModeloCronograma");
    XLSX.writeFile(wb, "modelo_carga_cronograma.xlsx");
}

function initDragAndDrop() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); });
    dropZone.addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer.files.length) processarPlanilha(e.dataTransfer.files[0]); });
    fileInput.addEventListener("change", (e) => { if (e.target.files.length) processarPlanilha(e.target.files[0]); });
}

function processarPlanilha(arquivo) {
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            const escolas = getStorage("app_escolas");
            const cidades = getStorage("app_cidades");
            const olimpiadas = getStorage("app_olimpiadas");
            const erros = [];
            let inseridos = 0;
            linhas.forEach((linha, idx) => {
                const aluno = String(linha.Aluno || "").trim();
                const escola = String(linha.Escola || "").trim();
                const municipio = String(linha.Municipio || linha.Município || "").trim();
                const olimpiada = String(linha.Olimpiada || linha.Olimpíada || "").trim();
                const premio = String(linha.Premio || linha.Prêmio || "").trim();
                const serie = String(linha.Serie || linha["Série"] || "").trim();
                const nl = idx + 2;
                if (!aluno || !escola || !municipio || !olimpiada || !serie || !premio) { erros.push(`Linha ${nl}: campo obrigatório vazio.`); return; }
                if (!escolas.some(e => normalizarTexto(e.nome) === normalizarTexto(escola))) { erros.push(`Linha ${nl}: escola não cadastrada (${escola}).`); return; }
                if (!cidades.some(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio))) { erros.push(`Linha ${nl}: município não cadastrado (${municipio}).`); return; }
                if (!olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(olimpiada))) { erros.push(`Linha ${nl}: olimpíada não cadastrada (${olimpiada}).`); return; }
                if (!SERIES_PADRAO.some(s => normalizarTexto(s) === normalizarTexto(serie))) { erros.push(`Linha ${nl}: série inválida (${serie}).`); return; }
                if (!PREMIOS_PADRAO.some(p => normalizarTexto(p) === normalizarTexto(premio))) { erros.push(`Linha ${nl}: prêmio inválido (${premio}).`); return; }
                gravarResultadoComSobrescrita({ aluno, escola, municipio, olimpiada, serie, premio });
                inseridos++;
            });
            salvarPremiados(); popularSeletores(); renderizarPlataformaDashboard(); renderizarResultadosImportacao();
            if (erros.length) alert(`Importação concluída.\n✅ ${inseridos} inseridos\n⚠️ ${erros.length} erros:\n\n${erros.slice(0, 10).join("\n")}`);
            else alert(`✅ ${inseridos} resultados importados com sucesso!`);
        } catch (err) { alert("Erro ao processar a planilha."); }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ Aluno: "Nome Completo", Escola: "Nome da Escola", Municipio: "Cidade - UF", Olimpiada: "Nome da Olimpíada", Serie: "6º Ano EF", Premio: "Ouro" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao_resultados.xlsx");
}

// ==================== PLATAFORMA DE ENSINO ====================
const DRIVE_UPLOAD_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbylwI7NtKjHAhL20UEtpTuKn5P8j8umDAAsDWnUd52oNvHqdAoAMNEobh5U9zvaneaoFA/exec";
const DRIVE_UPLOAD_TOKEN = "avance-olimpico-2026";
const FIREBASE_ROOT_PATH = "avance_olimpico";
const FIREBASE_DATA_PATHS = {
    app_usuarios: `${FIREBASE_ROOT_PATH}/app_usuarios`,
    app_cidades: `${FIREBASE_ROOT_PATH}/app_cidades`,
    app_escolas: `${FIREBASE_ROOT_PATH}/app_escolas`,
    app_olimpiadas: `${FIREBASE_ROOT_PATH}/app_olimpiadas`,
    app_cronograma: `${FIREBASE_ROOT_PATH}/app_cronograma`,
    app_premiados: `${FIREBASE_ROOT_PATH}/app_premiados`,
    app_plataforma: `${FIREBASE_ROOT_PATH}/app_plataforma`
};
const FIREBASE_MATERIAIS_PATH = FIREBASE_DATA_PATHS.app_plataforma;
const FIREBASE_USUARIOS_PATH = FIREBASE_DATA_PATHS.app_usuarios;
const LIMITE_ARQUIVO_DRIVE_MB = 15;
const LIMITE_ANEXO_MONITORIA_MB = 10;

async function carregarMateriaisPlataforma() {
    initFirebase();

    // Agora a Plataforma usa Realtime Database para a lista de materiais.
    // Os arquivos PDF ficam no Google Drive via Apps Script.
    if (!firebaseDB) return getStorage("app_plataforma");

    try {
        const snapshot = await firebaseDB
            .ref(FIREBASE_MATERIAIS_PATH)
            .orderByChild("criadoEm")
            .once("value");

        const materiais = [];
        snapshot.forEach(child => {
            materiais.push({ id: child.key, ...child.val() });
        });

        return materiais.reverse();
    } catch (erro) {
        console.warn("Falha ao carregar materiais do Firebase Realtime Database. Usando cache local como fallback.", erro);
        return getStorage("app_plataforma");
    }
}

async function renderizarPlataformaEnsino() {
    const container = document.getElementById("gridMateriais");
    if (!container) return;

    container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-16 text-center"><i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500 mb-4"></i><p class="text-gray-500 text-sm">Carregando materiais...</p></div>`;

    const materiais = await carregarMateriaisPlataforma();

    if (!materiais.length) {
        container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-16 text-center"><i class="fa-solid fa-photo-film text-4xl text-gray-700 mb-4"></i><p class="text-gray-500 text-sm">Nenhum material publicado ainda.</p><p class="text-gray-600 text-xs mt-1">Aguarde publicações do administrador.</p></div>`;
        return;
    }

    container.innerHTML = materiais.map(m => {
        const isVideo = m.tipo === "video";
        const isLink = m.tipo === "link";
        const isArquivo = m.tipo === "arquivo";

        let icone = isVideo ? "fa-play-circle" : isLink ? "fa-link" : "fa-file-pdf";
        let corIcone = isVideo ? "text-red-400" : isLink ? "text-blue-400" : "text-orange-400";
        let badgeTipo = isVideo ? "Vídeo" : isLink ? "Link" : "Arquivo";
        let corBadge = isVideo ? "bg-red-500/10 text-red-400" : isLink ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400";

        const acoesAdm = permissao("plataforma.podeGerenciar")
            ? `<button onclick="excluirMaterial('${m.id}')" class="text-red-400 hover:text-red-300 text-xs font-bold ml-2" title="Remover da plataforma"><i class="fa-solid fa-trash"></i></button>`
            : "";

        let conteudo = "";
        if (isVideo && m.url) {
            const embedUrl = converterUrlYoutube(m.url);
            conteudo = embedUrl
                ? `<div class="aspect-video w-full rounded-xl overflow-hidden mb-3"><iframe src="${embedUrl}" frameborder="0" allowfullscreen class="w-full h-full"></iframe></div>`
                : `<a href="${textoSeguro(m.url)}" target="_blank" class="block w-full text-center py-3 bg-gray-900 rounded-xl text-red-400 text-xs hover:bg-gray-700 transition mb-3"><i class="fa-solid fa-play mr-2"></i>Abrir vídeo</a>`;
        } else if (isLink && m.url) {
            conteudo = `<a href="${textoSeguro(m.url)}" target="_blank" class="block w-full text-center py-3 bg-gray-900 rounded-xl text-blue-400 text-xs hover:bg-gray-700 transition mb-3"><i class="fa-solid fa-external-link mr-2"></i>Acessar recurso</a>`;
        } else if (isArquivo && (m.arquivoUrl || m.dados)) {
            const href = m.arquivoUrl || m.dados;
            conteudo = `<a href="${textoSeguro(href)}" target="_blank" rel="noopener" class="block w-full text-center py-3 bg-gray-900 rounded-xl text-orange-400 text-xs hover:bg-gray-700 transition mb-3"><i class="fa-solid fa-file-arrow-down mr-2"></i>Abrir / baixar arquivo</a>`;
        }

        return `
            <div class="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl flex flex-col gap-2">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid ${icone} ${corIcone} text-xl"></i>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${corBadge}">${badgeTipo}</span>
                    </div>
                    ${acoesAdm}
                </div>
                <h4 class="font-bold text-white text-sm leading-snug">${textoSeguro(m.titulo)}</h4>
                ${m.descricao ? `<p class="text-gray-400 text-xs leading-relaxed">${textoSeguro(m.descricao)}</p>` : ""}
                ${m.area ? `<span class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider"><i class="fa-solid fa-tag mr-1"></i>${textoSeguro(m.area)}</span>` : ""}
                ${conteudo}
            </div>
        `;
    }).join("");
}

function converterUrlYoutube(url) {
    try {
        const u = new URL(url);
        let id = "";
        if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
        else if (u.hostname.includes("youtube.com")) id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
    } catch (e) {}
    return null;
}

function arquivoParaDataURL(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
        leitor.readAsDataURL(arquivo);
    });
}

function postParaAppsScript(payload, timeoutMs = 60000) {
    if (!DRIVE_UPLOAD_WEBAPP_URL || DRIVE_UPLOAD_WEBAPP_URL.includes("COLE_AQUI")) {
        return Promise.reject(new Error("URL do Apps Script não configurada."));
    }

    return new Promise((resolve, reject) => {
        const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const iframeName = `iframe_upload_${requestId}`;
        const iframe = document.createElement("iframe");
        iframe.name = iframeName;
        iframe.style.display = "none";

        const form = document.createElement("form");
        form.method = "POST";
        form.action = DRIVE_UPLOAD_WEBAPP_URL;
        form.target = iframeName;
        form.style.display = "none";

        const input = document.createElement("textarea");
        input.name = "payload";
        input.value = JSON.stringify({ ...payload, requestId });
        form.appendChild(input);

        let finalizado = false;
        const limpar = () => {
            window.removeEventListener("message", onMessage);
            setTimeout(() => { iframe.remove(); form.remove(); }, 200);
        };

        const timer = setTimeout(() => {
            if (finalizado) return;
            finalizado = true;
            limpar();
            reject(new Error("O Apps Script demorou demais para responder. Confira se ele foi reimplantado como App da Web e se a pasta do Drive está correta."));
        }, timeoutMs);

        function onMessage(event) {
            const data = event.data || {};
            if (!data || data.origem !== "avance-drive" || data.requestId !== requestId) return;
            if (finalizado) return;
            finalizado = true;
            clearTimeout(timer);
            limpar();
            if (data.success) resolve(data);
            else reject(new Error(data.error || "Falha no Apps Script."));
        }

        window.addEventListener("message", onMessage);
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
    });
}

async function enviarArquivoParaGoogleDrive(arquivo) {
    const tamanhoMb = arquivo.size / (1024 * 1024);
    if (tamanhoMb > LIMITE_ARQUIVO_DRIVE_MB) {
        throw new Error(`Arquivo muito grande para este modo de teste. Use arquivo com até ${LIMITE_ARQUIVO_DRIVE_MB} MB.`);
    }

    const fileBase64 = await arquivoParaDataURL(arquivo);
    return postParaAppsScript({
        action: "upload",
        token: DRIVE_UPLOAD_TOKEN,
        fileName: arquivo.name,
        mimeType: arquivo.type || "application/octet-stream",
        fileBase64
    }, 90000);
}

async function excluirArquivoGoogleDrive(fileId) {
    if (!fileId) return { success: true };
    return postParaAppsScript({
        action: "delete",
        token: DRIVE_UPLOAD_TOKEN,
        fileId
    }, 30000);
}

async function salvarNovoMaterial(event) {
    event.preventDefault();
    if (!permissao("plataforma.podeGerenciar")) return;

    initFirebase();

    const titulo = document.getElementById("matTitulo").value.trim();
    const descricao = document.getElementById("matDescricao").value.trim();
    const area = document.getElementById("matArea").value;
    const tipo = document.getElementById("matTipo").value;
    const url = document.getElementById("matUrl").value.trim();
    const fileInput = document.getElementById("matArquivo");
    const btn = event.submitter || document.querySelector('#formAddMaterial button[type="submit"]');

    if (!titulo) return alert("O título é obrigatório.");
    if ((tipo === "video" || tipo === "link") && !url) return alert("Informe a URL do material.");
    if (tipo === "arquivo" && (!fileInput || fileInput.files.length === 0)) return alert("Selecione um arquivo PDF para publicar.");
    if (!firebaseDB) return alert("Firebase Realtime Database ainda não carregou. Verifique se o Firebase está configurado e se o Realtime Database está ativo.");

    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Publicando...'; }

        const material = {
            titulo,
            descricao,
            area,
            tipo,
            url: tipo === "video" || tipo === "link" ? url : "",
            criadoPor: usuarioLogado?.nome || "Sistema",
            criadoPorId: usuarioLogado?.id || "",
            criadoEm: firebase.database.ServerValue.TIMESTAMP,
            hospedagem: tipo === "arquivo" ? "google_drive" : "link_externo"
        };

        if (tipo === "arquivo") {
            const arquivo = fileInput.files[0];
            const upload = await enviarArquivoParaGoogleDrive(arquivo);
            material.arquivoUrl = upload.fileUrl;
            material.driveFileId = upload.fileId;
            material.nomeArquivo = upload.fileName || arquivo.name;
            material.tamanhoBytes = arquivo.size;
        }

        await firebaseDB.ref(FIREBASE_MATERIAIS_PATH).push(material);

        // Cache local apenas como cópia de emergência para visualização offline.
        const cache = getStorage("app_plataforma");
        cache.unshift({ id: novoId(), ...material, criadoEm: Date.now() });
        setStorage("app_plataforma", cache.slice(0, 100));

        document.getElementById("formAddMaterial").reset();
        ajustarCamposFormMaterial();
        await renderizarPlataformaEnsino();
        alert("Material publicado com sucesso. Arquivo salvo no Google Drive e registro salvo no Firebase.");
    } catch (erro) {
        console.error("Erro ao publicar material:", erro);
        alert(`Erro ao publicar material.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-upload mr-2"></i>Publicar Material'; }
    }
}

async function excluirMaterial(id) {
    if (!permissao("plataforma.podeGerenciar")) return;
    if (!confirmarExclusao("o material", "este item")) return;

    initFirebase();

    try {
        let material = null;
        if (firebaseDB) {
            const snap = await firebaseDB.ref(`${FIREBASE_MATERIAIS_PATH}/${id}`).once("value");
            material = snap.val();
        } else {
            material = getStorage("app_plataforma").find(m => m.id === id) || null;
        }

        if (material?.driveFileId) {
            await excluirArquivoGoogleDrive(material.driveFileId);
        }

        if (firebaseDB) {
            await firebaseDB.ref(`${FIREBASE_MATERIAIS_PATH}/${id}`).remove();
        }

        const materiaisLocais = getStorage("app_plataforma").filter(m => m.id !== id && m.driveFileId !== material?.driveFileId);
        setStorage("app_plataforma", materiaisLocais);

        await renderizarPlataformaEnsino();
        alert("Material removido da plataforma e arquivo enviado para a lixeira do Google Drive.");
    } catch (erro) {
        console.error("Erro ao apagar material:", erro);
        alert(`Erro ao apagar material.\n\n${erro.message || erro}\n\nSe você ainda não atualizou o Apps Script com a função de exclusão, faça essa atualização e reimplante o App da Web.`);
    }
}

function ajustarCamposFormMaterial() {
    const tipo = document.getElementById("matTipo")?.value;
    const divUrl = document.getElementById("divMatUrl");
    const divArquivo = document.getElementById("divMatArquivo");
    if (!divUrl || !divArquivo) return;
    divUrl.classList.add("hidden");
    divArquivo.classList.add("hidden");
    if (tipo === "video" || tipo === "link") divUrl.classList.remove("hidden");
    else if (tipo === "arquivo") divArquivo.classList.remove("hidden");
}

// ==================== MONITORIA — FIREBASE REALTIME ====================
function initFirebase() {
    if (firebaseApp && firebaseDB && firebaseFirestore && firebaseStorage) return;

    const firebaseConfig = (typeof FIREBASE_CONFIG_AVANCE !== "undefined") ? FIREBASE_CONFIG_AVANCE : {
        apiKey: "AIzaSyDn5eAVOerIiknYMRdvMo_2YmXVXR0NwL0",
        authDomain: "avanceolimpico.firebaseapp.com",
        databaseURL: "https://avanceolimpico-default-rtdb.firebaseio.com",
        projectId: "avanceolimpico",
        storageBucket: "avanceolimpico.firebasestorage.app",
        messagingSenderId: "895771266102",
        appId: "1:895771266102:web:f4e6b32f7c631d3eb81c97",
        measurementId: "G-FPETQTFRZN"
    };

    try {
        if (!firebaseApp) {
            firebaseApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
        }
        if (!firebaseDB && firebase.database) firebaseDB = firebase.database();
        if (!firebaseFirestore && firebase.firestore) firebaseFirestore = firebase.firestore();
        if (!firebaseStorage && firebase.storage) firebaseStorage = firebase.storage();
        if (firebase.analytics) { try { firebase.analytics(); } catch (_) {} }
    } catch(e) {
        console.warn("Firebase não configurado ainda:", e.message);
    }
}

function renderizarSalasMonitoria() {
    const container = document.getElementById("gridSalasMonitoria");
    if (!container) return;

    const salas = typeof SALAS_MONITORIA !== "undefined" ? SALAS_MONITORIA : [];
    const coresBorder = { blue: "border-blue-700/40 hover:border-blue-500/60", purple: "border-purple-700/40 hover:border-purple-500/60", emerald: "border-emerald-700/40 hover:border-emerald-500/60", amber: "border-amber-700/40 hover:border-amber-500/60", rose: "border-rose-700/40 hover:border-rose-500/60" };
    const coresIcone = { blue: "text-blue-400 bg-blue-500/10", purple: "text-purple-400 bg-purple-500/10", emerald: "text-emerald-400 bg-emerald-500/10", amber: "text-amber-400 bg-amber-500/10", rose: "text-rose-400 bg-rose-500/10" };
    const coresBtn = { blue: "bg-blue-600 hover:bg-blue-500", purple: "bg-purple-600 hover:bg-purple-500", emerald: "bg-emerald-600 hover:bg-emerald-500", amber: "bg-amber-600 hover:bg-amber-500", rose: "bg-rose-600 hover:bg-rose-500" };

    container.innerHTML = salas.map(sala => `
        <div class="bg-gray-800 border ${coresBorder[sala.cor] || "border-gray-700"} rounded-2xl p-5 flex flex-col gap-3 transition cursor-pointer shadow-xl" onclick="entrarSalaMonitoria('${sala.id}')">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl ${coresIcone[sala.cor] || "text-gray-400 bg-gray-700"} flex items-center justify-center">
                    <i class="fa-solid ${sala.icone} text-lg"></i>
                </div>
                <div>
                    <h4 class="font-bold text-white text-sm">${textoSeguro(sala.nome)}</h4>
                    <span id="status-${sala.id}" class="text-[10px] text-gray-500 font-semibold">Verificando...</span>
                </div>
            </div>
            <button onclick="event.stopPropagation(); entrarSalaMonitoria('${sala.id}')" class="w-full py-2 rounded-xl ${coresBtn[sala.cor] || "bg-gray-700"} text-white text-xs font-bold tracking-wider transition">
                <i class="fa-solid fa-door-open mr-2"></i>Entrar na Sala
            </button>
        </div>
    `).join("");

    // Verificar status das salas via Firebase
    verificarStatusSalas();
}

function verificarStatusSalas() {
    initFirebase();
    if (!firebaseDB) {
        document.querySelectorAll("[id^='status-']").forEach(el => { el.textContent = "Firebase não configurado"; el.classList.add("text-amber-500"); });
        return;
    }
    const salas = typeof SALAS_MONITORIA !== "undefined" ? SALAS_MONITORIA : [];
    salas.forEach(sala => {
        firebaseDB.ref(`monitoria/${sala.id}/participantes`).on("value", snap => {
            const statusEl = document.getElementById(`status-${sala.id}`);
            if (!statusEl) return;
            const participantes = snap.val() || {};
            const count = Object.keys(participantes).filter(k => participantes[k].online).length;
            if (count === 0) { statusEl.textContent = "Sala livre"; statusEl.className = "text-[10px] text-emerald-400 font-semibold"; }
            else if (count === 1) { statusEl.textContent = "1 participante"; statusEl.className = "text-[10px] text-amber-400 font-semibold"; }
            else { statusEl.textContent = `${count}/2 — Sala cheia`; statusEl.className = "text-[10px] text-red-400 font-semibold"; }
        });
    });
}

function entrarSalaMonitoria(salaId) {
    initFirebase();
    if (!firebaseDB) {
        return alert("⚠️ Firebase ainda não configurado.\n\nVeja o guia de configuração na aba Monitoria.");
    }

    const sala = (typeof SALAS_MONITORIA !== "undefined" ? SALAS_MONITORIA : []).find(s => s.id === salaId);
    if (!sala) return;

    firebaseDB.ref(`monitoria/${salaId}/participantes`).once("value", async snap => {
        const participantes = snap.val() || {};
        const ativos = Object.entries(participantes).filter(([_, v]) => v && v.online);
        const meuId = usuarioLogado.id;
        const jaEsta = ativos.find(([id]) => id === meuId);
        const ativosOutros = ativos.filter(([id]) => id !== meuId);
        const usuarioEhMonitor = usuarioLogado.nivel === "Monitor";
        const haMonitorNaSala = ativosOutros.some(([_, v]) => v.nivel === "Monitor");
        const haNaoMonitorNaSala = ativosOutros.some(([_, v]) => v.nivel !== "Monitor");

        if (!jaEsta) {
            if (ativosOutros.length >= 2) {
                return alert("Esta sala está cheia.\n\nRegra da monitoria: no máximo 2 pessoas por sala.");
            }

            if (usuarioEhMonitor) {
                if (haMonitorNaSala) {
                    return alert("Já existe um monitor nesta sala.\n\nRegra da monitoria: apenas 1 monitor e 1 participante por atendimento.");
                }
            } else {
                if (!haMonitorNaSala) {
                    return alert("Aguarde um monitor entrar nesta sala.\n\nRegra da monitoria: a sala só abre atendimento quando houver 1 monitor disponível.");
                }
                if (haNaoMonitorNaSala) {
                    return alert("Esta sala já está em atendimento com outro participante.\n\nRegra da monitoria: apenas 1 monitor e 1 participante por vez.");
                }
            }
        }

        // Quando um monitor abre uma sala vazia, começa um novo atendimento limpo.
        // Isso evita que um aluno veja conversas de atendimentos anteriores.
        if (!jaEsta && usuarioEhMonitor && ativosOutros.length === 0) {
            await firebaseDB.ref(`monitoria/${salaId}/mensagens`).remove();
            await firebaseDB.ref(`monitoria/${salaId}/chamada`).remove();
        }

        salaMoniAtual = salaId;
        abrirChatMonitoria(sala, salaId);
    });
}

function abrirChatMonitoria(sala, salaId) {
    const modal = document.getElementById("modalMonitoria");
    const titulo = document.getElementById("monitoriaModalTitulo");
    const msgs = document.getElementById("monitoriaMessages");
    if (!modal || !titulo || !msgs) return;

    titulo.innerHTML = `<i class="fa-solid ${sala.icone} mr-2"></i>${sala.nome}`;
    msgs.innerHTML = `<div class="text-center text-gray-600 text-xs py-4">Conectando à sala...</div>`;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    resetarInterfaceChamadaMonitoria();

    // Registrar presença
    const meuRef = firebaseDB.ref(`monitoria/${salaId}/participantes/${usuarioLogado.id}`);
    meuRef.set({ nome: usuarioLogado.nome, nivel: usuarioLogado.nivel, online: true, entrouEm: Date.now() });
    meuRef.onDisconnect().update({ online: false, saiuEm: Date.now() });

    // Limpar listener anterior
    if (monitoriaListenerAtivo) {
        monitoriaListenerAtivo();
        monitoriaListenerAtivo = null;
    }

    // Ouvir mensagens
    const msgsRef = firebaseDB.ref(`monitoria/${salaId}/mensagens`);
    const handler = msgsRef.limitToLast(100).on("value", snap => {
        const dados = snap.val() || {};
        const lista = Object.values(dados).sort((a, b) => a.ts - b.ts);

        if (!lista.length) {
            msgs.innerHTML = `<div class="text-center text-gray-600 text-xs py-8"><i class="fa-solid fa-comments text-2xl mb-2 block"></i>Nenhuma mensagem ainda.<br>Seja o primeiro a enviar!</div>`;
        } else {
            msgs.innerHTML = lista.map(m => renderizarMensagemMonitoria(m)).join("");
        }
        msgs.scrollTop = msgs.scrollHeight;
    });

    monitoriaListenerAtivo = () => msgsRef.off("value", handler);
}

function renderizarMensagemMonitoria(m) {
    const minha = m.autorId === usuarioLogado.id;
    const hora = new Date(m.ts || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const autorHtml = !minha ? `<div class="text-[10px] font-bold text-blue-300 mb-0.5">${textoSeguro(m.autor)} <span class="text-gray-400 font-normal">(${textoSeguro(m.nivel)})</span></div>` : "";

    let conteudoHtml = `<div class="text-sm leading-snug">${textoSeguro(m.texto || "")}</div>`;

    if (m.tipo === "imagem" && m.arquivoUrl) {
        conteudoHtml = `
            ${m.texto ? `<div class="text-sm leading-snug mb-2">${textoSeguro(m.texto)}</div>` : ""}
            <a href="${textoSeguro(m.arquivoUrl)}" target="_blank" rel="noopener" class="block">
                <img src="${textoSeguro(m.arquivoUrl)}" alt="Imagem enviada" class="max-h-56 rounded-xl border border-white/10 object-contain bg-black/20">
            </a>
            <a href="${textoSeguro(m.arquivoUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-2 text-[11px] font-bold underline ${minha ? 'text-blue-100' : 'text-blue-300'}">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir imagem
            </a>
        `;
    } else if (m.tipo === "arquivo" && m.arquivoUrl) {
        conteudoHtml = `
            ${m.texto ? `<div class="text-sm leading-snug mb-2">${textoSeguro(m.texto)}</div>` : ""}
            <a href="${textoSeguro(m.arquivoUrl)}" target="_blank" rel="noopener" class="flex items-center gap-3 p-3 rounded-xl ${minha ? 'bg-blue-700/60 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'} border border-white/10 transition">
                <i class="fa-solid fa-file-arrow-down text-lg"></i>
                <span class="min-w-0">
                    <span class="block text-xs font-bold truncate">${textoSeguro(m.nomeArquivo || 'Arquivo enviado')}</span>
                    <span class="block text-[10px] opacity-80">Abrir / baixar arquivo</span>
                </span>
            </a>
        `;
    }

    return `
        <div class="flex ${minha ? 'justify-end' : 'justify-start'} mb-2">
            <div class="max-w-[78%] ${minha ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'} px-4 py-2.5 rounded-2xl ${minha ? 'rounded-tr-sm' : 'rounded-tl-sm'} shadow">
                ${autorHtml}
                ${conteudoHtml}
                <div class="text-[10px] ${minha ? 'text-blue-200' : 'text-gray-500'} text-right mt-1">${hora}</div>
            </div>
        </div>
    `;
}

function enviarMensagemMonitoria() {
    const input = document.getElementById("monitoriaInput");
    if (!input || !firebaseDB || !salaMoniAtual) return;
    const texto = input.value.trim();
    if (!texto) return;

    firebaseDB.ref(`monitoria/${salaMoniAtual}/mensagens`).push({
        tipo: "texto",
        autorId: usuarioLogado.id,
        autor: usuarioLogado.nome,
        nivel: usuarioLogado.nivel,
        texto,
        ts: Date.now()
    });
    input.value = "";
}

function abrirSeletorArquivoMonitoria() {
    const input = document.getElementById("monitoriaArquivoInput");
    if (input) input.click();
}

async function enviarArquivoMonitoria(inputEl) {
    if (!inputEl || !inputEl.files || !inputEl.files.length) return;
    if (!firebaseDB || !salaMoniAtual || !usuarioLogado) {
        inputEl.value = "";
        return alert("Entre em uma sala antes de enviar arquivo.");
    }

    const arquivo = inputEl.files[0];
    inputEl.value = "";

    const tamanhoMb = arquivo.size / (1024 * 1024);
    if (tamanhoMb > LIMITE_ANEXO_MONITORIA_MB) {
        return alert(`Arquivo muito grande. Para o chat da monitoria, use até ${LIMITE_ANEXO_MONITORIA_MB} MB.`);
    }

    const statusAnterior = document.getElementById("monitoriaCallStatus")?.textContent || "";
    setStatusChamadaMonitoria("Enviando anexo para o Drive...", "text-amber-400");

    try {
        const upload = await enviarArquivoParaGoogleDrive(arquivo);
        const ehImagem = (arquivo.type || "").startsWith("image/");
        await firebaseDB.ref(`monitoria/${salaMoniAtual}/mensagens`).push({
            tipo: ehImagem ? "imagem" : "arquivo",
            autorId: usuarioLogado.id,
            autor: usuarioLogado.nome,
            nivel: usuarioLogado.nivel,
            texto: ehImagem ? "Imagem enviada" : "Arquivo enviado",
            arquivoUrl: upload.fileUrl,
            driveFileId: upload.fileId || "",
            nomeArquivo: upload.fileName || arquivo.name,
            mimeType: arquivo.type || "application/octet-stream",
            tamanhoBytes: arquivo.size,
            ts: Date.now()
        });
        setStatusChamadaMonitoria(statusAnterior || "Chamada não iniciada.", chamadaMonitoriaAtiva ? "text-emerald-400" : "text-gray-500");
    } catch (e) {
        console.error("Erro ao enviar anexo da monitoria", e);
        setStatusChamadaMonitoria(statusAnterior || "Chamada não iniciada.", chamadaMonitoriaAtiva ? "text-emerald-400" : "text-gray-500");
        alert(`Não foi possível enviar o anexo.\n\n${e.message || e}`);
    }
}


// ==================== MONITORIA — VOZ E VÍDEO VIA WEBRTC ====================
function adicionarRtcListener(ref, evento, handler) {
    ref.on(evento, handler);
    rtcListenersAtivos.push(() => ref.off(evento, handler));
}

function limparRtcListeners() {
    rtcListenersAtivos.forEach(off => {
        try { off(); } catch (e) { console.warn("Falha ao remover listener RTC", e); }
    });
    rtcListenersAtivos = [];
}

function setStatusChamadaMonitoria(texto, classe = "text-gray-400") {
    const el = document.getElementById("monitoriaCallStatus");
    if (!el) return;
    el.className = `text-[11px] font-semibold ${classe}`;
    el.textContent = texto;
}

function resetarInterfaceChamadaMonitoria() {
    const area = document.getElementById("monitoriaVideoArea");
    const btnVideo = document.getElementById("btnIniciarVideoMonitoria");
    const btnVoz = document.getElementById("btnIniciarVozMonitoria");
    const btnLegado = document.getElementById("btnIniciarChamadaMonitoria");
    const btnMic = document.getElementById("btnAlternarMicMonitoria");
    const btnCam = document.getElementById("btnAlternarCamMonitoria");
    const btnSair = document.getElementById("btnEncerrarChamadaMonitoria");
    const localBox = document.getElementById("monitoriaLocalVideoBox");
    const remotoBox = document.getElementById("monitoriaRemoteVideoBox");

    tipoChamadaMonitoriaAtual = null;
    if (area) area.classList.add("hidden");
    if (btnVideo) btnVideo.classList.remove("hidden");
    if (btnVoz) btnVoz.classList.remove("hidden");
    if (btnLegado) btnLegado.classList.remove("hidden");
    if (btnMic) btnMic.classList.add("hidden");
    if (btnCam) btnCam.classList.add("hidden");
    if (btnSair) btnSair.classList.add("hidden");
    if (localBox) localBox.classList.remove("hidden");
    if (remotoBox) remotoBox.classList.remove("hidden");
    setStatusChamadaMonitoria("Chamada não iniciada.", "text-gray-500");
}

function atualizarInterfaceChamadaMonitoria(ativa) {
    const area = document.getElementById("monitoriaVideoArea");
    const btnVideo = document.getElementById("btnIniciarVideoMonitoria");
    const btnVoz = document.getElementById("btnIniciarVozMonitoria");
    const btnLegado = document.getElementById("btnIniciarChamadaMonitoria");
    const btnMic = document.getElementById("btnAlternarMicMonitoria");
    const btnCam = document.getElementById("btnAlternarCamMonitoria");
    const btnSair = document.getElementById("btnEncerrarChamadaMonitoria");
    const localBox = document.getElementById("monitoriaLocalVideoBox");
    const remotoBox = document.getElementById("monitoriaRemoteVideoBox");
    const chamadaDeVoz = tipoChamadaMonitoriaAtual === "voz";

    if (area) area.classList.toggle("hidden", !ativa);
    if (btnVideo) btnVideo.classList.toggle("hidden", ativa);
    if (btnVoz) btnVoz.classList.toggle("hidden", ativa);
    if (btnLegado) btnLegado.classList.toggle("hidden", ativa);
    if (btnMic) btnMic.classList.toggle("hidden", !ativa);
    if (btnCam) btnCam.classList.toggle("hidden", !ativa || chamadaDeVoz);
    if (btnSair) btnSair.classList.toggle("hidden", !ativa);

    // Na chamada de voz, mantém um painel discreto para status/áudio sem exibir quadros pretos de câmera.
    if (localBox) localBox.classList.toggle("hidden", chamadaDeVoz);
    if (remotoBox) remotoBox.classList.toggle("hidden", chamadaDeVoz);
}

async function obterMidiaLocalMonitoria(tipo = "video") {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não liberou acesso a câmera/microfone. Use Chrome/Edge/Firefox em HTTPS ou localhost.");
    }

    if (tipo === "voz") {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (erroVideo) {
        console.warn("Falha ao abrir câmera. Tentando apenas áudio.", erroVideo);
        const somenteAudio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        alert("Não consegui abrir a câmera, mas o microfone foi liberado. A chamada seguirá apenas com áudio neste dispositivo.");
        tipoChamadaMonitoriaAtual = "voz";
        return somenteAudio;
    }
}

function configurarVideosMonitoria() {
    const localVideo = document.getElementById("monitoriaLocalVideo");
    const remotoVideo = document.getElementById("monitoriaRemoteVideo");

    if (localVideo && localMediaStream) {
        localVideo.srcObject = localMediaStream;
        localVideo.muted = true;
        localVideo.play?.().catch(() => {});
    }
    if (remotoVideo) {
        remotoVideo.srcObject = remoteMediaStream || null;
        remotoVideo.play?.().catch(() => {});
    }
}

function criarPeerConnectionMonitoria() {
    rtcPeerConnection = new RTCPeerConnection(RTC_CONFIG);
    remoteMediaStream = new MediaStream();
    rtcCandidatosProcessados = new Set();

    localMediaStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, localMediaStream));

    rtcPeerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remoteMediaStream.addTrack(track));
        configurarVideosMonitoria();
        setStatusChamadaMonitoria(tipoChamadaMonitoriaAtual === "voz" ? "Conectado com áudio." : "Conectado com áudio/vídeo.", "text-emerald-400");
    };

    rtcPeerConnection.onconnectionstatechange = () => {
        const estado = rtcPeerConnection?.connectionState;
        if (estado === "connected") setStatusChamadaMonitoria(tipoChamadaMonitoriaAtual === "voz" ? "Conectado com áudio." : "Conectado com áudio/vídeo.", "text-emerald-400");
        else if (estado === "connecting") setStatusChamadaMonitoria("Conectando chamada...", "text-amber-400");
        else if (["failed", "disconnected"].includes(estado)) setStatusChamadaMonitoria("Conexão instável. Se não voltar, saia e entre novamente.", "text-red-400");
        else if (estado === "closed") setStatusChamadaMonitoria("Chamada encerrada.", "text-gray-500");
    };

    rtcPeerConnection.onicecandidate = (event) => {
        if (!event.candidate || !firebaseDB || !salaMoniAtual || !usuarioLogado) return;
        firebaseDB.ref(`monitoria/${salaMoniAtual}/chamada/candidatos/${usuarioLogado.id}`).push(event.candidate.toJSON());
    };
}

async function limparChamadaMonitoriaSeAntiga(chamadaRef) {
    const snap = await chamadaRef.once("value");
    const dados = snap.val();
    const ts = dados?.meta?.ts || dados?.offer?.ts || 0;
    if (ts && Date.now() - ts > 20 * 60 * 1000) {
        await chamadaRef.remove();
        return true;
    }
    return false;
}

async function iniciarChamadaMonitoria(tipo = "video") {
    initFirebase();
    if (!firebaseDB || !salaMoniAtual || !usuarioLogado) return alert("Entre em uma sala de monitoria antes de iniciar a chamada.");
    if (chamadaMonitoriaAtiva) return;

    tipoChamadaMonitoriaAtual = tipo === "voz" ? "voz" : "video";
    const statusInicial = tipoChamadaMonitoriaAtual === "voz" ? "Solicitando microfone..." : "Solicitando câmera e microfone...";
    setStatusChamadaMonitoria(statusInicial, "text-amber-400");

    try {
        localMediaStream = await obterMidiaLocalMonitoria(tipoChamadaMonitoriaAtual);
        chamadaMonitoriaAtiva = true;
        atualizarInterfaceChamadaMonitoria(true);
        criarPeerConnectionMonitoria();
        configurarVideosMonitoria();

        const chamadaRef = firebaseDB.ref(`monitoria/${salaMoniAtual}/chamada`);
        await limparChamadaMonitoriaSeAntiga(chamadaRef);

        const offerRef = chamadaRef.child("offer");
        const answerRef = chamadaRef.child("answer");
        const candidatosRef = chamadaRef.child("candidatos");

        adicionarRtcListener(candidatosRef, "child_added", snapUsuario => {
            const autorId = snapUsuario.key;
            if (!autorId || autorId === usuarioLogado.id) return;
            const candHandler = async snapCand => {
                const chave = `${autorId}:${snapCand.key}`;
                if (rtcCandidatosProcessados.has(chave)) return;
                rtcCandidatosProcessados.add(chave);
                const cand = snapCand.val();
                if (!cand || !rtcPeerConnection) return;
                try { await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(cand)); }
                catch (e) { console.warn("ICE candidate ainda não pôde ser aplicado", e); }
            };
            snapUsuario.ref.on("child_added", candHandler);
            rtcListenersAtivos.push(() => snapUsuario.ref.off("child_added", candHandler));
        });

        const offerSnap = await offerRef.once("value");
        const offerExistente = offerSnap.val();

        if (!offerExistente) {
            setStatusChamadaMonitoria("Criando chamada. Aguarde o outro participante entrar...", "text-amber-400");
            const offer = await rtcPeerConnection.createOffer();
            await rtcPeerConnection.setLocalDescription(offer);
            await chamadaRef.child("meta").set({ tipo: tipoChamadaMonitoriaAtual, criadoPor: usuarioLogado.id, ts: Date.now() });
            await offerRef.set({ type: offer.type, sdp: offer.sdp, autorId: usuarioLogado.id, autor: usuarioLogado.nome, ts: Date.now() });

            adicionarRtcListener(answerRef, "value", async answerSnap => {
                const answer = answerSnap.val();
                if (!answer || answer.autorId === usuarioLogado.id || rtcPeerConnection.currentRemoteDescription) return;
                try {
                    await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: answer.type, sdp: answer.sdp }));
                    setStatusChamadaMonitoria("Conectando chamada...", "text-amber-400");
                } catch (e) {
                    console.warn("Falha ao aplicar resposta da chamada", e);
                    setStatusChamadaMonitoria("Falha na conexão. Saia e tente novamente.", "text-red-400");
                }
            });
        } else {
            if (offerExistente.autorId === usuarioLogado.id) {
                setStatusChamadaMonitoria("Você já criou esta chamada. Aguarde outro participante.", "text-amber-400");
                return;
            }

            setStatusChamadaMonitoria("Entrando na chamada existente...", "text-amber-400");
            await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: offerExistente.type, sdp: offerExistente.sdp }));
            const answer = await rtcPeerConnection.createAnswer();
            await rtcPeerConnection.setLocalDescription(answer);
            await answerRef.set({ type: answer.type, sdp: answer.sdp, autorId: usuarioLogado.id, autor: usuarioLogado.nome, ts: Date.now() });
        }
    } catch (e) {
        console.error("Erro ao iniciar chamada", e);
        encerrarChamadaMonitoria(false);
        alert(`Não foi possível iniciar a chamada.\n\n${e.message || e}`);
    }
}

function iniciarChamadaVideoMonitoria() {
    return iniciarChamadaMonitoria("video");
}

function iniciarChamadaVozMonitoria() {
    return iniciarChamadaMonitoria("voz");
}

function alternarMicrofoneMonitoria() {
    if (!localMediaStream) return;
    const tracks = localMediaStream.getAudioTracks();
    tracks.forEach(t => t.enabled = !t.enabled);
    const ativo = tracks.some(t => t.enabled);
    const btn = document.getElementById("btnAlternarMicMonitoria");
    if (btn) btn.innerHTML = ativo ? '<i class="fa-solid fa-microphone mr-1"></i>Mic' : '<i class="fa-solid fa-microphone-slash mr-1"></i>Mic';
}

function alternarCameraMonitoria() {
    if (!localMediaStream) return;
    const tracks = localMediaStream.getVideoTracks();
    tracks.forEach(t => t.enabled = !t.enabled);
    const ativa = tracks.some(t => t.enabled);
    const btn = document.getElementById("btnAlternarCamMonitoria");
    if (btn) btn.innerHTML = ativa ? '<i class="fa-solid fa-video mr-1"></i>Câmera' : '<i class="fa-solid fa-video-slash mr-1"></i>Câmera';
}

function encerrarChamadaMonitoria(limparFirebase = true) {
    limparRtcListeners();

    if (rtcPeerConnection) {
        try { rtcPeerConnection.close(); } catch (e) { console.warn("Falha ao fechar conexão RTC", e); }
    }
    rtcPeerConnection = null;

    if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
    }
    localMediaStream = null;
    remoteMediaStream = null;
    chamadaMonitoriaAtiva = false;
    tipoChamadaMonitoriaAtual = null;
    rtcCandidatosProcessados = new Set();

    const localVideo = document.getElementById("monitoriaLocalVideo");
    const remotoVideo = document.getElementById("monitoriaRemoteVideo");
    if (localVideo) localVideo.srcObject = null;
    if (remotoVideo) remotoVideo.srcObject = null;

    if (limparFirebase && firebaseDB && salaMoniAtual && usuarioLogado) {
        firebaseDB.ref(`monitoria/${salaMoniAtual}/chamada/candidatos/${usuarioLogado.id}`).remove();
        firebaseDB.ref(`monitoria/${salaMoniAtual}/chamada`).once("value", snap => {
            const chamada = snap.val() || {};
            if (chamada.offer?.autorId === usuarioLogado.id || chamada.answer?.autorId === usuarioLogado.id) {
                firebaseDB.ref(`monitoria/${salaMoniAtual}/chamada`).remove();
            }
        });
    }

    resetarInterfaceChamadaMonitoria();
}

async function limparConversaMonitoriaAtual() {
    if (!firebaseDB || !salaMoniAtual) return;
    await firebaseDB.ref(`monitoria/${salaMoniAtual}/mensagens`).remove();
}

async function fecharModalMonitoria() {
    const salaParaFechar = salaMoniAtual;
    let apagarConversa = false;

    if (firebaseDB && salaParaFechar && usuarioLogado) {
        apagarConversa = confirm("Ao sair da sala, você deseja apagar a conversa deste atendimento?\n\nRecomendado para manter a privacidade das dúvidas e deixar a sala limpa para o próximo atendimento.");
    }

    const modal = document.getElementById("modalMonitoria");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }

    encerrarChamadaMonitoria(true);

    if (monitoriaListenerAtivo) { monitoriaListenerAtivo(); monitoriaListenerAtivo = null; }

    if (firebaseDB && salaParaFechar && usuarioLogado) {
        if (apagarConversa) {
            await firebaseDB.ref(`monitoria/${salaParaFechar}/mensagens`).remove();
            await firebaseDB.ref(`monitoria/${salaParaFechar}/chamada`).remove();
        }
        await firebaseDB.ref(`monitoria/${salaParaFechar}/participantes/${usuarioLogado.id}`).update({ online: false, saiuEm: Date.now() });
    }

    salaMoniAtual = null;
}

// ==================== EXPOSIÇÃO GLOBAL ====================
window.navegarAba = navegarAba;
window.editarUsuario = editarUsuario;
window.editarCidade = editarCidade;
window.editarEscola = editarEscola;
window.editarOlimpiada = editarOlimpiada;
window.editarCronograma = editarCronograma;
window.editarResultado = editarResultado;
window.excluirUsuario = excluirUsuario;
window.excluirCidade = excluirCidade;
window.excluirEscola = excluirEscola;
window.excluirOlimpiada = excluirOlimpiada;
window.excluirCronograma = excluirCronograma;
window.excluirResultado = excluirResultado;
window.excluirMaterial = excluirMaterial;
window.salvarNovoMaterial = salvarNovoMaterial;
window.ajustarCamposFormMaterial = ajustarCamposFormMaterial;
window.entrarSalaMonitoria = entrarSalaMonitoria;
window.enviarMensagemMonitoria = enviarMensagemMonitoria;
window.abrirSeletorArquivoMonitoria = abrirSeletorArquivoMonitoria;
window.enviarArquivoMonitoria = enviarArquivoMonitoria;
window.fecharModalMonitoria = fecharModalMonitoria;
window.iniciarChamadaMonitoria = iniciarChamadaMonitoria;
window.iniciarChamadaVideoMonitoria = iniciarChamadaVideoMonitoria;
window.iniciarChamadaVozMonitoria = iniciarChamadaVozMonitoria;
window.alternarMicrofoneMonitoria = alternarMicrofoneMonitoria;
window.alternarCameraMonitoria = alternarCameraMonitoria;
window.encerrarChamadaMonitoria = encerrarChamadaMonitoria;
window.downloadTemplate = downloadTemplate;
window.downloadCronogramaTemplate = downloadCronogramaTemplate;
window.ajustarCamposFormUsuario = ajustarCamposFormUsuario;
window.salvarNovoUsuario = salvarNovoUsuario;
window.salvarNovaOlimpiada = salvarNovaOlimpiada;
window.salvarNovoCronograma = salvarNovoCronograma;
window.salvarNovaCidade = salvarNovaCidade;
window.salvarNovaEscola = salvarNovaEscola;
window.fecharModalEdicao = fecharModalEdicao;
