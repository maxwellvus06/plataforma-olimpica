// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogado = null;
let memoriaDadosSistema = {}; // cache em memória da aba atual; não grava no navegador

// Referência Firebase para Monitoria
let firebaseApp = null;
let firebaseDB = null;
let firebaseFirestore = null;
let firebaseStorage = null;
let firebaseAuth = null;
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
const SEXOS_ALUNO_PADRAO = ["Masculino", "Feminino"];

// Ano ativo da plataforma. Não usa localStorage/sessionStorage: muda só na aba atual.
let anoDadosAtivo = "2026";
const CHAVES_ANUAIS_FIRESTORE = ["app_cidades", "app_escolas", "app_alunos", "app_olimpiadas", "app_cronograma", "app_premiados", "app_plataforma"];
const ANOS_REFERENCIA_PADRAO = ["2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const OPCOES_OLIMPIADA = {
    anos: ANOS_REFERENCIA_PADRAO,
    areas: ["Matemática", "Física", "Química", "Biologia", "Ciências Integradas", "Astronomia", "Tecnologia / Robótica", "Idiomas", "Multidisciplinar", "Outro"],
    abrangencias: ["Municipal", "Estadual", "Regional (Norte-Nordeste, etc.)", "Nacional", "Internacional"],
    status: ["Ativa", "Aguardando edital", "Suspensa", "Encerrada"],
    tiposEscola: ["Somente pública", "Somente privada", "Pública e privada"],
    inscricaoIndividual: ["Sim", "Não", "Sim, somente se a escola não participar"],
    escolaInscricao: ["Sim, obrigatório", "Não, inscrição automática", "Opcional"],
    seriesAtendidas: ["1º ao 9º Ano EF", "1ª a 3ª Série EM", "Técnico", "EJA", "Universitário"],
    segmentos: ["EF I (1º–5º)", "EF II (6º–9º)", "Ensino Médio", "Misto EF+EM"],
    simNao: ["Sim", "Não"],
    numeroFases: ["1 fase", "2 fases", "3 fases", "4 ou mais fases"],
    tiposQuestao: ["Múltipla escolha", "Dissertativa / Aberta", "Mista (obj. + dissertativa)", "Experimental / Prática", "Verdadeiro ou Falso", "Online assíncrona"],
    modalidadesAplicacao: ["Presencial na escola", "Presencial em centro regional", "Online síncrona", "Online assíncrona", "Misto"],
    duracoes: ["Até 1h", "1h30", "2h", "2h30", "3h", "3h30", "4h ou mais"],
    materiaisProva: ["PDF download no site", "PDF enviado por e-mail", "Plataforma online", "Correios", "A definir"],
    correcoes: ["Escola lança acertos no sistema", "Upload de cartão/folha", "Correção automática online", "Correção centralizada pelo organizador"],
    gratuitaPublica: ["Sim", "Não", "Parcialmente"],
    formasPagamento: ["Boleto bancário", "Hotmart", "PIX", "Cartão de crédito", "Isento"],
    premios: ["Medalha física", "Certificado digital", "Troféu", "Bolsa (ex: PIC Jr/CNPq)", "Premiação em dinheiro", "Reconhecimento em vestibulares"],
    categoriasPremiacao: ["Ouro", "Prata", "Bronze", "Menção Honrosa", "Participação"],
    internacionais: ["Nenhuma", "IJSO", "IPhO", "IChO", "IBO", "IMO", "IOI", "IOAA", "Outra"],
    niveisFunil: ["Porta de entrada (fase única acessível)", "Intermediária (2 fases, regional)", "Avançada (nacional)", "Seletiva Internacional"]
};

const TAXONOMIA_ETAPAS = [
    {
        grupoCodigo: "G1",
        grupoNome: "Grupo 1 — Pré-inscrição / Divulgação",
        etapas: [
            { codigo: "01", nome: "Publicação do Edital" },
            { codigo: "02", nome: "Abertura das Inscrições" },
            { codigo: "03", nome: "Encerramento das Inscrições" },
            { codigo: "04", nome: "Homologação das Inscrições" },
            { codigo: "05", nome: "Pagamento / Boleto" }
        ]
    },
    {
        grupoCodigo: "G2",
        grupoNome: "Grupo 2 — Pré-prova / Logística",
        etapas: [
            { codigo: "06", nome: "Download / Disponibilização da Prova" },
            { codigo: "07", nome: "Impressão e Preparação do Material" },
            { codigo: "08", nome: "Teste Técnico / Configuração de Sistema" },
            { codigo: "09", nome: "Cadastro de Estudantes / Professores" }
        ]
    },
    {
        grupoCodigo: "G3",
        grupoNome: "Grupo 3 — Aplicação da Prova",
        etapas: [
            { codigo: "10", nome: "Fase Única — Aplicação" },
            { codigo: "11", nome: "1ª Fase — Aplicação Escolar" },
            { codigo: "12", nome: "2ª Fase — Aplicação Regional" },
            { codigo: "13", nome: "3ª Fase — Aplicação Nacional" },
            { codigo: "14", nome: "Janela Extra / Aplicação de Reposição" },
            { codigo: "15", nome: "Fase Internacional / Seletiva" }
        ]
    },
    {
        grupoCodigo: "G4",
        grupoNome: "Grupo 4 — Pós-prova / Envio e Correção",
        etapas: [
            { codigo: "16", nome: "Envio de Cartões / Folhas de Resposta" },
            { codigo: "17", nome: "Envio / Upload de Gabarito Nominal" },
            { codigo: "18", nome: "Gabarito Preliminar" },
            { codigo: "19", nome: "Gabarito Definitivo" },
            { codigo: "20", nome: "Contestação / Recursos de Gabarito" }
        ]
    },
    {
        grupoCodigo: "G5",
        grupoNome: "Grupo 5 — Resultados e Classificação",
        etapas: [
            { codigo: "21", nome: "Lista Preliminar de Classificados" },
            { codigo: "22", nome: "Lista Definitiva de Classificados" },
            { codigo: "23", nome: "Resultado Final / Premiados" },
            { codigo: "24", nome: "Resultado Preliminar (com recurso aberto)" }
        ]
    },
    {
        grupoCodigo: "G6",
        grupoNome: "Grupo 6 — Pós-resultado / Operacional",
        etapas: [
            { codigo: "25", nome: "Indicação de Professores" },
            { codigo: "26", nome: "Confirmação de Interesse / Participação" },
            { codigo: "27", nome: "Envio de Documentação dos Premiados" },
            { codigo: "28", nome: "Compra / Pedido de Medalhas" }
        ]
    },
    {
        grupoCodigo: "G7",
        grupoNome: "Grupo 7 — Entrega e Premiação",
        etapas: [
            { codigo: "29", nome: "Entrega de Certificados Digitais" },
            { codigo: "30", nome: "Entrega de Medalhas / Troféus" },
            { codigo: "31", nome: "Cerimônia de Premiação" },
            { codigo: "32", nome: "Classificação Automática para Próxima Olimpíada" }
        ]
    }
];

document.addEventListener("DOMContentLoaded", () => {
    // Login primeiro. Nada de carregar/gravar todas as coleções antes do formulário funcionar.
    // Se o Firebase tiver algum erro de regra, o botão de login continua ativo e o erro aparece só ao tentar entrar.
    try {
        aplicarTemaPreferidoLocal();
        initFirebase();
        carregarLayoutVisual().catch(erro => console.warn("Layout visual não carregado ainda:", erro));
        initLogin();
        initDragAndDrop();
        initDragAndDropCronograma();
        initDragAndDropOlimpiadas();
        initDragAndDropAlunos();
        initAlunos();
        initResultadoManual();
        initFormularioOlimpiadaCompleto();
        initSeletorAnoDados();

        document.getElementById("filterMunicipio")?.addEventListener("change", renderizarPlataformaDashboard);
        document.getElementById("filterEscola")?.addEventListener("change", renderizarPlataformaDashboard);
        document.getElementById("filterOlimpiada")?.addEventListener("change", renderizarPlataformaDashboard);
        document.getElementById("filterResultadoNome")?.addEventListener("input", renderizarResultadosImportacao);
        document.getElementById("filterResultadoCidade")?.addEventListener("change", renderizarResultadosImportacao);
        document.getElementById("filterResultadoEscola")?.addEventListener("change", renderizarResultadosImportacao);
        document.getElementById("filterResultadoPremio")?.addEventListener("change", renderizarResultadosImportacao);
        document.getElementById("btnAtualizarRelatorios")?.addEventListener("click", gerarRelatoriosComparativos);
        document.getElementById("relAnoInicio")?.addEventListener("change", gerarRelatoriosComparativos);
        document.getElementById("relAnoFim")?.addEventListener("change", gerarRelatoriosComparativos);
        document.getElementById("relFiltroCidade")?.addEventListener("change", () => { atualizarFiltroEscolasRelatorio(); gerarRelatoriosComparativos(); });
        document.getElementById("relFiltroEscola")?.addEventListener("change", gerarRelatoriosComparativos);
        initRelatoriosCriativos();
        document.getElementById("filterCronogramaGrupoEtapa")?.addEventListener("change", () => { preencherFiltrosCronograma(); renderizarCronograma(); });
        document.getElementById("filterCronogramaEtapa")?.addEventListener("change", renderizarCronograma);
        document.getElementById("filterCronogramaModoExibicao")?.addEventListener("change", renderizarCronograma);
        document.getElementById("btnToggleTema")?.addEventListener("click", alternarTemaClaroEscuro);
        document.getElementById("btnLogout")?.addEventListener("click", logout);
        verificarSessao();
    } catch (erro) {
        console.error("Erro ao preparar a tela de login:", erro);
        alert(`Erro ao preparar a tela de login.\n\n${erro.message || erro}`);
    }
});

// ==================== SISTEMA DE AUTENTICAÇÃO ====================
function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userInput = document.getElementById("auth-user").value.trim().toLowerCase();
        const passInput = document.getElementById("auth-pass").value.trim();
        const lembrar = !!document.getElementById("auth-remember")?.checked;
        const btn = form.querySelector('button[type="submit"]');

        try {
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Entrando pelo Firebase Auth...'; }
            initFirebase();
            if (!firebaseAuth) throw new Error("Firebase Auth não inicializado. Confira se o SDK firebase-auth-compat.js está carregado.");

            await firebaseAuth.setPersistence(lembrar ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);

            const authEmail = emailAuthParaLogin(userInput);
            let authUser = null;
            let perfil = null;

            try {
                const cred = await firebaseAuth.signInWithEmailAndPassword(authEmail, passInput);
                authUser = cred.user;
            } catch (erroLoginAuth) {
                // Primeiro acesso/migração: permite criar conta Auth a partir dos usuários-semente do database.js.
                // Para usuários já criados depois, entre como ADM uma vez para provisionar as contas Auth em lote.
                const usuarioSemente = buscarUsuarioSementePorCredencial(userInput, passInput);
                if (!usuarioSemente) throw erroLoginAuth;
                const credCriado = await firebaseAuth.createUserWithEmailAndPassword(emailAuthDoUsuario(usuarioSemente), passInput);
                authUser = credCriado.user;
                perfil = await gravarPerfilAuthUsuario(authUser.uid, usuarioSemente, passInput);
            }

            if (!perfil) perfil = await carregarPerfilUsuarioAuth(authUser, userInput);
            if (!perfil) {
                const usuarioSemente = buscarUsuarioSementePorCredencial(userInput, passInput);
                if (usuarioSemente) perfil = await gravarPerfilAuthUsuario(authUser.uid, usuarioSemente, passInput);
            }
            if (!perfil) throw new Error("Login autenticado, mas o perfil da plataforma não foi encontrado em sistema_usuarios.");

            usuarioLogado = perfil;
            if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Carregando dados...'; }
            await carregarDadosPosLogin();
            if (usuarioLogado?.nivel === "ADM") await provisionarUsuariosAuthExistentes();
            aplicarTemaUsuario(usuarioLogado);
            logarSucesso(usuarioLogado);
        } catch (erro) {
            console.error("Erro ao tentar login", erro);
            alert(`Erro ao tentar login pelo Firebase Auth.\n\n${traduzirErroAuth(erro)}`);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Acessar Painel'; }
        }
    });
}

const TEMA_LOCAL_KEY = "avance_tema_preferido_v2";
const SENHA_PADRAO_USUARIO = "avance@2026";

function normalizarLoginAuth(valor) {
    return String(valor || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function emailAuthParaLogin(loginOuEmail) {
    const valor = String(loginOuEmail || "").trim().toLowerCase();
    if (valor.includes("@")) return valor;
    return `${normalizarLoginAuth(valor)}@avance.local`;
}

function emailAuthDoUsuario(usuario) {
    if (usuario?.authEmail) return String(usuario.authEmail).trim().toLowerCase();
    if (usuario?.emailAuth) return String(usuario.emailAuth).trim().toLowerCase();
    const emailReal = String(usuario?.email || usuario?.emailInstitucional || usuario?.emailPessoal || "").trim().toLowerCase();
    if (emailReal && emailReal.includes("@")) return emailReal;
    // Fallback apenas para usuários legados/semente. Usuários novos precisam de e-mail real obrigatório.
    return emailAuthParaLogin(usuario?.login || usuario?.cpf || usuario?.id || novoId());
}

function emailUsuarioObrigatorio(usuario, contexto = "usuário") {
    const email = String(usuario?.email || usuario?.emailInstitucional || usuario?.emailPessoal || "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error(`Informe um e-mail válido para ${contexto}. Ele será usado no Firebase Auth.`);
    return email;
}

function buscarUsuarioSementePorCredencial(login, senha) {
    const sementes = (typeof DATABASE !== "undefined" && Array.isArray(DATABASE.usuarios)) ? DATABASE.usuarios : [];
    return sementes.find(u => normalizarTexto(u.login) === normalizarTexto(login) && String(u.senha) === String(senha)) || null;
}

function traduzirErroAuth(erro) {
    const code = erro?.code || "";
    if (code.includes("auth/user-not-found") || code.includes("auth/invalid-login-credentials")) return "Usuário não encontrado no Firebase Auth. Entre como ADM uma vez para migrar/provisionar os usuários existentes.";
    if (code.includes("auth/wrong-password")) return "Senha inválida.";
    if (code.includes("auth/email-already-in-use")) return "Este login/e-mail interno já existe no Firebase Auth.";
    if (code.includes("auth/operation-not-allowed")) return "Ative o provedor E-mail/Senha em Firebase Console → Authentication → Sign-in method.";
    if (code.includes("auth/weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
    return erro?.message || String(erro);
}

async function gravarPerfilAuthUsuario(uid, usuario, senhaOriginal = "") {
    initFirebase();
    const perfil = {
        ...usuario,
        id: usuario.id || uid,
        authUid: uid,
        authEmail: emailAuthDoUsuario(usuario),
        senhaMigradaParaAuth: true,
        senha: usuario.senha || senhaOriginal || "",
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };
    await firebaseFirestore.collection("sistema_usuarios").doc(uid).set(perfil, { merge: true });
    return { ...perfil, id: perfil.id };
}

async function carregarPerfilUsuarioAuth(authUser, loginDigitado = "") {
    initFirebase();
    if (!authUser || !firebaseFirestore) return null;

    const emailAuth = String(authUser.email || "").toLowerCase();

    // 1) Modelo profissional novo: documento com ID igual ao UID do Firebase Auth.
    const direto = await firebaseFirestore.collection("sistema_usuarios").doc(authUser.uid).get();
    if (direto.exists) {
        const data = direto.data() || {};
        return { id: data.id || direto.id, ...data, authUid: authUser.uid, authEmail: data.authEmail || emailAuth };
    }

    // 2) Compatibilidade segura com seus usuários antigos:
    //    busca somente documentos cujo authUid seja exatamente o UID autenticado.
    //    Isso funciona com Rules fechadas, sem deixar sistema_usuarios público.
    let snap = await firebaseFirestore
        .collection("sistema_usuarios")
        .where("authUid", "==", authUser.uid)
        .limit(1)
        .get();

    if (snap.empty && emailAuth) {
        // 3) Fallback seguro por e-mail Auth. Útil quando o documento já tem emailAuth,
        //    mas ainda não tem authUid preenchido corretamente.
        snap = await firebaseFirestore
            .collection("sistema_usuarios")
            .where("emailAuth", "==", emailAuth)
            .limit(1)
            .get();
    }

    if (snap.empty && emailAuth) {
        // 4) Fallback por e-mail cadastral. Ajuda na migração inicial, mas ainda exige
        //    usuário autenticado e regra validando o e-mail do token.
        snap = await firebaseFirestore
            .collection("sistema_usuarios")
            .where("email", "==", emailAuth)
            .limit(1)
            .get();
    }

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data() || {};
    const perfil = {
        id: data.id || doc.id,
        ...data,
        authUid: data.authUid || authUser.uid,
        authEmail: data.authEmail || emailAuth
    };

    // Atualiza o documento legado para consolidar authUid/authEmail.
    await doc.ref.set({
        authUid: authUser.uid,
        authEmail: perfil.authEmail,
        emailAuth: perfil.authEmail,
        autenticacaoMigradaEm: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Também cria/atualiza o documento canônico com ID igual ao UID do Firebase Auth.
    // Isso é importante para as Firestore Rules reconhecerem o nível ADM/Monitor com segurança.
    if (doc.id !== authUser.uid) {
        await firebaseFirestore.collection("sistema_usuarios").doc(authUser.uid).set({
            ...perfil,
            id: perfil.id || authUser.uid,
            authUid: authUser.uid,
            authEmail: perfil.authEmail,
            emailAuth: perfil.authEmail,
            autenticacaoMigradaEm: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    return perfil;
}

async function verificarSessao() {
    initFirebase();
    if (!firebaseAuth) return;
    const form = document.getElementById("loginForm");
    const btn = form?.querySelector('button[type="submit"]');
    firebaseAuth.onAuthStateChanged(async (authUser) => {
        if (!authUser || usuarioLogado) return;
        try {
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Restaurando sessão...'; }
            const perfil = await carregarPerfilUsuarioAuth(authUser, authUser.email);
            if (!perfil) return;
            usuarioLogado = perfil;
            await carregarDadosPosLogin();
            if (usuarioLogado?.nivel === "ADM") await provisionarUsuariosAuthExistentes();
            aplicarTemaUsuario(usuarioLogado);
            logarSucesso(usuarioLogado);
        } catch (erro) {
            console.warn("Não foi possível restaurar sessão Auth. Faça login novamente.", erro);
            try { await firebaseAuth.signOut(); } catch (_) {}
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Acessar Painel'; }
        }
    });
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
    prepararFiltrosRelatoriosComparativos();
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
        "btnNav-relatorios": "relatorios",
        "btnNav-plataforma": "plataforma",
        "btnNav-monitoria": "monitoria",
        "btnNav-meusresultados": "meusresultados",
        "btnNavAlunos": "alunos",
        "btnNavUsuarios": "usuarios",
        "btnNavOlimpiadas": "olimpiadas",
        "btnNavCidades": "cidades",
        "btnNavEscolas": "escolas",
        "btnNavLayout": "layout"
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
        alunos: document.getElementById("btnNavAlunos"),
        usuarios: document.getElementById("btnNavUsuarios"),
        olimpiadas: document.getElementById("btnNavOlimpiadas"),
        cidades: document.getElementById("btnNavCidades"),
        escolas: document.getElementById("btnNavEscolas"),
        layout: document.getElementById("btnNavLayout")
    })[aba];
    if (btn) {
        btn.classList.remove("text-gray-400");
        btn.classList.add("text-blue-400", "bg-blue-500/10");
    }

    const titulos = {
        dashboard: "Dashboard Analítico", calendario: "Calendário Oficial de Olimpíadas",
        meusresultados: "Meus Resultados", importar: "Importar Resultados", relatorios: "Relatórios Comparativos",
        alunos: "Cadastro de Alunos", usuarios: "Gerenciar Usuários e Permissões",
        olimpiadas: "Olimpíadas Cadastradas", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)",
        plataforma: "Plataforma de Ensino", monitoria: "Monitoria — Salas de Atendimento", layout: "Editor de Layout"
    };
    const titulo = document.getElementById("pageTitleDisplay");
    if (titulo) titulo.innerText = titulos[aba] || "Painel Operacional";

    if (aba === "meusresultados") renderizarDashboardAluno();
    if (aba === "plataforma") renderizarPlataformaEnsino();
    if (aba === "monitoria") renderizarSalasMonitoria();
    if (aba === "importar") renderizarResultadosImportacao();
    if (aba === "relatorios") prepararTelaRelatoriosComparativos();
    if (aba === "alunos") { popularSeletoresAlunos(); renderizarAlunos(); }
    if (aba === "layout") prepararEditorLayout();
}

function getCidadeGestor() {
    if (!usuarioLogado) return null;
    if (usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Monitor" || usuarioLogado.nivel === "Visualizador") return null;
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

function valoresSelectMultiplo(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    return Array.from(el.selectedOptions || []).map(opt => opt.value).filter(Boolean);
}

function escopoVisualizadorUsuario(usuario = usuarioLogado) {
    if (!usuario || usuario.nivel !== "Visualizador") return null;
    const escopo = usuario.escopoVisualizador || {};
    return {
        cidadesIds: Array.isArray(escopo.cidadesIds) ? escopo.cidadesIds : [],
        escolasIds: Array.isArray(escopo.escolasIds) ? escopo.escolasIds : []
    };
}

function cidadeNomeUfPorId(cidadeId) {
    const c = getStorage("app_cidades").find(cid => cid.id === cidadeId);
    return c ? `${c.nome} - ${c.uf}` : "";
}

function idsEscolasDoEscopoVisualizador(usuario = usuarioLogado) {
    const escopo = escopoVisualizadorUsuario(usuario);
    if (!escopo) return [];
    const escolas = getStorage("app_escolas");
    const ids = new Set(escopo.escolasIds || []);
    escolas.forEach(e => {
        if ((escopo.cidadesIds || []).includes(e.cidadeId)) ids.add(e.id);
    });
    return Array.from(ids);
}

function nomesEscolasDoEscopoVisualizador(usuario = usuarioLogado) {
    const ids = idsEscolasDoEscopoVisualizador(usuario);
    const escolas = getStorage("app_escolas");
    return escolas.filter(e => ids.includes(e.id)).map(e => e.nome);
}

function nomesMunicipiosDoEscopoVisualizador(usuario = usuarioLogado) {
    const escopo = escopoVisualizadorUsuario(usuario);
    if (!escopo) return [];
    const nomes = new Set();
    (escopo.cidadesIds || []).forEach(cid => {
        const nome = cidadeNomeUfPorId(cid);
        if (nome) nomes.add(nome);
    });
    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    (escopo.escolasIds || []).forEach(eid => {
        const esc = escolas.find(e => e.id === eid);
        const cid = esc ? cidades.find(c => c.id === esc.cidadeId) : null;
        if (cid) nomes.add(`${cid.nome} - ${cid.uf}`);
    });
    return Array.from(nomes);
}

function itemDentroDoEscopoVisualizador(item, usuario = usuarioLogado) {
    if (!usuario || usuario.nivel !== "Visualizador") return true;
    const municipios = nomesMunicipiosDoEscopoVisualizador(usuario).map(normalizarTexto);
    const escolas = nomesEscolasDoEscopoVisualizador(usuario).map(normalizarTexto);
    const escolaItem = normalizarTexto(item.escola || item.nomeEscola || item.escolaNome);
    const municipioItem = normalizarTexto(item.municipio || item.cidade || item.cidadeNome);
    if (escolaItem && escolas.includes(escolaItem)) return true;
    if (municipioItem && municipios.includes(municipioItem)) return true;
    return false;
}

function popularEscopoVisualizadorCadastro() {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const selCidades = document.getElementById("addUserVisualizadorCidades");
    const selEscolas = document.getElementById("addUserVisualizadorEscolas");
    if (selCidades) {
        const anteriores = valoresSelectMultiplo("addUserVisualizadorCidades");
        selCidades.innerHTML = cidades.map(c => `<option value="${textoSeguro(c.id)}">${textoSeguro(c.nome)} (${textoSeguro(c.uf)})</option>`).join("");
        anteriores.forEach(v => { const opt = Array.from(selCidades.options).find(o => o.value === v); if (opt) opt.selected = true; });
    }
    if (selEscolas) {
        const anteriores = valoresSelectMultiplo("addUserVisualizadorEscolas");
        selEscolas.innerHTML = escolas.map(e => {
            const c = cidades.find(cid => cid.id === e.cidadeId);
            const cidadeTxt = c ? ` — ${c.nome}/${c.uf}` : "";
            return `<option value="${textoSeguro(e.id)}">${textoSeguro(e.nome)}${textoSeguro(cidadeTxt)}</option>`;
        }).join("");
        anteriores.forEach(v => { const opt = Array.from(selEscolas.options).find(o => o.value === v); if (opt) opt.selected = true; });
    }
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
        if (nivelUsuario === "Visualizador") return [{ value: "", text: "Escopo múltiplo definido no cadastro" }];
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
    if (usuarioLogado.nivel === "Visualizador") return itemDentroDoEscopoVisualizador(resultado);

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
    if (usuarioLogado.nivel === "Visualizador") return itemDentroDoEscopoVisualizador(resultado);
    const municipioTravado = getMunicipioFiltradoUsuario();
    return municipioTravado === "TODOS" || normalizarTexto(resultado.municipio) === normalizarTexto(municipioTravado);
}

async function logout() {
    try { if (firebaseAuth) await firebaseAuth.signOut(); } catch (_) {}
    usuarioLogado = null;
    if (monitoriaListenerAtivo) {
        monitoriaListenerAtivo();
        monitoriaListenerAtivo = null;
    }
    salaMoniAtual = null;
    document.getElementById("mainPanel").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("loginForm")?.reset();
}

function clonarDados(valor) {
    try { return JSON.parse(JSON.stringify(valor)); }
    catch (_) { return valor; }
}

function getStorage(chave, fallback = []) {
    if (Object.prototype.hasOwnProperty.call(memoriaDadosSistema, chave)) {
        return clonarDados(memoriaDadosSistema[chave]);
    }
    return clonarDados(fallback);
}

function setStorage(chave, valor) {
    memoriaDadosSistema[chave] = clonarDados(valor);
    return salvarChaveFirebase(chave, valor);
}

function setStorageLocal(chave, valor) {
    memoriaDadosSistema[chave] = clonarDados(valor);
}

function dadosSementePorChave(chave) {
    const mapa = {
        app_usuarios: typeof DATABASE !== "undefined" ? DATABASE.usuarios : [],
        app_cidades: typeof CONFIG_CIDADES_INICIAIS !== "undefined" ? CONFIG_CIDADES_INICIAIS : [],
        app_escolas: typeof CONFIG_ESCOLAS_INICIAIS !== "undefined" ? CONFIG_ESCOLAS_INICIAIS : [],
        app_alunos: [],
        app_olimpiadas: typeof DATABASE !== "undefined" ? DATABASE.olimpiadas : [],
        app_cronograma: typeof DATABASE !== "undefined" ? DATABASE.cronograma : [],
        app_premiados: typeof DATABASE !== "undefined" ? DATABASE.premiados : [],
        app_plataforma: typeof DATABASE !== "undefined" ? DATABASE.plataforma : []
    };
    return Array.isArray(mapa[chave]) ? clonarDados(mapa[chave]) : [];
}

function normalizarListaFirebase(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.filter(Boolean);
    if (typeof valor === "object") return Object.values(valor).filter(Boolean);
    return [];
}

function getFirebaseCollectionBaseName(chave) {
    if (typeof FIREBASE_COLLECTIONS !== "undefined" && FIREBASE_COLLECTIONS[chave]) return FIREBASE_COLLECTIONS[chave];
    return chave.replace(/^app_/, "sistema_");
}

function getFirebaseCollectionName(chave) {
    const base = getFirebaseCollectionBaseName(chave);
    // Usuários são globais para não travar o login ao trocar de ano.
    // As demais informações administrativas ficam separadas por ano no Firestore.
    if (chave === "app_usuarios") return base;
    if (CHAVES_ANUAIS_FIRESTORE.includes(chave)) return `anos/${anoDadosAtivo}/${base}`;
    return base;
}

function atualizarRotuloAnoDados() {
    const select = document.getElementById("selectAnoDados");
    if (select && select.value !== anoDadosAtivo) select.value = anoDadosAtivo;
    const label = document.getElementById("labelCicloOperacional");
    if (label) label.innerText = `Ciclo Operacional ${anoDadosAtivo}`;
    const anoForm = document.getElementById("addOliAnoReferencia");
    if (anoForm && Array.from(anoForm.options).some(opt => opt.value === anoDadosAtivo)) anoForm.value = anoDadosAtivo;
}

async function trocarAnoDados(novoAno) {
    novoAno = String(novoAno || "").trim();
    if (!novoAno || novoAno === anoDadosAtivo) return;
    if (usuarioLogado && !confirm(`Trocar para o ano ${novoAno}?

Os dados exibidos serão recarregados do banco deste ano.`)) {
        atualizarRotuloAnoDados();
        return;
    }
    anoDadosAtivo = novoAno;
    atualizarRotuloAnoDados();
    CHAVES_ANUAIS_FIRESTORE.forEach(chave => { delete memoriaDadosSistema[chave]; });
    dadosTrabalho = [];

    if (usuarioLogado) {
        await carregarDadosPosLogin();
        popularSeletores();
        renderizarPlataformaDashboard();
        renderizarCronograma();
        renderizarTabelasGerenciais();
        renderizarAlunos();
        renderizarResultadosImportacao();
        renderizarPlataformaEnsino();
        renderizarDashboardAluno();
        if (!document.getElementById("view-relatorios")?.classList.contains("hidden")) prepararTelaRelatoriosComparativos();
        alert(`Ano ${anoDadosAtivo} carregado com sucesso.`);
    }
}

function initSeletorAnoDados() {
    const select = document.getElementById("selectAnoDados");
    if (!select) return;
    select.value = anoDadosAtivo;
    select.addEventListener("change", () => trocarAnoDados(select.value));
    atualizarRotuloAnoDados();
}

function prepararListaParaFirestore(lista) {
    return normalizarListaFirebase(lista).map(item => {
        const copia = { ...(item || {}) };
        if (!copia.id) copia.id = novoId();
        return copia;
    });
}

async function substituirColecaoFirestore(nomeColecao, lista) {
    const col = firebaseFirestore.collection(nomeColecao);
    const atuais = await col.get();
    const dados = prepararListaParaFirestore(lista);

    let batch = firebaseFirestore.batch();
    let ops = 0;

    atuais.forEach(doc => {
        batch.delete(doc.ref);
        ops++;
    });

    dados.forEach(item => {
        const docId = nomeColecao === "sistema_usuarios" ? String(item.authUid || item.id) : String(item.id);
        batch.set(col.doc(docId), item);
        ops++;
    });

    if (ops > 0) await batch.commit();
    return dados;
}

function salvarChaveFirebase(chave, valor) {
    initFirebase();
    if (!firebaseFirestore) {
        console.error(`${chave} NÃO foi salvo: Cloud Firestore não inicializado.`);
        alert(`Firebase/Firestore não inicializou. ${chave} não foi salvo no banco.`);
        return Promise.reject(new Error("Cloud Firestore não inicializado"));
    }
    const colecao = getFirebaseCollectionName(chave);
    return substituirColecaoFirestore(colecao, valor).then((dados) => {
        setStorageLocal(chave, dados);
        console.log(`Firestore OK: ${chave} salvo na coleção ${colecao}`);
    }).catch(erro => {
        console.error(`${chave} NÃO foi salvo no Firestore na coleção ${colecao}.`, erro);
        alert(`${chave} não foi salvo no Firestore. Verifique as Rules do Cloud Firestore.

${erro.message || erro}`);
        throw erro;
    });
}

async function carregarChaveFirebase(chave, fallback = []) {
    initFirebase();
    let seed = Array.isArray(fallback) && fallback.length ? fallback : dadosSementePorChave(chave);
    // Para anos diferentes de 2026, não semeia automaticamente cidades/escolas/olimpíadas/resultados.
    // Assim cada ciclo anual começa limpo e recebe apenas os dados cadastrados/importados naquele ano.
    if (chave !== "app_usuarios" && CHAVES_ANUAIS_FIRESTORE.includes(chave) && anoDadosAtivo !== "2026" && !(Array.isArray(fallback) && fallback.length)) {
        seed = [];
    }

    if (!firebaseFirestore) {
        console.error("Cloud Firestore não inicializado. Nada será gravado localmente.");
        setStorageLocal(chave, seed);
        return getStorage(chave, []);
    }

    const colecao = getFirebaseCollectionName(chave);

    try {
        const snap = await firebaseFirestore.collection(colecao).get();
        let remotos = [];
        snap.forEach(doc => {
            const data = doc.data() || {};
            remotos.push({ id: data.id || doc.id, ...data });
        });

        if (chave === "app_usuarios") {
            const sementesUsuarios = dadosSementePorChave("app_usuarios");
            const mapa = new Map();
            remotos.forEach(item => mapa.set(String(item.id || item.login || novoId()), item));
            sementesUsuarios.forEach(item => {
                const id = String(item.id || item.login || novoId());
                const loginJaExiste = Array.from(mapa.values()).some(x => normalizarTexto(x.login) === normalizarTexto(item.login));
                if (!mapa.has(id) && !loginJaExiste) mapa.set(id, item);
            });
            const finais = prepararListaParaFirestore(Array.from(mapa.values()).filter(Boolean));
            if (JSON.stringify(finais) !== JSON.stringify(prepararListaParaFirestore(remotos))) {
                await substituirColecaoFirestore(colecao, finais);
            }
            setStorageLocal(chave, finais);
            return finais;
        }

        if (remotos.length > 0) {
            setStorageLocal(chave, remotos);
            return remotos;
        }

        const dadosIniciais = prepararListaParaFirestore(seed);
        if (dadosIniciais.length > 0) {
            await substituirColecaoFirestore(colecao, dadosIniciais);
            setStorageLocal(chave, dadosIniciais);
        } else {
            setStorageLocal(chave, []);
        }
        return getStorage(chave, []);
    } catch (erro) {
        console.error(`Erro de Firebase ao carregar ${chave} na coleção ${colecao}.`, erro);
        alert(`Erro de Firebase ao carregar ${chave}. Verifique as Rules do Cloud Firestore.

${erro.message || erro}`);
        throw erro;
    }
}

async function carregarDadosFirebaseInicial() {
    const chaves = [
        "app_usuarios",
        "app_cidades",
        "app_escolas",
        "app_alunos",
        "app_olimpiadas",
        "app_cronograma",
        "app_premiados",
        "app_plataforma"
    ];

    for (const chave of chaves) {
        await carregarChaveFirebase(chave, []);
    }
}

async function carregarDadosPosLogin() {
    // Depois do login, carrega as coleções usadas pelo painel.
    // Usuários já foram carregados no processo de autenticação.
    const chaves = [
        "app_cidades",
        "app_escolas",
        "app_alunos",
        "app_olimpiadas",
        "app_cronograma",
        "app_premiados",
        "app_plataforma"
    ];

    for (const chave of chaves) {
        await carregarChaveFirebase(chave, []);
    }

    dadosTrabalho = getStorage("app_premiados", []);
    if (!Array.isArray(dadosTrabalho)) dadosTrabalho = [];
}

async function sincronizarUsuariosFirebaseInicial() {
    return await carregarChaveFirebase("app_usuarios", []);
}

function salvarUsuariosFirebase(usuarios) {
    return salvarChaveFirebase("app_usuarios", usuarios);
}

async function salvarUsuariosSistema(usuarios) {
    setStorageLocal("app_usuarios", usuarios);
    if (usuarioLogado?.nivel === "ADM") {
        try {
            const provisionados = await provisionarAuthUsuarios(usuarios);
            return salvarChaveFirebase("app_usuarios", provisionados);
        } catch (erro) {
            console.warn("Provisionamento Auth falhou. Salvando perfis no Firestore mesmo assim.", erro);
        }
    }
    return salvarChaveFirebase("app_usuarios", usuarios);
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

function atualizarBotaoTema() {
    const claro = document.body.classList.contains("theme-light");
    const btn = document.getElementById("btnToggleTema");
    if (btn) {
        btn.innerHTML = claro
            ? '<i class="fa-solid fa-moon mr-2"></i>Tema escuro'
            : '<i class="fa-solid fa-sun mr-2"></i>Tema claro';
    }
}

function aplicarTemaPreferidoLocal() {
    try {
        const tema = localStorage.getItem(TEMA_LOCAL_KEY) || "escuro";
        document.body.classList.toggle("theme-light", tema === "claro");
        atualizarBotaoTema();
    } catch (_) {}
}

function aplicarTemaUsuario(usuario = usuarioLogado) {
    const tema = usuario?.preferencias?.tema || usuario?.temaPreferido || (() => { try { return localStorage.getItem(TEMA_LOCAL_KEY); } catch (_) { return null; } })() || "escuro";
    document.body.classList.toggle("theme-light", tema === "claro");
    try { localStorage.setItem(TEMA_LOCAL_KEY, tema); } catch (_) {}
    atualizarBotaoTema();
}

async function salvarTemaUsuario(tema) {
    try { localStorage.setItem(TEMA_LOCAL_KEY, tema); } catch (_) {}
    if (!usuarioLogado?.id) return;
    const usuarios = getStorage("app_usuarios", []);
    const idx = usuarios.findIndex(u => String(u.id) === String(usuarioLogado.id));
    if (idx === -1) return;
    usuarios[idx] = { ...usuarios[idx], preferencias: { ...(usuarios[idx].preferencias || {}), tema } };
    usuarioLogado = usuarios[idx];
    setStorageLocal("app_usuarios", usuarios);
    await salvarUsuariosSistema(usuarios);
}

function alternarTemaClaroEscuro() {
    const claro = !document.body.classList.contains("theme-light");
    document.body.classList.toggle("theme-light", claro);
    atualizarBotaoTema();
    salvarTemaUsuario(claro ? "claro" : "escuro").catch(erro => console.warn("Não foi possível salvar preferência de tema.", erro));
}

function todasEtapasPadronizadas() {
    return TAXONOMIA_ETAPAS.flatMap(grupo => grupo.etapas.map(etapa => ({
        ...etapa,
        grupoCodigo: grupo.grupoCodigo,
        grupoNome: grupo.grupoNome
    })));
}

function encontrarEtapaPadronizada(valor) {
    const alvo = normalizarTexto(valor);
    if (!alvo) return null;
    return todasEtapasPadronizadas().find(etapa =>
        normalizarTexto(etapa.nome) === alvo ||
        normalizarTexto(etapa.codigo) === alvo ||
        normalizarTexto(`${etapa.codigo} · ${etapa.nome}`) === alvo
    ) || null;
}

function normalizarEtapaCronograma(valor) {
    const etapa = encontrarEtapaPadronizada(valor);
    if (!etapa) return {
        etapa: String(valor ?? "").trim(),
        etapaCodigo: "",
        etapaGrupo: "",
        etapaGrupoNome: "",
        padronizada: false
    };
    return {
        etapa: etapa.nome,
        etapaCodigo: etapa.codigo,
        etapaGrupo: etapa.grupoCodigo,
        etapaGrupoNome: etapa.grupoNome,
        padronizada: true
    };
}

function montarOptionsEtapasSelect(valorSelecionado = "", opcoes = {}) {
    const incluirPlaceholder = opcoes.incluirPlaceholder !== false;
    const textoPlaceholder = opcoes.textoPlaceholder || "Selecione a etapa...";
    const valorAtual = String(valorSelecionado ?? "").trim();
    const etapaAtual = encontrarEtapaPadronizada(valorAtual);
    const partes = [];

    if (incluirPlaceholder) partes.push(`<option value="">${textoSeguro(textoPlaceholder)}</option>`);
    if (valorAtual && !etapaAtual) {
        partes.push(`<option value="${textoSeguro(valorAtual)}" selected>⚠ Etapa não padronizada — ${textoSeguro(valorAtual)}</option>`);
    }

    TAXONOMIA_ETAPAS.forEach(grupo => {
        partes.push(`<optgroup label="${textoSeguro(grupo.grupoNome)}">`);
        grupo.etapas.forEach(etapa => {
            const selected = etapaAtual?.codigo === etapa.codigo ? " selected" : "";
            partes.push(`<option value="${textoSeguro(etapa.nome)}"${selected}>${textoSeguro(etapa.codigo)} · ${textoSeguro(etapa.nome)}</option>`);
        });
        partes.push(`</optgroup>`);
    });

    return partes.join("");
}

function preencherSelectEtapasCronograma() {
    const select = document.getElementById("addCroEtapa");
    if (!select) return;
    const valorAtual = select.value;
    select.innerHTML = montarOptionsEtapasSelect(valorAtual, { incluirPlaceholder: true, textoPlaceholder: "Selecione a etapa/fase..." });
}

function preencherFiltrosCronograma() {
    const filtroGrupo = document.getElementById("filterCronogramaGrupoEtapa");
    const filtroEtapa = document.getElementById("filterCronogramaEtapa");
    if (!filtroGrupo && !filtroEtapa) return;

    const grupoAtual = filtroGrupo?.value || "TODOS";
    if (filtroGrupo) {
        const valorAnterior = filtroGrupo.value || "TODOS";
        filtroGrupo.innerHTML = `<option value="TODOS">-- Todos os grupos de etapa --</option>` +
            TAXONOMIA_ETAPAS.map(grupo => `<option value="${textoSeguro(grupo.grupoCodigo)}">${textoSeguro(grupo.grupoNome)}</option>`).join("") +
            `<option value="NAO_PADRONIZADA">⚠ Etapas não padronizadas</option>`;
        if ([...filtroGrupo.options].some(opt => opt.value === valorAnterior)) filtroGrupo.value = valorAnterior;
    }

    if (filtroEtapa) {
        const valorAnterior = filtroEtapa.value || "TODOS";
        const grupos = grupoAtual === "TODOS" || grupoAtual === "NAO_PADRONIZADA"
            ? TAXONOMIA_ETAPAS
            : TAXONOMIA_ETAPAS.filter(grupo => grupo.grupoCodigo === grupoAtual);
        filtroEtapa.innerHTML = `<option value="TODOS">-- Todas as etapas --</option>` + grupos.map(grupo =>
            `<optgroup label="${textoSeguro(grupo.grupoNome)}">` +
            grupo.etapas.map(etapa => `<option value="${textoSeguro(etapa.nome)}">${textoSeguro(etapa.codigo)} · ${textoSeguro(etapa.nome)}</option>`).join("") +
            `</optgroup>`
        ).join("");
        if ([...filtroEtapa.options].some(opt => opt.value === valorAnterior)) filtroEtapa.value = valorAnterior;
    }
}

function etapaVisualCronograma(evento) {
    const info = normalizarEtapaCronograma(evento.etapa);
    if (info.padronizada) {
        const label = `${info.etapaCodigo} · ${info.etapa}`;
        return `<span class="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-gray-300">${textoSeguro(label)}</span>`;
    }
    return `<span class="px-2 py-0.5 bg-amber-950/30 border border-amber-700/50 rounded text-amber-300" title="Selecione uma etapa padronizada ao editar este evento.">⚠ Etapa não padronizada: ${textoSeguro(evento.etapa || "Não informada")}</span>`;
}

function confirmarExclusao(tipo, nome) {
    return confirm(`Tem certeza que deseja apagar ${tipo}: ${nome}?\n\nEssa ação não pode ser desfeita.`);
}

function existeResultadoParaCampo(campo, valor) {
    const alvo = normalizarTexto(valor);
    return dadosTrabalho.some(item => normalizarTexto(item[campo]) === alvo);
}


// ==================== FIREBASE AUTH — PROVISIONAMENTO DE USUÁRIOS ====================
function firebaseConfigAtual() {
    return (typeof FIREBASE_CONFIG_AVANCE !== "undefined") ? FIREBASE_CONFIG_AVANCE : firebase.app().options;
}

function getAuthSecundario() {
    const nomeApp = "authProvisionamentoSecundario";
    const appSec = firebase.apps.find(app => app.name === nomeApp) || firebase.initializeApp(firebaseConfigAtual(), nomeApp);
    return appSec.auth();
}

async function criarOuEntrarAuthSecundario(email, senha) {
    const authSec = getAuthSecundario();
    try {
        const cred = await authSec.createUserWithEmailAndPassword(email, senha);
        const uid = cred.user.uid;
        await authSec.signOut();
        return uid;
    } catch (erro) {
        if (String(erro?.code || "").includes("email-already-in-use")) {
            const cred = await authSec.signInWithEmailAndPassword(email, senha);
            const uid = cred.user.uid;
            await authSec.signOut();
            return uid;
        }
        throw erro;
    }
}

async function provisionarAuthUsuario(usuario) {
    if (!usuario) return usuario;
    if (usuario.authUid && (usuario.authEmail || usuario.emailAuth)) return usuario;
    const senha = String(usuario.senha || usuario.senhaPadrao || SENHA_PADRAO_USUARIO);
    if (senha.length < 6) throw new Error(`Senha fraca para ${usuario.nome || usuario.login}. Use pelo menos 6 caracteres.`);
    const email = emailAuthDoUsuario(usuario);
    if (!email || !email.includes("@")) throw new Error(`E-mail Auth inválido para ${usuario.nome || usuario.login}.`);
    const uid = await criarOuEntrarAuthSecundario(email, senha);
    return { ...usuario, authUid: uid, authEmail: email, emailAuth: email, senhaMigradaParaAuth: true };
}

async function provisionarAuthUsuarios(usuarios) {
    const lista = [];
    for (const usuario of normalizarListaFirebase(usuarios)) {
        try {
            lista.push(await provisionarAuthUsuario(usuario));
        } catch (erro) {
            console.warn(`Não foi possível provisionar Auth para ${usuario?.nome || usuario?.login}.`, erro);
            lista.push(usuario);
        }
    }
    setStorageLocal("app_usuarios", lista);
    return lista;
}

async function provisionarUsuariosAuthExistentes() {
    if (usuarioLogado?.nivel !== "ADM") return;
    const usuarios = getStorage("app_usuarios", []);
    if (!usuarios.length) return;
    const pendentes = usuarios.filter(u => !u.authUid || !u.authEmail);
    if (!pendentes.length) return;
    const atualizados = await provisionarAuthUsuarios(usuarios);
    await salvarChaveFirebase("app_usuarios", atualizados);
    console.log(`Firebase Auth: ${pendentes.length} usuário(s) provisionado(s).`);
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
        wrap.id = `modalWrap_${campo.nome}`;
        const label = document.createElement("label");
        label.className = "block text-xs font-semibold text-gray-400 uppercase tracking-wider";
        label.innerText = campo.label;
        wrap.appendChild(label);

        let input;
        if (campo.tipo === "checkboxGroup") {
            input = document.createElement("div");
            input.id = `modalCampo_${campo.nome}`;
            input.className = "grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-gray-900 border border-gray-700 p-3 text-xs text-gray-300";
            const valoresAtuais = Array.isArray(campo.valor) ? campo.valor.map(v => normalizarTexto(v)) : [];
            const opts = Array.isArray(campo.options) ? campo.options : [];
            opts.forEach(opt => {
                const valor = typeof opt === "object" ? opt.value : opt;
                const texto = typeof opt === "object" ? opt.text : opt;
                const labelOpt = document.createElement("label");
                labelOpt.className = "flex items-center gap-2 leading-snug";
                const chk = document.createElement("input");
                chk.type = "checkbox";
                chk.value = valor;
                chk.className = "accent-blue-500";
                chk.checked = valoresAtuais.includes(normalizarTexto(valor));
                labelOpt.appendChild(chk);
                labelOpt.appendChild(document.createTextNode(texto));
                input.appendChild(labelOpt);
            });
        } else if (campo.tipo === "select" || campo.tipo === "selectGrouped") {
            input = document.createElement("select");
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none";

            if (campo.tipo === "selectGrouped") {
                input.innerHTML = montarOptionsEtapasSelect(campo.valor, { incluirPlaceholder: true, textoPlaceholder: "Selecione a etapa padronizada..." });
            } else {
                const opts = Array.isArray(campo.options) ? campo.options : [];
                opts.forEach(opt => {
                    const o = document.createElement("option");
                    if (typeof opt === "object") { o.value = opt.value; o.text = opt.text; }
                    else { o.value = opt; o.text = opt; }
                    if (o.value == campo.valor) o.selected = true;
                    input.appendChild(o);
                });
            }
        } else if (campo.tipo === "textarea") {
            input = document.createElement("textarea");
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none resize-none";
            input.rows = campo.rows || 3;
            input.value = campo.valor ?? "";
        } else {
            input = document.createElement("input");
            input.type = campo.tipo || "text";
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none";
            input.value = campo.valor ?? "";
        }
        input.id = input.id || `modalCampo_${campo.nome}`;
        wrap.appendChild(input);
        corpo.appendChild(wrap);
    });

    const modal = document.getElementById("modalEdicao");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    if (onDepoisMontar) onDepoisMontar();

    document.getElementById("modalEdicaoBtnSalvar").onclick = () => {
        const dados = {};
        campos.forEach(c => {
            const el = document.getElementById(`modalCampo_${c.nome}`);
            if (c.tipo === "checkboxGroup") {
                dados[c.nome] = Array.from(el?.querySelectorAll('input[type="checkbox"]:checked') || []).map(chk => chk.value);
            } else {
                dados[c.nome] = el?.value ?? "";
            }
        });
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

    if (atual.nivel === "Visualizador") {
        const cidades = getStorage("app_cidades");
        const escolas = getStorage("app_escolas");
        const escopo = atual.escopoVisualizador || { cidadesIds: [], escolasIds: [] };
        campos.push({ nome: "visualizadorCidadesIds", label: "Cidades permitidas ao visualizador", tipo: "multiselect", valor: escopo.cidadesIds || [], size: 5, options: cidades.map(c => ({ value: c.id, text: `${c.nome} (${c.uf})` })) });
        campos.push({ nome: "visualizadorEscolasIds", label: "Escolas permitidas ao visualizador", tipo: "multiselect", valor: escopo.escolasIds || [], size: 6, options: escolas.map(e => ({ value: e.id, text: e.nome })) });
    }

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
            if (d.nivel === "Visualizador") {
                const cidadesIds = Array.isArray(d.visualizadorCidadesIds) ? d.visualizadorCidadesIds : (lista[i].escopoVisualizador?.cidadesIds || []);
                const escolasIds = Array.isArray(d.visualizadorEscolasIds) ? d.visualizadorEscolasIds : (lista[i].escopoVisualizador?.escolasIds || []);
                if (!cidadesIds.length && !escolasIds.length) return alert("Visualizador precisa ter pelo menos uma cidade ou escola no escopo."), false;
                lista[i].escopoVisualizador = { cidadesIds, escolasIds };
            } else {
                delete lista[i].escopoVisualizador;
            }
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

function valorOlimpiadaAtual(atual, campo, fallback = "") {
    const v = atual?.[campo];
    return v === undefined || v === null ? fallback : v;
}

function listaOlimpiadaAtual(atual, campo, fallbackCampoTexto = "") {
    if (Array.isArray(atual?.[campo])) return atual[campo];
    if (fallbackCampoTexto && typeof atual?.[fallbackCampoTexto] === "string") {
        return atual[fallbackCampoTexto].split(",").map(x => x.trim()).filter(Boolean);
    }
    return [];
}

function sincronizarCondicionaisModalOlimpiada() {
    const restricao = document.getElementById("modalCampo_possuiRestricaoIdade");
    const idadeWrap = document.getElementById("modalWrap_idadeMaxima");
    const modalidades = document.getElementById("modalCampo_possuiModalidades");
    const modalidadesWrap = document.getElementById("modalWrap_modalidadesDescricao");

    const aplicar = () => {
        if (idadeWrap) idadeWrap.classList.toggle("hidden", restricao?.value !== "Sim");
        if (modalidadesWrap) modalidadesWrap.classList.toggle("hidden", modalidades?.value !== "Sim");
    };

    if (restricao) restricao.onchange = aplicar;
    if (modalidades) modalidades.onchange = aplicar;
    aplicar();
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
        titulo: "Visualizar / editar olimpíada homologada",
        campos: [
            { nome: "nome", label: "Nome completo da olimpíada", valor: valorOlimpiadaAtual(atual, "nome") },
            { nome: "categoria", label: "Sigla / Frente", valor: valorOlimpiadaAtual(atual, "categoria") },
            { nome: "edicao", label: "Edição / Número", tipo: "number", valor: valorOlimpiadaAtual(atual, "edicao") },
            { nome: "anoReferencia", label: "Ano de referência", tipo: "select", valor: valorOlimpiadaAtual(atual, "anoReferencia", anoDadosAtivo), options: OPCOES_OLIMPIADA.anos },
            { nome: "areas", label: "Área / Disciplina", tipo: "checkboxGroup", valor: listaOlimpiadaAtual(atual, "areas"), options: OPCOES_OLIMPIADA.areas },
            { nome: "abrangencia", label: "Abrangência geográfica", tipo: "select", valor: valorOlimpiadaAtual(atual, "abrangencia", "Nacional"), options: OPCOES_OLIMPIADA.abrangencias },
            { nome: "status", label: "Status", tipo: "select", valor: valorOlimpiadaAtual(atual, "status", "Ativa"), options: OPCOES_OLIMPIADA.status },

            { nome: "organizadorPrincipal", label: "Organizador principal", valor: valorOlimpiadaAtual(atual, "organizadorPrincipal") },
            { nome: "siteOficial", label: "Site oficial", tipo: "url", valor: valorOlimpiadaAtual(atual, "siteOficial") },
            { nome: "instagramOficial", label: "Instagram oficial", valor: valorOlimpiadaAtual(atual, "instagramOficial") },
            { nome: "tipoEscolaElegivel", label: "Tipo de escola elegível", tipo: "select", valor: valorOlimpiadaAtual(atual, "tipoEscolaElegivel", "Pública e privada"), options: OPCOES_OLIMPIADA.tiposEscola },
            { nome: "inscricaoIndividual", label: "Inscrição pode ser individual?", tipo: "select", valor: valorOlimpiadaAtual(atual, "inscricaoIndividual", "Não"), options: OPCOES_OLIMPIADA.inscricaoIndividual },
            { nome: "escolaPrecisaInscrever", label: "Escola precisa se inscrever?", tipo: "select", valor: valorOlimpiadaAtual(atual, "escolaPrecisaInscrever", "Sim, obrigatório"), options: OPCOES_OLIMPIADA.escolaInscricao },

            { nome: "seriesAtendidas", label: "Séries atendidas", tipo: "checkboxGroup", valor: listaOlimpiadaAtual(atual, "seriesAtendidas", "series"), options: OPCOES_OLIMPIADA.seriesAtendidas },
            { nome: "segmentoPrincipal", label: "Segmento principal", tipo: "select", valor: valorOlimpiadaAtual(atual, "segmentoPrincipal", "Misto EF+EM"), options: OPCOES_OLIMPIADA.segmentos },
            { nome: "possuiRestricaoIdade", label: "Possui restrição de idade?", tipo: "select", valor: valorOlimpiadaAtual(atual, "possuiRestricaoIdade", "Não"), options: OPCOES_OLIMPIADA.simNao },
            { nome: "idadeMaxima", label: "Idade máxima do participante", tipo: "number", valor: valorOlimpiadaAtual(atual, "idadeMaxima") },
            { nome: "possuiModalidades", label: "Possui modalidades/níveis internos?", tipo: "select", valor: valorOlimpiadaAtual(atual, "possuiModalidades", "Não"), options: OPCOES_OLIMPIADA.simNao },
            { nome: "modalidadesDescricao", label: "Descrição das modalidades", tipo: "textarea", valor: valorOlimpiadaAtual(atual, "modalidadesDescricao") },

            { nome: "numeroFases", label: "Número de fases", tipo: "select", valor: valorOlimpiadaAtual(atual, "numeroFases", "1 fase"), options: OPCOES_OLIMPIADA.numeroFases },
            { nome: "tiposQuestao", label: "Tipo de questão (fase principal)", tipo: "checkboxGroup", valor: listaOlimpiadaAtual(atual, "tiposQuestao"), options: OPCOES_OLIMPIADA.tiposQuestao },
            { nome: "modalidadeAplicacao", label: "Modalidade de aplicação", tipo: "select", valor: valorOlimpiadaAtual(atual, "modalidadeAplicacao", "Presencial na escola"), options: OPCOES_OLIMPIADA.modalidadesAplicacao },
            { nome: "duracaoProvaPrincipal", label: "Duração da prova principal", tipo: "select", valor: valorOlimpiadaAtual(atual, "duracaoProvaPrincipal", "2h"), options: OPCOES_OLIMPIADA.duracoes },
            { nome: "materialProvaEnviadoComo", label: "Material de prova enviado como", tipo: "select", valor: valorOlimpiadaAtual(atual, "materialProvaEnviadoComo", "A definir"), options: OPCOES_OLIMPIADA.materiaisProva },
            { nome: "correcaoRealizadaPor", label: "Correção realizada por", tipo: "select", valor: valorOlimpiadaAtual(atual, "correcaoRealizadaPor", "Correção centralizada pelo organizador"), options: OPCOES_OLIMPIADA.correcoes },

            { nome: "gratuitaParaEscolaPublica", label: "É gratuita para escola pública?", tipo: "select", valor: valorOlimpiadaAtual(atual, "gratuitaParaEscolaPublica", "Sim"), options: OPCOES_OLIMPIADA.gratuitaPublica },
            { nome: "custoEscolaPublica", label: "Custo para escola pública", valor: valorOlimpiadaAtual(atual, "custoEscolaPublica") },
            { nome: "custoEscolaPrivada", label: "Custo para escola privada", valor: valorOlimpiadaAtual(atual, "custoEscolaPrivada") },
            { nome: "formasPagamento", label: "Forma de pagamento", tipo: "checkboxGroup", valor: listaOlimpiadaAtual(atual, "formasPagamento"), options: OPCOES_OLIMPIADA.formasPagamento },

            { nome: "premiosOferecidos", label: "Tipos de prêmio oferecidos", tipo: "checkboxGroup", valor: listaOlimpiadaAtual(atual, "premiosOferecidos"), options: OPCOES_OLIMPIADA.premios },
            { nome: "categoriasPremiacao", label: "Categorias de premiação", tipo: "checkboxGroup", valor: listaOlimpiadaAtual(atual, "categoriasPremiacao"), options: OPCOES_OLIMPIADA.categoriasPremiacao },
            { nome: "premiaProfessores", label: "Premia professores?", tipo: "select", valor: valorOlimpiadaAtual(atual, "premiaProfessores", "Não"), options: OPCOES_OLIMPIADA.simNao },
            { nome: "premiaEscola", label: "Premia escola?", tipo: "select", valor: valorOlimpiadaAtual(atual, "premiaEscola", "Não"), options: OPCOES_OLIMPIADA.simNao },

            { nome: "classificaPara", label: "Classifica para qual olimpíada?", valor: valorOlimpiadaAtual(atual, "classificaPara") },
            { nome: "preRequisitoDe", label: "É pré-requisito de qual olimpíada?", valor: valorOlimpiadaAtual(atual, "preRequisitoDe") },
            { nome: "olimpiadaInternacionalAssociada", label: "Olimpíada internacional associada", tipo: "select", valor: valorOlimpiadaAtual(atual, "olimpiadaInternacionalAssociada", "Nenhuma"), options: OPCOES_OLIMPIADA.internacionais },
            { nome: "nivelFunil", label: "Nível de dificuldade / posição no funil", tipo: "select", valor: valorOlimpiadaAtual(atual, "nivelFunil", "Porta de entrada (fase única acessível)"), options: OPCOES_OLIMPIADA.niveisFunil }
        ],
        onDepoisMontar: sincronizarCondicionaisModalOlimpiada,
        onSalvar: (d) => {
            if (!d.nome || !d.categoria) return alert("Nome completo e sigla/frente são obrigatórios."), false;
            if (!Array.isArray(d.seriesAtendidas) || !d.seriesAtendidas.length) return alert("Selecione pelo menos uma série atendida."), false;
            if (!Array.isArray(d.areas) || !d.areas.length) return alert("Selecione pelo menos uma área/disciplina."), false;

            const lista = getStorage("app_olimpiadas");
            if (lista.some(o => o.id !== id && normalizarTexto(o.nome) === normalizarTexto(d.nome))) return alert("Já existe outra olimpíada com esse nome."), false;
            const i = lista.findIndex(o => o.id === id);
            if (i === -1) return alert("Olimpíada não encontrada."), false;

            const possuiRestricaoIdade = d.possuiRestricaoIdade === "Sim";
            const possuiModalidades = d.possuiModalidades === "Sim";

            lista[i] = {
                ...lista[i],
                ...d,
                categoria: String(d.categoria || "").toUpperCase(),
                series: d.seriesAtendidas.join(", "),
                idadeMaxima: possuiRestricaoIdade ? d.idadeMaxima : "",
                modalidadesDescricao: possuiModalidades ? d.modalidadesDescricao : "",
                atualizadoEm: new Date().toISOString()
            };

            setStorage("app_olimpiadas", lista);
            atualizarResultadosCampo("olimpiada", nomeAntigo, d.nome);
            atualizarResultadosCampo("olimpiada", categoriaAntiga, d.nome);
            popularSeletores(); renderizarTabelasGerenciais(); renderizarCronograma(); renderizarPlataformaDashboard(); renderizarResultadosImportacao();
            alert("Olimpíada atualizada com cadastro completo.");
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
            { nome: "etapa", label: "Etapa / fase", tipo: "selectGrouped", valor: atual.etapa || "" },
            { nome: "data", label: "Data / janela crítica", valor: atual.data || "" },
            { nome: "segmento", label: "Público-alvo / séries elegíveis", valor: atual.segmento || "" },
            { nome: "acao", label: "Diretriz operacional", tipo: "textarea", valor: atual.acao || "" }
        ],
        onSalvar: (d) => {
            if (!d.olimpiadaId || !d.etapa || !d.data || !d.segmento || !d.acao) return alert("Todos os campos do evento são obrigatórios."), false;
            const lista = getStorage("app_cronograma");
            const i = lista.findIndex(c => c.id === id);
            if (i === -1) return alert("Evento não encontrado."), false;
            const infoEtapa = normalizarEtapaCronograma(d.etapa);
            const atualizado = { ...lista[i], olimpiadaId: d.olimpiadaId, etapa: infoEtapa.etapa, etapaCodigo: infoEtapa.etapaCodigo, etapaGrupo: infoEtapa.etapaGrupo, etapaGrupoNome: infoEtapa.etapaGrupoNome, data: d.data, segmento: d.segmento, acao: d.acao };
            const resultado = inserirOuSubstituirEventoCronograma(lista, atualizado, id, true);
            if (resultado.cancelado) return false;
            setStorage("app_cronograma", resultado.lista);
            renderizarCronograma();
            alert(resultado.substituido ? "Evento atualizado e duplicidade substituída com sucesso." : "Evento atualizado com sucesso.");
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


// ==================== RELATÓRIOS COMPARATIVOS ====================
function anosSelecionadosRelatorio() {
    const inicio = Number(document.getElementById("relAnoInicio")?.value || anoDadosAtivo);
    const fim = Number(document.getElementById("relAnoFim")?.value || anoDadosAtivo);
    const a = Math.min(inicio, fim);
    const b = Math.max(inicio, fim);
    return ANOS_REFERENCIA_PADRAO.map(Number).filter(ano => ano >= a && ano <= b).map(String);
}

function prepararFiltrosRelatoriosComparativos() {
    const anoInicio = document.getElementById("relAnoInicio");
    const anoFim = document.getElementById("relAnoFim");
    if (anoInicio && anoInicio.options.length === 0) {
        anoInicio.innerHTML = ANOS_REFERENCIA_PADRAO.map(a => `<option value="${a}">${a}</option>`).join("");
    }
    if (anoFim && anoFim.options.length === 0) {
        anoFim.innerHTML = ANOS_REFERENCIA_PADRAO.map(a => `<option value="${a}">${a}</option>`).join("");
    }
    if (anoInicio) anoInicio.value = ANOS_REFERENCIA_PADRAO.includes("2022") ? "2022" : ANOS_REFERENCIA_PADRAO[0];
    if (anoFim) anoFim.value = anoDadosAtivo;
}

async function prepararTelaRelatoriosComparativos() {
    prepararFiltrosRelatoriosComparativos();
    await atualizarFiltrosEntidadesRelatorio();
    await gerarRelatoriosComparativos();
}

function colecaoAnualFirestore(ano, chave) {
    const base = getFirebaseCollectionBaseName(chave);
    return `anos/${ano}/${base}`;
}

async function carregarColecaoAnualRelatorio(ano, chave) {
    initFirebase();
    if (!firebaseFirestore) throw new Error("Cloud Firestore não inicializado.");
    const snap = await firebaseFirestore.collection(colecaoAnualFirestore(ano, chave)).get();
    const lista = [];
    snap.forEach(doc => lista.push({ id: doc.id, ...(doc.data() || {}) }));
    return lista;
}

async function carregarPremiadosMultianual(anos) {
    const pacotes = await Promise.all(anos.map(async ano => {
        const premiados = await carregarColecaoAnualRelatorio(ano, "app_premiados");
        return premiados.map(item => ({ ...item, ano }));
    }));
    return pacotes.flat();
}

function premiosPorAnoVazio(ano) {
    return { ano, total: 0, ouro: 0, prata: 0, bronze: 0, mencao: 0 };
}

function classificarPremio(premio) {
    const p = normalizarTexto(premio);
    if (p.includes("ouro")) return "ouro";
    if (p.includes("prata")) return "prata";
    if (p.includes("bronze")) return "bronze";
    if (p.includes("men")) return "mencao";
    return "outros";
}

function aplicarFiltrosRelatorio(lista) {
    const cidade = document.getElementById("relFiltroCidade")?.value || "TODAS";
    const escola = document.getElementById("relFiltroEscola")?.value || "TODAS";
    return lista.filter(item => {
        if (!resultadoDentroDoEscopoUsuario(item)) return false;
        if (cidade !== "TODAS" && normalizarTexto(item.municipio) !== normalizarTexto(cidade)) return false;
        if (escola !== "TODAS" && normalizarTexto(item.escola) !== normalizarTexto(escola)) return false;
        return true;
    });
}

function agregarPorAno(lista, anos) {
    const mapa = new Map(anos.map(ano => [ano, premiosPorAnoVazio(ano)]));
    lista.forEach(item => {
        const ano = String(item.ano || anoDadosAtivo);
        if (!mapa.has(ano)) mapa.set(ano, premiosPorAnoVazio(ano));
        const linha = mapa.get(ano);
        linha.total++;
        const tipo = classificarPremio(item.premio);
        if (linha[tipo] !== undefined) linha[tipo]++;
    });
    return Array.from(mapa.values()).sort((a, b) => Number(a.ano) - Number(b.ano));
}

function calcularCrescimento(atual, anterior) {
    if (anterior === null || anterior === undefined) return "—";
    const delta = atual - anterior;
    if (anterior === 0 && atual > 0) return `+${atual} novo(s)`;
    if (anterior === 0 && atual === 0) return "0";
    const perc = (delta / anterior) * 100;
    const sinal = delta > 0 ? "+" : "";
    return `${sinal}${delta} (${sinal}${perc.toFixed(1)}%)`;
}

function linhaCrescimentoClasse(texto) {
    if (String(texto).startsWith("+")) return "text-emerald-400";
    if (String(texto).startsWith("-")) return "text-red-400";
    return "text-gray-400";
}

function agregarRanking(lista, campoPrincipal, campoSecundario = null) {
    const mapa = new Map();
    lista.forEach(item => {
        const nome = item[campoPrincipal] || "Não informado";
        const ano = String(item.ano || anoDadosAtivo);
        if (!mapa.has(nome)) mapa.set(nome, { nome, secundario: item[campoSecundario] || "", total: 0, porAno: {} });
        const reg = mapa.get(nome);
        reg.total++;
        if (!reg.secundario && campoSecundario) reg.secundario = item[campoSecundario] || "";
        reg.porAno[ano] = (reg.porAno[ano] || 0) + 1;
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

function melhorAnoTexto(porAno) {
    const entries = Object.entries(porAno || {}).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
    return entries.length ? `${entries[0][0]} (${entries[0][1]})` : "—";
}

function crescimentoEntidadeTexto(porAno, anos) {
    if (!anos.length) return "—";
    const primeiro = porAno?.[anos[0]] || 0;
    const ultimo = porAno?.[anos[anos.length - 1]] || 0;
    return calcularCrescimento(ultimo, primeiro);
}

async function atualizarFiltrosEntidadesRelatorio() {
    const anos = anosSelecionadosRelatorio();
    const lista = await carregarPremiadosMultianual(anos);
    const cidadeSel = document.getElementById("relFiltroCidade");
    const escolaSel = document.getElementById("relFiltroEscola");
    if (!cidadeSel || !escolaSel) return;
    const valorCidade = cidadeSel.value || "TODAS";
    const valorEscola = escolaSel.value || "TODAS";
    const cidades = Array.from(new Set(lista.map(i => i.municipio).filter(Boolean))).sort();
    cidadeSel.innerHTML = `<option value="TODAS">Todas</option>` + cidades.map(c => `<option value="${textoSeguro(c)}">${textoSeguro(c)}</option>`).join("");
    cidadeSel.value = cidades.includes(valorCidade) ? valorCidade : "TODAS";
    atualizarFiltroEscolasRelatorio(lista, valorEscola);
}

function atualizarFiltroEscolasRelatorio(listaBase = null, valorAnterior = null) {
    const escolaSel = document.getElementById("relFiltroEscola");
    if (!escolaSel) return;
    const cidade = document.getElementById("relFiltroCidade")?.value || "TODAS";
    const lista = Array.isArray(listaBase) ? listaBase : memoriaRelatoriosUltimaLista || [];
    const valor = valorAnterior || escolaSel.value || "TODAS";
    const escolas = Array.from(new Set(lista.filter(i => cidade === "TODAS" || normalizarTexto(i.municipio) === normalizarTexto(cidade)).map(i => i.escola).filter(Boolean))).sort();
    escolaSel.innerHTML = `<option value="TODAS">Todas</option>` + escolas.map(e => `<option value="${textoSeguro(e)}">${textoSeguro(e)}</option>`).join("");
    escolaSel.value = escolas.includes(valor) ? valor : "TODAS";
}

let memoriaRelatoriosUltimaLista = [];

async function gerarRelatoriosComparativos() {
    const btn = document.getElementById("btnAtualizarRelatorios");
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Carregando...'; }
        const anos = anosSelecionadosRelatorio();
        const todos = await carregarPremiadosMultianual(anos);
        memoriaRelatoriosUltimaLista = todos;
        if (document.activeElement?.id === "relAnoInicio" || document.activeElement?.id === "relAnoFim") await atualizarFiltrosEntidadesRelatorio();
        const filtrados = aplicarFiltrosRelatorio(todos);
        const porAno = agregarPorAno(filtrados, anos);
        const total = filtrados.length;
        const melhor = porAno.slice().sort((a, b) => b.total - a.total || Number(a.ano) - Number(b.ano))[0];
        const crescimentoFinal = porAno.length ? calcularCrescimento(porAno[porAno.length - 1].total, porAno[0].total) : "—";

        document.getElementById("relCardTotal").innerText = total;
        document.getElementById("relCardMelhorAno").innerText = melhor && melhor.total > 0 ? `${melhor.ano} (${melhor.total})` : "—";
        document.getElementById("relCardCrescimento").innerText = crescimentoFinal;
        document.getElementById("relCardAnos").innerText = anos.length;

        const tbodyAno = document.getElementById("tableRelEvolucao");
        if (tbodyAno) {
            let anterior = null;
            tbodyAno.innerHTML = porAno.map(l => {
                const cresc = calcularCrescimento(l.total, anterior);
                anterior = l.total;
                return `<tr class="hover:bg-gray-700/20"><td class="p-4 font-bold text-white">${l.ano}</td><td class="p-4 font-bold">${l.total}</td><td class="p-4 text-amber-400">${l.ouro}</td><td class="p-4 text-gray-300">${l.prata}</td><td class="p-4 text-orange-300">${l.bronze}</td><td class="p-4 text-blue-300">${l.mencao}</td><td class="p-4 font-bold ${linhaCrescimentoClasse(cresc)}">${cresc}</td></tr>`;
            }).join("") || `<tr><td colspan="7" class="p-6 text-center text-gray-500">Nenhum resultado encontrado no período.</td></tr>`;
        }

        const rankingCidades = agregarRanking(filtrados, "municipio").slice(0, 30);
        const tbodyCid = document.getElementById("tableRelCidades");
        if (tbodyCid) {
            tbodyCid.innerHTML = rankingCidades.map(r => {
                const cresc = crescimentoEntidadeTexto(r.porAno, anos);
                return `<tr class="hover:bg-gray-700/20"><td class="p-4 font-bold text-white">${textoSeguro(r.nome)}</td><td class="p-4 font-bold">${r.total}</td><td class="p-4">${melhorAnoTexto(r.porAno)}</td><td class="p-4 font-bold ${linhaCrescimentoClasse(cresc)}">${cresc}</td></tr>`;
            }).join("") || `<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhuma cidade com resultado no período.</td></tr>`;
        }

        const rankingEscolas = agregarRanking(filtrados, "escola", "municipio").slice(0, 50);
        const tbodyEsc = document.getElementById("tableRelEscolas");
        if (tbodyEsc) {
            tbodyEsc.innerHTML = rankingEscolas.map(r => {
                const cresc = crescimentoEntidadeTexto(r.porAno, anos);
                return `<tr class="hover:bg-gray-700/20"><td class="p-4 font-bold text-white">${textoSeguro(r.nome)}</td><td class="p-4 text-gray-400">${textoSeguro(r.secundario || "—")}</td><td class="p-4 font-bold">${r.total}</td><td class="p-4">${melhorAnoTexto(r.porAno)}</td><td class="p-4 font-bold ${linhaCrescimentoClasse(cresc)}">${cresc}</td></tr>`;
            }).join("") || `<tr><td colspan="5" class="p-6 text-center text-gray-500">Nenhuma escola com resultado no período.</td></tr>`;
        }
    } catch (erro) {
        console.error("Erro ao gerar relatórios comparativos", erro);
        alert(`Erro ao gerar relatórios comparativos.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate mr-2"></i>Atualizar relatório'; }
    }
}

// ==================== NAVEGAÇÃO ENTRE ABAS ====================
function navegarAba(abaId, botaoTarget) {
    if (!podeVerAba(abaId)) return;

    document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
    document.getElementById(`view-${abaId}`).classList.remove("hidden");

    const titulos = {
        dashboard: "Dashboard Analítico", calendario: "Calendário Oficial de Olimpíadas",
        meusresultados: "Meus Resultados", importar: "Importar Resultados", relatorios: "Relatórios Comparativos",
        alunos: "Cadastro de Alunos", usuarios: "Gerenciar Usuários e Permissões",
        olimpiadas: "Olimpíadas Cadastradas", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)",
        plataforma: "Plataforma de Ensino", monitoria: "Monitoria — Salas de Atendimento", layout: "Editor de Layout"
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
    if (abaId === "relatorios") {
        prepararTelaRelatoriosComparativos();
    }
    if (abaId === "meusresultados") {
        renderizarDashboardAluno();
    }
    if (abaId === "usuarios") {
        renderizarTabelasGerenciais();
    }
    if (abaId === "alunos") {
        popularSeletoresAlunos();
        renderizarAlunos();
    }
    if (abaId === "layout") {
        prepararEditorLayout();
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
    const divVisualizador = document.getElementById("divEscopoVisualizador");
    if (!divCidade || !divEscola) return;

    divCidade.classList.add("hidden");
    divEscola.classList.add("hidden");
    if (divVisualizador) divVisualizador.classList.add("hidden");

    if (nivel === "Gestor") {
        divCidade.classList.remove("hidden");
    } else if (nivel === "Escola" || nivel === "Aluno") {
        divEscola.classList.remove("hidden");
    } else if (nivel === "Visualizador") {
        if (divVisualizador) divVisualizador.classList.remove("hidden");
        popularEscopoVisualizadorCadastro();
    }
}

async function salvarNovoUsuario(event) {
    event.preventDefault();
    const nivel = usuarioLogado?.nivel;
    const perms = PERMISSOES[nivel];
    if (!perms?.usuarios.podeGerenciar) return;

    const nivelNovo = document.getElementById("addUserNivel").value;
    if (!perms.usuarios.niveisPermitidos.includes(nivelNovo)) return alert("Sem permissão para criar esse nível de usuário.");

    const nome = document.getElementById("addUserNome").value.trim();
    const login = document.getElementById("addUserLogin").value.trim().toLowerCase();
    const senha = SENHA_PADRAO_USUARIO;
    const email = document.getElementById("addUserEmail").value.trim().toLowerCase();
    const telefone = document.getElementById("addUserTelefone").value.trim();

    if (!nome) return alert("Informe o nome completo do usuário.");
    if (!login) return alert("Informe um login interno para organização do usuário.");
    if (!email || !email.includes("@")) return alert("Informe um e-mail válido. Esse e-mail será usado no Firebase Auth para login.");

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
    } else if (nivelNovo === "Visualizador") {
        if (nivel !== "ADM") return alert("Apenas administradores podem criar usuários Visualizadores.");
        const cidadesEscopo = valoresSelectMultiplo("addUserVisualizadorCidades");
        const escolasEscopo = valoresSelectMultiplo("addUserVisualizadorEscolas");
        if (!cidadesEscopo.length && !escolasEscopo.length) return alert("Defina pelo menos uma cidade ou escola para o escopo do Visualizador.");
        vinculoId = "";
    } else if (nivelNovo === "ADM" || nivelNovo === "Monitor") {
        if (nivel !== "ADM") return alert("Apenas administradores podem criar esse nível de usuário.");
    }

    const usuarios = getStorage("app_usuarios");
    if (usuarios.some(u => normalizarTexto(u.login) === login)) return alert("Erro: já existe um usuário com esse login.");
    if (usuarios.some(u => normalizarTexto(u.email) === normalizarTexto(email) || normalizarTexto(u.authEmail) === normalizarTexto(email) || normalizarTexto(u.emailAuth) === normalizarTexto(email))) return alert("Erro: já existe um usuário com esse e-mail/Auth.");

    let novoUsuario = {
        id: novoId(),
        login,
        senha,
        senhaPadrao: senha,
        nivel: nivelNovo,
        nome,
        email,
        authEmail: email,
        emailAuth: email,
        telefone,
        vinculoId,
        criadoEm: new Date().toISOString(),
        criadoPorId: usuarioLogado?.id || "",
        criadoPorNome: usuarioLogado?.nome || ""
    };
    if (nivelNovo === "Visualizador") {
        novoUsuario.escopoVisualizador = {
            cidadesIds: valoresSelectMultiplo("addUserVisualizadorCidades"),
            escolasIds: valoresSelectMultiplo("addUserVisualizadorEscolas")
        };
    }

    try {
        novoUsuario = await provisionarAuthUsuario(novoUsuario);
        usuarios.push(novoUsuario);
        await salvarUsuariosSistema(usuarios);
        document.getElementById("formCadUsuario").reset();
        const senhaInput = document.getElementById("addUserSenha");
        if (senhaInput) senhaInput.value = SENHA_PADRAO_USUARIO;
        ajustarCamposFormUsuario();
        renderizarTabelasGerenciais();
        alert(`Usuário criado com sucesso.\n\nLogin: ${email}\nSenha padrão: ${SENHA_PADRAO_USUARIO}`);
    } catch (erro) {
        console.error("Erro ao criar usuário no Firebase Auth", erro);
        alert(`Não foi possível criar o usuário no Firebase Auth.\n\n${traduzirErroAuth(erro)}`);
    }
}

// ==================== RESET DE SENHAS EM LOTE ====================
function niveisResetSenhaDisponiveis() {
    return ["ADM", "Gestor", "Escola", "Aluno", "Monitor", "Visualizador"];
}

function usuarioPertenceCidade(usuario, cidadeId) {
    if (!usuario || !cidadeId) return false;
    const escolas = getStorage("app_escolas", []);

    if (usuario.cidadeId && String(usuario.cidadeId) === String(cidadeId)) return true;
    if (usuario.nivel === "Gestor" && String(usuario.vinculoId || "") === String(cidadeId)) return true;

    if (usuario.nivel === "Escola" || usuario.nivel === "Aluno") {
        const escolaId = usuario.escolaId || usuario.vinculoId || "";
        const escola = escolas.find(e => String(e.id) === String(escolaId));
        return !!escola && String(escola.cidadeId) === String(cidadeId);
    }

    return false;
}

function usuarioPertenceEscola(usuario, escolaId) {
    if (!usuario || !escolaId) return false;
    return String(usuario.vinculoId || "") === String(escolaId) || String(usuario.escolaId || "") === String(escolaId);
}

function usuariosAlvoResetSenha(tipoAlvo, valorAlvo) {
    const usuarios = getStorage("app_usuarios", []);
    if (!tipoAlvo || !valorAlvo) return [];

    if (tipoAlvo === "nivel") return usuarios.filter(u => u.nivel === valorAlvo);
    if (tipoAlvo === "cidade") return usuarios.filter(u => usuarioPertenceCidade(u, valorAlvo));
    if (tipoAlvo === "escola") return usuarios.filter(u => usuarioPertenceEscola(u, valorAlvo));

    return [];
}

function textoAlvoResetSenha(tipoAlvo, valorAlvo) {
    const cidades = getStorage("app_cidades", []);
    const escolas = getStorage("app_escolas", []);
    if (tipoAlvo === "nivel") return `nível ${valorAlvo}`;
    if (tipoAlvo === "cidade") {
        const cidade = cidades.find(c => String(c.id) === String(valorAlvo));
        return cidade ? `cidade ${cidade.nome} - ${cidade.uf}` : "cidade selecionada";
    }
    if (tipoAlvo === "escola") {
        const escola = escolas.find(e => String(e.id) === String(valorAlvo));
        return escola ? `escola ${escola.nome}` : "escola selecionada";
    }
    return "alvo selecionado";
}

function atualizarOpcoesResetSenhaLote() {
    const tipo = document.getElementById("resetSenhaTipoAlvo")?.value || "nivel";
    const select = document.getElementById("resetSenhaValorAlvo");
    if (!select) return;

    const cidades = getStorage("app_cidades", []).slice().sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    const escolas = getStorage("app_escolas", []).slice().sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    const usuarios = getStorage("app_usuarios", []);

    let options = [];
    if (tipo === "nivel") {
        options = niveisResetSenhaDisponiveis().map(n => {
            const qtd = usuarios.filter(u => u.nivel === n).length;
            return { value: n, text: `${n} — ${qtd} usuário(s)` };
        });
    } else if (tipo === "cidade") {
        options = cidades.map(c => {
            const qtd = usuarios.filter(u => usuarioPertenceCidade(u, c.id)).length;
            return { value: c.id, text: `${c.nome} - ${c.uf} — ${qtd} usuário(s)` };
        });
    } else if (tipo === "escola") {
        options = escolas.map(e => {
            const cidade = cidades.find(c => c.id === e.cidadeId);
            const qtd = usuarios.filter(u => usuarioPertenceEscola(u, e.id)).length;
            return { value: e.id, text: `${e.nome}${cidade ? ` (${cidade.nome} - ${cidade.uf})` : ""} — ${qtd} usuário(s)` };
        });
    }

    select.innerHTML = '<option value="">Selecione...</option>' + options.map(o => `<option value="${textoSeguro(o.value)}">${textoSeguro(o.text)}</option>`).join("");
}

function prepararPainelResetSenhaLote() {
    const painel = document.getElementById("painelResetSenhaLote");
    if (!painel) return;
    if (usuarioLogado?.nivel === "ADM") {
        painel.classList.remove("hidden");
        atualizarOpcoesResetSenhaLote();
    } else {
        painel.classList.add("hidden");
    }
}

async function resetarSenhasEmLote(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem resetar senhas em lote.");

    const tipoAlvo = document.getElementById("resetSenhaTipoAlvo")?.value || "";
    const valorAlvo = document.getElementById("resetSenhaValorAlvo")?.value || "";
    const novaSenha = document.getElementById("resetSenhaNova")?.value || "";
    const confirmar = document.getElementById("resetSenhaConfirmar")?.value || "";

    if (!tipoAlvo || !valorAlvo) return alert("Selecione o alvo do reset.");
    if (!novaSenha.trim()) return alert("Digite a nova senha.");
    if (novaSenha.length < 6) return alert("Use uma senha com pelo menos 6 caracteres.");
    if (novaSenha !== confirmar) return alert("A confirmação da senha não confere.");

    const usuarios = getStorage("app_usuarios", []);
    const alvos = usuariosAlvoResetSenha(tipoAlvo, valorAlvo);
    if (alvos.length === 0) return alert("Nenhum usuário encontrado para este alvo.");

    const incluiUsuarioLogado = alvos.some(u => u.id === usuarioLogado?.id);
    const textoAlvo = textoAlvoResetSenha(tipoAlvo, valorAlvo);
    const avisoProprio = incluiUsuarioLogado ? "\n\nAtenção: seu próprio usuário também está dentro deste alvo." : "";
    const listaResumo = alvos.slice(0, 8).map(u => `• ${u.nome || u.login} (${u.nivel})`).join("\n");
    const extra = alvos.length > 8 ? `\n• ... e mais ${alvos.length - 8} usuário(s)` : "";

    const confirmarReset = confirm(`Você está prestes a resetar a senha de ${alvos.length} usuário(s) do alvo: ${textoAlvo}.\n\n${listaResumo}${extra}${avisoProprio}\n\nDeseja continuar?`);
    if (!confirmarReset) return;

    const idsAlvo = new Set(alvos.map(u => String(u.id)));
    const atualizados = usuarios.map(u => {
        if (!idsAlvo.has(String(u.id))) return u;
        return {
            ...u,
            senha: novaSenha,
            senhaRedefinidaEm: new Date().toISOString(),
            senhaRedefinidaPorId: usuarioLogado.id,
            senhaRedefinidaPorNome: usuarioLogado.nome || usuarioLogado.login || "Administrador"
        };
    });

    const btn = event.target?.querySelector('button[type="submit"]');
    const textoOriginal = btn?.innerHTML;
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Resetando...';
        }
        await setStorage("app_usuarios", atualizados);
        renderizarTabelasGerenciais();
        event.target.reset();
        atualizarOpcoesResetSenhaLote();
        alert(`Senha redefinida com sucesso para ${alvos.length} usuário(s).`);
    } catch (erro) {
        console.error("Erro ao resetar senhas em lote", erro);
        alert(`Não foi possível resetar as senhas no Firestore.\n\n${erro.message || erro}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = textoOriginal || '<i class="fa-solid fa-rotate-right mr-2"></i>Resetar senhas selecionadas';
        }
    }
}

// ==================== CADASTROS ADM ====================
function valoresMarcados(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}

function valorCampo(id, fallback = "") {
    const el = document.getElementById(id);
    return el ? String(el.value ?? "").trim() : fallback;
}

function alternarCampoCondicional(selectId, wrapperId, valorAtivo = "Sim") {
    const select = document.getElementById(selectId);
    const wrapper = document.getElementById(wrapperId);
    if (!select || !wrapper) return;
    const atualizar = () => {
        if (select.value === valorAtivo) wrapper.classList.remove("hidden");
        else wrapper.classList.add("hidden");
    };
    select.addEventListener("change", atualizar);
    atualizar();
}

function initFormularioOlimpiadaCompleto() {
    alternarCampoCondicional("addOliRestricaoIdade", "wrapOliIdadeMaxima", "Sim");
    alternarCampoCondicional("addOliModalidades", "wrapOliModalidadesDescricao", "Sim");
}

function montarDadosOlimpiadaFormulario() {
    const areas = valoresMarcados("addOliAreas");
    const seriesAtendidas = valoresMarcados("addOliSeriesAtendidas");
    const tiposQuestao = valoresMarcados("addOliTiposQuestao");
    const formasPagamento = valoresMarcados("addOliFormasPagamento");
    const premiosOferecidos = valoresMarcados("addOliPremios");
    const categoriasPremiacao = valoresMarcados("addOliCategoriasPremiacao");

    const possuiRestricaoIdade = valorCampo("addOliRestricaoIdade") === "Sim";
    const possuiModalidades = valorCampo("addOliModalidades") === "Sim";

    return {
        id: novoId(),

        // Campos legados usados pela plataforma atual
        nome: valorCampo("addOliNome"),
        categoria: valorCampo("addOliCategoria").toUpperCase(),
        series: seriesAtendidas.join(", "),

        // Cadastro completo
        edicao: valorCampo("addOliEdicao"),
        anoReferencia: valorCampo("addOliAnoReferencia") || anoDadosAtivo,
        areas,
        abrangencia: valorCampo("addOliAbrangencia"),
        status: valorCampo("addOliStatus"),

        organizadorPrincipal: valorCampo("addOliOrganizador"),
        siteOficial: valorCampo("addOliSite"),
        instagramOficial: valorCampo("addOliInstagram"),
        tipoEscolaElegivel: valorCampo("addOliTipoEscola"),
        inscricaoIndividual: valorCampo("addOliInscricaoIndividual"),
        escolaPrecisaInscrever: valorCampo("addOliEscolaInscricao"),

        seriesAtendidas,
        segmentoPrincipal: valorCampo("addOliSegmentoPrincipal"),
        possuiRestricaoIdade: possuiRestricaoIdade ? "Sim" : "Não",
        idadeMaxima: possuiRestricaoIdade ? valorCampo("addOliIdadeMaxima") : "",
        possuiModalidades: possuiModalidades ? "Sim" : "Não",
        modalidadesDescricao: possuiModalidades ? valorCampo("addOliModalidadesDescricao") : "",

        numeroFases: valorCampo("addOliNumeroFases"),
        tiposQuestao,
        modalidadeAplicacao: valorCampo("addOliModalidadeAplicacao"),
        duracaoProvaPrincipal: valorCampo("addOliDuracaoProva"),
        materialProvaEnviadoComo: valorCampo("addOliMaterialProva"),
        correcaoRealizadaPor: valorCampo("addOliCorrecao"),

        gratuitaParaEscolaPublica: valorCampo("addOliGratuitaPublica"),
        custoEscolaPublica: valorCampo("addOliCustoPublica"),
        custoEscolaPrivada: valorCampo("addOliCustoPrivada"),
        formasPagamento,

        premiosOferecidos,
        categoriasPremiacao,
        premiaProfessores: valorCampo("addOliPremiaProfessores"),
        premiaEscola: valorCampo("addOliPremiaEscola"),

        classificaPara: valorCampo("addOliClassificaPara"),
        preRequisitoDe: valorCampo("addOliPreRequisitoDe"),
        olimpiadaInternacionalAssociada: valorCampo("addOliInternacionalAssociada"),
        nivelFunil: valorCampo("addOliNivelFunil"),

        criadoEm: new Date().toISOString()
    };
}

function salvarNovaOlimpiada(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;

    const novaOlimpiada = montarDadosOlimpiadaFormulario();
    if (!novaOlimpiada.nome || !novaOlimpiada.categoria) return alert("Nome completo e sigla/frente são obrigatórios.");
    if (!novaOlimpiada.seriesAtendidas.length) return alert("Selecione pelo menos uma série atendida.");
    if (!novaOlimpiada.areas.length) return alert("Selecione pelo menos uma área/disciplina.");

    const olimpiadas = getStorage("app_olimpiadas");
    if (olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(novaOlimpiada.nome))) return alert(`Erro: esta olimpíada já está cadastrada no ano ${anoDadosAtivo}.`);

    olimpiadas.push(novaOlimpiada);
    setStorage("app_olimpiadas", olimpiadas);

    const form = document.getElementById("formCadOlimpiada");
    if (form) form.reset();
    initFormularioOlimpiadaCompleto();
    popularSeletores();
    renderizarTabelasGerenciais();
    alert("Olimpíada homologada com cadastro completo.");
}

function salvarNovoCronograma(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;
    const olimpiadaId = document.getElementById("addCroOlimpiadaSelect").value;
    const etapa = document.getElementById("addCroEtapa").value.trim();
    const data = document.getElementById("addCroData").value.trim();
    const segmento = document.getElementById("addCroSegmento").value.trim();
    const acao = document.getElementById("addCroAcao").value.trim();
    const infoEtapa = normalizarEtapaCronograma(etapa);
    const cronograma = getStorage("app_cronograma");
    const novo = { id: novoId(), olimpiadaId, etapa: infoEtapa.etapa, etapaCodigo: infoEtapa.etapaCodigo, etapaGrupo: infoEtapa.etapaGrupo, etapaGrupoNome: infoEtapa.etapaGrupoNome, data, segmento, acao };
    const resultado = inserirOuSubstituirEventoCronograma(cronograma, novo, null, true);
    if (resultado.cancelado) return;
    setStorage("app_cronograma", resultado.lista);
    document.getElementById("formCadCronograma").reset();
    preencherSelectEtapasCronograma();
    renderizarCronograma();
    if (resultado.substituido) alert("Evento duplicado substituído com sucesso.");
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


// ==================== CADASTRO DE ALUNOS ====================
function initAlunos() {
    const nasc = document.getElementById("addAlunoNascimento");
    if (nasc) nasc.addEventListener("change", () => atualizarIdadeAluno("addAlunoNascimento", "addAlunoIdade"));
    popularSeletoresAlunos();
}

function calcularIdadePorData(dataNascimento) {
    if (!dataNascimento) return "";
    const nasc = new Date(`${dataNascimento}T00:00:00`);
    if (Number.isNaN(nasc.getTime())) return "";
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? idade : "";
}

function atualizarIdadeAluno(inputId, outputId) {
    const idade = calcularIdadePorData(document.getElementById(inputId)?.value || "");
    const out = document.getElementById(outputId);
    if (out) out.value = idade !== "" ? `${idade} anos` : "";
}

function cpfLimpo(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor) {
    const d = cpfLimpo(valor);
    if (d.length !== 11) return valor || "";
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function escolaDoAluno(aluno) {
    const escolas = getStorage("app_escolas");
    return escolas.find(e => e.id === aluno.escolaId || normalizarTexto(e.nome) === normalizarTexto(aluno.escolaNome));
}

function cidadeDaEscola(escola) {
    const cidades = getStorage("app_cidades");
    return escola ? cidades.find(c => c.id === escola.cidadeId) : null;
}

function alunosPermitidosParaUsuario() {
    const alunos = getStorage("app_alunos", []);
    if (!usuarioLogado) return [];
    if (usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Monitor") return alunos;
    if (usuarioLogado.nivel === "Visualizador") {
        const escolaIds = idsEscolasDoEscopoVisualizador();
        return alunos.filter(a => escolaIds.includes(a.escolaId));
    }
    const escolasPermitidasIds = new Set(escolasPermitidasParaCadastroUsuario().map(e => e.id));
    return alunos.filter(a => escolasPermitidasIds.has(a.escolaId));
}

function validarDadosAluno(dados, idIgnorado = null) {
    if (!dados.nome) return "Nome completo é obrigatório.";
    if (!dados.emailInstitucional && !dados.emailPessoal) return "Preencha pelo menos um e-mail: institucional ou pessoal.";
    if (!dados.cpf || cpfLimpo(dados.cpf).length !== 11) return "CPF do aluno é obrigatório e precisa ter 11 dígitos.";
    if (!dados.dataNascimento) return "Data de nascimento é obrigatória.";
    if (!dados.sexo) return "Sexo do aluno é obrigatório.";
    if (!dados.escolaId) return "Escola é obrigatória.";
    if (!dados.serie) return "Série é obrigatória.";
    if (!dados.turnoTurma) return "Turno/turma é obrigatório.";
    if (!dados.mae && !dados.pai && !dados.responsavelAcademico) return "Preencha pelo menos um responsável: mãe, pai ou responsável acadêmico.";

    const alunos = getStorage("app_alunos", []);
    const cpf = cpfLimpo(dados.cpf);
    if (alunos.some(a => a.id !== idIgnorado && cpfLimpo(a.cpf) === cpf)) return "Já existe aluno cadastrado com este CPF.";

    if (!escolasPermitidasParaCadastroUsuario().some(e => e.id === dados.escolaId)) return "Escola fora do seu escopo de permissão.";
    return null;
}

function montarDadosAlunoDoFormulario(prefixo = "addAluno", idExistente = null) {
    const escolaId = document.getElementById(`${prefixo}EscolaSelect`)?.value || "";
    const escola = getStorage("app_escolas").find(e => e.id === escolaId);
    const cidade = cidadeDaEscola(escola);
    const dataNascimento = document.getElementById(`${prefixo}Nascimento`)?.value || "";
    return {
        id: idExistente || novoId(),
        nome: document.getElementById(`${prefixo}Nome`)?.value.trim() || "",
        emailInstitucional: document.getElementById(`${prefixo}EmailInstitucional`)?.value.trim() || "",
        emailPessoal: document.getElementById(`${prefixo}EmailPessoal`)?.value.trim() || "",
        cpf: formatarCpf(document.getElementById(`${prefixo}Cpf`)?.value.trim() || ""),
        dataNascimento,
        idade: calcularIdadePorData(dataNascimento),
        sexo: document.getElementById(`${prefixo}Sexo`)?.value || "",
        escolaId,
        escolaNome: escola?.nome || "",
        cidadeId: cidade?.id || "",
        municipio: cidade ? `${cidade.nome} - ${cidade.uf}` : "",
        serie: document.getElementById(`${prefixo}Serie`)?.value || "",
        turnoTurma: document.getElementById(`${prefixo}Turma`)?.value.trim() || "",
        contatoAluno: document.getElementById(`${prefixo}Contato`)?.value.trim() || "",
        mae: document.getElementById(`${prefixo}Mae`)?.value.trim() || "",
        pai: document.getElementById(`${prefixo}Pai`)?.value.trim() || "",
        responsavelAcademico: document.getElementById(`${prefixo}Responsavel`)?.value.trim() || "",
        contatoResponsavel: document.getElementById(`${prefixo}ContatoResponsavel`)?.value.trim() || ""
    };
}

function popularSeletoresAlunos() {
    const escolaSelect = document.getElementById("addAlunoEscolaSelect");
    const serieSelect = document.getElementById("addAlunoSerie");
    if (escolaSelect) {
        const atual = escolaSelect.value;
        const escolas = escolasPermitidasParaCadastroUsuario();
        escolaSelect.innerHTML = '<option value="">Selecione a escola...</option>' + escolas.map(e => `<option value="${textoSeguro(e.id)}">${textoSeguro(e.nome)}</option>`).join("");
        if ([...escolaSelect.options].some(opt => opt.value === atual)) escolaSelect.value = atual;
    }
    if (serieSelect) {
        const atual = serieSelect.value;
        serieSelect.innerHTML = '<option value="">Selecione a série...</option>' + SERIES_PADRAO.map(s => `<option value="${textoSeguro(s)}">${textoSeguro(s)}</option>`).join("");
        if ([...serieSelect.options].some(opt => opt.value === atual)) serieSelect.value = atual;
    }
}

function salvarNovoAluno(event) {
    event.preventDefault();
    if (!permissao("usuarios.podeGerenciar")) return alert("Sem permissão para cadastrar alunos.");
    const dados = montarDadosAlunoDoFormulario();
    const erro = validarDadosAluno(dados);
    if (erro) return alert(erro);
    const alunos = getStorage("app_alunos", []);
    alunos.push({ ...dados, criadoEm: new Date().toISOString() });
    setStorage("app_alunos", alunos);
    document.getElementById("formCadAluno")?.reset();
    atualizarIdadeAluno("addAlunoNascimento", "addAlunoIdade");
    popularSeletores();
    renderizarAlunos();
    alert("Aluno cadastrado com sucesso.");
}

function renderizarAlunos() {
    const tbody = document.getElementById("tableAlunosCorpo");
    if (!tbody) return;
    const filtro = normalizarTexto(document.getElementById("filterAlunoNome")?.value || "");
    let alunos = alunosPermitidosParaUsuario();
    if (filtro) alunos = alunos.filter(a => normalizarTexto(`${a.nome} ${a.cpf} ${a.emailInstitucional} ${a.emailPessoal}`).includes(filtro));
    alunos.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    tbody.innerHTML = alunos.map(a => {
        const responsavel = a.mae || a.pai || a.responsavelAcademico || "—";
        return `<tr class="hover:bg-gray-800/60 transition">
            <td class="p-4"><div class="font-bold text-white">${textoSeguro(a.nome)}</div><div class="text-[11px] text-gray-500">${textoSeguro(a.emailInstitucional || a.emailPessoal || "sem e-mail")}</div></td>
            <td class="p-4"><div class="font-mono text-xs text-gray-300">${textoSeguro(a.cpf)}</div><div class="text-[11px] text-blue-400 font-bold">${textoSeguro(a.idade || calcularIdadePorData(a.dataNascimento) || "—")} anos</div></td>
            <td class="p-4"><div class="font-semibold text-gray-200">${textoSeguro(a.escolaNome)}</div><div class="text-[11px] text-gray-500">${textoSeguro(a.serie)} · ${textoSeguro(a.turnoTurma)} · ${textoSeguro(a.municipio)}</div></td>
            <td class="p-4"><div class="text-gray-300">${textoSeguro(responsavel)}</div><div class="text-[11px] text-gray-500">${textoSeguro(a.contatoResponsavel || a.contatoAluno || "sem contato")}</div></td>
            <td class="p-4 text-right"><button onclick="editarAluno('${textoSeguro(a.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td>
        </tr>`;
    }).join("") || '<tr><td colspan="5" class="p-8 text-center text-gray-500 text-sm">Nenhum aluno cadastrado neste ano.</td></tr>';
}

function editarAluno(id) {
    const alunos = getStorage("app_alunos", []);
    const atual = alunos.find(a => a.id === id);
    if (!atual) return alert("Aluno não encontrado.");
    if (!alunosPermitidosParaUsuario().some(a => a.id === id)) return alert("Você não tem permissão para editar este aluno.");
    const escolas = escolasPermitidasParaCadastroUsuario().map(e => ({ value: e.id, text: e.nome }));
    abrirModalEdicao({
        titulo: "Editar aluno",
        campos: [
            { nome: "nome", label: "Nome completo", valor: atual.nome || "" },
            { nome: "emailInstitucional", label: "E-mail institucional", tipo: "email", valor: atual.emailInstitucional || "" },
            { nome: "emailPessoal", label: "E-mail pessoal", tipo: "email", valor: atual.emailPessoal || "" },
            { nome: "cpf", label: "CPF do aluno", valor: atual.cpf || "" },
            { nome: "dataNascimento", label: "Data de nascimento", tipo: "date", valor: atual.dataNascimento || "" },
            { nome: "sexo", label: "Sexo", tipo: "select", valor: atual.sexo || "", options: SEXOS_ALUNO_PADRAO },
            { nome: "escolaId", label: "Escola", tipo: "select", valor: atual.escolaId || "", options: escolas },
            { nome: "serie", label: "Série", tipo: "select", valor: atual.serie || "", options: SERIES_PADRAO },
            { nome: "turnoTurma", label: "Turno / Turma", valor: atual.turnoTurma || "" },
            { nome: "contatoAluno", label: "Contato do aluno", valor: atual.contatoAluno || "" },
            { nome: "mae", label: "Nome completo da mãe", valor: atual.mae || "" },
            { nome: "pai", label: "Nome completo do pai", valor: atual.pai || "" },
            { nome: "responsavelAcademico", label: "Responsável acadêmico", valor: atual.responsavelAcademico || "" },
            { nome: "contatoResponsavel", label: "Contato do pai / responsável", valor: atual.contatoResponsavel || "" }
        ],
        onSalvar: (d) => {
            const escola = getStorage("app_escolas").find(e => e.id === d.escolaId);
            const cidade = cidadeDaEscola(escola);
            const dados = {
                ...atual,
                nome: d.nome.trim(),
                emailInstitucional: d.emailInstitucional.trim(),
                emailPessoal: d.emailPessoal.trim(),
                cpf: formatarCpf(d.cpf),
                dataNascimento: d.dataNascimento,
                idade: calcularIdadePorData(d.dataNascimento),
                sexo: d.sexo,
                escolaId: d.escolaId,
                escolaNome: escola?.nome || "",
                cidadeId: cidade?.id || "",
                municipio: cidade ? `${cidade.nome} - ${cidade.uf}` : "",
                serie: d.serie,
                turnoTurma: d.turnoTurma.trim(),
                contatoAluno: d.contatoAluno.trim(),
                mae: d.mae.trim(),
                pai: d.pai.trim(),
                responsavelAcademico: d.responsavelAcademico.trim(),
                contatoResponsavel: d.contatoResponsavel.trim(),
                atualizadoEm: new Date().toISOString()
            };
            const erro = validarDadosAluno(dados, id);
            if (erro) return alert(erro), false;
            const lista = getStorage("app_alunos", []);
            const idx = lista.findIndex(a => a.id === id);
            lista[idx] = dados;
            setStorage("app_alunos", lista);
            popularSeletores();
            renderizarAlunos();
            renderizarResultadosImportacao();
            alert("Aluno atualizado com sucesso.");
        },
        onApagar: () => excluirAluno(id)
    });
}

function excluirAluno(id) {
    const alunos = getStorage("app_alunos", []);
    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return alert("Aluno não encontrado.");
    if (!alunosPermitidosParaUsuario().some(a => a.id === id)) return alert("Você não tem permissão para apagar este aluno.");
    if (!confirmarExclusao("o aluno", aluno.nome)) return;
    setStorage("app_alunos", alunos.filter(a => a.id !== id));
    popularSeletores();
    renderizarAlunos();
}

function initDragAndDropAlunos() {
    const dropZone = document.getElementById("dropZoneAlunos");
    const fileInput = document.getElementById("fileInputAlunos");
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("border-emerald-500"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-emerald-500"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-emerald-500");
        if (e.dataTransfer.files.length) processarPlanilhaAlunos(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => { if (e.target.files.length) processarPlanilhaAlunos(e.target.files[0]); });
}

function montarAlunoDaLinhaPlanilha(linha, nl, erros) {
    const nome = lerLinhaPlanilha(linha, ["Nome completo", "Nome do aluno", "Aluno"], "");
    const emailInstitucional = lerLinhaPlanilha(linha, ["Email institucional", "E-mail institucional"], "");
    const emailPessoal = lerLinhaPlanilha(linha, ["Email pessoal", "E-mail pessoal"], "");
    const cpf = formatarCpf(lerLinhaPlanilha(linha, ["CPF do aluno", "CPF"], ""));
    const dataNascimentoRaw = lerLinhaPlanilha(linha, ["Data de nascimento", "Nascimento"], "");
    const dataNascimento = normalizarDataPlanilha(dataNascimentoRaw);
    const sexo = validarOpcaoLista(lerLinhaPlanilha(linha, ["Sexo"], ""), SEXOS_ALUNO_PADRAO, "Sexo", erros, nl, true);
    const escolaNome = lerLinhaPlanilha(linha, ["Escola", "Qual escola estuda"], "");
    const serie = validarOpcaoLista(lerLinhaPlanilha(linha, ["Série", "Serie"], ""), SERIES_PADRAO, "Série", erros, nl, true);
    const turnoTurma = lerLinhaPlanilha(linha, ["Turno/Turma", "Turno / Turma", "Turma"], "");
    const escola = escolasPermitidasParaCadastroUsuario().find(e => normalizarTexto(e.nome) === normalizarTexto(escolaNome));
    const cidade = cidadeDaEscola(escola);
    const aluno = {
        id: novoId(), nome, emailInstitucional, emailPessoal, cpf, dataNascimento,
        idade: calcularIdadePorData(dataNascimento), sexo,
        escolaId: escola?.id || "", escolaNome: escola?.nome || escolaNome,
        cidadeId: cidade?.id || "", municipio: cidade ? `${cidade.nome} - ${cidade.uf}` : "",
        serie, turnoTurma,
        contatoAluno: lerLinhaPlanilha(linha, ["Contato do aluno"], ""),
        mae: lerLinhaPlanilha(linha, ["Nome completo da mãe", "Nome da mãe", "Mãe"], ""),
        pai: lerLinhaPlanilha(linha, ["Nome completo do pai", "Nome do pai", "Pai"], ""),
        responsavelAcademico: lerLinhaPlanilha(linha, ["Responsável acadêmico", "Responsavel academico"], ""),
        contatoResponsavel: lerLinhaPlanilha(linha, ["Contato do pai/responsável", "Contato do pai", "Contato do responsável"], ""),
        origemCadastro: "importacao_xlsx", criadoEm: new Date().toISOString()
    };
    if (!nome) erros.push(`Linha ${nl}: Nome completo é obrigatório.`);
    if (!emailInstitucional && !emailPessoal) erros.push(`Linha ${nl}: informe e-mail institucional ou pessoal.`);
    if (!cpf || cpfLimpo(cpf).length !== 11) erros.push(`Linha ${nl}: CPF inválido ou vazio.`);
    if (!dataNascimento) erros.push(`Linha ${nl}: Data de nascimento inválida ou vazia.`);
    if (!escola) erros.push(`Linha ${nl}: escola não cadastrada ou fora do seu escopo (${escolaNome}).`);
    if (!turnoTurma) erros.push(`Linha ${nl}: Turno/Turma é obrigatório.`);
    if (!aluno.mae && !aluno.pai && !aluno.responsavelAcademico) erros.push(`Linha ${nl}: preencha mãe, pai ou responsável acadêmico.`);
    return aluno;
}

function normalizarDataPlanilha(valor) {
    if (!valor) return "";
    if (typeof valor === "number") {
        const parsed = XLSX.SSF.parse_date_code(valor);
        if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
    const s = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return "";
}

function processarPlanilhaAlunos(arquivo) {
    if (!permissao("usuarios.podeGerenciar")) return alert("Sem permissão para importar alunos.");
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            const erros = [];
            const alunos = getStorage("app_alunos", []);
            let inseridos = 0, substituidos = 0;
            linhas.forEach((linha, idx) => {
                const nl = idx + 2;
                if (!lerLinhaPlanilha(linha, ["Nome completo", "Nome do aluno", "Aluno"], "") && !lerLinhaPlanilha(linha, ["CPF do aluno", "CPF"], "")) return;
                const antes = erros.length;
                const aluno = montarAlunoDaLinhaPlanilha(linha, nl, erros);
                if (erros.length > antes) return;
                const erroValidacao = validarDadosAluno(aluno, null);
                if (erroValidacao && !erroValidacao.includes("Já existe")) { erros.push(`Linha ${nl}: ${erroValidacao}`); return; }
                const idxExistente = alunos.findIndex(a => cpfLimpo(a.cpf) === cpfLimpo(aluno.cpf));
                if (idxExistente >= 0) {
                    aluno.id = alunos[idxExistente].id;
                    aluno.atualizadoEm = new Date().toISOString();
                    alunos[idxExistente] = { ...alunos[idxExistente], ...aluno };
                    substituidos++;
                } else {
                    alunos.push(aluno);
                    inseridos++;
                }
            });
            setStorage("app_alunos", alunos);
            popularSeletores();
            renderizarAlunos();
            if (document.getElementById("fileInputAlunos")) document.getElementById("fileInputAlunos").value = "";
            const resumo = `Importação de alunos concluída para ${anoDadosAtivo}.\n✅ ${inseridos} inseridos\n🔁 ${substituidos} atualizados por CPF`;
            if (erros.length) alert(`${resumo}\n⚠️ ${erros.length} erros:\n\n${erros.slice(0, 15).join("\n")}`);
            else alert(`${resumo}\n\nDados salvos no Firestore.`);
        } catch (err) {
            console.error("Erro ao importar alunos", err);
            alert(`Erro ao processar a planilha de alunos.\n\n${err.message || err}`);
        }
    };
    leitor.readAsArrayBuffer(arquivo);
}

async function downloadAlunosTemplate() {
    if (!bibliotecaExcelJSPresente()) return alert("Biblioteca ExcelJS não carregou. Atualize a página com Ctrl + F5 e tente novamente.");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Avance Olímpico";
    workbook.created = new Date();
    const ws = workbook.addWorksheet("CadastroAlunos");
    ws.columns = [
        { header: "Nome completo", key: "nome", width: 36 },
        { header: "Email institucional", key: "emailInst", width: 32 },
        { header: "Email pessoal", key: "emailPessoal", width: 32 },
        { header: "CPF do aluno", key: "cpf", width: 18 },
        { header: "Data de nascimento", key: "nascimento", width: 18 },
        { header: "Sexo", key: "sexo", width: 16 },
        { header: "Escola", key: "escola", width: 42 },
        { header: "Série", key: "serie", width: 20 },
        { header: "Turno/Turma", key: "turma", width: 20 },
        { header: "Contato do aluno", key: "contatoAluno", width: 22 },
        { header: "Nome completo da mãe", key: "mae", width: 34 },
        { header: "Nome completo do pai", key: "pai", width: 34 },
        { header: "Responsável acadêmico", key: "responsavel", width: 34 },
        { header: "Contato do pai/responsável", key: "contatoResp", width: 26 }
    ];
    const escolas = escolasPermitidasParaCadastroUsuario().map(e => e.nome);
    ws.addRow({ nome: "Maria Exemplo da Silva", emailInst: "maria@escola.edu.br", cpf: "000.000.000-00", nascimento: "2010-05-20", sexo: "Feminino", escola: escolas[0] || "Nome da Escola", serie: "8º Ano EF", turma: "Manhã / 8º A", mae: "Nome da Mãe", contatoResp: "(86) 99999-9999" });
    for (let i = 0; i < 199; i++) ws.addRow({});
    estilizarCabecalhoTemplate(ws, ws.columns.length);
    const listas = obterOuCriarAbaListas(workbook);
    const rangeSexos = escreverListaValidacao(listas, "A", "Sexos", SEXOS_ALUNO_PADRAO);
    const rangeEscolas = escreverListaValidacao(listas, "B", "Escolas", escolas);
    const rangeSeries = escreverListaValidacao(listas, "C", "Séries", SERIES_PADRAO);
    aplicarListaSuspensa(ws, "F", 2, 201, rangeSexos, "Escolha o sexo do aluno.");
    aplicarListaSuspensa(ws, "G", 2, 201, rangeEscolas, "Escolha uma escola já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "H", 2, 201, rangeSeries, "Escolha a série da lista.");
    ws.getColumn("E").numFmt = "yyyy-mm-dd";
    await baixarWorkbookExcelJS(workbook, `modelo_cadastro_alunos_${anoDadosAtivo}.xlsx`);
}

function liberarResultadoManual() {
    ["addResAluno", "addResCidadeSelect", "addResEscolaSelect", "addResSerieSelect"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
}

function preencherResultadoPorAlunoSelecionado() {
    const alunoId = document.getElementById("addResAlunoSelect")?.value || "";
    liberarResultadoManual();
    if (!alunoId) return;
    const aluno = getStorage("app_alunos", []).find(a => a.id === alunoId);
    if (!aluno) return;
    const escola = escolaDoAluno(aluno);
    const cidade = cidadeDaEscola(escola);
    const inputAluno = document.getElementById("addResAluno");
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    const serieSelect = document.getElementById("addResSerieSelect");
    if (inputAluno) inputAluno.value = aluno.nome || "";
    if (cidadeSelect && cidade) cidadeSelect.value = `${cidade.nome} - ${cidade.uf}`;
    popularSeletoresResultadosManuais();
    if (cidadeSelect && cidade) cidadeSelect.value = `${cidade.nome} - ${cidade.uf}`;
    if (escolaSelect && escola) escolaSelect.value = escola.nome;
    if (serieSelect && aluno.serie) serieSelect.value = aluno.serie;
    ["addResAluno", "addResCidadeSelect", "addResEscolaSelect"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
    });
}


// ==================== USUÁRIO DE ALUNO E SENHA ====================
function alunoJaTemUsuario(aluno) {
    const cpf = cpfLimpo(aluno?.cpf || "");
    const usuarios = getStorage("app_usuarios", []);
    return usuarios.some(u => (u.alunoId && u.alunoId === aluno?.id) || cpfLimpo(u.login) === cpf);
}

function textoAlunoParaUsuario(aluno) {
    const escola = escolaDoAluno(aluno);
    const cpf = aluno?.cpf || "sem CPF";
    const serie = aluno?.serie || "sem série";
    const escolaNome = escola?.nome || aluno?.escolaNome || "sem escola";
    const status = alunoJaTemUsuario(aluno) ? " — usuário já existe" : "";
    return `${aluno?.nome || "Aluno sem nome"} — CPF: ${cpf} — ${escolaNome} — ${serie}${status}`;
}

function popularSelectAlunoParaUsuario() {
    const select = document.getElementById("selectAlunoParaUsuario");
    if (!select) return;
    const valorAtual = select.value;
    const alunos = alunosPermitidosParaUsuario().slice().sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    select.innerHTML = '<option value="">Selecione um aluno cadastrado...</option>' + alunos.map(a => `<option value="${textoSeguro(a.id)}">${textoSeguro(textoAlunoParaUsuario(a))}</option>`).join("");
    if ([...select.options].some(opt => opt.value === valorAtual)) select.value = valorAtual;
}

async function criarUsuarioAlunoSelecionado() {
    if (!permissao("usuarios.podeGerenciar")) return alert("Sem permissão para criar usuários.");
    const alunoId = document.getElementById("selectAlunoParaUsuario")?.value || "";
    if (!alunoId) return alert("Selecione um aluno cadastrado.");
    const aluno = alunosPermitidosParaUsuario().find(a => a.id === alunoId);
    if (!aluno) return alert("Aluno não encontrado ou fora do seu escopo.");
    const cpf = cpfLimpo(aluno.cpf);
    if (!cpf) return alert("Este aluno não tem CPF válido cadastrado.");

    const usuarios = getStorage("app_usuarios", []);
    if (usuarios.some(u => (u.alunoId && u.alunoId === aluno.id) || cpfLimpo(u.login) === cpf)) {
        return alert("Este aluno já possui usuário criado ou já existe um login com este CPF.");
    }

    const escola = escolaDoAluno(aluno);
    const cidade = cidadeDaEscola(escola);
    if (!escola) return alert("O aluno precisa estar vinculado a uma escola para criar usuário.");

    const emailAluno = String(aluno.emailInstitucional || aluno.emailPessoal || "").trim().toLowerCase();
    if (!emailAluno || !emailAluno.includes("@")) return alert("Este aluno precisa ter e-mail institucional ou pessoal válido. O e-mail será usado como login no Firebase Auth.");

    let novoUsuario = {
        id: novoId(),
        login: cpf,
        senha: SENHA_PADRAO_USUARIO,
        senhaPadrao: SENHA_PADRAO_USUARIO,
        nivel: "Aluno",
        nome: aluno.nome,
        email: emailAluno,
        authEmail: emailAluno,
        emailAuth: emailAluno,
        telefone: aluno.contatoAluno || aluno.contatoResponsavel || "",
        vinculoId: escola.id,
        escolaId: escola.id,
        cidadeId: cidade?.id || aluno.cidadeId || "",
        alunoId: aluno.id,
        alunoCpf: aluno.cpf || "",
        criadoEm: new Date().toISOString(),
        criadoPorId: usuarioLogado?.id || "",
        criadoPorNome: usuarioLogado?.nome || "",
        origem: "cadastro_aluno"
    };

    try {
        novoUsuario = await provisionarAuthUsuario(novoUsuario);
        usuarios.push(novoUsuario);
        await setStorage("app_usuarios", usuarios);
        renderizarTabelasGerenciais();
        popularSelectAlunoParaUsuario();
        alert(`Usuário criado com sucesso.\n\nLogin: ${emailAluno}\nSenha padrão: ${SENHA_PADRAO_USUARIO}`);
    } catch (erro) {
        console.error("Erro ao criar usuário de aluno no Firebase Auth", erro);
        alert(`Não foi possível criar o usuário do aluno no Firebase Auth.\n\n${traduzirErroAuth(erro)}`);
    }
}

function abrirModalMinhaSenha() {
    if (!usuarioLogado) return alert("Faça login para alterar sua senha.");
    abrirModalEdicao({
        titulo: "Alterar minha senha",
        campos: [
            { nome: "senhaAtual", label: "Senha atual", tipo: "password", valor: "" },
            { nome: "novaSenha", label: "Nova senha", tipo: "password", valor: "" },
            { nome: "confirmarSenha", label: "Confirmar nova senha", tipo: "password", valor: "" }
        ],
        onSalvar: (d) => {
            if (!d.senhaAtual || !d.novaSenha || !d.confirmarSenha) return alert("Preencha todos os campos."), false;
            if (String(d.senhaAtual) !== String(usuarioLogado.senha)) return alert("Senha atual incorreta."), false;
            if (String(d.novaSenha).length < 6) return alert("A nova senha precisa ter pelo menos 6 caracteres."), false;
            if (String(d.novaSenha) !== String(d.confirmarSenha)) return alert("A confirmação não confere com a nova senha."), false;
            const usuarios = getStorage("app_usuarios", []);
            const idx = usuarios.findIndex(u => u.id === usuarioLogado.id);
            if (idx === -1) return alert("Usuário não encontrado no banco."), false;
            usuarios[idx] = { ...usuarios[idx], senha: String(d.novaSenha), senhaAlteradaEm: new Date().toISOString() };
            usuarioLogado = usuarios[idx];
            setStorage("app_usuarios", usuarios);
            alert("Senha alterada com sucesso.");
        }
    });
}

function resultadosDoAlunoLogado() {
    if (!usuarioLogado || usuarioLogado.nivel !== "Aluno") return [];
    const alunoId = usuarioLogado.alunoId || "";
    const loginCpf = cpfLimpo(usuarioLogado.login || usuarioLogado.alunoCpf || "");
    const alunoCadastro = alunoId ? getStorage("app_alunos", []).find(a => a.id === alunoId) : null;
    const cpfCadastro = cpfLimpo(alunoCadastro?.cpf || "");
    const escolaId = usuarioLogado.escolaId || usuarioLogado.vinculoId || alunoCadastro?.escolaId || "";
    const escola = getStorage("app_escolas", []).find(e => e.id === escolaId);
    const escolaNome = escola?.nome || alunoCadastro?.escolaNome || "";
    return (dadosTrabalho || []).filter(r => {
        if (alunoId && r.alunoId === alunoId) return true;
        const cpfResultado = cpfLimpo(r.alunoCpf || "");
        if (cpfResultado && (cpfResultado === loginCpf || cpfResultado === cpfCadastro)) return true;
        if (alunoCadastro && normalizarTexto(r.aluno) === normalizarTexto(alunoCadastro.nome) && normalizarTexto(r.escola) === normalizarTexto(escolaNome)) return true;
        return false;
    });
}

function renderizarDashboardAluno() {
    const tbody = document.getElementById("tableAlunoResultadosCorpo");
    if (!tbody) return;
    if (!usuarioLogado || usuarioLogado.nivel !== "Aluno") {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500 text-sm">Este painel é exibido para usuários do nível Aluno.</td></tr>';
        return;
    }
    const resultados = resultadosDoAlunoLogado().slice().sort((a, b) => String(a.olimpiada || "").localeCompare(String(b.olimpiada || ""), "pt-BR"));
    const total = resultados.length;
    const ouro = resultados.filter(r => normalizarTexto(r.premio).includes("ouro")).length;
    const prataBronze = resultados.filter(r => ["prata", "bronze"].some(p => normalizarTexto(r.premio).includes(p))).length;
    const olimpiadas = new Set(resultados.map(r => r.olimpiada).filter(Boolean)).size;
    const setText = (id, valor) => { const el = document.getElementById(id); if (el) el.innerText = valor; };
    setText("alunoDashTotal", total);
    setText("alunoDashOuro", ouro);
    setText("alunoDashPrataBronze", prataBronze);
    setText("alunoDashOlimpiadas", olimpiadas);
    const info = document.getElementById("alunoDashInfo");
    if (info) info.innerText = `Ano ${anoDadosAtivo} · ${usuarioLogado.nome}`;
    tbody.innerHTML = resultados.map(r => `
        <tr class="hover:bg-gray-800/60 transition">
            <td class="p-4 font-bold text-white">${textoSeguro(r.olimpiada)}</td>
            <td class="p-4"><span class="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">${textoSeguro(r.premio)}</span></td>
            <td class="p-4 text-gray-300">${textoSeguro(r.serie || "—")}</td>
            <td class="p-4 text-gray-300">${textoSeguro(r.escola || "—")}</td>
            <td class="p-4 text-gray-400">${textoSeguro(r.municipio || "—")}</td>
        </tr>
    `).join("") || '<tr><td colspan="5" class="p-8 text-center text-gray-500 text-sm">Nenhum resultado vinculado ao seu cadastro neste ano.</td></tr>';
}

// ==================== RESULTADO MANUAL ====================
function initResultadoManual() {
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    const alunoSelect = document.getElementById("addResAlunoSelect");
    if (alunoSelect) alunoSelect.addEventListener("change", preencherResultadoPorAlunoSelecionado);
    if (cidadeSelect) cidadeSelect.addEventListener("change", popularSeletoresResultadosManuais);
    if (escolaSelect) escolaSelect.addEventListener("change", preencherCidadePelaEscolaManual);

    const formManual = document.getElementById("formResultadoManual");
    if (formManual) {
        formManual.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!permissao("resultados.podeEditar")) return alert("Sem permissão para adicionar resultados.");

            const alunoSelect = document.getElementById("addResAlunoSelect");
            const alunoIdSelecionado = alunoSelect?.value || "";
            const alunoObjSelecionado = alunoIdSelecionado ? getStorage("app_alunos").find(a => a.id === alunoIdSelecionado) : null;
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

            gravarResultadoComSobrescrita({ aluno, alunoId: alunoObjSelecionado?.id || "", alunoCpf: alunoObjSelecionado?.cpf || "", escola, municipio, olimpiada, serie, premio });
            salvarPremiados();
            popularSeletores();
            renderizarPlataformaDashboard();
            renderizarResultadosImportacao();
            renderizarDashboardAluno();
            formManual.reset();
            liberarResultadoManual();
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

    if (alunoSelect) {
        const valorAtualAluno = alunoSelect.value;
        const alunos = alunosPermitidosParaUsuario();
        alunoSelect.innerHTML = '<option value="">Digitação manual / aluno não cadastrado</option>' + alunos
            .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
            .map(a => `<option value="${textoSeguro(a.id)}">${textoSeguro(a.nome)} — ${textoSeguro(a.cpf || "sem CPF")}</option>`).join("");
        if ([...alunoSelect.options].some(opt => opt.value === valorAtualAluno)) alunoSelect.value = valorAtualAluno;
    }

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

function chaveEventoCronograma(evento) {
    const info = normalizarEtapaCronograma(evento?.etapa || evento?.etapaCodigo || "");
    const etapaChave = info.etapaCodigo || normalizarTexto(info.etapa || evento?.etapa || "");
    return `${String(evento?.olimpiadaId || "")}|${etapaChave}`;
}

function inserirOuSubstituirEventoCronograma(listaAtual, novoEvento, idIgnorado = null, pedirConfirmacao = true) {
    const chaveNova = chaveEventoCronograma(novoEvento);
    const duplicado = listaAtual.find(item => item.id !== idIgnorado && chaveEventoCronograma(item) === chaveNova);
    if (duplicado && pedirConfirmacao) {
        const olimpiada = getStorage("app_olimpiadas").find(o => o.id === novoEvento.olimpiadaId);
        const nomeOlimpiada = olimpiada?.nome || "Olimpíada selecionada";
        const ok = confirm(
            `Já existe um evento cadastrado para esta mesma olimpíada e mesma etapa.\n\n` +
            `Olimpíada: ${nomeOlimpiada}\n` +
            `Etapa: ${novoEvento.etapa}\n` +
            `Data atual cadastrada: ${duplicado.data || "não informada"}\n\n` +
            `Se você continuar, o evento existente será substituído por este novo registro. Deseja substituir?`
        );
        if (!ok) return { lista: listaAtual, cancelado: true, substituido: false };
    }

    let eventoFinal = { ...novoEvento };
    if (duplicado && !idIgnorado) eventoFinal.id = duplicado.id;

    const listaSemAntigos = listaAtual.filter(item => item.id !== eventoFinal.id && (!duplicado || item.id !== duplicado.id));
    listaSemAntigos.push(eventoFinal);
    return { lista: listaSemAntigos, cancelado: false, substituido: !!duplicado };
}

function parseDataBr(dataStr) {
    const texto = String(dataStr || "");
    const regex = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
    const achados = [...texto.matchAll(regex)];
    if (!achados.length) return null;

    const anoReferencia = achados.map(m => m[3]).find(Boolean);
    const datas = achados.map(m => {
        let ano = m[3] || anoReferencia || String(new Date().getFullYear());
        if (ano.length === 2) ano = `20${ano}`;
        const dia = Number(m[1]);
        const mes = Number(m[2]) - 1;
        const data = new Date(Number(ano), mes, dia, 12, 0, 0, 0);
        return Number.isNaN(data.getTime()) ? null : data;
    }).filter(Boolean);

    if (!datas.length) return null;
    return { inicio: datas[0], fim: datas[datas.length - 1] };
}

function classificarTemporalCronograma(evento) {
    const periodo = parseDataBr(evento?.data);
    if (!periodo) return { codigo: "semdata", ordem: 2, label: "Data a confirmar", classe: "text-gray-400", dataBase: new Date(8640000000000000) };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 30);

    const inicio = new Date(periodo.inicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(periodo.fim || periodo.inicio);
    fim.setHours(23, 59, 59, 999);

    if (fim < hoje) return { codigo: "passado", ordem: 3, label: "Já aconteceu", classe: "text-gray-500", dataBase: inicio };
    if (inicio <= limite) return { codigo: "proximo", ordem: 0, label: "Próximos 30 dias", classe: "text-emerald-400", dataBase: inicio };
    return { codigo: "futuro", ordem: 1, label: "Futuro", classe: "text-blue-400", dataBase: inicio };
}

function ordenarCronogramaPorModo(lista) {
    const modo = document.getElementById("filterCronogramaModoExibicao")?.value || "ETAPAS";
    if (modo !== "DATA") return lista;

    return [...lista].sort((a, b) => {
        const ca = classificarTemporalCronograma(a);
        const cb = classificarTemporalCronograma(b);
        if (ca.ordem !== cb.ordem) return ca.ordem - cb.ordem;
        if (ca.codigo === "passado" && cb.codigo === "passado") return cb.dataBase - ca.dataBase;
        return ca.dataBase - cb.dataBase;
    });
}

function badgeTemporalCronograma(evento) {
    const modo = document.getElementById("filterCronogramaModoExibicao")?.value || "ETAPAS";
    if (modo !== "DATA") return "";
    const status = classificarTemporalCronograma(evento);
    return `<div class="mt-1 text-[10px] uppercase tracking-wider font-bold ${status.classe}">${textoSeguro(status.label)}</div>`;
}

// ==================== RENDERS COMPONENTES ====================
function renderizarCronograma() {
    preencherFiltrosCronograma();
    const cronograma = getStorage("app_cronograma");
    const olimpiadas = getStorage("app_olimpiadas");
    const tbody = document.getElementById("tableCronogramaCorpo");
    if (!tbody) return;
    const podeEditar = permissao("calendario.podeEditar");
    const filtroGrupo = document.getElementById("filterCronogramaGrupoEtapa")?.value || "TODOS";
    const filtroEtapa = document.getElementById("filterCronogramaEtapa")?.value || "TODOS";

    const cronogramaFiltrado = ordenarCronogramaPorModo(cronograma.filter(c => {
        const info = normalizarEtapaCronograma(c.etapa);
        const porGrupo = filtroGrupo === "TODOS" ||
            (filtroGrupo === "NAO_PADRONIZADA" ? !info.padronizada : info.etapaGrupo === filtroGrupo);
        const porEtapa = filtroEtapa === "TODOS" || normalizarTexto(info.etapa) === normalizarTexto(filtroEtapa);
        return porGrupo && porEtapa;
    }));

    if (!cronogramaFiltrado.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500 text-sm">Nenhum evento encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = cronogramaFiltrado.map(c => {
        const oli = olimpiadas.find(o => o.id === c.olimpiadaId);
        const temporal = classificarTemporalCronograma(c);
        const rowExtra = temporal.codigo === "passado" ? " opacity-70" : "";
        return `
            <tr class="hover:bg-gray-800/40 transition${rowExtra}">
                <td class="p-4 font-bold text-white">${oli ? textoSeguro(oli.nome) : "Desconhecida"}</td>
                <td class="p-4 text-xs font-semibold">${etapaVisualCronograma(c)}</td>
                <td class="p-4 text-amber-400 font-mono text-xs"><i class="fa-regular fa-clock mr-1"></i> ${textoSeguro(c.data)}${badgeTemporalCronograma(c)}</td>
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
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(o.id)}</td><td class="p-4 font-bold text-white">${textoSeguro(o.nome)}</td><td class="p-4 text-blue-400 font-mono font-semibold">${textoSeguro(o.categoria)}</td><td class="p-4 text-gray-400 font-medium">${textoSeguro(o.series)}</td><td class="p-4 text-right">${podeEditar ? `<button onclick="editarOlimpiada('${textoSeguro(o.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-eye mr-1"></i> Ver / editar</button>` : ""}</td></tr>
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
            } else if (u.nivel === "Visualizador") {
                const escopo = u.escopoVisualizador || {};
                const qtdCidades = Array.isArray(escopo.cidadesIds) ? escopo.cidadesIds.length : 0;
                const qtdEscolas = Array.isArray(escopo.escolasIds) ? escopo.escolasIds.length : 0;
                descVinculo = `Visualização: ${qtdCidades} cidade(s), ${qtdEscolas} escola(s)`;
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
    preencherSelectEtapasCronograma();
    preencherFiltrosCronograma();
    if (document.getElementById("addUserCidadeSelect")) {
        document.getElementById("addUserCidadeSelect").innerHTML = '<option value="">Selecione a cidade polo...</option>' + cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
    }
    if (document.getElementById("addUserEscolaSelect")) {
        const escolasFiltradas = escolasPermitidasParaCadastroUsuario();
        document.getElementById("addUserEscolaSelect").innerHTML = '<option value="">Selecione a unidade escolar...</option>' + escolasFiltradas.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
    }
    popularSelectAlunoParaUsuario();
    popularEscopoVisualizadorCadastro();
    prepararPainelResetSenhaLote();
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
    const alunoSelect = document.getElementById("addResAlunoSelect");


    if (alunoSelect) {
        const valorAtualAluno = alunoSelect.value;
        const alunos = alunosPermitidosParaUsuario();
        alunoSelect.innerHTML = '<option value="">Digitação manual / aluno não cadastrado</option>' + alunos
            .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
            .map(a => `<option value="${textoSeguro(a.id)}">${textoSeguro(a.nome)} — ${textoSeguro(a.cpf || "sem CPF")}</option>`).join("");
        if ([...alunoSelect.options].some(opt => opt.value === valorAtualAluno)) alunoSelect.value = valorAtualAluno;
    }

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
    } else if (usuarioLogado?.nivel === "Visualizador") {
        const escopo = escopoVisualizadorUsuario();
        const escolaIds = idsEscolasDoEscopoVisualizador();
        escolas = escolas.filter(e => escolaIds.includes(e.id));
        cidades = cidades.filter(c => (escopo?.cidadesIds || []).includes(c.id) || escolas.some(e => e.cidadeId === c.id));
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
    } else if (usuarioLogado?.nivel === "Visualizador") {
        const escopo = escopoVisualizadorUsuario();
        const escolaIds = idsEscolasDoEscopoVisualizador();
        escolasDashboardBase = escolas.filter(e => escolaIds.includes(e.id));
        cidadesDashboard = cidades.filter(c => (escopo?.cidadesIds || []).includes(c.id) || escolasDashboardBase.some(e => e.cidadeId === c.id));
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
    popularSeletoresAlunos();
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
    } else if (usuarioLogado?.nivel === "Visualizador") {
        const escopo = escopoVisualizadorUsuario();
        const escolaIds = idsEscolasDoEscopoVisualizador();
        escolasVisiveis = escolasVisiveis.filter(e => escolaIds.includes(e.id));
        cidadesVisiveis = cidadesVisiveis.filter(c => (escopo?.cidadesIds || []).includes(c.id) || escolasVisiveis.some(e => e.cidadeId === c.id));
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
            let substituidos = 0;
            linhas.forEach(linha => {
                const siglaOuNome = (linha.SIGLA || linha.Olimpiada || "").trim().toLowerCase();
                const foundOli = olimpiadas.find(o => o.nome.toLowerCase().includes(siglaOuNome) || o.categoria.toLowerCase() === siglaOuNome);
                if (foundOli) {
                    const etapaOriginal = linha["FASE / ETAPA"] || linha.Etapa || "Fase Única — Aplicação";
                    const infoEtapa = normalizarEtapaCronograma(etapaOriginal);
                    const novoEvento = { id: String(Date.now() + inseridos), olimpiadaId: foundOli.id, etapa: infoEtapa.etapa, etapaCodigo: infoEtapa.etapaCodigo, etapaGrupo: infoEtapa.etapaGrupo, etapaGrupoNome: infoEtapa.etapaGrupoNome, data: linha["DATA / PERÍODO 2026"] || linha.Data || "A confirmar", segmento: linha["SÉRIES ELEGÍVEIS"] || linha.Segmento || "Geral", acao: linha["OBSERVAÇÃO CRÍTICA"] || linha.Diretriz || "Mapeamento em análise." };
                    const resultado = inserirOuSubstituirEventoCronograma(cronograma, novoEvento, null, false);
                    cronograma.splice(0, cronograma.length, ...resultado.lista);
                    if (resultado.substituido) substituidos++;
                    inseridos++;
                }
            });
            setStorage("app_cronograma", cronograma);
            alert(`${inseridos} etapas mapeadas com sucesso!${substituidos ? `\n${substituidos} evento(s) duplicado(s) foram substituídos.` : ""}`);
            renderizarCronograma();
        } catch (err) { alert("Erro ao processar planilha de cronograma."); }
    };
    leitor.readAsArrayBuffer(arquivo);
}

// ==================== TEMPLATES XLSX COM LISTA SUSPENSA ====================
// Usa ExcelJS para gerar validação de dados real no Excel/Google Sheets.
// SheetJS continua sendo usado apenas para LER as planilhas importadas.
function bibliotecaExcelJSPresente() {
    return typeof ExcelJS !== "undefined";
}

function valoresUnicosValidos(lista) {
    return Array.from(new Set((lista || [])
        .map(v => String(v ?? "").trim())
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function listaMunicipiosParaTemplate() {
    return valoresUnicosValidos(getStorage("app_cidades").map(c => `${c.nome} - ${c.uf}`));
}

function listaEscolasParaTemplate() {
    return valoresUnicosValidos(getStorage("app_escolas").map(e => e.nome));
}

function listaOlimpiadasParaTemplate() {
    return valoresUnicosValidos(getStorage("app_olimpiadas").map(o => o.nome));
}

function listaSegmentosCronogramaParaTemplate() {
    return valoresUnicosValidos([
        "1º Ano EF", "2º Ano EF", "3º Ano EF", "4º Ano EF", "5º Ano EF",
        "6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF",
        "1ª Série EM", "2ª Série EM", "3ª Série EM",
        "3º EF a 3ª EM", "6º EF a 9º EF", "6º EF a 3ª EM", "Ensino Fundamental", "Ensino Médio", "Geral"
    ]);
}

function obterOuCriarAbaListas(workbook) {
    const ws = workbook.addWorksheet("Listas");
    ws.state = "veryHidden";
    return ws;
}

function escreverListaValidacao(wsListas, coluna, titulo, valores) {
    const col = coluna;
    const lista = valoresUnicosValidos(valores);
    wsListas.getCell(`${col}1`).value = titulo;
    lista.forEach((valor, idx) => {
        wsListas.getCell(`${col}${idx + 2}`).value = valor;
    });
    const ultimaLinha = Math.max(lista.length + 1, 2);
    return `Listas!$${col}$2:$${col}$${ultimaLinha}`;
}

function aplicarListaSuspensa(ws, coluna, primeiraLinha, ultimaLinha, formulaRange, mensagemErro) {
    for (let row = primeiraLinha; row <= ultimaLinha; row++) {
        ws.getCell(`${coluna}${row}`).dataValidation = {
            type: "list",
            allowBlank: false,
            formulae: [formulaRange],
            showErrorMessage: true,
            errorStyle: "stop",
            errorTitle: "Valor inválido",
            error: mensagemErro || "Escolha um valor da lista suspensa."
        };
    }
}

function estilizarCabecalhoTemplate(ws, qtdColunas) {
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    header.height = 24;

    for (let col = 1; col <= qtdColunas; col++) {
        const cell = ws.getCell(1, col);
        cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" }
        };
    }
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: qtdColunas } };
}

async function baixarWorkbookExcelJS(workbook, nomeArquivo) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function downloadCronogramaTemplate() {
    if (!bibliotecaExcelJSPresente()) {
        alert("Biblioteca ExcelJS não carregou. Atualize a página com Ctrl + F5 e tente novamente.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Avance Olímpico";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("ModeloCronograma");
    ws.columns = [
        { header: "SIGLA", key: "SIGLA", width: 44 },
        { header: "FASE / ETAPA", key: "etapa", width: 36 },
        { header: "DATA / PERÍODO 2026", key: "data", width: 22 },
        { header: "SÉRIES ELEGÍVEIS", key: "segmento", width: 24 },
        { header: "OBSERVAÇÃO CRÍTICA", key: "observacao", width: 56 }
    ];

    const olimpiadas = listaOlimpiadasParaTemplate();
    ws.addRow({
        SIGLA: olimpiadas[0] || "OBMEP (Olimpíada Brasileira de Matemática das Escolas Públicas)",
        etapa: "1ª Fase — Aplicação Escolar",
        data: "09/06/2026",
        segmento: "6º EF a 3ª EM",
        observacao: "Imprimir cadernos de prova; recolher cartões."
    });
    ws.addRow({
        SIGLA: olimpiadas[1] || "Canguru de Matemática Brasil",
        etapa: "Fase Única — Aplicação",
        data: "19/03 a 25/03/2026",
        segmento: "3º EF a 3ª EM",
        observacao: "Aplicação nas salas sob fiscalização."
    });

    // Linhas em branco para preenchimento em lote
    for (let i = 0; i < 98; i++) ws.addRow({});

    estilizarCabecalhoTemplate(ws, 5);
    ws.getColumn(5).alignment = { wrapText: true, vertical: "top" };

    const listas = obterOuCriarAbaListas(workbook);
    const rangeOlimpiadas = escreverListaValidacao(listas, "A", "Olimpíadas cadastradas", olimpiadas);
    const rangeEtapas = escreverListaValidacao(listas, "B", "Etapas padronizadas", todasEtapasPadronizadas().map(e => e.nome));
    const rangeSegmentos = escreverListaValidacao(listas, "C", "Séries/segmentos", listaSegmentosCronogramaParaTemplate());

    aplicarListaSuspensa(ws, "A", 2, 101, rangeOlimpiadas, "Escolha uma olimpíada já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "B", 2, 101, rangeEtapas, "Escolha uma etapa padronizada.");
    aplicarListaSuspensa(ws, "D", 2, 101, rangeSegmentos, "Escolha uma série/segmento da lista.");

    await baixarWorkbookExcelJS(workbook, "modelo_carga_cronograma_com_listas.xlsx");
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
                if (!aluno && !escola && !municipio && !olimpiada && !serie && !premio) return;
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

async function downloadTemplate() {
    if (!bibliotecaExcelJSPresente()) {
        alert("Biblioteca ExcelJS não carregou. Atualize a página com Ctrl + F5 e tente novamente.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Avance Olímpico";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Modelo");
    ws.columns = [
        { header: "Aluno", key: "aluno", width: 34 },
        { header: "Escola", key: "escola", width: 42 },
        { header: "Municipio", key: "municipio", width: 26 },
        { header: "Olimpiada", key: "olimpiada", width: 54 },
        { header: "Serie", key: "serie", width: 18 },
        { header: "Premio", key: "premio", width: 20 }
    ];

    const escolas = listaEscolasParaTemplate();
    const municipios = listaMunicipiosParaTemplate();
    const olimpiadas = listaOlimpiadasParaTemplate();

    ws.addRow({
        aluno: "Nome Completo",
        escola: escolas[0] || "Nome da Escola",
        municipio: municipios[0] || "Cidade - UF",
        olimpiada: olimpiadas[0] || "Nome da Olimpíada",
        serie: "6º Ano EF",
        premio: "Ouro"
    });

    // Linhas em branco para preenchimento em lote
    for (let i = 0; i < 199; i++) ws.addRow({});

    estilizarCabecalhoTemplate(ws, 6);

    const listas = obterOuCriarAbaListas(workbook);
    const rangeEscolas = escreverListaValidacao(listas, "A", "Escolas cadastradas", escolas);
    const rangeMunicipios = escreverListaValidacao(listas, "B", "Municípios cadastrados", municipios);
    const rangeOlimpiadas = escreverListaValidacao(listas, "C", "Olimpíadas cadastradas", olimpiadas);
    const rangeSeries = escreverListaValidacao(listas, "D", "Séries", SERIES_PADRAO);
    const rangePremios = escreverListaValidacao(listas, "E", "Prêmios", PREMIOS_PADRAO);

    aplicarListaSuspensa(ws, "B", 2, 201, rangeEscolas, "Escolha uma escola já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "C", 2, 201, rangeMunicipios, "Escolha um município já cadastrado no sistema.");
    aplicarListaSuspensa(ws, "D", 2, 201, rangeOlimpiadas, "Escolha uma olimpíada já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "E", 2, 201, rangeSeries, "Escolha uma série da lista.");
    aplicarListaSuspensa(ws, "F", 2, 201, rangePremios, "Escolha um prêmio da lista.");

    await baixarWorkbookExcelJS(workbook, "modelo_importacao_resultados_com_listas.xlsx");
}



// ==================== HOMOLOGAÇÃO DE OLIMPÍADAS EM LOTE ====================
function initDragAndDropOlimpiadas() {
    const dropZone = document.getElementById("dropZoneOlimpiadas");
    const fileInput = document.getElementById("fileInputOlimpiadas");
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("border-emerald-500"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-emerald-500"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-emerald-500");
        if (e.dataTransfer.files.length) processarPlanilhaOlimpiadas(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => { if (e.target.files.length) processarPlanilhaOlimpiadas(e.target.files[0]); });
}

function lerLinhaPlanilha(linha, nomes, padrao = "") {
    for (const nome of nomes) {
        if (linha[nome] !== undefined && linha[nome] !== null && String(linha[nome]).trim() !== "") return String(linha[nome]).trim();
    }
    return padrao;
}

function lerMultiplosSlots(linha, prefixo, max = 3) {
    const valores = [];
    for (let i = 1; i <= max; i++) {
        const v = lerLinhaPlanilha(linha, [`${prefixo} ${i}`, `${prefixo}${i}`], "");
        if (v) valores.push(v);
    }
    return [...new Set(valores.map(v => v.trim()).filter(Boolean))];
}

function validarOpcaoLista(valor, lista, campo, erros, nl, obrigatorio = false) {
    const v = String(valor || "").trim();
    if (!v) {
        if (obrigatorio) erros.push(`Linha ${nl}: campo obrigatório vazio (${campo}).`);
        return v;
    }
    if (!lista.some(item => normalizarTexto(item) === normalizarTexto(v))) {
        erros.push(`Linha ${nl}: valor inválido em ${campo}: ${v}`);
    }
    return v;
}

function validarListaMultiplos(valores, lista, campo, erros, nl, obrigatorio = false) {
    const limpos = (valores || []).map(v => String(v || "").trim()).filter(Boolean);
    if (obrigatorio && !limpos.length) erros.push(`Linha ${nl}: selecione pelo menos uma opção em ${campo}.`);
    limpos.forEach(v => {
        if (!lista.some(item => normalizarTexto(item) === normalizarTexto(v))) erros.push(`Linha ${nl}: valor inválido em ${campo}: ${v}`);
    });
    return limpos;
}

function montarOlimpiadaDaLinhaPlanilha(linha, nl, erros) {
    const nome = lerLinhaPlanilha(linha, ["Nome completo da olimpíada", "Nome"], "");
    const categoria = lerLinhaPlanilha(linha, ["Sigla / Frente", "Sigla", "Frente"], "").toUpperCase();
    const edicao = lerLinhaPlanilha(linha, ["Edição / Número", "Edicao", "Edição"], "");
    const anoReferencia = validarOpcaoLista(lerLinhaPlanilha(linha, ["Ano de referência", "Ano"], anoDadosAtivo), OPCOES_OLIMPIADA.anos, "Ano de referência", erros, nl, true) || anoDadosAtivo;

    if (!nome) erros.push(`Linha ${nl}: Nome completo da olimpíada é obrigatório.`);
    if (!categoria) erros.push(`Linha ${nl}: Sigla / Frente é obrigatória.`);
    if (anoReferencia !== anoDadosAtivo) erros.push(`Linha ${nl}: ano da linha (${anoReferencia}) diferente do ano ativo da plataforma (${anoDadosAtivo}).`);

    const areas = validarListaMultiplos(lerMultiplosSlots(linha, "Área", 3), OPCOES_OLIMPIADA.areas, "Área", erros, nl, true);
    const seriesAtendidas = validarListaMultiplos(lerMultiplosSlots(linha, "Série atendida", 3), OPCOES_OLIMPIADA.seriesAtendidas, "Série atendida", erros, nl, true);
    const tiposQuestao = validarListaMultiplos(lerMultiplosSlots(linha, "Tipo de questão", 3), OPCOES_OLIMPIADA.tiposQuestao, "Tipo de questão", erros, nl, false);
    const formasPagamento = validarListaMultiplos(lerMultiplosSlots(linha, "Forma de pagamento", 3), OPCOES_OLIMPIADA.formasPagamento, "Forma de pagamento", erros, nl, false);
    const premiosOferecidos = validarListaMultiplos(lerMultiplosSlots(linha, "Prêmio oferecido", 3), OPCOES_OLIMPIADA.premios, "Prêmio oferecido", erros, nl, false);
    const categoriasPremiacao = validarListaMultiplos(lerMultiplosSlots(linha, "Categoria de premiação", 3), OPCOES_OLIMPIADA.categoriasPremiacao, "Categoria de premiação", erros, nl, false);

    const abrangencia = validarOpcaoLista(lerLinhaPlanilha(linha, ["Abrangência geográfica"], "Nacional"), OPCOES_OLIMPIADA.abrangencias, "Abrangência geográfica", erros, nl, true);
    const status = validarOpcaoLista(lerLinhaPlanilha(linha, ["Status"], "Ativa"), OPCOES_OLIMPIADA.status, "Status", erros, nl, true);
    const tipoEscolaElegivel = validarOpcaoLista(lerLinhaPlanilha(linha, ["Tipo de escola elegível"], "Pública e privada"), OPCOES_OLIMPIADA.tiposEscola, "Tipo de escola elegível", erros, nl, false);
    const inscricaoIndividual = validarOpcaoLista(lerLinhaPlanilha(linha, ["Inscrição individual?"], "Não"), OPCOES_OLIMPIADA.inscricaoIndividual, "Inscrição individual", erros, nl, false);
    const escolaPrecisaInscrever = validarOpcaoLista(lerLinhaPlanilha(linha, ["Escola precisa se inscrever?"], "Sim, obrigatório"), OPCOES_OLIMPIADA.escolaInscricao, "Escola precisa se inscrever", erros, nl, false);
    const segmentoPrincipal = validarOpcaoLista(lerLinhaPlanilha(linha, ["Segmento principal"], "Misto EF+EM"), OPCOES_OLIMPIADA.segmentos, "Segmento principal", erros, nl, false);
    const possuiRestricaoIdade = validarOpcaoLista(lerLinhaPlanilha(linha, ["Possui restrição de idade?"], "Não"), OPCOES_OLIMPIADA.simNao, "Possui restrição de idade", erros, nl, false);
    const possuiModalidades = validarOpcaoLista(lerLinhaPlanilha(linha, ["Possui modalidades/níveis internos?"], "Não"), OPCOES_OLIMPIADA.simNao, "Possui modalidades", erros, nl, false);
    const numeroFases = validarOpcaoLista(lerLinhaPlanilha(linha, ["Número de fases"], "1 fase"), OPCOES_OLIMPIADA.numeroFases, "Número de fases", erros, nl, false);
    const modalidadeAplicacao = validarOpcaoLista(lerLinhaPlanilha(linha, ["Modalidade de aplicação"], "Presencial na escola"), OPCOES_OLIMPIADA.modalidadesAplicacao, "Modalidade de aplicação", erros, nl, false);
    const duracaoProvaPrincipal = validarOpcaoLista(lerLinhaPlanilha(linha, ["Duração da prova principal"], "2h"), OPCOES_OLIMPIADA.duracoes, "Duração da prova", erros, nl, false);
    const materialProvaEnviadoComo = validarOpcaoLista(lerLinhaPlanilha(linha, ["Material de prova enviado como"], "A definir"), OPCOES_OLIMPIADA.materiaisProva, "Material de prova", erros, nl, false);
    const correcaoRealizadaPor = validarOpcaoLista(lerLinhaPlanilha(linha, ["Correção realizada por"], "Correção centralizada pelo organizador"), OPCOES_OLIMPIADA.correcoes, "Correção", erros, nl, false);
    const gratuitaParaEscolaPublica = validarOpcaoLista(lerLinhaPlanilha(linha, ["É gratuita para escola pública?"], "Sim"), OPCOES_OLIMPIADA.gratuitaPublica, "Gratuita para escola pública", erros, nl, false);
    const premiaProfessores = validarOpcaoLista(lerLinhaPlanilha(linha, ["Premia professores?"], "Não"), OPCOES_OLIMPIADA.simNao, "Premia professores", erros, nl, false);
    const premiaEscola = validarOpcaoLista(lerLinhaPlanilha(linha, ["Premia escola?"], "Não"), OPCOES_OLIMPIADA.simNao, "Premia escola", erros, nl, false);
    const olimpiadaInternacionalAssociada = validarOpcaoLista(lerLinhaPlanilha(linha, ["Olimpíada internacional associada"], "Nenhuma"), OPCOES_OLIMPIADA.internacionais, "Olimpíada internacional associada", erros, nl, false);
    const nivelFunil = validarOpcaoLista(lerLinhaPlanilha(linha, ["Nível de dificuldade / posição no funil"], "Porta de entrada (fase única acessível)"), OPCOES_OLIMPIADA.niveisFunil, "Nível no funil", erros, nl, false);

    return {
        id: novoId(),
        nome,
        categoria,
        series: seriesAtendidas.join(", "),
        edicao,
        anoReferencia,
        areas,
        abrangencia,
        status,
        organizadorPrincipal: lerLinhaPlanilha(linha, ["Organizador principal"], ""),
        siteOficial: lerLinhaPlanilha(linha, ["Site oficial"], ""),
        instagramOficial: lerLinhaPlanilha(linha, ["Instagram oficial", "Instagram"], ""),
        tipoEscolaElegivel,
        inscricaoIndividual,
        escolaPrecisaInscrever,
        seriesAtendidas,
        segmentoPrincipal,
        possuiRestricaoIdade,
        idadeMaxima: possuiRestricaoIdade === "Sim" ? lerLinhaPlanilha(linha, ["Idade máxima do participante"], "") : "",
        possuiModalidades,
        modalidadesDescricao: possuiModalidades === "Sim" ? lerLinhaPlanilha(linha, ["Descrição das modalidades"], "") : "",
        numeroFases,
        tiposQuestao,
        modalidadeAplicacao,
        duracaoProvaPrincipal,
        materialProvaEnviadoComo,
        correcaoRealizadaPor,
        gratuitaParaEscolaPublica,
        custoEscolaPublica: lerLinhaPlanilha(linha, ["Custo para escola pública"], ""),
        custoEscolaPrivada: lerLinhaPlanilha(linha, ["Custo para escola privada"], ""),
        formasPagamento,
        premiosOferecidos,
        categoriasPremiacao,
        premiaProfessores,
        premiaEscola,
        classificaPara: lerLinhaPlanilha(linha, ["Classifica para qual olimpíada?"], ""),
        preRequisitoDe: lerLinhaPlanilha(linha, ["É pré-requisito de qual olimpíada?"], ""),
        olimpiadaInternacionalAssociada,
        nivelFunil,
        criadoEm: new Date().toISOString(),
        origemCadastro: "importacao_xlsx"
    };
}

function processarPlanilhaOlimpiadas(arquivo) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem homologar olimpíadas em lote.");
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            const erros = [];
            const olimpiadas = getStorage("app_olimpiadas");
            let inseridos = 0;
            let substituidos = 0;

            linhas.forEach((linha, idx) => {
                const nl = idx + 2;
                const nomeTeste = lerLinhaPlanilha(linha, ["Nome completo da olimpíada", "Nome"], "");
                const siglaTeste = lerLinhaPlanilha(linha, ["Sigla / Frente", "Sigla", "Frente"], "");
                if (!nomeTeste && !siglaTeste) return;

                const antesErros = erros.length;
                const item = montarOlimpiadaDaLinhaPlanilha(linha, nl, erros);
                if (erros.length > antesErros) return;

                const idxExistente = olimpiadas.findIndex(o => normalizarTexto(o.nome) === normalizarTexto(item.nome) || normalizarTexto(o.categoria) === normalizarTexto(item.categoria));
                if (idxExistente >= 0) {
                    item.id = olimpiadas[idxExistente].id || item.id;
                    item.atualizadoEm = new Date().toISOString();
                    olimpiadas[idxExistente] = { ...olimpiadas[idxExistente], ...item };
                    substituidos++;
                } else {
                    olimpiadas.push(item);
                    inseridos++;
                }
            });

            setStorage("app_olimpiadas", olimpiadas);
            popularSeletores();
            renderizarTabelasGerenciais();
            if (document.getElementById("fileInputOlimpiadas")) document.getElementById("fileInputOlimpiadas").value = "";

            const resumo = `Importação concluída para o ano ${anoDadosAtivo}.\n✅ ${inseridos} inseridas\n🔁 ${substituidos} substituídas`;
            if (erros.length) alert(`${resumo}\n⚠️ ${erros.length} erros:\n\n${erros.slice(0, 15).join("\n")}`);
            else alert(`${resumo}\n\nDados salvos no Firestore do ano ${anoDadosAtivo}.`);
        } catch (err) {
            console.error("Erro ao importar olimpíadas", err);
            alert(`Erro ao processar a planilha de olimpíadas.\n\n${err.message || err}`);
        }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function aplicarValidacaoColunas(ws, colunas, linhaInicial, linhaFinal, range, mensagem) {
    colunas.forEach(col => aplicarListaSuspensa(ws, col, linhaInicial, linhaFinal, range, mensagem));
}

async function downloadOlimpiadasTemplate() {
    if (!bibliotecaExcelJSPresente()) {
        alert("Biblioteca ExcelJS não carregou. Atualize a página com Ctrl + F5 e tente novamente.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Avance Olímpico";
    workbook.created = new Date();
    const ws = workbook.addWorksheet("HomologacaoOlimpiadas");

    ws.columns = [
        { header: "Nome completo da olimpíada", key: "nome", width: 42 },
        { header: "Sigla / Frente", key: "sigla", width: 18 },
        { header: "Edição / Número", key: "edicao", width: 16 },
        { header: "Ano de referência", key: "ano", width: 18 },
        { header: "Área 1", key: "area1", width: 22 },
        { header: "Área 2", key: "area2", width: 22 },
        { header: "Área 3", key: "area3", width: 22 },
        { header: "Abrangência geográfica", key: "abrangencia", width: 28 },
        { header: "Status", key: "status", width: 20 },
        { header: "Organizador principal", key: "organizador", width: 34 },
        { header: "Site oficial", key: "site", width: 34 },
        { header: "Instagram oficial", key: "instagram", width: 34 },
        { header: "Tipo de escola elegível", key: "tipoEscola", width: 28 },
        { header: "Inscrição individual?", key: "inscricaoIndividual", width: 34 },
        { header: "Escola precisa se inscrever?", key: "escolaInscricao", width: 30 },
        { header: "Série atendida 1", key: "serie1", width: 24 },
        { header: "Série atendida 2", key: "serie2", width: 24 },
        { header: "Série atendida 3", key: "serie3", width: 24 },
        { header: "Segmento principal", key: "segmento", width: 24 },
        { header: "Possui restrição de idade?", key: "restricaoIdade", width: 26 },
        { header: "Idade máxima do participante", key: "idadeMaxima", width: 26 },
        { header: "Possui modalidades/níveis internos?", key: "possuiModalidades", width: 34 },
        { header: "Descrição das modalidades", key: "modalidadesDescricao", width: 36 },
        { header: "Número de fases", key: "fases", width: 18 },
        { header: "Tipo de questão 1", key: "tipoQuestao1", width: 28 },
        { header: "Tipo de questão 2", key: "tipoQuestao2", width: 28 },
        { header: "Tipo de questão 3", key: "tipoQuestao3", width: 28 },
        { header: "Modalidade de aplicação", key: "modalidade", width: 30 },
        { header: "Duração da prova principal", key: "duracao", width: 24 },
        { header: "Material de prova enviado como", key: "material", width: 30 },
        { header: "Correção realizada por", key: "correcao", width: 36 },
        { header: "É gratuita para escola pública?", key: "gratuita", width: 28 },
        { header: "Custo para escola pública", key: "custoPublica", width: 24 },
        { header: "Custo para escola privada", key: "custoPrivada", width: 24 },
        { header: "Forma de pagamento 1", key: "pagamento1", width: 24 },
        { header: "Forma de pagamento 2", key: "pagamento2", width: 24 },
        { header: "Forma de pagamento 3", key: "pagamento3", width: 24 },
        { header: "Prêmio oferecido 1", key: "premio1", width: 28 },
        { header: "Prêmio oferecido 2", key: "premio2", width: 28 },
        { header: "Prêmio oferecido 3", key: "premio3", width: 28 },
        { header: "Categoria de premiação 1", key: "catPremio1", width: 24 },
        { header: "Categoria de premiação 2", key: "catPremio2", width: 24 },
        { header: "Categoria de premiação 3", key: "catPremio3", width: 24 },
        { header: "Premia professores?", key: "premiaProf", width: 22 },
        { header: "Premia escola?", key: "premiaEscola", width: 20 },
        { header: "Classifica para qual olimpíada?", key: "classifica", width: 34 },
        { header: "É pré-requisito de qual olimpíada?", key: "prerequisito", width: 36 },
        { header: "Olimpíada internacional associada", key: "internacional", width: 32 },
        { header: "Nível de dificuldade / posição no funil", key: "funil", width: 42 }
    ];

    ws.addRow({
        nome: "Olimpíada Brasileira de Física",
        sigla: "OBF",
        edicao: "27",
        ano: anoDadosAtivo,
        area1: "Física",
        abrangencia: "Nacional",
        status: "Ativa",
        organizador: "Sociedade Brasileira de Física",
        site: "https://",
        instagram: "@obf_oficial",
        tipoEscola: "Pública e privada",
        inscricaoIndividual: "Não",
        escolaInscricao: "Sim, obrigatório",
        serie1: "1ª a 3ª Série EM",
        segmento: "Ensino Médio",
        restricaoIdade: "Não",
        possuiModalidades: "Sim",
        modalidadesDescricao: "Nível 1, Nível 2 e Nível 3",
        fases: "3 fases",
        tipoQuestao1: "Múltipla escolha",
        tipoQuestao2: "Dissertativa / Aberta",
        modalidade: "Presencial na escola",
        duracao: "3h",
        material: "PDF download no site",
        correcao: "Upload de cartão/folha",
        gratuita: "Sim",
        pagamento1: "Isento",
        premio1: "Medalha física",
        premio2: "Certificado digital",
        catPremio1: "Ouro",
        catPremio2: "Prata",
        catPremio3: "Bronze",
        premiaProf: "Não",
        premiaEscola: "Não",
        internacional: "IPhO",
        funil: "Avançada (nacional)"
    });
    for (let i = 0; i < 149; i++) ws.addRow({ ano: anoDadosAtivo });

    estilizarCabecalhoTemplate(ws, ws.columns.length);
    ws.getRow(1).height = 36;
    ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
    });

    const listas = obterOuCriarAbaListas(workbook);
    const ranges = {
        anos: escreverListaValidacao(listas, "A", "Anos", OPCOES_OLIMPIADA.anos),
        areas: escreverListaValidacao(listas, "B", "Áreas", OPCOES_OLIMPIADA.areas),
        abrangencias: escreverListaValidacao(listas, "C", "Abrangências", OPCOES_OLIMPIADA.abrangencias),
        status: escreverListaValidacao(listas, "D", "Status", OPCOES_OLIMPIADA.status),
        tiposEscola: escreverListaValidacao(listas, "E", "Tipos de escola", OPCOES_OLIMPIADA.tiposEscola),
        inscricaoIndividual: escreverListaValidacao(listas, "F", "Inscrição individual", OPCOES_OLIMPIADA.inscricaoIndividual),
        escolaInscricao: escreverListaValidacao(listas, "G", "Escola inscrição", OPCOES_OLIMPIADA.escolaInscricao),
        series: escreverListaValidacao(listas, "H", "Séries", OPCOES_OLIMPIADA.seriesAtendidas),
        segmentos: escreverListaValidacao(listas, "I", "Segmentos", OPCOES_OLIMPIADA.segmentos),
        simNao: escreverListaValidacao(listas, "J", "Sim Não", OPCOES_OLIMPIADA.simNao),
        numeroFases: escreverListaValidacao(listas, "K", "Número de fases", OPCOES_OLIMPIADA.numeroFases),
        tiposQuestao: escreverListaValidacao(listas, "L", "Tipos de questão", OPCOES_OLIMPIADA.tiposQuestao),
        modalidades: escreverListaValidacao(listas, "M", "Modalidades de aplicação", OPCOES_OLIMPIADA.modalidadesAplicacao),
        duracoes: escreverListaValidacao(listas, "N", "Durações", OPCOES_OLIMPIADA.duracoes),
        materiais: escreverListaValidacao(listas, "O", "Materiais", OPCOES_OLIMPIADA.materiaisProva),
        correcoes: escreverListaValidacao(listas, "P", "Correções", OPCOES_OLIMPIADA.correcoes),
        gratuita: escreverListaValidacao(listas, "Q", "Gratuidade", OPCOES_OLIMPIADA.gratuitaPublica),
        formasPagamento: escreverListaValidacao(listas, "R", "Formas pagamento", OPCOES_OLIMPIADA.formasPagamento),
        premios: escreverListaValidacao(listas, "S", "Prêmios", OPCOES_OLIMPIADA.premios),
        categorias: escreverListaValidacao(listas, "T", "Categorias premiação", OPCOES_OLIMPIADA.categoriasPremiacao),
        internacionais: escreverListaValidacao(listas, "U", "Internacionais", OPCOES_OLIMPIADA.internacionais),
        funil: escreverListaValidacao(listas, "V", "Funil", OPCOES_OLIMPIADA.niveisFunil)
    };

    aplicarListaSuspensa(ws, "D", 2, 151, ranges.anos, "Escolha o ano de referência.");
    aplicarValidacaoColunas(ws, ["E", "F", "G"], 2, 151, ranges.areas, "Escolha uma área/disciplina.");
    aplicarListaSuspensa(ws, "H", 2, 151, ranges.abrangencias, "Escolha a abrangência.");
    aplicarListaSuspensa(ws, "I", 2, 151, ranges.status, "Escolha o status.");
    aplicarListaSuspensa(ws, "M", 2, 151, ranges.tiposEscola, "Escolha o tipo de escola elegível.");
    aplicarListaSuspensa(ws, "N", 2, 151, ranges.inscricaoIndividual, "Escolha uma opção.");
    aplicarListaSuspensa(ws, "O", 2, 151, ranges.escolaInscricao, "Escolha uma opção.");
    aplicarValidacaoColunas(ws, ["P", "Q", "R"], 2, 151, ranges.series, "Escolha uma série/segmento atendido.");
    aplicarListaSuspensa(ws, "S", 2, 151, ranges.segmentos, "Escolha o segmento principal.");
    aplicarListaSuspensa(ws, "T", 2, 151, ranges.simNao, "Escolha Sim ou Não.");
    aplicarListaSuspensa(ws, "V", 2, 151, ranges.simNao, "Escolha Sim ou Não.");
    aplicarListaSuspensa(ws, "X", 2, 151, ranges.numeroFases, "Escolha o número de fases.");
    aplicarValidacaoColunas(ws, ["Y", "Z", "AA"], 2, 151, ranges.tiposQuestao, "Escolha o tipo de questão.");
    aplicarListaSuspensa(ws, "AB", 2, 151, ranges.modalidades, "Escolha a modalidade de aplicação.");
    aplicarListaSuspensa(ws, "AC", 2, 151, ranges.duracoes, "Escolha a duração.");
    aplicarListaSuspensa(ws, "AD", 2, 151, ranges.materiais, "Escolha como o material é enviado.");
    aplicarListaSuspensa(ws, "AE", 2, 151, ranges.correcoes, "Escolha a forma de correção.");
    aplicarListaSuspensa(ws, "AF", 2, 151, ranges.gratuita, "Escolha a gratuidade.");
    aplicarValidacaoColunas(ws, ["AI", "AJ", "AK"], 2, 151, ranges.formasPagamento, "Escolha uma forma de pagamento.");
    aplicarValidacaoColunas(ws, ["AL", "AM", "AN"], 2, 151, ranges.premios, "Escolha um prêmio oferecido.");
    aplicarValidacaoColunas(ws, ["AO", "AP", "AQ"], 2, 151, ranges.categorias, "Escolha uma categoria de premiação.");
    aplicarListaSuspensa(ws, "AR", 2, 151, ranges.simNao, "Escolha Sim ou Não.");
    aplicarListaSuspensa(ws, "AS", 2, 151, ranges.simNao, "Escolha Sim ou Não.");
    aplicarListaSuspensa(ws, "AV", 2, 151, ranges.internacionais, "Escolha uma opção.");
    aplicarListaSuspensa(ws, "AW", 2, 151, ranges.funil, "Escolha o nível no funil.");

    await baixarWorkbookExcelJS(workbook, `modelo_homologacao_olimpiadas_${anoDadosAtivo}_com_listas.xlsx`);
}

// ==================== PLATAFORMA DE ENSINO ====================
const DRIVE_UPLOAD_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbylwI7NtKjHAhL20UEtpTuKn5P8j8umDAAsDWnUd52oNvHqdAoAMNEobh5U9zvaneaoFA/exec";
const DRIVE_UPLOAD_TOKEN = "avance-olimpico-2026";
// Coleções do Cloud Firestore já existentes no seu projeto, como aparece no print.
const FIREBASE_COLLECTIONS = {
    app_usuarios: "sistema_usuarios",
    app_cidades: "sistema_cidades",
    app_escolas: "sistema_escolas",
    app_alunos: "sistema_alunos",
    app_olimpiadas: "sistema_olimpiadas",
    app_cronograma: "sistema_cronograma",
    app_premiados: "sistema_premiados",
    app_plataforma: "sistema_plataforma"
};
function getMateriaisCollectionName() { return getFirebaseCollectionName("app_plataforma"); }
function getUsuariosCollectionName() { return getFirebaseCollectionName("app_usuarios"); }
const LIMITE_ARQUIVO_DRIVE_MB = 25;
const LIMITE_ANEXO_MONITORIA_MB = 10;
const DISCIPLINAS_PLATAFORMA = ["Geral", "Matemática", "Física", "Química", "Biologia", "Ciências", "Astronomia", "Tecnologia / Robótica", "Linguagem", "Humanas", "Multidisciplinar"];
const NIVEIS_PLATAFORMA = ["Geral", "Nível 1 — 6º/7º Ano", "Nível 2 — 8º/9º Ano", "Ensino Fundamental I", "Ensino Fundamental II", "Ensino Médio", "ITA/IME", "Avançado / Seletivas"];
const TIPOS_MATERIAL_PLATAFORMA = ["Lista de exercícios", "Apostila", "Livro", "Videoaula", "Áudio", "Simulado", "Gabarito", "Resolução comentada", "Apresentação / Slides", "Link útil", "Outro"];
const TIPOS_INTERACAO_PLATAFORMA = ["Dúvida", "Resolução", "Comentário", "Correção sugerida"];

async function carregarMateriaisPlataforma() {
    initFirebase();

    // A Plataforma usa Cloud Firestore para a lista de materiais.
    // Os arquivos ficam no Firebase Storage; os metadados ficam no Cloud Firestore.
    if (!firebaseFirestore) return getStorage("app_plataforma");

    try {
        const snapshot = await firebaseFirestore
            .collection(getMateriaisCollectionName())
            .get();

        const materiais = [];
        snapshot.forEach(doc => {
            const data = doc.data() || {};
            materiais.push({ id: data.id || doc.id, ...data });
        });

        materiais.sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0));
        setStorageLocal("app_plataforma", materiais);
        return materiais;
    } catch (erro) {
        console.error("Falha ao carregar materiais do Cloud Firestore.", erro);
        alert(`Erro ao carregar materiais no Firestore.

${erro.message || erro}`);
        throw erro;
    }
}

function normalizarConclusoesMaterial(m) {
    if (!m) return [];
    if (Array.isArray(m.concluidos)) return m.concluidos.filter(Boolean);
    if (Array.isArray(m.concluidoPor)) {
        return m.concluidoPor.filter(Boolean).map(id => ({ usuarioId: String(id), usuarioNome: "", concluidoEm: null }));
    }
    return [];
}

function materialFeitoPorUsuario(m) {
    if (!usuarioLogado) return false;
    const uid = String(usuarioLogado.id || usuarioLogado.login || "");
    return normalizarConclusoesMaterial(m).some(item => String(item.usuarioId || item.id || item.login || "") === uid);
}

function normalizarMaterialPlataforma(m) {
    const tipoLegado = m.tipo || "link";
    const disciplina = m.disciplina || m.area || "Geral";
    const nivel = m.nivel || "Geral";
    let tipoMaterial = m.tipoMaterial;
    if (!tipoMaterial) {
        if (tipoLegado === "video") tipoMaterial = "Videoaula";
        else if (tipoLegado === "arquivo") tipoMaterial = "Apostila";
        else tipoMaterial = "Link útil";
    }
    return { ...m, disciplina, area: disciplina, nivel, tipoMaterial, tipo: tipoLegado, interacoes: Array.isArray(m.interacoes) ? m.interacoes : [], concluidos: normalizarConclusoesMaterial(m) };
}

function preencherFiltroPlataforma(id, opcoes, valorAtual) {
    const select = document.getElementById(id);
    if (!select) return;
    const anterior = valorAtual || select.value || "TODOS";
    select.innerHTML = `<option value="TODOS">Todos</option>` + opcoes.map(op => `<option value="${textoSeguro(op)}">${textoSeguro(op)}</option>`).join("");
    if (Array.from(select.options).some(o => o.value === anterior)) select.value = anterior;
}

function atualizarFiltrosPlataforma(materiais) {
    const disciplinas = Array.from(new Set([...DISCIPLINAS_PLATAFORMA, ...materiais.map(m => m.disciplina).filter(Boolean)])).sort((a,b)=>a.localeCompare(b));
    const niveis = Array.from(new Set([...NIVEIS_PLATAFORMA, ...materiais.map(m => m.nivel).filter(Boolean)]));
    const tipos = Array.from(new Set([...TIPOS_MATERIAL_PLATAFORMA, ...materiais.map(m => m.tipoMaterial).filter(Boolean)]));
    preencherFiltroPlataforma("filtroMatDisciplina", disciplinas, document.getElementById("filtroMatDisciplina")?.value);
    preencherFiltroPlataforma("filtroMatNivel", niveis, document.getElementById("filtroMatNivel")?.value);
    preencherFiltroPlataforma("filtroMatTipo", tipos, document.getElementById("filtroMatTipo")?.value);
}

function formatarDataHora(timestamp) {
    if (!timestamp) return "Data não registrada";
    try { return new Date(Number(timestamp)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
    catch (_) { return "Data inválida"; }
}

function iconeMaterialPlataforma(m) {
    const tipoMaterial = normalizarTexto(m.tipoMaterial);
    if (m.tipo === "video" || tipoMaterial.includes("video")) return { icone: "fa-play-circle", cor: "text-red-400" };
    if (tipoMaterial.includes("audio") || tipoMaterial.includes("áudio")) return { icone: "fa-headphones", cor: "text-purple-400" };
    if (tipoMaterial.includes("lista")) return { icone: "fa-list-check", cor: "text-emerald-400" };
    if (tipoMaterial.includes("livro")) return { icone: "fa-book", cor: "text-amber-400" };
    if (tipoMaterial.includes("simulado")) return { icone: "fa-clipboard-check", cor: "text-blue-400" };
    if (tipoMaterial.includes("gabarito")) return { icone: "fa-key", cor: "text-yellow-400" };
    if (tipoMaterial.includes("resolução") || tipoMaterial.includes("resolucao")) return { icone: "fa-lightbulb", cor: "text-orange-400" };
    if (m.tipo === "arquivo") return { icone: "fa-file-lines", cor: "text-orange-400" };
    return { icone: "fa-link", cor: "text-blue-400" };
}

function renderizarConteudoMaterial(m) {
    const isVideo = m.tipo === "video";
    const isLink = m.tipo === "link";
    const isArquivo = m.tipo === "arquivo";
    if (isVideo && m.url) {
        const embedUrl = converterUrlYoutube(m.url);
        return embedUrl
            ? `<div class="aspect-video w-full rounded-xl overflow-hidden my-3 bg-gray-950"><iframe src="${embedUrl}" frameborder="0" allowfullscreen class="w-full h-full"></iframe></div>`
            : `<a href="${textoSeguro(m.url)}" target="_blank" class="block w-full text-center py-3 bg-gray-900 rounded-xl text-red-400 text-xs hover:bg-gray-700 transition my-3"><i class="fa-solid fa-play mr-2"></i>Abrir vídeo</a>`;
    }
    if (isLink && m.url) return `<a href="${textoSeguro(m.url)}" target="_blank" class="block w-full text-center py-3 bg-gray-900 rounded-xl text-blue-400 text-xs hover:bg-gray-700 transition my-3"><i class="fa-solid fa-external-link mr-2"></i>Acessar recurso</a>`;
    if (isArquivo && (m.arquivoUrl || m.dados)) {
        const href = m.arquivoUrl || m.dados;
        return `<a href="${textoSeguro(href)}" target="_blank" rel="noopener" class="block w-full text-center py-3 bg-gray-900 rounded-xl text-orange-400 text-xs hover:bg-gray-700 transition my-3"><i class="fa-solid fa-file-arrow-down mr-2"></i>Abrir / baixar arquivo</a>`;
    }
    return "";
}

function renderizarInteracoesMaterial(m) {
    const interacoes = Array.isArray(m.interacoes) ? [...m.interacoes].sort((a,b)=>Number(b.criadoEm||0)-Number(a.criadoEm||0)) : [];
    const lista = interacoes.length
        ? interacoes.map(i => `
            <div class="bg-gray-900/70 border border-gray-700 rounded-xl p-3">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${i.tipo === "Dúvida" ? "bg-amber-500/10 text-amber-300" : i.tipo === "Resolução" ? "bg-emerald-500/10 text-emerald-300" : "bg-blue-500/10 text-blue-300"}">${textoSeguro(i.tipo || "Comentário")}</span>
                    <span class="text-[10px] text-gray-500">${textoSeguro(i.criadoPor || "Usuário")} · ${formatarDataHora(i.criadoEm)}</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">${textoSeguro(i.texto || "")}</p>
                ${i.imagemUrl ? `<a href="${textoSeguro(i.imagemUrl)}" target="_blank" class="inline-block mt-2"><img src="${textoSeguro(i.imagemUrl)}" class="max-h-48 rounded-xl border border-gray-700 object-contain bg-gray-950" alt="Imagem enviada"></a>` : ""}
            </div>
        `).join("")
        : `<p class="text-xs text-gray-600 italic">Nenhuma interação ainda. Seja o primeiro a comentar, perguntar ou enviar uma resolução.</p>`;

    return `
        <details class="mt-3 border-t border-gray-700 pt-3">
            <summary class="cursor-pointer text-xs font-bold text-gray-300 hover:text-white"><i class="fa-solid fa-comments text-blue-400 mr-2"></i> Fórum do material (${interacoes.length})</summary>
            <div class="mt-3 space-y-3">
                ${lista}
                <form onsubmit="publicarInteracaoMaterial('${m.id}', event)" class="bg-gray-900/50 border border-gray-700 rounded-xl p-3 space-y-2">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select id="interacaoTipo_${m.id}" class="p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300 focus:outline-none">
                            ${TIPOS_INTERACAO_PLATAFORMA.map(t => `<option value="${textoSeguro(t)}">${textoSeguro(t)}</option>`).join("")}
                        </select>
                        <input id="interacaoImagem_${m.id}" type="file" accept="image/*" class="md:col-span-2 p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300">
                    </div>
                    <textarea id="interacaoTexto_${m.id}" rows="2" required class="w-full p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-200 focus:outline-none resize-none" placeholder="Escreva sua dúvida, resolução ou comentário..."></textarea>
                    <button type="submit" class="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition"><i class="fa-solid fa-paper-plane mr-1"></i>Enviar no fórum</button>
                </form>
            </div>
        </details>
    `;
}

async function renderizarPlataformaEnsino() {
    const container = document.getElementById("gridMateriais");
    if (!container) return;

    container.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center"><i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500 mb-4"></i><p class="text-gray-500 text-sm">Carregando materiais...</p></div>`;

    let materiais = (await carregarMateriaisPlataforma()).map(normalizarMaterialPlataforma);
    atualizarFiltrosPlataforma(materiais);

    const filtroDisciplina = document.getElementById("filtroMatDisciplina")?.value || "TODOS";
    const filtroNivel = document.getElementById("filtroMatNivel")?.value || "TODOS";
    const filtroTipo = document.getElementById("filtroMatTipo")?.value || "TODOS";
    const filtroStatus = document.getElementById("filtroMatStatus")?.value || "TODOS";
    const busca = normalizarTexto(document.getElementById("filtroMatBusca")?.value || "");

    materiais = materiais.filter(m => {
        if (filtroDisciplina !== "TODOS" && m.disciplina !== filtroDisciplina) return false;
        if (filtroNivel !== "TODOS" && m.nivel !== filtroNivel) return false;
        if (filtroTipo !== "TODOS" && m.tipoMaterial !== filtroTipo) return false;
        const feito = materialFeitoPorUsuario(m);
        if (filtroStatus === "FEITOS" && !feito) return false;
        if (filtroStatus === "NAO_FEITOS" && feito) return false;
        if (busca) {
            const alvo = normalizarTexto(`${m.titulo || ""} ${m.descricao || ""} ${m.disciplina || ""} ${m.nivel || ""} ${m.tipoMaterial || ""}`);
            if (!alvo.includes(busca)) return false;
        }
        return true;
    });

    if (!materiais.length) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center bg-gray-800 border border-gray-700 rounded-2xl"><i class="fa-solid fa-photo-film text-4xl text-gray-700 mb-4"></i><p class="text-gray-500 text-sm">Nenhum material encontrado.</p><p class="text-gray-600 text-xs mt-1">Ajuste os filtros ou aguarde novas publicações.</p></div>`;
        return;
    }

    const grupos = new Map();
    materiais.forEach(m => {
        const chave = `${m.disciplina || "Geral"}|||${m.nivel || "Geral"}|||${m.tipoMaterial || "Outro"}`;
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push(m);
    });

    container.innerHTML = Array.from(grupos.entries()).map(([chave, itens]) => {
        const [disciplina, nivel, tipoMaterial] = chave.split("|||");
        return `
            <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-book mr-1"></i>${textoSeguro(disciplina)}</span>
                    <span class="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-layer-group mr-1"></i>${textoSeguro(nivel)}</span>
                    <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold uppercase tracking-wider"><i class="fa-solid fa-file-lines mr-1"></i>${textoSeguro(tipoMaterial)}</span>
                    <span class="text-[10px] text-gray-600 font-bold uppercase tracking-wider">${itens.length} item(ns)</span>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    ${itens.map(m => {
                        const icon = iconeMaterialPlataforma(m);
                        const acoesAdm = permissao("plataforma.podeGerenciar")
                            ? `<button onclick="excluirMaterial('${m.id}')" class="text-red-400 hover:text-red-300 text-xs font-bold ml-2" title="Remover da plataforma"><i class="fa-solid fa-trash"></i></button>`
                            : "";
                        return `
                            <div class="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl flex flex-col gap-2">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <i class="fa-solid ${icon.icone} ${icon.cor} text-xl"></i>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-900 text-gray-300">${textoSeguro(m.tipoMaterial)}</span>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-900 text-gray-400">${m.tipo === "arquivo" ? "Arquivo" : m.tipo === "video" ? "Vídeo" : "Link"}</span>
                                    </div>
                                    ${acoesAdm}
                                </div>
                                <div class="flex items-start justify-between gap-3">
                                    <h4 class="font-bold text-white text-sm leading-snug flex-1">${textoSeguro(m.titulo)}</h4>
                                    <label class="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${materialFeitoPorUsuario(m) ? "border-emerald-700 bg-emerald-500/10 text-emerald-300" : "border-gray-700 bg-gray-900 text-gray-400"} text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none" title="Marcar este material como feito">
                                        <input type="checkbox" ${materialFeitoPorUsuario(m) ? "checked" : ""} onchange="alternarMaterialFeito('${m.id}', this.checked)" class="accent-emerald-500">
                                        ${materialFeitoPorUsuario(m) ? "Feito" : "Fazer"}
                                    </label>
                                </div>
                                ${m.descricao ? `<p class="text-gray-400 text-xs leading-relaxed">${textoSeguro(m.descricao)}</p>` : ""}
                                <div class="text-[10px] text-gray-500 leading-relaxed">
                                    <div><i class="fa-solid fa-user mr-1"></i>Postado por ${textoSeguro(m.criadoPor || "Sistema")} ${m.criadoPorNivel ? `(${textoSeguro(m.criadoPorNivel)})` : ""}</div>
                                    <div><i class="fa-solid fa-clock mr-1"></i>${formatarDataHora(m.criadoEm)}</div>
                                    ${m.nomeArquivo ? `<div><i class="fa-solid fa-paperclip mr-1"></i>${textoSeguro(m.nomeArquivo)}</div>` : ""}
                                    <div><i class="fa-solid ${materialFeitoPorUsuario(m) ? "fa-circle-check text-emerald-400" : "fa-circle text-gray-600"} mr-1"></i>${materialFeitoPorUsuario(m) ? "Marcado como feito por você" : "Ainda não marcado como feito"}</div>
                                </div>
                                ${renderizarConteudoMaterial(m)}
                                ${renderizarInteracoesMaterial(m)}
                            </div>
                        `;
                    }).join("")}
                </div>
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

function nomeSeguroStorage(nome) {
    return String(nome || "arquivo")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120) || "arquivo";
}

function caminhoArquivoStorage(pasta, arquivo) {
    const ano = typeof anoDadosAtivo !== "undefined" ? anoDadosAtivo : new Date().getFullYear();
    const id = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    return `plataforma/${ano}/${pasta}/${id}_${nomeSeguroStorage(arquivo.name)}`;
}

async function enviarArquivoParaFirebaseStorage(arquivo, pasta = "materiais") {
    initFirebase();
    if (!firebaseStorage) {
        throw new Error("Firebase Storage não inicializado. Verifique se firebase-storage-compat.js está carregado e se o Storage foi ativado no Firebase.");
    }

    const tamanhoMb = arquivo.size / (1024 * 1024);
    if (tamanhoMb > LIMITE_ARQUIVO_DRIVE_MB) {
        throw new Error(`Arquivo muito grande. Use arquivo com até ${LIMITE_ARQUIVO_DRIVE_MB} MB.`);
    }

    const storagePath = caminhoArquivoStorage(pasta, arquivo);
    const ref = firebaseStorage.ref().child(storagePath);
    const metadata = {
        contentType: arquivo.type || "application/octet-stream",
        customMetadata: {
            ano: String(typeof anoDadosAtivo !== "undefined" ? anoDadosAtivo : ""),
            enviadoPorId: String(usuarioLogado?.id || ""),
            enviadoPorNome: String(usuarioLogado?.nome || "")
        }
    };

    await ref.put(arquivo, metadata);
    const fileUrl = await ref.getDownloadURL();

    return {
        success: true,
        fileUrl,
        storagePath,
        fileName: arquivo.name,
        mimeType: arquivo.type || "application/octet-stream",
        size: arquivo.size
    };
}

async function excluirArquivoFirebaseStorage(storagePath) {
    if (!storagePath) return { success: true };
    initFirebase();
    if (!firebaseStorage) return { success: false };
    await firebaseStorage.ref().child(storagePath).delete();
    return { success: true };
}

// Mantém os nomes antigos para não quebrar outras chamadas do app.
async function enviarArquivoParaGoogleDrive(arquivo) {
    return enviarArquivoParaFirebaseStorage(arquivo, "materiais");
}

async function excluirArquivoGoogleDrive(storagePath) {
    return excluirArquivoFirebaseStorage(storagePath);
}

async function salvarNovoMaterial(event) {
    event.preventDefault();
    if (!permissao("plataforma.podeGerenciar")) return alert("Apenas administradores e monitores podem publicar materiais.");

    initFirebase();

    const titulo = document.getElementById("matTitulo").value.trim();
    const descricao = document.getElementById("matDescricao").value.trim();
    const disciplina = document.getElementById("matDisciplina")?.value || "Geral";
    const nivel = document.getElementById("matNivel")?.value || "Geral";
    const tipoMaterial = document.getElementById("matTipoMaterial")?.value || "Outro";
    const tipo = document.getElementById("matTipo").value;
    const url = document.getElementById("matUrl").value.trim();
    const fileInput = document.getElementById("matArquivo");
    const btn = event.submitter || document.querySelector('#formAddMaterial button[type="submit"]');

    if (!titulo) return alert("O título é obrigatório.");
    if (!disciplina || !nivel || !tipoMaterial) return alert("Disciplina, nível e tipo de material são obrigatórios.");
    if ((tipo === "video" || tipo === "link") && !url) return alert("Informe a URL do material.");
    if (tipo === "arquivo" && (!fileInput || fileInput.files.length === 0)) return alert("Selecione um arquivo para publicar.");
    if (!firebaseFirestore) return alert("Cloud Firestore ainda não carregou. Verifique se o Firebase está configurado e se as Rules do Firestore permitem leitura/escrita.");

    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Publicando...'; }

        const material = {
            titulo,
            descricao,
            disciplina,
            area: disciplina, // compatibilidade com materiais antigos
            nivel,
            tipoMaterial,
            tipo,
            url: tipo === "video" || tipo === "link" ? url : "",
            id: novoId(),
            criadoPor: usuarioLogado?.nome || "Sistema",
            criadoPorId: usuarioLogado?.id || "",
            criadoPorNivel: usuarioLogado?.nivel || "",
            criadoEm: Date.now(),
            atualizadoEm: Date.now(),
            interacoes: [],
            hospedagem: tipo === "arquivo" ? "firebase_storage" : "link_externo"
        };

        if (tipo === "arquivo") {
            const arquivo = fileInput.files[0];
            const upload = await enviarArquivoParaGoogleDrive(arquivo);
            material.arquivoUrl = upload.fileUrl;
            material.storagePath = upload.storagePath;
            material.driveFileId = upload.storagePath; // compatibilidade com versões antigas
            material.nomeArquivo = upload.fileName || arquivo.name;
            material.mimeType = arquivo.type || "application/octet-stream";
            material.tamanhoBytes = arquivo.size;
        }

        await firebaseFirestore.collection(getMateriaisCollectionName()).doc(String(material.id)).set(material);
        await carregarChaveFirebase("app_plataforma", []);

        document.getElementById("formAddMaterial").reset();
        ajustarCamposFormMaterial();
        await renderizarPlataformaEnsino();
        alert("Material publicado com sucesso. Registro salvo no Firebase e arquivo/link registrado na plataforma.");
    } catch (erro) {
        console.error("Erro ao publicar material:", erro);
        alert(`Erro ao publicar material.

${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2"></i>Publicar Material'; }
    }
}

async function alternarMaterialFeito(materialId, marcado) {
    if (!usuarioLogado) return alert("Você precisa estar logado para marcar materiais como feitos.");
    initFirebase();
    if (!firebaseFirestore) return alert("Cloud Firestore não inicializado.");

    try {
        const ref = firebaseFirestore.collection(getMateriaisCollectionName()).doc(String(materialId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Material não encontrado no Firestore.");

        const material = snap.data() || {};
        let concluidos = normalizarConclusoesMaterial(material);
        const uid = String(usuarioLogado.id || usuarioLogado.login || "");
        concluidos = concluidos.filter(item => String(item.usuarioId || item.id || item.login || "") !== uid);

        if (marcado) {
            concluidos.push({
                usuarioId: uid,
                usuarioNome: usuarioLogado.nome || "Usuário",
                usuarioNivel: usuarioLogado.nivel || "",
                concluidoEm: Date.now()
            });
        }

        await ref.update({ concluidos, atualizadoEm: Date.now() });
        await carregarChaveFirebase("app_plataforma", []);
        await renderizarPlataformaEnsino();
    } catch (erro) {
        console.error("Erro ao atualizar status do material:", erro);
        alert(`Erro ao atualizar status do material.

${erro.message || erro}`);
        await renderizarPlataformaEnsino();
    }
}

async function publicarInteracaoMaterial(materialId, event) {
    event.preventDefault();
    if (!usuarioLogado) return alert("Você precisa estar logado para interagir no fórum.");
    initFirebase();
    if (!firebaseFirestore) return alert("Cloud Firestore não inicializado.");

    const tipo = document.getElementById(`interacaoTipo_${materialId}`)?.value || "Comentário";
    const textoEl = document.getElementById(`interacaoTexto_${materialId}`);
    const imagemEl = document.getElementById(`interacaoImagem_${materialId}`);
    const texto = textoEl?.value.trim() || "";
    const btn = event.submitter;

    if (!texto) return alert("Escreva uma dúvida, resolução ou comentário.");

    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i>Enviando...'; }
        const ref = firebaseFirestore.collection(getMateriaisCollectionName()).doc(String(materialId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Material não encontrado no Firestore.");
        const material = snap.data() || {};
        const interacoes = Array.isArray(material.interacoes) ? [...material.interacoes] : [];

        const interacao = {
            id: novoId(),
            tipo,
            texto,
            criadoPor: usuarioLogado.nome || "Usuário",
            criadoPorId: usuarioLogado.id || "",
            criadoPorNivel: usuarioLogado.nivel || "",
            criadoEm: Date.now()
        };

        if (imagemEl?.files?.length) {
            const imagem = imagemEl.files[0];
            if (!String(imagem.type || "").startsWith("image/")) throw new Error("Anexe apenas imagens nas interações do fórum.");
            if (imagem.size / (1024 * 1024) > LIMITE_ANEXO_MONITORIA_MB) throw new Error(`Imagem muito grande. Use até ${LIMITE_ANEXO_MONITORIA_MB} MB.`);
            const upload = await enviarArquivoParaFirebaseStorage(imagem, "forum");
            interacao.imagemUrl = upload.fileUrl;
            interacao.storagePath = upload.storagePath;
            interacao.driveFileId = upload.storagePath; // compatibilidade com versões antigas
            interacao.nomeArquivo = upload.fileName || imagem.name;
            interacao.mimeType = imagem.type;
            interacao.tamanhoBytes = imagem.size;
        }

        interacoes.push(interacao);
        await ref.update({ interacoes, atualizadoEm: Date.now() });
        if (textoEl) textoEl.value = "";
        if (imagemEl) imagemEl.value = "";
        await carregarChaveFirebase("app_plataforma", []);
        await renderizarPlataformaEnsino();
    } catch (erro) {
        console.error("Erro ao enviar interação no fórum:", erro);
        alert(`Erro ao enviar interação.

${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i>Enviar no fórum'; }
    }
}

async function excluirMaterial(id) {
    if (!permissao("plataforma.podeGerenciar")) return;
    if (!confirmarExclusao("o material", "este item")) return;

    initFirebase();

    try {
        if (!firebaseFirestore) throw new Error("Cloud Firestore não inicializado");
        const docRef = firebaseFirestore.collection(getMateriaisCollectionName()).doc(String(id));
        const snap = await docRef.get();
        const material = snap.exists ? snap.data() : null;

        if (material?.storagePath || material?.driveFileId) {
            await excluirArquivoGoogleDrive(material.storagePath || material.driveFileId);
        }

        await docRef.delete();

        await carregarChaveFirebase("app_plataforma", []);

        await renderizarPlataformaEnsino();
        alert("Material removido da plataforma e arquivo removido do Firebase Storage.");
    } catch (erro) {
        console.error("Erro ao apagar material:", erro);
        alert(`Erro ao apagar material.\n\n${erro.message || erro}\n\nVerifique as regras do Firebase Storage se a exclusão for bloqueada.`);
    }
}

function ajustarCamposFormMaterial() {
    const tipo = document.getElementById("matTipo")?.value;
    const divUrl = document.getElementById("divMatUrl");
    const divArquivo = document.getElementById("divMatArquivo");
    const inputUrl = document.getElementById("matUrl");
    const inputArquivo = document.getElementById("matArquivo");
    if (!divUrl || !divArquivo) return;
    divUrl.classList.add("hidden");
    divArquivo.classList.add("hidden");
    if (inputUrl) inputUrl.required = false;
    if (inputArquivo) inputArquivo.required = false;
    if (tipo === "video" || tipo === "link") {
        divUrl.classList.remove("hidden");
        if (inputUrl) inputUrl.required = true;
    } else if (tipo === "arquivo") {
        divArquivo.classList.remove("hidden");
        if (inputArquivo) inputArquivo.required = true;
    }
}

// ==================== MONITORIA — FIREBASE REALTIME ====================

// ==================== EDITOR VISUAL DE LAYOUT ====================
const LAYOUT_PADRAO = {
    nomeLogin: "Avance Consultoria",
    subtituloLogin: "Plataforma de Resultados 2026",
    nomeSidebar: "Avance Olímpica",
    subtituloSidebar: "Módulo de Controle",
    corPrimaria: "#2563eb",
    corDestaque: "#60a5fa",
    corFundo: "#111827",
    corCard: "#1f2937",
    corBorda: "#374151",
    corFundoClaro: "#f8fafc",
    corCardClaro: "#ffffff",
    corBordaClaro: "#d1d5db",
    corTextoClaro: "#111827",
    corTextoSecundarioClaro: "#4b5563",
    logoUrl: "",
    bannerUrl: "",
    estiloVisual: "classico",
    densidade: "confortavel",
    raio: "medio",
    fonte: "sistema",
    fundoModo: "solido",
    fundoImagemUrl: "",
    fundoOpacidade: "0.08",
    bannerAltura: "180px",
    bannerPosicao: "center"
};
let layoutVisualAtual = { ...LAYOUT_PADRAO };

function layoutCollectionRef() {
    initFirebase();
    if (!firebaseFirestore) return null;
    return firebaseFirestore.collection("sistema_layout").doc("config");
}

async function carregarLayoutVisual() {
    const ref = layoutCollectionRef();
    if (!ref) {
        aplicarLayoutVisual(layoutVisualAtual);
        return layoutVisualAtual;
    }
    try {
        const snap = await ref.get();
        if (snap.exists) layoutVisualAtual = { ...LAYOUT_PADRAO, ...(snap.data() || {}) };
        else await ref.set({ ...LAYOUT_PADRAO, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        aplicarLayoutVisual(layoutVisualAtual);
        return layoutVisualAtual;
    } catch (erro) {
        console.warn("Não foi possível carregar layout visual.", erro);
        aplicarLayoutVisual(layoutVisualAtual);
        return layoutVisualAtual;
    }
}

function imagemOuIcone(slot, url, iconeClasse) {
    const el = document.getElementById(slot);
    if (!el) return;
    if (url) el.innerHTML = `<img src="${textoSeguro(url)}" alt="Logo">`;
    else el.innerHTML = `<i class="fa-solid ${iconeClasse}"></i>`;
}

function aplicarLayoutVisual(config = {}) {
    layoutVisualAtual = { ...LAYOUT_PADRAO, ...config };
    const c = layoutVisualAtual;

    const paresTexto = {
        brandLoginTitle: c.nomeLogin,
        brandLoginSubtitle: c.subtituloLogin,
        brandSidebarTitle: c.nomeSidebar,
        brandSidebarSubtitle: c.subtituloSidebar,
        layoutPreviewTitulo: c.nomeLogin,
        layoutPreviewSubtitulo: c.subtituloLogin
    };
    Object.entries(paresTexto).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = valor || "";
    });

    imagemOuIcone("brandLoginLogoSlot", c.logoUrl, "fa-graduation-cap text-3xl");
    imagemOuIcone("brandSidebarLogoSlot", c.logoUrl, "fa-chart-line text-sm");
    imagemOuIcone("layoutPreviewLogo", c.logoUrl, "fa-graduation-cap text-2xl");
    const previewBanner = document.getElementById("layoutPreviewBanner");
    if (previewBanner) {
        previewBanner.style.backgroundImage = c.bannerUrl ? `url('${c.bannerUrl}')` : "";
        previewBanner.style.height = c.bannerAltura || "180px";
        previewBanner.style.backgroundPosition = c.bannerPosicao || "center";
        previewBanner.style.backgroundSize = "cover";
        previewBanner.innerText = c.bannerUrl ? "" : "Banner institucional";
    }

    const fonteCss = {
        sistema: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        inter: "Inter, ui-sans-serif, system-ui, sans-serif",
        serifada: "Georgia, 'Times New Roman', serif",
        mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
    }[c.fonte] || "Inter, ui-sans-serif, system-ui, sans-serif";

    const raioCss = { reto: "0.5rem", suave: "0.75rem", medio: "1rem", forte: "1.5rem" }[c.raio] || "1rem";
    const paddingCss = { compacta: "0.75rem", confortavel: "1rem", ampla: "1.35rem" }[c.densidade] || "1rem";
    const gapCss = { compacta: "0.75rem", confortavel: "1rem", ampla: "1.35rem" }[c.densidade] || "1rem";

    const fundoBase = c.fundoModo === "gradiente"
        ? `radial-gradient(circle at top left, color-mix(in srgb, ${c.corPrimaria} 28%, transparent), transparent 32%), linear-gradient(135deg, ${c.corFundo}, color-mix(in srgb, ${c.corFundo} 78%, black))`
        : c.corFundo;

    const imagemFundoCss = c.fundoModo === "imagem" && c.fundoImagemUrl
        ? `body:not(.theme-light)::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: -1; background: url('${c.fundoImagemUrl}') center/cover no-repeat; opacity: ${c.fundoOpacidade || "0.08"}; }`
        : `body:not(.theme-light)::before { content: none; }`;

    const estiloExtra = {
        classico: "",
        glass: `body:not(.theme-light) .bg-gray-800, body:not(.theme-light) .bg-gray-900\\/40 { backdrop-filter: blur(16px); background-color: color-mix(in srgb, ${c.corCard} 72%, transparent) !important; }`,
        minimalista: `body:not(.theme-light) .shadow-xl, body:not(.theme-light) .shadow-2xl, body:not(.theme-light) .shadow-lg { box-shadow: none !important; } body:not(.theme-light) .border { border-width: 1px !important; }`,
        institucional: `body:not(.theme-light) h1, body:not(.theme-light) h2, body:not(.theme-light) h3 { letter-spacing: .04em; } body:not(.theme-light) .uppercase { letter-spacing: .09em; }`,
        olimpico: `.content-gradient { background-size: 200% 100%; animation: layoutGradientMove 7s ease-in-out infinite; } @keyframes layoutGradientMove { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`
    }[c.estiloVisual] || "";

    const style = document.getElementById("layoutDynamicStyle");
    if (style) {
        style.textContent = `
            body { font-family: ${fonteCss} !important; }
            body:not(.theme-light) { background: ${fundoBase} !important; background-attachment: fixed !important; }
            ${imagemFundoCss}
            body:not(.theme-light) .bg-gray-900 { background-color: ${c.corFundo} !important; }
            body:not(.theme-light) .bg-gray-950 { background-color: color-mix(in srgb, ${c.corFundo} 78%, black) !important; }
            body:not(.theme-light) .bg-gray-800 { background-color: ${c.corCard} !important; }
            body:not(.theme-light) .bg-gray-800\/40, body:not(.theme-light) .bg-gray-800\/50 { background-color: color-mix(in srgb, ${c.corCard} 82%, transparent) !important; }
            body:not(.theme-light) .border-gray-700, body:not(.theme-light) .border-gray-800 { border-color: ${c.corBorda} !important; }
            body.theme-light { background: ${c.corFundoClaro || "#f8fafc"} !important; color: ${c.corTextoClaro || "#111827"} !important; }
            body.theme-light .bg-gray-900, body.theme-light .bg-gray-950 { background-color: ${c.corFundoClaro || "#f8fafc"} !important; }
            body.theme-light .bg-gray-800, body.theme-light .bg-gray-800\/40, body.theme-light .bg-gray-800\/50, body.theme-light .bg-gray-900\/40, body.theme-light .bg-gray-900\/50 { background-color: ${c.corCardClaro || "#ffffff"} !important; }
            body.theme-light .border-gray-700, body.theme-light .border-gray-800 { border-color: ${c.corBordaClaro || "#d1d5db"} !important; }
            body.theme-light .text-white, body.theme-light .text-gray-100, body.theme-light .text-gray-200, body.theme-light .text-gray-300 { color: ${c.corTextoClaro || "#111827"} !important; }
            body.theme-light .text-gray-400, body.theme-light .text-gray-500 { color: ${c.corTextoSecundarioClaro || "#4b5563"} !important; }
            body.theme-light input, body.theme-light select, body.theme-light textarea { background-color: ${c.corCardClaro || "#ffffff"} !important; color: ${c.corTextoClaro || "#111827"} !important; border-color: ${c.corBordaClaro || "#d1d5db"} !important; }
            .bg-blue-600, .hover\\:bg-blue-700:hover { background-color: ${c.corPrimaria} !important; }
            .text-blue-400 { color: ${c.corDestaque} !important; }
            .border-blue-500\/20, .border-blue-700, .focus\\:border-blue-500:focus { border-color: ${c.corDestaque} !important; }
            .bg-blue-500\/10, .bg-blue-500\/20 { background-color: color-mix(in srgb, ${c.corPrimaria} 18%, transparent) !important; }
            .content-gradient { background-image: linear-gradient(90deg, ${c.corPrimaria}, ${c.corDestaque}) !important; }
            .rounded-xl, .rounded-2xl, .rounded-lg { border-radius: ${raioCss} !important; }
            main.space-y-8, .space-y-8 { gap: ${gapCss} !important; }
            body:not(.theme-light) .p-6 { padding: ${paddingCss} !important; }
            .brand-banner-preview { height: ${c.bannerAltura || "180px"} !important; background-position: ${c.bannerPosicao || "center"} !important; background-size: cover !important; }
            ${estiloExtra}
        `;
    }
}

function lerLayoutDoFormulario() {
    return {
        nomeLogin: document.getElementById("layoutNomeLogin")?.value?.trim() || LAYOUT_PADRAO.nomeLogin,
        subtituloLogin: document.getElementById("layoutSubtituloLogin")?.value?.trim() || LAYOUT_PADRAO.subtituloLogin,
        nomeSidebar: document.getElementById("layoutNomeSidebar")?.value?.trim() || LAYOUT_PADRAO.nomeSidebar,
        subtituloSidebar: document.getElementById("layoutSubtituloSidebar")?.value?.trim() || LAYOUT_PADRAO.subtituloSidebar,
        corPrimaria: document.getElementById("layoutCorPrimaria")?.value || LAYOUT_PADRAO.corPrimaria,
        corDestaque: document.getElementById("layoutCorDestaque")?.value || LAYOUT_PADRAO.corDestaque,
        corFundo: document.getElementById("layoutCorFundo")?.value || LAYOUT_PADRAO.corFundo,
        corCard: document.getElementById("layoutCorCard")?.value || LAYOUT_PADRAO.corCard,
        corBorda: document.getElementById("layoutCorBorda")?.value || LAYOUT_PADRAO.corBorda,
        corFundoClaro: document.getElementById("layoutCorFundoClaro")?.value || LAYOUT_PADRAO.corFundoClaro,
        corCardClaro: document.getElementById("layoutCorCardClaro")?.value || LAYOUT_PADRAO.corCardClaro,
        corBordaClaro: document.getElementById("layoutCorBordaClaro")?.value || LAYOUT_PADRAO.corBordaClaro,
        logoUrl: document.getElementById("layoutLogoUrl")?.value?.trim() || "",
        bannerUrl: document.getElementById("layoutBannerUrl")?.value?.trim() || "",
        estiloVisual: document.getElementById("layoutEstiloVisual")?.value || LAYOUT_PADRAO.estiloVisual,
        densidade: document.getElementById("layoutDensidade")?.value || LAYOUT_PADRAO.densidade,
        raio: document.getElementById("layoutRaio")?.value || LAYOUT_PADRAO.raio,
        fonte: document.getElementById("layoutFonte")?.value || LAYOUT_PADRAO.fonte,
        fundoModo: document.getElementById("layoutFundoModo")?.value || LAYOUT_PADRAO.fundoModo,
        fundoImagemUrl: document.getElementById("layoutFundoImagemUrl")?.value?.trim() || "",
        fundoOpacidade: document.getElementById("layoutFundoOpacidade")?.value || LAYOUT_PADRAO.fundoOpacidade,
        bannerAltura: document.getElementById("layoutBannerAltura")?.value || LAYOUT_PADRAO.bannerAltura,
        bannerPosicao: document.getElementById("layoutBannerPosicao")?.value || LAYOUT_PADRAO.bannerPosicao
    };
}

function preencherFormularioLayout(config = layoutVisualAtual) {
    const c = { ...LAYOUT_PADRAO, ...config };
    const valores = {
        layoutNomeLogin: c.nomeLogin,
        layoutSubtituloLogin: c.subtituloLogin,
        layoutNomeSidebar: c.nomeSidebar,
        layoutSubtituloSidebar: c.subtituloSidebar,
        layoutCorPrimaria: c.corPrimaria,
        layoutCorDestaque: c.corDestaque,
        layoutCorFundo: c.corFundo,
        layoutCorCard: c.corCard,
        layoutCorBorda: c.corBorda,
        layoutCorFundoClaro: c.corFundoClaro,
        layoutCorCardClaro: c.corCardClaro,
        layoutCorBordaClaro: c.corBordaClaro,
        layoutLogoUrl: c.logoUrl,
        layoutBannerUrl: c.bannerUrl,
        layoutEstiloVisual: c.estiloVisual,
        layoutDensidade: c.densidade,
        layoutRaio: c.raio,
        layoutFonte: c.fonte,
        layoutFundoModo: c.fundoModo,
        layoutFundoImagemUrl: c.fundoImagemUrl,
        layoutFundoOpacidade: c.fundoOpacidade,
        layoutBannerAltura: c.bannerAltura,
        layoutBannerPosicao: c.bannerPosicao
    };
    Object.entries(valores).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.value = valor || "";
    });
    aplicarLayoutVisual(c);
}

function prepararEditorLayout() {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    preencherFormularioLayout(layoutVisualAtual);
}

function aplicarPaletaRapidaLayout(paleta) {
    const paletas = {
        azul: { corPrimaria: "#2563eb", corDestaque: "#60a5fa", corFundo: "#111827", corCard: "#1f2937", corBorda: "#374151" },
        roxo: { corPrimaria: "#7c3aed", corDestaque: "#a78bfa", corFundo: "#111827", corCard: "#211a32", corBorda: "#4c1d95" },
        verde: { corPrimaria: "#059669", corDestaque: "#34d399", corFundo: "#0f172a", corCard: "#16251f", corBorda: "#065f46" },
        dourado: { corPrimaria: "#b45309", corDestaque: "#fbbf24", corFundo: "#111827", corCard: "#241d14", corBorda: "#92400e" },
        vermelho: { corPrimaria: "#dc2626", corDestaque: "#f87171", corFundo: "#111827", corCard: "#281818", corBorda: "#7f1d1d" }
    };
    if (!paletas[paleta]) return;
    Object.entries(paletas[paleta]).forEach(([campo, valor]) => {
        const id = {
            corPrimaria: "layoutCorPrimaria", corDestaque: "layoutCorDestaque", corFundo: "layoutCorFundo", corCard: "layoutCorCard", corBorda: "layoutCorBorda"
        }[campo];
        const el = document.getElementById(id);
        if (el) el.value = valor;
    });
    previsualizarLayoutVisual();
}

function previsualizarLayoutVisual() {
    aplicarLayoutVisual(lerLayoutDoFormulario());
}

async function uploadArquivoLayout(inputId, tipo) {
    const input = document.getElementById(inputId);
    const arquivo = input?.files?.[0];
    if (!arquivo) return "";
    initFirebase();
    if (!firebaseStorage) throw new Error("Firebase Storage não inicializado.");
    if (!arquivo.type.startsWith("image/")) throw new Error("Use apenas arquivo de imagem para o layout.");
    const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const caminho = `layout/${tipo}_${Date.now()}_${nomeSeguro}`;
    const ref = firebaseStorage.ref().child(caminho);
    try {
        const snap = await ref.put(arquivo, { contentType: arquivo.type });
        return await snap.ref.getDownloadURL();
    } catch (erro) {
        if (String(erro?.code || erro?.message || "").includes("unauthorized")) {
            throw new Error("Firebase Storage bloqueou o upload. Publique as regras do Storage permitindo a pasta layout/ e confira se o Storage está ativo.");
        }
        throw erro;
    }
}

async function salvarLayoutVisual(event) {
    event?.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    const btn = event?.target?.querySelector('button[type="submit"]');
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Salvando...'; }
        const config = lerLayoutDoFormulario();
        const novaLogo = await uploadArquivoLayout("layoutLogoArquivo", "logo");
        const novoBanner = await uploadArquivoLayout("layoutBannerArquivo", "banner");
        const novaImagemFundo = await uploadArquivoLayout("layoutFundoImagemArquivo", "fundo");
        if (novaLogo) config.logoUrl = novaLogo;
        if (novoBanner) config.bannerUrl = novoBanner;
        if (novaImagemFundo) {
            config.fundoImagemUrl = novaImagemFundo;
            config.fundoModo = "imagem";
        }
        const ref = layoutCollectionRef();
        if (!ref) throw new Error("Firestore não inicializado.");
        await ref.set({ ...config, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(), atualizadoPorId: usuarioLogado.id, atualizadoPorNome: usuarioLogado.nome }, { merge: true });
        layoutVisualAtual = { ...LAYOUT_PADRAO, ...config };
        preencherFormularioLayout(layoutVisualAtual);
        alert("Layout salvo com sucesso.");
    } catch (erro) {
        console.error("Erro ao salvar layout", erro);
        alert(`Erro ao salvar layout.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Salvar layout'; }
    }
}

async function resetarLayoutVisual() {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    if (!confirm("Restaurar o layout padrão da plataforma?")) return;
    const ref = layoutCollectionRef();
    if (!ref) return alert("Firestore não inicializado.");
    await ref.set({ ...LAYOUT_PADRAO, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(), atualizadoPorId: usuarioLogado.id, atualizadoPorNome: usuarioLogado.nome }, { merge: true });
    layoutVisualAtual = { ...LAYOUT_PADRAO };
    preencherFormularioLayout(layoutVisualAtual);
    alert("Layout padrão restaurado.");
}

function initFirebase() {
    if (firebaseApp && firebaseFirestore && firebaseStorage && firebaseAuth) return;

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
        if (!firebaseAuth && firebase.auth) firebaseAuth = firebase.auth();
        if (firebase.analytics) { try { firebase.analytics(); } catch (_) {} }
        if (firebaseFirestore) {
            firebaseFirestore.collection("sistema_debug").doc("ultimo_acesso").set({
                quando: firebase.firestore.FieldValue.serverTimestamp(),
                origem: "app_firestore_sem_armazenamento_local"
            }, { merge: true }).catch(e => console.error("Debug Firestore falhou:", e));
        }
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

// ==================== CENTRAL DE RELATÓRIOS CRIATIVOS ====================
let relatorioCriativoAtual = null;

function initRelatoriosCriativos() {
    document.getElementById("btnGerarRelatorioCriativo")?.addEventListener("click", gerarRelatorioCriativo);
    document.getElementById("btnExportarRelatorioPDF")?.addEventListener("click", () => exportarRelatorioCriativo("pdf"));
    document.getElementById("btnExportarRelatorioDOCX")?.addEventListener("click", () => exportarRelatorioCriativo("docx"));
    document.getElementById("btnExportarRelatorioXLSX")?.addEventListener("click", () => exportarRelatorioCriativo("xlsx"));
    ["relTipoCriativo", "relTomCriativo", "relProfundidadeCriativo"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", () => { relatorioCriativoAtual = null; });
    });
}

function textoTomRelatorio(tom) {
    const mapa = {
        gestao: "Gestão / Direção",
        institucional: "Institucional / Prefeitura",
        pedagogico: "Pedagógico / Coordenação",
        familias: "Famílias e comunidade",
        aluno: "Aluno / motivacional"
    };
    return mapa[tom] || "Gestão / Direção";
}

function perfilNarrativoRelatorio(tom) {
    const mapa = {
        gestao: "leitura objetiva para tomada de decisão, priorização de recursos e acompanhamento de indicadores",
        institucional: "prestação de contas com linguagem institucional, valorizando alcance, transparência e impacto público",
        pedagogico: "análise didática para coordenação, professores e planejamento de intervenções",
        familias: "comunicação clara para famílias, destacando evolução, participação e próximos passos",
        aluno: "devolutiva motivacional, simples e orientada a metas de estudo"
    };
    return mapa[tom] || mapa.gestao;
}

function valorRelatorio(id, padrao = "") { return document.getElementById(id)?.value || padrao; }

function filtroEscopoDescricaoRelatorio() {
    const cidade = valorRelatorio("relFiltroCidade", "TODAS");
    const escola = valorRelatorio("relFiltroEscola", "TODAS");
    if (cidade !== "TODAS" && escola !== "TODAS") return `${escola} — ${cidade}`;
    if (cidade !== "TODAS") return `Cidade: ${cidade}`;
    if (escola !== "TODAS") return `Escola: ${escola}`;
    return "Todos os dados permitidos pelo escopo do usuário";
}

async function carregarDadosMultianuaisRelatorio(anos) {
    const chaves = ["app_premiados", "app_alunos", "app_olimpiadas", "app_cronograma", "app_plataforma"];
    const resultado = { premiados: [], alunos: [], olimpiadas: [], cronograma: [], plataforma: [] };
    const mapa = { app_premiados: "premiados", app_alunos: "alunos", app_olimpiadas: "olimpiadas", app_cronograma: "cronograma", app_plataforma: "plataforma" };
    for (const chave of chaves) {
        const pacotes = await Promise.all(anos.map(async ano => {
            try {
                const lista = await carregarColecaoAnualRelatorio(ano, chave);
                return lista.map(item => ({ ...item, ano }));
            } catch (_) { return []; }
        }));
        resultado[mapa[chave]] = pacotes.flat();
    }
    return resultado;
}

function filtrarListaPorEscopoResultado(lista) {
    return lista.filter(item => {
        if (item.municipio || item.escola) return resultadoDentroDoEscopoUsuario(item);
        return true;
    });
}

function contagemPorCampo(lista, campo, limite = 10) {
    const mapa = new Map();
    lista.forEach(item => {
        const valor = item[campo] || "Não informado";
        mapa.set(valor, (mapa.get(valor) || 0) + 1);
    });
    return Array.from(mapa.entries()).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)).slice(0, limite);
}

function tabelaPremiosPorAno(premiados, anos) { return agregarPorAno(premiados, anos).map(l => ({ Ano: l.ano, Total: l.total, Ouro: l.ouro, Prata: l.prata, Bronze: l.bronze, "Menção": l.mencao })); }
function tabelaRankingCidade(premiados) { return agregarRanking(premiados, "municipio").slice(0, 20).map((r, i) => ({ "#": i + 1, Cidade: r.nome, Medalhas: r.total, "Melhor ano": melhorAnoTexto(r.porAno) })); }
function tabelaRankingEscola(premiados) { return agregarRanking(premiados, "escola", "municipio").slice(0, 30).map((r, i) => ({ "#": i + 1, Escola: r.nome, Cidade: r.secundario || "—", Medalhas: r.total, "Melhor ano": melhorAnoTexto(r.porAno) })); }
function tabelaOlimpiadas(premiados) { return contagemPorCampo(premiados, "olimpiada", 30).map((r, i) => ({ "#": i + 1, Olimpíada: r.nome, Resultados: r.total })); }

function gerarInsightCrescimento(porAno) {
    if (!porAno.length) return "Ainda não há resultados suficientes para produzir leitura de crescimento.";
    const primeiro = porAno[0];
    const ultimo = porAno[porAno.length - 1];
    const delta = ultimo.total - primeiro.total;
    if (delta > 0) return `Crescimento positivo no período: ${primeiro.total} resultado(s) em ${primeiro.ano} para ${ultimo.total} em ${ultimo.ano}, um ganho de ${delta}.`;
    if (delta < 0) return `Atenção: houve queda no período, de ${primeiro.total} resultado(s) em ${primeiro.ano} para ${ultimo.total} em ${ultimo.ano}.`;
    return `Estabilidade no período: ${primeiro.total} resultado(s) no início e no fim da série.`;
}

function resumoExecutivoTexto(dados, anos, tom) {
    const premiosFiltrados = aplicarFiltrosRelatorio(dados.premiados);
    const porAno = agregarPorAno(premiosFiltrados, anos);
    const total = premiosFiltrados.length;
    const alunos = filtrarListaPorEscopoResultado(dados.alunos).length;
    const olimpiadasComResultado = new Set(premiosFiltrados.map(r => r.olimpiada).filter(Boolean)).size;
    const escolas = new Set(premiosFiltrados.map(r => r.escola).filter(Boolean)).size;
    const melhor = porAno.slice().sort((a, b) => b.total - a.total)[0];
    return {
        cards: [
            { nome: "Resultados no período", valor: total },
            { nome: "Alunos cadastrados", valor: alunos },
            { nome: "Escolas com resultado", valor: escolas },
            { nome: "Olimpíadas com resultado", valor: olimpiadasComResultado },
            { nome: "Melhor ano", valor: melhor && melhor.total ? `${melhor.ano} (${melhor.total})` : "—" }
        ],
        insights: [
            `Este documento foi gerado em perfil ${textoTomRelatorio(tom).toLowerCase()}, com foco em ${perfilNarrativoRelatorio(tom)}.`,
            gerarInsightCrescimento(porAno),
            total ? `O ranking por escola e cidade permite identificar polos fortes e pontos que precisam de reforço pedagógico.` : `Ainda não há dados suficientes de resultados para comparação.`
        ],
        tabelas: [
            { titulo: "Evolução anual de resultados", linhas: tabelaPremiosPorAno(premiosFiltrados, anos) },
            { titulo: "Ranking por cidade", linhas: tabelaRankingCidade(premiosFiltrados) },
            { titulo: "Ranking por escola", linhas: tabelaRankingEscola(premiosFiltrados) },
            { titulo: "Olimpíadas com mais resultados", linhas: tabelaOlimpiadas(premiosFiltrados) }
        ]
    };
}

function montarRelatorioPorTipo(tipo, dados, anos, tom, profundidade) {
    const premios = aplicarFiltrosRelatorio(dados.premiados);
    const alunos = filtrarListaPorEscopoResultado(dados.alunos);
    const olimpiadas = dados.olimpiadas;
    const cronograma = dados.cronograma;
    const plataforma = dados.plataforma;
    const base = resumoExecutivoTexto(dados, anos, tom);
    const periodo = `${anos[0]} a ${anos[anos.length - 1]}`;
    const responsavel = valorRelatorio("relResponsavelCriativo", "Coordenação Olímpica");

    const modelos = {
        executivo: { titulo: "Panorama Executivo de Resultados Olímpicos", subtitulo: "visão consolidada para gestão e tomada de decisão" },
        cidade: { titulo: "Dossiê de Desempenho por Cidade", subtitulo: "leitura territorial dos resultados e crescimento" },
        escola: { titulo: "Raio-X de Desempenho por Escola", subtitulo: "comparativo institucional e ranking de escolas" },
        alunos: { titulo: "Mapa de Alunos Olímpicos", subtitulo: "cadastro, distribuição e potencial de acompanhamento" },
        olimpiadas: { titulo: "Catálogo Estratégico de Olimpíadas", subtitulo: "funil de competições, áreas e abrangência" },
        calendario: { titulo: "Radar Operacional do Calendário", subtitulo: "prazos, etapas e riscos de execução" },
        plataforma: { titulo: "Relatório de Engajamento da Plataforma", subtitulo: "materiais, fórum, participação e pendências" },
        prestacao: { titulo: "Relatório de Prestação de Contas", subtitulo: "síntese institucional de entregas, alcance e resultados" }
    };
    const meta = modelos[tipo] || modelos.executivo;
    const rel = {
        tipo, titulo: meta.titulo, subtitulo: meta.subtitulo, periodo, escopo: filtroEscopoDescricaoRelatorio(), tom: textoTomRelatorio(tom), profundidade, responsavel,
        criadoEm: new Date().toLocaleString("pt-BR"), cards: base.cards, insights: [...base.insights], tabelas: [...base.tabelas]
    };

    if (tipo === "alunos") {
        rel.cards = [
            { nome: "Alunos cadastrados", valor: alunos.length },
            { nome: "Escolas representadas", valor: new Set(alunos.map(a => a.escolaNome || a.escola || a.escolaId).filter(Boolean)).size },
            { nome: "Séries diferentes", valor: new Set(alunos.map(a => a.serie).filter(Boolean)).size },
            { nome: "Com CPF registrado", valor: alunos.filter(a => a.cpf).length }
        ];
        rel.insights.push("Este relatório ajuda a conferir base de alunos, distribuição por série e escolas com maior potencial de participação.");
        rel.tabelas = [
            { titulo: "Alunos por escola", linhas: contagemPorCampo(alunos, "escolaNome", 30) },
            { titulo: "Alunos por série", linhas: contagemPorCampo(alunos, "serie", 20) },
            { titulo: "Alunos por sexo", linhas: contagemPorCampo(alunos, "sexo", 10) }
        ];
    }

    if (tipo === "olimpiadas") {
        rel.cards = [
            { nome: "Olimpíadas homologadas", valor: olimpiadas.length },
            { nome: "Ativas", valor: olimpiadas.filter(o => o.status === "Ativa").length },
            { nome: "Áreas diferentes", valor: new Set(olimpiadas.flatMap(o => Array.isArray(o.areas) ? o.areas : [o.categoria || o.area]).filter(Boolean)).size },
            { nome: "Internacionais associadas", valor: olimpiadas.filter(o => o.olimpiadaInternacionalAssociada && o.olimpiadaInternacionalAssociada !== "Nenhuma").length }
        ];
        rel.insights.push("O catálogo mostra se a estratégia está concentrada em poucas áreas ou distribuída em um funil olímpico mais amplo.");
        rel.tabelas = [
            { titulo: "Olimpíadas por status", linhas: contagemPorCampo(olimpiadas, "status", 10) },
            { titulo: "Olimpíadas por abrangência", linhas: contagemPorCampo(olimpiadas, "abrangencia", 10) },
            { titulo: "Olimpíadas cadastradas", linhas: olimpiadas.slice(0, 80).map(o => ({ Nome: o.nome, Sigla: o.categoria || o.sigla || "—", Status: o.status || "—", Abrangência: o.abrangencia || "—", Área: Array.isArray(o.areas) ? o.areas.join(", ") : (o.area || o.categoria || "—") })) }
        ];
    }

    if (tipo === "calendario") {
        const eventosOrdenados = [...cronograma].sort((a, b) => classificarTemporalCronograma(a).ordem - classificarTemporalCronograma(b).ordem || classificarTemporalCronograma(a).dataBase - classificarTemporalCronograma(b).dataBase);
        rel.cards = [
            { nome: "Eventos cadastrados", valor: cronograma.length },
            { nome: "Próximos 30 dias", valor: cronograma.filter(e => classificarTemporalCronograma(e).codigo === "proximo").length },
            { nome: "Futuros", valor: cronograma.filter(e => classificarTemporalCronograma(e).codigo === "futuro").length },
            { nome: "Já aconteceram", valor: cronograma.filter(e => classificarTemporalCronograma(e).codigo === "passado").length }
        ];
        rel.insights.push("O radar operacional prioriza o que precisa de ação imediata, separando eventos próximos, futuros e vencidos.");
        rel.tabelas = [
            { titulo: "Eventos por grupo de etapa", linhas: contagemPorCampo(cronograma, "etapaGrupoNome", 20) },
            { titulo: "Radar de eventos", linhas: eventosOrdenados.slice(0, 80).map(e => ({ Status: classificarTemporalCronograma(e).label, Olimpíada: nomeOlimpiadaPorId(e.olimpiadaId) || e.olimpiada || "—", Etapa: e.etapa || "—", Data: e.data || "—", Ação: e.acao || "—" })) }
        ];
    }

    if (tipo === "plataforma") {
        const concluidos = plataforma.reduce((acc, m) => acc + Object.keys(m.concluidos || {}).length, 0);
        const interacoes = plataforma.reduce((acc, m) => acc + (Array.isArray(m.interacoes) ? m.interacoes.length : 0), 0);
        rel.cards = [
            { nome: "Materiais publicados", valor: plataforma.length },
            { nome: "Marcações de feito", valor: concluidos },
            { nome: "Interações no fórum", valor: interacoes },
            { nome: "Disciplinas", valor: new Set(plataforma.map(m => m.disciplina).filter(Boolean)).size }
        ];
        rel.insights.push("Este relatório permite enxergar se a plataforma está sendo usada como biblioteca ativa ou apenas como repositório passivo.");
        rel.tabelas = [
            { titulo: "Materiais por disciplina", linhas: contagemPorCampo(plataforma, "disciplina", 20) },
            { titulo: "Materiais por tipo", linhas: contagemPorCampo(plataforma, "tipoMaterial", 20) },
            { titulo: "Materiais com maior engajamento", linhas: plataforma.map(m => ({ Material: m.titulo || m.nome || "Sem título", Disciplina: m.disciplina || "—", Tipo: m.tipoMaterial || "—", Feitos: Object.keys(m.concluidos || {}).length, Interações: Array.isArray(m.interacoes) ? m.interacoes.length : 0 })).sort((a,b)=> (b.Feitos+b.Interações)-(a.Feitos+a.Interações)).slice(0,30) }
        ];
    }

    if (tipo === "cidade") rel.insights.push("Use este dossiê para comparar cidades, justificar expansão do projeto e identificar polos que precisam de reforço.");
    if (tipo === "escola") rel.insights.push("Use este raio-X para conversar com direções escolares e acompanhar evolução por unidade.");
    if (tipo === "prestacao") rel.insights.push("Este formato é adequado para anexar em prestação de contas, reuniões institucionais e apresentação de impacto.");

    if (profundidade === "resumo") rel.tabelas = rel.tabelas.slice(0, 2).map(t => ({ ...t, linhas: t.linhas.slice(0, 12) }));
    if (profundidade === "analitico") rel.tabelas = rel.tabelas.slice(0, 4).map(t => ({ ...t, linhas: t.linhas.slice(0, 35) }));
    return rel;
}

async function gerarRelatorioCriativo() {
    const btn = document.getElementById("btnGerarRelatorioCriativo");
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Gerando...'; }
        await gerarRelatoriosComparativos();
        const anos = anosSelecionadosRelatorio();
        const dados = await carregarDadosMultianuaisRelatorio(anos);
        relatorioCriativoAtual = montarRelatorioPorTipo(valorRelatorio("relTipoCriativo", "executivo"), dados, anos, valorRelatorio("relTomCriativo", "gestao"), valorRelatorio("relProfundidadeCriativo", "analitico"));
        renderizarPreviewRelatorioCriativo(relatorioCriativoAtual);
    } catch (erro) {
        console.error("Erro ao gerar relatório criativo", erro);
        alert(`Erro ao gerar relatório.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Gerar peça'; }
    }
}

function renderizarPreviewRelatorioCriativo(rel) {
    const alvo = document.getElementById("relPreviewCriativo");
    if (!alvo || !rel) return;
    alvo.innerHTML = `
        <div class="rounded-2xl border border-purple-900/40 bg-gray-950/50 p-5">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                    <p class="text-[11px] uppercase tracking-[0.25em] text-purple-400 font-black">${textoSeguro(rel.tom)} · ${textoSeguro(rel.periodo)}</p>
                    <h2 class="text-2xl font-black text-white mt-1">${textoSeguro(rel.titulo)}</h2>
                    <p class="text-sm text-gray-400 mt-1">${textoSeguro(rel.subtitulo)}</p>
                </div>
                <div class="text-xs text-gray-500 lg:text-right"><p>Escopo: ${textoSeguro(rel.escopo)}</p><p>Responsável: ${textoSeguro(rel.responsavel)}</p><p>Gerado em: ${textoSeguro(rel.criadoEm)}</p></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
                ${rel.cards.map(c => `<div class="bg-gray-900 border border-gray-800 rounded-xl p-3"><p class="text-[10px] text-gray-500 uppercase font-bold">${textoSeguro(c.nome)}</p><p class="text-xl font-black text-white mt-1">${textoSeguro(c.valor)}</p></div>`).join("")}
            </div>
            <div class="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
                ${rel.insights.map(i => `<div class="bg-purple-950/20 border border-purple-900/30 rounded-xl p-3 text-sm text-gray-300"><i class="fa-solid fa-lightbulb text-purple-400 mr-2"></i>${textoSeguro(i)}</div>`).join("")}
            </div>
        </div>
        ${rel.tabelas.map(t => `<div class="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden"><div class="p-4 border-b border-gray-700 bg-gray-800/60"><h3 class="text-sm font-bold text-white uppercase tracking-wider">${textoSeguro(t.titulo)}</h3></div>${htmlTabelaRelatorio(t.linhas)}</div>`).join("")}
    `;
}

function htmlTabelaRelatorio(linhas) {
    if (!linhas || !linhas.length) return `<div class="p-6 text-center text-gray-500">Sem dados para esta tabela.</div>`;
    const cols = Object.keys(linhas[0]);
    return `<div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-gray-900/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider">${cols.map(c => `<th class="p-3">${textoSeguro(c)}</th>`).join("")}</tr></thead><tbody class="divide-y divide-gray-700/40 text-sm text-gray-300">${linhas.map(l => `<tr>${cols.map(c => `<td class="p-3">${textoSeguro(l[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

async function garantirRelatorioCriativoAtual() {
    if (!relatorioCriativoAtual) await gerarRelatorioCriativo();
    if (!relatorioCriativoAtual) throw new Error("Relatório não foi gerado.");
    return relatorioCriativoAtual;
}

function nomeArquivoRelatorio(rel, ext) {
    const base = String(rel.titulo || "relatorio").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();
    return `${base}_${rel.periodo.replace(/\s+/g, "")}.${ext}`;
}

async function exportarRelatorioCriativo(formato) {
    try {
        const rel = await garantirRelatorioCriativoAtual();
        if (formato === "pdf") return exportarRelatorioPDF(rel);
        if (formato === "docx") return exportarRelatorioDOCX(rel);
        if (formato === "xlsx") return exportarRelatorioXLSX(rel);
    } catch (erro) {
        console.error("Erro ao exportar relatório", erro);
        alert(`Erro ao exportar relatório.\n\n${erro.message || erro}`);
    }
}

function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nomeArquivo; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportarRelatorioPDF(rel) {
    if (!window.jspdf?.jsPDF) throw new Error("Biblioteca jsPDF não carregada.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margem = 42; let y = 48; const largura = 512;
    const addText = (txt, size = 10, bold = false, cor = [30,30,30]) => {
        doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...cor);
        const linhas = doc.splitTextToSize(String(txt ?? ""), largura);
        linhas.forEach(l => { if (y > 780) { doc.addPage(); y = 48; } doc.text(l, margem, y); y += size + 5; });
    };
    doc.setFillColor(31, 41, 55); doc.rect(0, 0, 595, 110, "F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text(rel.titulo, margem, 45);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`${rel.subtitulo} · ${rel.periodo}`, margem, 66); doc.text(`Escopo: ${rel.escopo}`, margem, 84);
    y = 135;
    addText("Indicadores principais", 13, true, [31,41,55]);
    rel.cards.forEach(c => addText(`${c.nome}: ${c.valor}`, 10, true)); y += 6;
    addText("Leitura interpretativa", 13, true, [31,41,55]);
    rel.insights.forEach(i => addText(`• ${i}`, 10)); y += 6;
    rel.tabelas.forEach(t => {
        addText(t.titulo, 13, true, [31,41,55]);
        const linhas = t.linhas || [];
        if (!linhas.length) { addText("Sem dados."); return; }
        const cols = Object.keys(linhas[0]).slice(0, 5);
        addText(cols.join(" | "), 8, true);
        linhas.slice(0, 25).forEach(l => addText(cols.map(c => l[c]).join(" | "), 8));
        y += 8;
    });
    doc.save(nomeArquivoRelatorio(rel, "pdf"));
}

async function exportarRelatorioDOCX(rel) {
    if (!window.docx) throw new Error("Biblioteca DOCX não carregada.");
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = window.docx;
    const children = [
        new Paragraph({ text: rel.titulo, heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: `${rel.subtitulo} · ${rel.periodo}`, italics: true })] }),
        new Paragraph({ text: `Escopo: ${rel.escopo}` }),
        new Paragraph({ text: `Responsável: ${rel.responsavel} · Gerado em ${rel.criadoEm}` }),
        new Paragraph({ text: "Indicadores principais", heading: HeadingLevel.HEADING_1 }),
        ...rel.cards.map(c => new Paragraph({ children: [new TextRun({ text: `${c.nome}: `, bold: true }), new TextRun(String(c.valor))] })),
        new Paragraph({ text: "Leitura interpretativa", heading: HeadingLevel.HEADING_1 }),
        ...rel.insights.map(i => new Paragraph({ text: `• ${i}` }))
    ];
    rel.tabelas.forEach(t => {
        children.push(new Paragraph({ text: t.titulo, heading: HeadingLevel.HEADING_1 }));
        if (!t.linhas?.length) { children.push(new Paragraph("Sem dados.")); return; }
        const cols = Object.keys(t.linhas[0]).slice(0, 6);
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
            new TableRow({ children: cols.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })] })) }),
            ...t.linhas.slice(0, 40).map(l => new TableRow({ children: cols.map(c => new TableCell({ children: [new Paragraph(String(l[c] ?? ""))] })) }))
        ] }));
    });
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    baixarBlob(blob, nomeArquivoRelatorio(rel, "docx"));
}

async function exportarRelatorioXLSX(rel) {
    if (typeof ExcelJS === "undefined") throw new Error("ExcelJS não carregado.");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Plataforma Olímpica";
    const resumo = wb.addWorksheet("Resumo");
    resumo.addRows([[rel.titulo], [rel.subtitulo], ["Período", rel.periodo], ["Escopo", rel.escopo], ["Tom", rel.tom], ["Responsável", rel.responsavel], [], ["Indicador", "Valor"], ...rel.cards.map(c => [c.nome, c.valor]), [], ["Leituras"], ...rel.insights.map(i => [i])]);
    resumo.getColumn(1).width = 42; resumo.getColumn(2).width = 24;
    rel.tabelas.forEach((t, idx) => {
        const nome = (t.titulo || `Tabela ${idx+1}`).slice(0, 28).replace(/[\\/?*\[\]:]/g, "");
        const ws = wb.addWorksheet(nome || `Tabela ${idx+1}`);
        if (!t.linhas?.length) { ws.addRow(["Sem dados"]); return; }
        const cols = Object.keys(t.linhas[0]);
        ws.addRow(cols);
        t.linhas.forEach(l => ws.addRow(cols.map(c => l[c] ?? "")));
        formatarPlanilhaModelo(ws, cols.length);
    });
    await baixarWorkbookExcelJS(wb, nomeArquivoRelatorio(rel, "xlsx"));
}

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
window.publicarInteracaoMaterial = publicarInteracaoMaterial;
window.alternarMaterialFeito = alternarMaterialFeito;
window.renderizarPlataformaEnsino = renderizarPlataformaEnsino;
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
window.downloadOlimpiadasTemplate = downloadOlimpiadasTemplate;
window.downloadAlunosTemplate = downloadAlunosTemplate;
window.downloadCronogramaTemplate = downloadCronogramaTemplate;
window.ajustarCamposFormUsuario = ajustarCamposFormUsuario;
window.abrirModalMinhaSenha = abrirModalMinhaSenha;
window.criarUsuarioAlunoSelecionado = criarUsuarioAlunoSelecionado;
window.renderizarDashboardAluno = renderizarDashboardAluno;
window.salvarNovoUsuario = salvarNovoUsuario;
window.salvarNovoAluno = salvarNovoAluno;
window.editarAluno = editarAluno;
window.excluirAluno = excluirAluno;
window.renderizarAlunos = renderizarAlunos;
window.salvarNovaOlimpiada = salvarNovaOlimpiada;
window.salvarNovoCronograma = salvarNovoCronograma;
window.salvarNovaCidade = salvarNovaCidade;
window.salvarNovaEscola = salvarNovaEscola;
window.fecharModalEdicao = fecharModalEdicao;

// ==================== EDITOR VISUAL — LAYOUT POR ESCOPO ====================
// Regras de precedência: usuário > escola > cidade > nível > global.
function layoutDocIdPorEscopo(tipo = "global", alvo = "") {
    const seguro = String(alvo || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    if (tipo === "nivel") return `nivel_${seguro}`;
    if (tipo === "cidade") return `cidade_${seguro}`;
    if (tipo === "escola") return `escola_${seguro}`;
    if (tipo === "usuario") return `usuario_${seguro}`;
    return "global";
}

function layoutCollectionRef(docId = "global") {
    initFirebase();
    if (!firebaseFirestore) return null;
    return firebaseFirestore.collection("sistema_layout").doc(docId || "global");
}

async function lerDocLayout(docId) {
    const ref = layoutCollectionRef(docId);
    if (!ref) return null;
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
}

function getEscoposLayoutParaUsuario(usuario = usuarioLogado) {
    const escopos = ["global"];
    if (!usuario) return escopos;

    if (usuario.nivel) escopos.push(layoutDocIdPorEscopo("nivel", usuario.nivel));

    let escolaId = "";
    let cidadeId = "";

    if (usuario.nivel === "Gestor" && usuario.vinculoId) {
        cidadeId = usuario.vinculoId;
    }

    if ((usuario.nivel === "Escola" || usuario.nivel === "Aluno") && usuario.vinculoId) {
        escolaId = usuario.vinculoId;
        const escolas = getStorage("app_escolas", []);
        const escola = escolas.find(e => String(e.id) === String(escolaId));
        if (escola?.cidadeId) cidadeId = escola.cidadeId;
    }

    if (usuario.cidadeId && !cidadeId) cidadeId = usuario.cidadeId;
    if (usuario.escolaId && !escolaId) escolaId = usuario.escolaId;

    if (cidadeId) escopos.push(layoutDocIdPorEscopo("cidade", cidadeId));
    if (escolaId) escopos.push(layoutDocIdPorEscopo("escola", escolaId));
    if (usuario.id) escopos.push(layoutDocIdPorEscopo("usuario", usuario.id));

    return [...new Set(escopos)];
}

async function carregarLayoutVisual() {
    initFirebase();
    if (!firebaseFirestore) {
        aplicarLayoutVisual(layoutVisualAtual);
        return layoutVisualAtual;
    }

    try {
        let final = { ...LAYOUT_PADRAO };

        // Compatibilidade com a primeira versão do editor, que salvava em sistema_layout/config.
        const legado = await lerDocLayout("config");
        if (legado) final = { ...final, ...legado };

        const escopos = getEscoposLayoutParaUsuario(usuarioLogado);
        for (const docId of escopos) {
            const dados = await lerDocLayout(docId);
            if (dados) final = { ...final, ...dados };
        }

        layoutVisualAtual = { ...LAYOUT_PADRAO, ...final };
        aplicarLayoutVisual(layoutVisualAtual);
        return layoutVisualAtual;
    } catch (erro) {
        console.warn("Não foi possível carregar layout visual por escopo.", erro);
        aplicarLayoutVisual(layoutVisualAtual);
        return layoutVisualAtual;
    }
}

function textoAlvoLayout(tipo, alvo) {
    if (tipo === "nivel") return `nível ${alvo}`;
    if (tipo === "cidade") {
        const c = getStorage("app_cidades", []).find(x => String(x.id) === String(alvo));
        return c ? `cidade ${c.nome} (${c.uf})` : `cidade ${alvo}`;
    }
    if (tipo === "escola") {
        const e = getStorage("app_escolas", []).find(x => String(x.id) === String(alvo));
        return e ? `escola ${e.nome}` : `escola ${alvo}`;
    }
    if (tipo === "usuario") {
        const u = getStorage("app_usuarios", []).find(x => String(x.id) === String(alvo));
        return u ? `usuário ${u.nome} (${u.nivel})` : `usuário ${alvo}`;
    }
    return "todos os usuários";
}

function getEscopoSelecionadoLayout() {
    const tipo = document.getElementById("layoutEscopoTipo")?.value || "global";
    const alvoSelect = document.getElementById("layoutEscopoAlvo");
    const alvo = tipo === "global" ? "" : (alvoSelect?.value || "");
    return { tipo, alvo, docId: layoutDocIdPorEscopo(tipo, alvo) };
}

function atualizarResumoEscopoLayout(existeConfig = null) {
    const { tipo, alvo, docId } = getEscopoSelecionadoLayout();
    const resumo = document.getElementById("layoutEscopoResumo");
    if (!resumo) return;
    const alvoTexto = textoAlvoLayout(tipo, alvo);
    let status = "";
    if (existeConfig === true) status = " Este escopo já possui configuração própria.";
    if (existeConfig === false) status = " Este escopo ainda não possui configuração própria; a tela mostra o layout herdado.";
    resumo.innerText = `Editando layout para ${alvoTexto}. ID interno: ${docId}.${status}`;
}

function atualizarAlvosLayoutEditor() {
    const tipo = document.getElementById("layoutEscopoTipo")?.value || "global";
    const alvo = document.getElementById("layoutEscopoAlvo");
    if (!alvo) return;

    alvo.innerHTML = "";
    alvo.disabled = tipo === "global";

    if (tipo === "global") {
        alvo.innerHTML = '<option value="">Todos</option>';
        atualizarResumoEscopoLayout(null);
        return;
    }

    let opcoes = [];
    if (tipo === "nivel") {
        opcoes = ["ADM", "Gestor", "Escola", "Aluno", "Monitor", "Visualizador"].map(n => ({ value: n, text: n }));
    } else if (tipo === "cidade") {
        opcoes = getStorage("app_cidades", []).map(c => ({ value: c.id, text: `${c.nome} (${c.uf})` }));
    } else if (tipo === "escola") {
        const cidades = getStorage("app_cidades", []);
        opcoes = getStorage("app_escolas", []).map(e => {
            const c = cidades.find(x => String(x.id) === String(e.cidadeId));
            return { value: e.id, text: `${e.nome}${c ? ` — ${c.nome}/${c.uf}` : ""}` };
        });
    } else if (tipo === "usuario") {
        opcoes = getStorage("app_usuarios", []).map(u => ({ value: u.id, text: `${u.nome} — ${u.nivel} — ${u.login}` }));
    }

    if (!opcoes.length) {
        alvo.innerHTML = '<option value="">Nenhum alvo disponível</option>';
        alvo.disabled = true;
    } else {
        alvo.innerHTML = opcoes.map(o => `<option value="${textoSeguro(o.value)}">${textoSeguro(o.text)}</option>`).join("");
    }
    atualizarResumoEscopoLayout(null);
}

async function carregarLayoutEscopoSelecionado(mostrarAviso = true) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    const { docId } = getEscopoSelecionadoLayout();
    try {
        let dados = await lerDocLayout(docId);
        if (!dados && docId === "global") dados = await lerDocLayout("config");

        if (dados) {
            preencherFormularioLayout({ ...LAYOUT_PADRAO, ...dados });
            atualizarResumoEscopoLayout(true);
            if (mostrarAviso) alert("Configuração deste escopo carregada.");
            return;
        }

        // Se não existir configuração específica, mostra o layout efetivo atual como ponto de partida.
        preencherFormularioLayout(layoutVisualAtual);
        atualizarResumoEscopoLayout(false);
        if (mostrarAviso) alert("Este escopo ainda não tem layout próprio. A tela mostra o layout herdado; salve para criar uma configuração específica.");
    } catch (erro) {
        console.error("Erro ao carregar layout do escopo", erro);
        alert(`Erro ao carregar layout do escopo.\n\n${erro.message || erro}`);
    }
}

function prepararEditorLayout() {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    atualizarAlvosLayoutEditor();
    preencherFormularioLayout(layoutVisualAtual);
    atualizarResumoEscopoLayout(null);
}

async function salvarLayoutVisual(event) {
    event?.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    const btn = event?.target?.querySelector('button[type="submit"]');
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Salvando...'; }
        const escopo = getEscopoSelecionadoLayout();
        const config = lerLayoutDoFormulario();
        const novaLogo = await uploadArquivoLayout("layoutLogoArquivo", "logo");
        const novoBanner = await uploadArquivoLayout("layoutBannerArquivo", "banner");
        const novaImagemFundo = await uploadArquivoLayout("layoutFundoImagemArquivo", "fundo");
        if (novaLogo) config.logoUrl = novaLogo;
        if (novoBanner) config.bannerUrl = novoBanner;
        if (novaImagemFundo) {
            config.fundoImagemUrl = novaImagemFundo;
            config.fundoModo = "imagem";
        }
        const ref = layoutCollectionRef(escopo.docId);
        if (!ref) throw new Error("Firestore não inicializado.");
        await ref.set({
            ...config,
            escopoTipo: escopo.tipo,
            escopoAlvo: escopo.alvo,
            escopoDocId: escopo.docId,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoPorId: usuarioLogado.id,
            atualizadoPorNome: usuarioLogado.nome
        }, { merge: true });

        // Se for layout global, também atualiza a cópia legada para não quebrar versões antigas abertas em cache.
        if (escopo.docId === "global") {
            await layoutCollectionRef("config")?.set({ ...config, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

        await carregarLayoutVisual();
        preencherFormularioLayout({ ...LAYOUT_PADRAO, ...config });
        atualizarResumoEscopoLayout(true);
        alert(`Layout salvo para ${textoAlvoLayout(escopo.tipo, escopo.alvo)}.`);
    } catch (erro) {
        console.error("Erro ao salvar layout", erro);
        alert(`Erro ao salvar layout.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Salvar layout'; }
    }
}

async function resetarLayoutVisual() {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    const escopo = getEscopoSelecionadoLayout();
    if (!confirm(`Restaurar o layout padrão para ${textoAlvoLayout(escopo.tipo, escopo.alvo)}?`)) return;
    const ref = layoutCollectionRef(escopo.docId);
    if (!ref) return alert("Firestore não inicializado.");
    await ref.set({
        ...LAYOUT_PADRAO,
        escopoTipo: escopo.tipo,
        escopoAlvo: escopo.alvo,
        escopoDocId: escopo.docId,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPorId: usuarioLogado.id,
        atualizadoPorNome: usuarioLogado.nome
    }, { merge: true });
    await carregarLayoutVisual();
    preencherFormularioLayout(LAYOUT_PADRAO);
    atualizarResumoEscopoLayout(true);
    alert("Layout padrão restaurado para este escopo.");
}

async function removerLayoutEscopoSelecionado() {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar o layout.");
    const escopo = getEscopoSelecionadoLayout();
    if (escopo.docId === "global") return alert("O layout global não pode ser removido. Use Restaurar padrão.");
    if (!confirm(`Remover a configuração própria de ${textoAlvoLayout(escopo.tipo, escopo.alvo)}?\n\nEsse alvo voltará a herdar o layout mais amplo.`)) return;
    const ref = layoutCollectionRef(escopo.docId);
    if (!ref) return alert("Firestore não inicializado.");
    await ref.delete();
    await carregarLayoutVisual();
    preencherFormularioLayout(layoutVisualAtual);
    atualizarResumoEscopoLayout(false);
    alert("Configuração específica removida. Este alvo agora herdará outro layout.");
}

// Sobrescreve o sucesso do login para reaplicar o layout após carregar o escopo do usuário.
function logarSucesso(usuario) {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainPanel").classList.remove("hidden");
    document.getElementById("userLoggedNome").innerText = usuario.nome;
    document.getElementById("userLoggedNivel").innerText = usuario.nivel;

    carregarLayoutVisual().catch(erro => console.warn("Layout por escopo não carregou após login:", erro));
    aplicarPermissoesNavegacao(usuario);
    popularSeletores();
    renderizarPlataformaDashboard();
    renderizarCronograma();
    renderizarTabelasGerenciais();
    renderizarResultadosImportacao();
    ajustarCamposFormUsuario();
    renderizarPlataformaEnsino();
    prepararFiltrosRelatoriosComparativos();
    ativarPrimeiraAbaPermitida();
}
