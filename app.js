// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;


// ============================================================
// POPUPS INTERNOS DA PLATAFORMA
// Avisos/erros deixam de usar alert() do navegador.
// ============================================================
function garantirModalSistemaPlataforma() {
    let modal = document.getElementById("modalSistemaPlataforma");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "modalSistemaPlataforma";
    modal.className = "fixed inset-0 z-[99999] hidden items-center justify-center px-4 py-6";
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" data-modal-sistema-overlay></div>
        <div class="relative w-full max-w-lg rounded-2xl border border-amber-400/40 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
                <div class="flex items-start gap-3">
                    <div id="modalSistemaIcone" class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                        <i class="fa-solid fa-circle-info"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 id="modalSistemaTitulo" class="font-bold text-lg leading-tight">Aviso</h3>
                        <p class="text-xs text-slate-400 mt-1">Mensagem da plataforma</p>
                    </div>
                </div>
            </div>
            <div class="px-5 py-5">
                <div id="modalSistemaMensagem" class="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap"></div>
            </div>
            <div class="px-5 py-4 border-t border-slate-800 bg-slate-950/95 flex flex-wrap justify-end gap-2">
                <button id="modalSistemaCancelar" type="button" class="hidden px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 transition">Cancelar</button>
                <button id="modalSistemaOk" type="button" class="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition">OK</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function modalSistemaPlataforma({ titulo = "Aviso", mensagem = "", tipo = "info", confirmar = false, textoOk = "OK", textoCancelar = "Cancelar" } = {}) {
    return new Promise(resolve => {
        const modal = garantirModalSistemaPlataforma();
        const tituloEl = document.getElementById("modalSistemaTitulo");
        const msgEl = document.getElementById("modalSistemaMensagem");
        const okBtn = document.getElementById("modalSistemaOk");
        const cancelBtn = document.getElementById("modalSistemaCancelar");
        const iconEl = document.getElementById("modalSistemaIcone");
        const overlay = modal.querySelector("[data-modal-sistema-overlay]");
        const icons = {
            erro: '<i class="fa-solid fa-triangle-exclamation"></i>',
            sucesso: '<i class="fa-solid fa-circle-check"></i>',
            pergunta: '<i class="fa-solid fa-circle-question"></i>',
            info: '<i class="fa-solid fa-circle-info"></i>'
        };
        if (tituloEl) tituloEl.textContent = titulo;
        if (msgEl) msgEl.textContent = String(mensagem ?? "");
        if (okBtn) okBtn.textContent = textoOk || "OK";
        if (cancelBtn) {
            cancelBtn.textContent = textoCancelar || "Cancelar";
            cancelBtn.classList.toggle("hidden", !confirmar);
        }
        if (iconEl) iconEl.innerHTML = icons[tipo] || icons.info;
        const fechar = (valor) => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
            okBtn?.removeEventListener("click", onOk);
            cancelBtn?.removeEventListener("click", onCancel);
            overlay?.removeEventListener("click", onCancel);
            document.removeEventListener("keydown", onKey);
            resolve(valor);
        };
        const onOk = () => fechar(true);
        const onCancel = () => fechar(false);
        const onKey = (ev) => {
            if (ev.key === "Escape") fechar(false);
            if (ev.key === "Enter" && !ev.shiftKey) fechar(true);
        };
        okBtn?.addEventListener("click", onOk);
        cancelBtn?.addEventListener("click", onCancel);
        overlay?.addEventListener("click", confirmar ? onCancel : onOk);
        document.addEventListener("keydown", onKey);
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        setTimeout(() => okBtn?.focus(), 40);
    });
}

function avisoPlataforma(mensagem, titulo = "Aviso", tipo = "info") {
    return modalSistemaPlataforma({ titulo, mensagem, tipo, confirmar: false, textoOk: "OK" });
}

function confirmarPlataforma(mensagem, titulo = "Confirmação", textoOk = "Confirmar", textoCancelar = "Cancelar") {
    return modalSistemaPlataforma({ titulo, mensagem, tipo: "pergunta", confirmar: true, textoOk, textoCancelar });
}

(function ativarAlertasInternosDaPlataforma(){
    const alertaNativo = window.alert?.bind(window);
    window.__alertaNativoOriginal = alertaNativo;
    window.alert = function(mensagem){
        try { avisoPlataforma(mensagem, "Aviso", "info"); }
        catch(e) { if (alertaNativo) alertaNativo(String(mensagem ?? "")); }
    };
})();

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
let simuladoSessaoAtual = null;
let simuladoTimerInterval = null;
let simuladoEnvioEmAndamento = false;

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

const SERIES_PADRAO = ["1º Ano EF", "2º Ano EF", "3º Ano EF", "4º Ano EF", "5º Ano EF", "6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "1ª Série EM", "2ª Série EM", "3ª Série EM"];
const PREMIOS_PADRAO = ["Ouro", "Prata", "Bronze", "Menção Honrosa"];
const SEXOS_ALUNO_PADRAO = ["Masculino", "Feminino"];
const ETNIAS_ALUNO_PADRAO = ["Não informado", "Branca", "Preta", "Parda", "Amarela", "Indígena", "Prefiro não declarar", "Outra"];
let listasSuspensasConfig = {};
let listaSuspensaAtualKey = null;
let listaSuspensaAtualSelect = null;

// Ano ativo da plataforma. Não usa localStorage/sessionStorage: muda só na aba atual.
let anoDadosAtivo = "2026";
const CHAVES_ANUAIS_FIRESTORE = ["app_cidades", "app_escolas", "app_alunos", "app_olimpiadas", "app_cronograma", "app_premiados", "app_plataforma", "app_simulados", "app_simulados_envios", "app_aulas", "app_questoes", "app_listas_suspensas"];
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


// ==================== UX GLOBAL: SELECTS EM ORDEM ALFABÉTICA E TABELAS ORDENÁVEIS ====================
function textoOpcaoSelect(opt) { return String(opt?.textContent || "").trim(); }
function deveFixarOpcaoSelect(opt) {
    const v = String(opt?.value || "").toUpperCase();
    const t = textoOpcaoSelect(opt).toUpperCase();
    return !opt?.value || v === "TODOS" || v === "" || t.includes("SELECIONE") || t === "TODAS" || t === "TODOS" || t.includes("NÃO INFORMADO");
}
function ordenarSelectAlfabeticamente(select) {
    if (!select || select.dataset.noAlphaSort === "true") return;
    if (select.multiple && select.options.length > 150) return;
    const opts = Array.from(select.children);
    if (opts.some(el => el.tagName === "OPTGROUP")) {
        opts.filter(el => el.tagName === "OPTGROUP").forEach(g => {
            const filhos = Array.from(g.children);
            filhos.sort((a,b) => textoOpcaoSelect(a).localeCompare(textoOpcaoSelect(b), "pt-BR", { sensitivity: "base", numeric: true }));
            filhos.forEach(o => g.appendChild(o));
        });
    } else {
        const fixas = opts.filter(deveFixarOpcaoSelect);
        const moveis = opts.filter(o => !deveFixarOpcaoSelect(o));
        moveis.sort((a,b) => textoOpcaoSelect(a).localeCompare(textoOpcaoSelect(b), "pt-BR", { sensitivity: "base", numeric: true }));
        [...fixas, ...moveis].forEach(o => select.appendChild(o));
    }
    select.dataset.alphaSorted = "true";
}
function ordenarSelectsAlfabeticamente(context = document) {
    context.querySelectorAll?.("select").forEach(ordenarSelectAlfabeticamente);
}
function valorCelulaOrdenacao(td) {
    const txt = String(td?.innerText || td?.textContent || "").trim();
    const n = Number(txt.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", "."));
    if (txt && !Number.isNaN(n) && /\d/.test(txt)) return n;
    const data = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (data) return new Date(Number(data[3]), Number(data[2])-1, Number(data[1])).getTime();
    return txt.toLocaleLowerCase("pt-BR");
}
function ordenarTabelaPorColuna(table, colIndex, direcao) {
    const tbody = table.tBodies?.[0];
    if (!tbody) return;
    const linhas = Array.from(tbody.rows);
    linhas.sort((a,b) => {
        const va = valorCelulaOrdenacao(a.cells[colIndex]);
        const vb = valorCelulaOrdenacao(b.cells[colIndex]);
        if (typeof va === "number" && typeof vb === "number") return direcao * (va - vb);
        return direcao * String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true });
    });
    linhas.forEach(l => tbody.appendChild(l));
}
function tornarTabelaOrdenavel(table) {
    if (!table || table.dataset.sortableReady === "true") return;
    const ths = Array.from(table.querySelectorAll("thead th"));
    ths.forEach((th, idx) => {
        if (th.dataset.noSort === "true") return;
        th.classList.add("cursor-pointer", "select-none");
        th.title = "Clique para ordenar crescente/decrescente";
        th.addEventListener("click", () => {
            const atual = th.dataset.sortDir === "asc" ? "desc" : "asc";
            ths.forEach(x => { x.dataset.sortDir = ""; x.querySelector(".sort-indicator")?.remove(); });
            th.dataset.sortDir = atual;
            const span = document.createElement("span");
            span.className = "sort-indicator ml-1 text-blue-400";
            span.textContent = atual === "asc" ? "▲" : "▼";
            th.appendChild(span);
            ordenarTabelaPorColuna(table, idx, atual === "asc" ? 1 : -1);
        });
    });
    table.dataset.sortableReady = "true";
}
function tornarTabelasOrdenaveis(context = document) {
    context.querySelectorAll?.("table").forEach(tornarTabelaOrdenavel);
}
function initOrdenacaoGlobalTabelasESelects() {
    ordenarSelectsAlfabeticamente();
    tornarTabelasOrdenaveis();
    aplicarCustomizacoesListasSuspensas(document);
    const obs = new MutationObserver(muts => {
        for (const m of muts) {
            m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.matches?.("select")) ordenarSelectAlfabeticamente(n);
                if (n.matches?.("table")) tornarTabelaOrdenavel(n);
                ordenarSelectsAlfabeticamente(n);
                tornarTabelasOrdenaveis(n);
                aplicarCustomizacoesListasSuspensas(n);
            });
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
}

// ==================== ADM: PERSONALIZAÇÃO GLOBAL DE LISTAS SUSPENSAS ====================
function podeEditarListasSuspensas() {
    return usuarioLogado?.nivel === "ADM";
}

function chaveListaSuspensa(select) {
    if (!select) return "";
    if (select.dataset.listaKey) return select.dataset.listaKey;
    const label = select.closest("div")?.querySelector("label")?.innerText || "lista";
    const key = select.id || select.name || `${label}_${Array.from(document.querySelectorAll("select")).indexOf(select)}`;
    select.dataset.listaKey = String(key).trim().replace(/\s+/g, "_");
    return select.dataset.listaKey;
}

function rotuloListaSuspensa(select) {
    const label = select?.closest("div")?.querySelector("label")?.innerText;
    return label || select?.id || "Lista suspensa";
}

function listaSuspensaProtegidaPorModulo(select) {
    // Listas que representam entidades centrais devem ser gerenciadas nos módulos próprios,
    // não pelo editor rápido de listas suspensas. Isso evita inconsistência entre select e banco.
    if (!select) return true;
    const texto = [
        select.id,
        select.name,
        select.dataset?.listaKey,
        select.closest("div")?.querySelector("label")?.innerText,
        select.getAttribute("aria-label"),
        select.title
    ].filter(Boolean).join(" ").toLowerCase();

    const termosProtegidos = [
        "aluno", "alunos",
        "escola", "escolas",
        "olimpiada", "olimpíada", "olimpiadas", "olimpíadas",
        "cidade", "cidades", "municipio", "município", "municipios", "municípios"
    ];
    return termosProtegidos.some(t => texto.includes(t));
}

function snapshotOpcoesOriginaisLista(select) {
    if (!select) return [];
    if (select.dataset.listaOpcoesOriginais) {
        try { return JSON.parse(select.dataset.listaOpcoesOriginais) || []; } catch (_) {}
    }
    const opcoes = Array.from(select.options || []).map(opt => ({
        valor: valorOpcaoLista(opt),
        texto: opt.textContent.trim(),
        custom: opt.dataset.customOption === "true"
    })).filter(o => o.valor || o.texto);
    try { select.dataset.listaOpcoesOriginais = JSON.stringify(opcoes); } catch (_) {}
    return opcoes;
}

function carregarConfigListasSuspensasEmMemoria() {
    const arr = getStorage("app_listas_suspensas", []);
    listasSuspensasConfig = {};
    if (Array.isArray(arr)) {
        arr.forEach(item => {
            if (!item?.id) return;
            listasSuspensasConfig[item.id] = {
                id: item.id,
                nome: item.nome || item.id,
                adicionados: Array.isArray(item.adicionados) ? item.adicionados : [],
                removidos: Array.isArray(item.removidos) ? item.removidos : []
            };
        });
    }
    return listasSuspensasConfig;
}

function serializarConfigListasSuspensas() {
    return Object.values(listasSuspensasConfig || {}).map(item => ({
        id: item.id,
        nome: item.nome || item.id,
        adicionados: Array.from(new Set((item.adicionados || []).map(String).filter(Boolean))),
        removidos: Array.from(new Set((item.removidos || []).map(String).filter(Boolean))),
        atualizadoEm: Date.now(),
        atualizadoPor: usuarioLogado?.nome || ""
    }));
}

async function salvarConfigListasSuspensas() {
    setStorageLocal("app_listas_suspensas", serializarConfigListasSuspensas());
    if (!podeEditarListasSuspensas()) return;
    await setStorage("app_listas_suspensas", serializarConfigListasSuspensas());
}

function valorOpcaoLista(opt) {
    return String(opt?.value || opt?.textContent || "").trim();
}

function garantirConfigLista(key, nome = "") {
    if (!listasSuspensasConfig[key]) listasSuspensasConfig[key] = { id: key, nome: nome || key, adicionados: [], removidos: [] };
    if (nome && !listasSuspensasConfig[key].nome) listasSuspensasConfig[key].nome = nome;
    return listasSuspensasConfig[key];
}

function aplicarCustomizacaoSelect(select) {
    if (!select || select.dataset.noListEditor === "true") return;
    snapshotOpcoesOriginaisLista(select);

    // Não permitir personalização rápida em listas que dependem de entidades cadastradas.
    // Elas devem vir dos módulos próprios: Alunos, Escolas, Cidades e Olimpíadas.
    if (listaSuspensaProtegidaPorModulo(select)) {
        select.dataset.noListEditor = "true";
        return;
    }

    const key = chaveListaSuspensa(select);
    const cfg = listasSuspensasConfig[key];
    if (cfg) {
        const removidos = new Set((cfg.removidos || []).map(String));
        Array.from(select.options).forEach(opt => {
            if (!opt.dataset.valorOriginal) opt.dataset.valorOriginal = valorOpcaoLista(opt);
            if (removidos.has(valorOpcaoLista(opt)) || removidos.has(opt.textContent.trim())) opt.remove();
        });
        (cfg.adicionados || []).forEach(valor => {
            valor = String(valor || "").trim();
            if (!valor) return;
            const existe = Array.from(select.options).some(opt => normalizarTexto(valorOpcaoLista(opt)) === normalizarTexto(valor) || normalizarTexto(opt.textContent) === normalizarTexto(valor));
            if (!existe) {
                const opt = document.createElement("option");
                opt.value = valor;
                opt.textContent = valor;
                opt.dataset.customOption = "true";
                select.appendChild(opt);
            }
        });
        ordenarSelectAlfabeticamente(select);
    }
    anexarBotaoEditorLista(select);
}

function aplicarCustomizacoesListasSuspensas(context = document) {
    context.querySelectorAll?.("select").forEach(aplicarCustomizacaoSelect);
}

function anexarBotaoEditorLista(select) {
    if (!podeEditarListasSuspensas() || !select || select.dataset.listEditorReady === "true" || select.dataset.noListEditor === "true") return;
    if (listaSuspensaProtegidaPorModulo(select)) { select.dataset.noListEditor = "true"; return; }
    if (!select.id && !select.name) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900 border border-gray-700 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-950/30";
    btn.innerHTML = '<i class="fa-solid fa-list-check"></i> Editar lista';
    btn.title = "ADM: adicionar/remover opções desta lista suspensa";
    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); abrirModalListaSuspensa(select); };
    select.insertAdjacentElement("afterend", btn);
    select.dataset.listEditorReady = "true";
}

function abrirModalListaSuspensa(select) {
    if (!podeEditarListasSuspensas()) return alert("Apenas ADM pode editar listas suspensas.");
    if (listaSuspensaProtegidaPorModulo(select)) return alert("Esta lista é gerada por cadastro próprio. Use o módulo de Alunos, Escolas, Cidades ou Olimpíadas para alterar as opções.");
    listaSuspensaAtualSelect = select;
    listaSuspensaAtualKey = chaveListaSuspensa(select);
    garantirConfigLista(listaSuspensaAtualKey, rotuloListaSuspensa(select));
    const modal = document.getElementById("modalListaSuspensa");
    const titulo = document.getElementById("listaSuspensaNomeAtual");
    if (titulo) titulo.innerText = `${rotuloListaSuspensa(select)} — chave: ${listaSuspensaAtualKey}`;
    renderizarItensListaSuspensaAtual();
    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
}

function fecharModalListaSuspensa() {
    const modal = document.getElementById("modalListaSuspensa");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    listaSuspensaAtualSelect = null;
    listaSuspensaAtualKey = null;
}

function opcoesAtuaisListaSuspensa(select) {
    return Array.from(select?.options || []).map(opt => ({ valor: valorOpcaoLista(opt), texto: opt.textContent.trim(), custom: opt.dataset.customOption === "true" })).filter(o => o.valor || o.texto);
}

function renderizarItensListaSuspensaAtual() {
    const alvo = document.getElementById("listaSuspensaItens");
    if (!alvo || !listaSuspensaAtualSelect || !listaSuspensaAtualKey) return;
    const cfg = garantirConfigLista(listaSuspensaAtualKey, rotuloListaSuspensa(listaSuspensaAtualSelect));
    const removidos = new Set((cfg.removidos || []).map(String));
    const originais = snapshotOpcoesOriginaisLista(listaSuspensaAtualSelect);
    const atuais = opcoesAtuaisListaSuspensa(listaSuspensaAtualSelect);
    const mapa = new Map();
    [...originais, ...atuais].forEach(o => {
        const chave = normalizarTexto(o.valor || o.texto);
        if (chave && !mapa.has(chave)) mapa.set(chave, o);
    });
    (cfg.adicionados || []).forEach(v => {
        const chave = normalizarTexto(v);
        if (chave && !mapa.has(chave)) mapa.set(chave, { valor: v, texto: v, custom: true });
    });
    const linhas = Array.from(mapa.values()).sort((a,b) => String(a.texto || a.valor).localeCompare(String(b.texto || b.valor), "pt-BR", { sensitivity: "base", numeric: true }));
    if (!linhas.length) { alvo.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Nenhuma opção encontrada.</p>`; return; }
    alvo.innerHTML = linhas.map(item => {
        const val = textoSeguro(item.valor || item.texto);
        const oculto = removidos.has(item.valor) || removidos.has(item.texto);
        return `<div class="flex items-center justify-between gap-3 p-3 rounded-xl border ${oculto ? 'border-red-900/40 bg-red-950/20 opacity-70' : 'border-gray-700 bg-gray-900/50'}">
            <div class="min-w-0"><p class="text-sm font-bold text-white truncate">${textoSeguro(item.texto || item.valor)}</p><p class="text-[10px] text-gray-500">${item.custom ? 'Opção adicionada pelo ADM' : 'Opção original da lista'}${oculto ? ' • atualmente oculta' : ''}</p></div>
            <button onclick="alternarRemocaoOpcaoListaSuspensa('${val.replace(/'/g, "&#39;")}')" class="px-3 py-1.5 rounded-lg ${oculto ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-800/50' : 'bg-red-900/30 text-red-300 border border-red-900/50'} text-[10px] font-black uppercase tracking-wider">${oculto ? 'Habilitar' : 'Ocultar'}</button>
        </div>`;
    }).join("");
}

async function adicionarOpcaoListaSuspensaAtual() {
    if (!listaSuspensaAtualKey || !listaSuspensaAtualSelect) return;
    const input = document.getElementById("listaSuspensaNovaOpcao");
    const valor = String(input?.value || "").trim();
    if (!valor) return alert("Digite a nova opção.");
    const cfg = garantirConfigLista(listaSuspensaAtualKey, rotuloListaSuspensa(listaSuspensaAtualSelect));
    if (![...(cfg.adicionados || []), ...opcoesAtuaisListaSuspensa(listaSuspensaAtualSelect).map(o => o.valor)].some(v => normalizarTexto(v) === normalizarTexto(valor))) {
        cfg.adicionados.push(valor);
    }
    cfg.removidos = (cfg.removidos || []).filter(v => normalizarTexto(v) !== normalizarTexto(valor));
    if (input) input.value = "";
    await salvarConfigListasSuspensas();
    aplicarCustomizacoesListasSuspensas(document);
    renderizarItensListaSuspensaAtual();
}

async function alternarRemocaoOpcaoListaSuspensa(valor) {
    if (!listaSuspensaAtualKey || !listaSuspensaAtualSelect) return;
    valor = String(valor || "").replace(/&#39;/g, "'");
    const cfg = garantirConfigLista(listaSuspensaAtualKey, rotuloListaSuspensa(listaSuspensaAtualSelect));
    const existe = (cfg.removidos || []).some(v => normalizarTexto(v) === normalizarTexto(valor));
    if (existe) cfg.removidos = cfg.removidos.filter(v => normalizarTexto(v) !== normalizarTexto(valor));
    else cfg.removidos.push(valor);
    await salvarConfigListasSuspensas();
    aplicarCustomizacoesListasSuspensas(document);
    renderizarItensListaSuspensaAtual();
}

async function restaurarListaSuspensaAtual() {
    if (!listaSuspensaAtualKey) return;
    if (!confirm("Restaurar esta lista? As opções adicionadas/ocultadas pelo ADM serão removidas.")) return;
    delete listasSuspensasConfig[listaSuspensaAtualKey];
    await salvarConfigListasSuspensas();
    location.reload();
}

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
        document.getElementById("filterCronogramaOlimpiada")?.addEventListener("change", renderizarCronograma);
        document.getElementById("filterCronogramaMes")?.addEventListener("change", renderizarCronograma);
        document.getElementById("btnToggleTema")?.addEventListener("click", alternarTemaClaroEscuro);
        document.getElementById("btnAtualizarReuniao")?.addEventListener("click", gerarPainelReuniao);
        initMobileUX();
        initOrdenacaoGlobalTabelasESelects();
        initValidacaoCpfGlobal();
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


function abrirModalInscricaoAluno() {
    const modal = document.getElementById("modalInscricaoAluno");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    voltarBuscaCpfInscricao();
    setTimeout(() => document.getElementById("inscricaoAlunoCpf")?.focus(), 80);
}

function fecharModalInscricaoAluno() {
    const modal = document.getElementById("modalInscricaoAluno");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("inscricaoAlunoCpf") && (document.getElementById("inscricaoAlunoCpf").value = "");
    document.getElementById("formCriarContaAlunoCpf")?.reset();
}

function voltarBuscaCpfInscricao() {
    document.getElementById("passoBuscaCpfAluno")?.classList.remove("hidden");
    document.getElementById("formCriarContaAlunoCpf")?.classList.add("hidden");
    const msg = document.getElementById("inscricaoAlunoCpfMsg");
    if (msg) {
        msg.className = "text-[11px] text-gray-500 mt-1";
        msg.innerText = "Digite os 11 números do CPF. O sistema irá formatar e validar automaticamente.";
    }
}

function preencherModalCriacaoContaAluno(aluno) {
    const escola = escolaDoAluno(aluno);
    document.getElementById("inscricaoAlunoId").value = aluno.id || "";
    document.getElementById("inscricaoAlunoNome").innerText = aluno.nome || "Aluno encontrado";
    document.getElementById("inscricaoAlunoResumo").innerText = `${aluno.cpf || "CPF cadastrado"} • ${escola?.nome || aluno.escolaNome || "Escola não informada"} • ${aluno.serie || "Série não informada"}`;
    const emailSugerido = String(aluno.emailInstitucional || aluno.emailPessoal || "").trim().toLowerCase();
    const emailInput = document.getElementById("inscricaoAlunoEmail");
    if (emailInput) emailInput.value = emailSugerido;
    document.getElementById("passoBuscaCpfAluno")?.classList.add("hidden");
    document.getElementById("formCriarContaAlunoCpf")?.classList.remove("hidden");
    setTimeout(() => document.getElementById("inscricaoAlunoEmail")?.focus(), 80);
}

async function buscarAlunoParaInscricao() {
    initFirebase();
    const input = document.getElementById("inscricaoAlunoCpf");
    const msg = document.getElementById("inscricaoAlunoCpfMsg");
    if (!formatarCpfAoFinal(input, true)) return;
    const cpf = cpfLimpo(input.value);
    if (!validarCpf(cpf)) return alert("CPF inválido. Confira os números digitados.");
    try {
        if (msg) { msg.className = "text-[11px] text-blue-400 mt-1"; msg.innerText = "Buscando cadastro do aluno..."; }
        const aluno = await buscarAlunoPorCpfPublico(cpf);
        if (!aluno) {
            if (msg) { msg.className = "text-[11px] text-red-400 mt-1"; msg.innerText = "Não encontrei aluno cadastrado com este CPF. Confira o CPF ou procure a coordenação."; }
            return;
        }
        preencherModalCriacaoContaAluno(aluno);
    } catch (erro) {
        console.error("Erro ao buscar aluno por CPF", erro);
        alert(`Não foi possível consultar o cadastro do aluno.\n\n${erro.message || erro}`);
    }
}

async function buscarAlunoPorCpfPublico(cpf) {
    initFirebase();
    const cpfNum = cpfLimpo(cpf);
    if (!firebaseFirestore) throw new Error("Firestore não inicializado.");
    const lookupRef = firebaseFirestore.collection("anos").doc(String(anoDadosAtivo)).collection("sistema_alunos_lookup").doc(cpfNum);
    const lookup = await lookupRef.get();
    if (lookup.exists) {
        const data = lookup.data() || {};
        return { ...data, cpf: formatarCpf(cpfNum), id: data.alunoId || data.id || "" };
    }
    // Fallback para ambientes ainda abertos durante migração. Em regras seguras, este trecho pode ser negado.
    try {
        const snap = await firebaseFirestore.collection("anos").doc(String(anoDadosAtivo)).collection("sistema_alunos").where("cpfNumerico", "==", cpfNum).limit(1).get();
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (_) {}
    return null;
}

async function criarContaAlunoPorCpf(event) {
    event.preventDefault();
    initFirebase();
    const alunoId = document.getElementById("inscricaoAlunoId")?.value || "";
    const email = String(document.getElementById("inscricaoAlunoEmail")?.value || "").trim().toLowerCase();
    const senha = String(document.getElementById("inscricaoAlunoSenha")?.value || "");
    const senha2 = String(document.getElementById("inscricaoAlunoSenha2")?.value || "");
    if (!email || !email.includes("@")) return alert("Informe um e-mail válido. Ele será usado para entrar na plataforma.");
    if (senha.length < 6) return alert("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== senha2) return alert("A confirmação de senha não confere.");

    const cpf = cpfLimpo(document.getElementById("inscricaoAlunoCpf")?.value || "");
    const aluno = await buscarAlunoPorCpfPublico(cpf);
    if (!aluno || (alunoId && aluno.id && aluno.id !== alunoId && aluno.alunoId !== alunoId)) return alert("Não foi possível confirmar o cadastro do aluno. Tente novamente.");
    const escola = aluno.escolaId ? (await obterEscolaBasicaParaCadastro(aluno.escolaId)) : null;
    try {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(email, senha);
        const uid = cred.user.uid;
        const perfil = {
            id: uid,
            authUid: uid,
            authEmail: email,
            emailAuth: email,
            login: email,
            email,
            senha: "",
            senhaMigradaParaAuth: true,
            nivel: "Aluno",
            nome: aluno.nome || "Aluno",
            telefone: aluno.contatoAluno || aluno.contatoResponsavel || "",
            vinculoId: aluno.escolaId || "",
            escolaId: aluno.escolaId || "",
            cidadeId: escola?.cidadeId || aluno.cidadeId || "",
            alunoId: aluno.alunoId || aluno.id || "",
            alunoCpf: formatarCpf(cpf),
            cpf: formatarCpf(cpf),
            criadoEm: new Date().toISOString(),
            origem: "autoinscricao_cpf"
        };
        await firebaseFirestore.collection("sistema_usuarios").doc(uid).set(perfil, { merge: true });
        usuarioLogado = perfil;
        fecharModalInscricaoAluno();
        await carregarDadosPosLogin();
        aplicarTemaUsuario(usuarioLogado);
        logarSucesso(usuarioLogado);
        alert("Conta criada com sucesso. Bem-vindo(a)!");
    } catch (erro) {
        console.error("Erro ao criar conta do aluno", erro);
        alert(`Não foi possível criar sua conta.\n\n${traduzirErroAuth(erro)}`);
    }
}

async function obterEscolaBasicaParaCadastro(escolaId) {
    const local = getStorage("app_escolas", []).find(e => e.id === escolaId);
    if (local) return local;
    try {
        const snap = await firebaseFirestore.collection("anos").doc(String(anoDadosAtivo)).collection("sistema_escolas").doc(String(escolaId)).get();
        return snap.exists ? { id: snap.id, ...snap.data() } : null;
    } catch (_) { return null; }
}

function dadosLookupAluno(aluno) {
    const cpf = cpfLimpo(aluno?.cpf || "");
    if (!cpf || !validarCpf(cpf)) return null;
    return {
        id: aluno.id || "",
        alunoId: aluno.id || aluno.alunoId || "",
        nome: aluno.nome || "",
        cpf: formatarCpf(cpf),
        cpfNumerico: cpf,
        emailInstitucional: aluno.emailInstitucional || "",
        emailPessoal: aluno.emailPessoal || "",
        escolaId: aluno.escolaId || "",
        escolaNome: aluno.escolaNome || "",
        cidadeId: aluno.cidadeId || "",
        municipio: aluno.municipio || "",
        serie: aluno.serie || "",
        contatoAluno: aluno.contatoAluno || "",
        contatoResponsavel: aluno.contatoResponsavel || "",
        atualizadoEm: new Date().toISOString()
    };
}

async function salvarAlunoLookupPublico(aluno) {
    try {
        initFirebase();
        const dados = dadosLookupAluno(aluno);
        if (!dados || !firebaseFirestore || !usuarioLogado) return;
        await firebaseFirestore.collection("anos").doc(String(anoDadosAtivo)).collection("sistema_alunos_lookup").doc(dados.cpfNumerico).set(dados, { merge: true });
    } catch (erro) {
        console.warn("Não foi possível atualizar lookup público de aluno.", erro);
    }
}

async function removerAlunoLookupPublico(aluno) {
    try {
        initFirebase();
        const cpf = cpfLimpo(aluno?.cpf || "");
        if (!cpf || !firebaseFirestore || !usuarioLogado) return;
        await firebaseFirestore.collection("anos").doc(String(anoDadosAtivo)).collection("sistema_alunos_lookup").doc(cpf).delete();
    } catch (erro) {
        console.warn("Não foi possível remover lookup público de aluno.", erro);
    }
}

function sincronizarLookupPublicoAlunos(alunos = getStorage("app_alunos", [])) {
    normalizarListaFirebase(alunos).forEach(a => salvarAlunoLookupPublico(a));
}

function logarSucesso(usuario) {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainPanel").classList.remove("hidden");
    document.getElementById("userLoggedNome").innerText = usuario.nome;
    document.getElementById("userLoggedNivel").innerText = usuario.nivel;

    if (["ADM", "Staff"].includes(usuario.nivel)) sincronizarLookupPublicoAlunos();
    aplicarPermissoesNavegacao(usuario);
    popularSeletores();
    renderizarPlataformaDashboard();
    renderizarCronograma();
    renderizarTabelasGerenciais();
    renderizarResultadosImportacao();
    ajustarCamposFormUsuario();
    renderizarPlataformaEnsino();
    carregarConfigListasSuspensasEmMemoria();
    aplicarCustomizacoesListasSuspensas(document);
    popularFiltrosSimulados(); renderizarSimulados();
    popularFiltrosAulas(); renderizarAulas();
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
        "btnNav-reuniao": "reuniao",
        "btnNav-plataforma": "plataforma",
        "btnNav-simulados": "simulados",
        "btnNav-aulas": "aulas",
        "btnNav-questoes": "questoes",
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
        meusresultados: "Meus Resultados", importar: "Importar Resultados", relatorios: "Relatórios Comparativos", reuniao: "Reunião Estratégica",
        alunos: "Cadastro de Alunos", usuarios: "Gerenciar Usuários e Permissões",
        olimpiadas: "Olimpíadas Cadastradas", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)",
        plataforma: "Plataforma de Ensino", simulados: "Simulados", aulas: "Aulas", questoes: "Banco de Questões", monitoria: "Monitoria — Salas de Atendimento", layout: "Editor de Layout"
    };
    const titulo = document.getElementById("pageTitleDisplay");
    if (titulo) titulo.innerText = titulos[aba] || "Painel Operacional";

    if (aba === "meusresultados") renderizarDashboardAluno();
    if (aba === "plataforma") renderizarPlataformaEnsino();
    if (aba === "simulados") { popularFiltrosSimulados(); renderizarSimulados(); }
    if (aba === "aulas") { popularFiltrosAulas(); renderizarAulas(); }
    if (aba === "monitoria") renderizarSalasMonitoria();
    if (aba === "importar") renderizarResultadosImportacao();
    if (aba === "relatorios") prepararTelaRelatoriosComparativos();
    if (aba === "reuniao") prepararTelaReuniao();
    if (aba === "alunos") { popularSeletoresAlunos(); renderizarAlunos(); }
    if (aba === "layout") prepararEditorLayout();
}

function getCidadeGestor() {
    if (!usuarioLogado) return null;
    if (usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Monitor" || usuarioLogado.nivel === "Professor/Orientador" || usuarioLogado.nivel === "Visualizador") return null;
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

function escopoProfessorOrientadorUsuario(usuario = usuarioLogado) {
    if (!usuario || usuario.nivel !== "Professor/Orientador") return null;
    const escopo = usuario.escopoProfessorOrientador || {};
    return {
        todasEscolas: escopo.todasEscolas === true,
        escolasIds: Array.isArray(escopo.escolasIds) ? escopo.escolasIds : []
    };
}

function idsEscolasDoEscopoProfessorOrientador(usuario = usuarioLogado) {
    const escopo = escopoProfessorOrientadorUsuario(usuario);
    if (!escopo) return [];
    const escolas = getStorage("app_escolas");
    if (escopo.todasEscolas) return escolas.map(e => e.id);
    return escopo.escolasIds || [];
}

function nomesEscolasDoEscopoProfessorOrientador(usuario = usuarioLogado) {
    const ids = idsEscolasDoEscopoProfessorOrientador(usuario);
    const escolas = getStorage("app_escolas");
    return escolas.filter(e => ids.includes(e.id)).map(e => e.nome);
}

function nomesMunicipiosDoEscopoProfessorOrientador(usuario = usuarioLogado) {
    const escolaIds = idsEscolasDoEscopoProfessorOrientador(usuario);
    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const nomes = new Set();
    escolas.filter(e => escolaIds.includes(e.id)).forEach(e => {
        const c = cidades.find(cid => cid.id === e.cidadeId);
        if (c) nomes.add(`${c.nome} - ${c.uf}`);
    });
    return Array.from(nomes);
}

function itemDentroDoEscopoProfessorOrientador(item, usuario = usuarioLogado) {
    if (!usuario || usuario.nivel !== "Professor/Orientador") return true;
    const escopo = escopoProfessorOrientadorUsuario(usuario);
    if (!escopo) return false;
    if (escopo.todasEscolas) return true;
    const escolas = nomesEscolasDoEscopoProfessorOrientador(usuario).map(normalizarTexto);
    const escolaItem = normalizarTexto(item.escola || item.nomeEscola || item.escolaNome);
    return !!escolaItem && escolas.includes(escolaItem);
}

function popularEscopoProfessorOrientadorCadastro() {
    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const selEscolas = document.getElementById("addUserProfessorEscolas");
    if (selEscolas) {
        const anteriores = valoresSelectMultiplo("addUserProfessorEscolas");
        selEscolas.innerHTML = escolas.map(e => {
            const c = cidades.find(cid => cid.id === e.cidadeId);
            const cidadeTxt = c ? ` — ${c.nome}/${c.uf}` : "";
            return `<option value="${textoSeguro(e.id)}">${textoSeguro(e.nome)}${textoSeguro(cidadeTxt)}</option>`;
        }).join("");
        anteriores.forEach(v => { const opt = Array.from(selEscolas.options).find(o => o.value === v); if (opt) opt.selected = true; });
    }
    atualizarEstadoEscopoProfessorCadastro();
}

function atualizarEstadoEscopoProfessorCadastro() {
    const chk = document.getElementById("addUserProfessorTodasEscolas");
    const sel = document.getElementById("addUserProfessorEscolas");
    if (!chk || !sel) return;
    sel.disabled = chk.checked;
    sel.classList.toggle("opacity-50", chk.checked);
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
        if (nivelUsuario === "Professor/Orientador") return [{ value: "", text: "Escopo de escolas definido no cadastro" }];
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
    if (usuarioLogado.nivel === "Professor/Orientador") return itemDentroDoEscopoProfessorOrientador(resultado);
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
    if (usuarioLogado.nivel === "Professor/Orientador") return itemDentroDoEscopoProfessorOrientador(resultado);
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
        app_cronograma: [], // eventos do calendário não devem ser semeados automaticamente; se apagar, não podem voltar
        app_premiados: [], // resultados não devem ser semeados automaticamente; se apagar, não podem voltar
        app_plataforma: typeof DATABASE !== "undefined" ? DATABASE.plataforma : [],
        app_simulados: [],
        app_simulados_envios: [],
        app_aulas: [],
        app_questoes: [],
        app_listas_suspensas: []
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
        popularFiltrosSimulados(); renderizarSimulados();
        popularFiltrosAulas(); renderizarAulas();
        renderizarDashboardAluno();
        if (!document.getElementById("view-relatorios")?.classList.contains("hidden")) prepararTelaRelatoriosComparativos();
        if (!document.getElementById("view-reuniao")?.classList.contains("hidden")) prepararTelaReuniao();
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

function docIdUsuarioFirestore(item) {
    return String(item?.authUid || item?.id || item?.login || novoId());
}

async function upsertColecaoFirestore(nomeColecao, lista) {
    const col = firebaseFirestore.collection(nomeColecao);
    const dados = prepararListaParaFirestore(lista);

    let batch = firebaseFirestore.batch();
    let ops = 0;

    dados.forEach(item => {
        const docId = nomeColecao === "sistema_usuarios" ? docIdUsuarioFirestore(item) : String(item.id);
        batch.set(col.doc(docId), item, { merge: true });
        ops++;
    });

    if (ops > 0) await batch.commit();
    return dados;
}

async function substituirColecaoFirestore(nomeColecao, lista) {
    // ATENÇÃO: substituição total é segura para coleções anuais comuns,
    // mas NUNCA deve ser usada para sistema_usuarios.
    // Em usuários, um cache incompleto poderia apagar perfis já existentes.
    if (nomeColecao === "sistema_usuarios") {
        return upsertColecaoFirestore(nomeColecao, lista);
    }

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
        batch.set(col.doc(String(item.id)), item);
        ops++;
    });

    if (ops > 0) await batch.commit();
    return dados;
}

async function apagarUsuarioFirestore(usuario) {
    if (!firebaseFirestore || !usuario) return;
    const ids = new Set([usuario.authUid, usuario.id].filter(Boolean).map(String));
    const batch = firebaseFirestore.batch();
    ids.forEach(id => batch.delete(firebaseFirestore.collection("sistema_usuarios").doc(id)));
    if (ids.size) await batch.commit();
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
            // Usuários são globais e sensíveis. Nunca substituímos a coleção inteira
            // ao carregar, para evitar apagar perfis Auth por causa de cache incompleto.
            const finais = prepararListaParaFirestore(remotos);
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
        "app_plataforma",
        "app_simulados",
        "app_simulados_envios",
        "app_aulas",
        "app_listas_suspensas",
        ...(["ADM", "Monitor", "Professor/Orientador"].includes(usuarioLogado?.nivel) ? ["app_questoes"] : [])
    ];

    for (const chave of chaves) {
        await carregarChaveFirebase(chave, []);
    }
}

async function carregarDadosPosLogin() {
    // Depois do login, carrega as coleções usadas pelo painel.
    // ADM precisa carregar sistema_usuarios para a aba Gerenciar Usuários.
    // Usuários não-ADM não fazem leitura geral de sistema_usuarios, respeitando Rules fechadas.
    const chaves = [
        ...(usuarioLogado?.nivel === "ADM" ? ["app_usuarios"] : []),
        "app_cidades",
        "app_escolas",
        "app_alunos",
        "app_olimpiadas",
        "app_cronograma",
        "app_premiados",
        "app_plataforma",
        "app_simulados",
        "app_simulados_envios",
        "app_aulas",
        "app_listas_suspensas",
        ...(["ADM", "Monitor", "Professor/Orientador"].includes(usuarioLogado?.nivel) ? ["app_questoes"] : [])
    ];

    for (const chave of chaves) {
        await carregarChaveFirebase(chave, []);
    }

    dadosTrabalho = getStorage("app_premiados", []);
    if (!Array.isArray(dadosTrabalho)) dadosTrabalho = [];
    carregarConfigListasSuspensasEmMemoria();
    setTimeout(() => aplicarCustomizacoesListasSuspensas(document), 100);
}

async function sincronizarUsuariosFirebaseInicial() {
    return await carregarChaveFirebase("app_usuarios", []);
}

function salvarUsuariosFirebase(usuarios) {
    return salvarChaveFirebase("app_usuarios", usuarios);
}

async function salvarUsuariosSistema(usuarios) {
    let lista = normalizarListaFirebase(usuarios);

    // Proteção contra cache incompleto: se o ADM logado não estiver na lista,
    // preserva o próprio perfil para evitar "sumir" da tela de gerenciamento.
    if (usuarioLogado && !lista.some(u => u.id === usuarioLogado.id || u.authUid === usuarioLogado.authUid)) {
        lista = [usuarioLogado, ...lista];
    }

    setStorageLocal("app_usuarios", lista);
    if (usuarioLogado?.nivel === "ADM") {
        try {
            const provisionados = await provisionarAuthUsuarios(lista);
            return salvarChaveFirebase("app_usuarios", provisionados);
        } catch (erro) {
            console.warn("Provisionamento Auth falhou. Salvando perfis no Firestore mesmo assim.", erro);
        }
    }
    return salvarChaveFirebase("app_usuarios", lista);
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
    const salvos = getStorage("app_premiados", []);
    return Array.isArray(salvos) ? salvos : [];
}

async function salvarPremiados() {
    dadosTrabalho = Array.isArray(dadosTrabalho) ? dadosTrabalho : [];
    await setStorage("app_premiados", dadosTrabalho);
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
    const filtroOlimpiada = document.getElementById("filterCronogramaOlimpiada");
    const filtroMes = document.getElementById("filterCronogramaMes");
    if (!filtroGrupo && !filtroEtapa && !filtroOlimpiada && !filtroMes) return;

    if (filtroOlimpiada) {
        const valorAnterior = filtroOlimpiada.value || "TODOS";
        const olimpiadas = getStorage("app_olimpiadas");
        filtroOlimpiada.innerHTML = `<option value="TODOS">-- Todas as olimpíadas --</option>` +
            olimpiadas.slice().sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }))
                .map(o => `<option value="${textoSeguro(o.id)}">${textoSeguro(o.nome)}</option>`).join("");
        if ([...filtroOlimpiada.options].some(opt => opt.value === valorAnterior)) filtroOlimpiada.value = valorAnterior;
    }

    if (filtroMes && !filtroMes.dataset.montado) {
        filtroMes.innerHTML = `<option value="TODOS">-- Todos os meses --</option>` +
            ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
                .map((nome, i) => `<option value="${String(i + 1).padStart(2, "0")}">${nome}</option>`).join("");
        filtroMes.dataset.montado = "true";
    }

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
async function excluirUsuario(id) {
    const usuarios = getStorage("app_usuarios");
    const usuario = usuarios.find(u => u.id === id || u.authUid === id);
    if (!usuario) return alert("Usuário não encontrado.");
    if (!usuarioPodeGerenciarUsuarioAlvo(usuario)) return alert("Você não tem permissão para apagar este usuário.");
    if (usuarioLogado?.id === id || usuarioLogado?.authUid === usuario.authUid) return alert("Segurança: você não pode apagar o próprio usuário enquanto está logado.");
    const admins = usuarios.filter(u => u.nivel === "ADM");
    if (usuario.nivel === "ADM" && admins.length <= 1) return alert("Segurança: não é permitido apagar o último administrador do sistema.");
    if (!confirmarExclusao("o usuário", usuario.nome)) return;

    try {
        await apagarUsuarioFirestore(usuario);
        setStorageLocal("app_usuarios", usuarios.filter(u => u.id !== usuario.id && u.authUid !== usuario.authUid));
        renderizarTabelasGerenciais();
        alert("Usuário removido do Firestore. Se ele também existir no Firebase Auth, remova-o em Authentication > Users ou use a rotina administrativa segura quando configurarmos Cloud Functions.");
    } catch (erro) {
        console.error("Erro ao excluir usuário", erro);
        alert(`Não foi possível excluir o usuário.

${erro.message || erro}`);
    }
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

async function excluirCronograma(id) {
    if (usuarioLogado?.nivel !== "ADM") {
        alert("Apenas administradores podem apagar eventos do calendário.");
        return false;
    }

    const cronograma = getStorage("app_cronograma");
    const evento = cronograma.find(c => c.id === id);
    if (!evento) {
        alert("Evento não encontrado.");
        return false;
    }

    const olimpiada = getStorage("app_olimpiadas").find(o => o.id === evento.olimpiadaId);
    const nomeOlimpiada = olimpiada?.nome || "Olimpíada não identificada";
    const nomeEvento = `${nomeOlimpiada} — ${evento.etapa || "Etapa sem nome"} — ${evento.data || "sem data"}`;

    if (!confirmarExclusao("o evento do calendário", nomeEvento)) return false;

    const novaLista = cronograma.filter(c => c.id !== id);
    await setStorage("app_cronograma", novaLista);

    renderizarCronograma();
    renderizarTabelasGerenciais();
    if (!document.getElementById("view-reuniao")?.classList.contains("hidden") && typeof prepararTelaReuniao === "function") prepararTelaReuniao();
    alert("Evento apagado com sucesso.");
    return true;
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
        } else if (campo.tipo === "multiselect") {
            input = document.createElement("select");
            input.multiple = true;
            input.size = campo.size || 5;
            input.className = "w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 focus:outline-none";
            const valoresAtuais = Array.isArray(campo.valor) ? campo.valor.map(String) : [];
            const opts = Array.isArray(campo.options) ? campo.options : [];
            opts.forEach(opt => {
                const o = document.createElement("option");
                if (typeof opt === "object") { o.value = opt.value; o.text = opt.text; }
                else { o.value = opt; o.text = opt; }
                if (valoresAtuais.includes(String(o.value))) o.selected = true;
                input.appendChild(o);
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

    document.getElementById("modalEdicaoBtnSalvar").onclick = async () => {
        const btnSalvar = document.getElementById("modalEdicaoBtnSalvar");
        const textoOriginal = btnSalvar ? btnSalvar.innerHTML : "";
        const dados = {};
        campos.forEach(c => {
            const el = document.getElementById(`modalCampo_${c.nome}`);
            if (c.tipo === "checkboxGroup") {
                dados[c.nome] = Array.from(el?.querySelectorAll('input[type="checkbox"]:checked') || []).map(chk => chk.value);
            } else if (c.tipo === "multiselect") {
                dados[c.nome] = Array.from(el?.selectedOptions || []).map(opt => opt.value);
            } else if (c.tipo === "file") {
                dados[c.nome] = el?.files?.[0] || null;
            } else {
                dados[c.nome] = el?.value ?? "";
            }
        });
        try {
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Salvando...';
            }
            const resultado = await Promise.resolve(onSalvar(dados));
            if (resultado !== false) fecharModalEdicao();
        } catch (erro) {
            console.error("Erro ao salvar edição", erro);
            alert(`Erro ao salvar.

${erro.message || erro}`);
        } finally {
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = textoOriginal;
            }
        }
    };

    const btnApagar = document.getElementById("modalEdicaoBtnApagar");
    if (btnApagar) {
        if (onApagar) {
            btnApagar.classList.remove("hidden");
            btnApagar.onclick = async () => {
                const textoOriginal = btnApagar.innerHTML;
                try {
                    btnApagar.disabled = true;
                    btnApagar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Apagando...';
                    const resultado = await Promise.resolve(onApagar());
                    if (resultado !== false) fecharModalEdicao();
                } catch (erro) {
                    console.error("Erro ao apagar registro", erro);
                    alert(`Erro ao apagar.

${erro.message || erro}`);
                } finally {
                    btnApagar.disabled = false;
                    btnApagar.innerHTML = textoOriginal;
                }
            };
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
        { nome: "emailAuth", label: "Login / e-mail de acesso", tipo: "email", valor: atual.emailAuth || atual.authEmail || atual.email || atual.login || "" },
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

    if (atual.nivel === "Professor/Orientador") {
        const escolas = getStorage("app_escolas");
        const escopo = atual.escopoProfessorOrientador || { todasEscolas: false, escolasIds: [] };
        campos.push({ nome: "professorTodasEscolas", label: "Acesso aos resultados de todas as escolas?", tipo: "select", valor: escopo.todasEscolas ? "Sim" : "Não", options: ["Não", "Sim"] });
        campos.push({ nome: "professorEscolasIds", label: "Escolas vinculadas ao professor/orientador", tipo: "multiselect", valor: escopo.escolasIds || [], size: 6, options: escolas.map(e => ({ value: e.id, text: e.nome })) });
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
            if (!d.nome || !d.emailAuth || !String(d.emailAuth).includes("@")) return alert("Nome e e-mail de acesso são obrigatórios."), false;
            if (!perms.usuarios.niveisPermitidos.includes(d.nivel)) return alert("Você não pode atribuir esse nível de acesso."), false;

            const vinculosPermitidos = opcoesVinculoUsuario(d.nivel).map(o => o.value);
            const precisaVinculo = d.nivel === "Gestor" || d.nivel === "Escola" || d.nivel === "Aluno";
            if (precisaVinculo && !vinculosPermitidos.includes(d.vinculoId)) return alert("Vínculo fora do seu escopo de permissão."), false;

            const lista = getStorage("app_usuarios");
            if (lista.some(u => u.id !== id && (normalizarTexto(u.emailAuth || u.authEmail || u.email || u.login) === normalizarTexto(d.emailAuth)))) return alert("Já existe outro usuário com esse e-mail de acesso."), false;
            const i = lista.findIndex(u => u.id === id);
            const senhaFinal = d.novaSenha ? d.novaSenha : lista[i].senha;
            const emailAcesso = String(d.emailAuth || "").trim().toLowerCase();
            lista[i] = { ...lista[i], nome: d.nome, login: emailAcesso, senha: senhaFinal, nivel: d.nivel, email: emailAcesso, authEmail: emailAcesso, emailAuth: emailAcesso, telefone: d.telefone, vinculoId: precisaVinculo ? d.vinculoId : "" };
            if (d.nivel === "Visualizador") {
                const cidadesIds = Array.isArray(d.visualizadorCidadesIds) ? d.visualizadorCidadesIds : (lista[i].escopoVisualizador?.cidadesIds || []);
                const escolasIds = Array.isArray(d.visualizadorEscolasIds) ? d.visualizadorEscolasIds : (lista[i].escopoVisualizador?.escolasIds || []);
                if (!cidadesIds.length && !escolasIds.length) return alert("Visualizador precisa ter pelo menos uma cidade ou escola no escopo."), false;
                lista[i].escopoVisualizador = { cidadesIds, escolasIds };
            } else {
                delete lista[i].escopoVisualizador;
            }
            if (d.nivel === "Professor/Orientador") {
                const todasEscolas = d.professorTodasEscolas === "Sim" || lista[i].escopoProfessorOrientador?.todasEscolas === true;
                const escolasIds = Array.isArray(d.professorEscolasIds) ? d.professorEscolasIds : (lista[i].escopoProfessorOrientador?.escolasIds || []);
                lista[i].escopoProfessorOrientador = { todasEscolas, escolasIds: todasEscolas ? [] : escolasIds };
            } else {
                delete lista[i].escopoProfessorOrientador;
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

function resultadoTemCertificado(resultado) {
    return !!(resultado && (resultado.certificadoUrl || resultado.certificadoStoragePath));
}

function certificadoResultadoHtml(resultado, modo = "tabela") {
    if (!resultadoTemCertificado(resultado)) {
        return modo === "modal"
            ? '<span class="text-xs text-gray-500">Nenhum certificado anexado.</span>'
            : '<span class="text-[11px] text-gray-500">—</span>';
    }
    const nome = textoSeguro(resultado.certificadoNomeArquivo || "Certificado");
    const url = textoSeguro(resultado.certificadoUrl || "#");
    const classe = modo === "modal"
        ? "inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition"
        : "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/20 transition";
    return `<a href="${url}" target="_blank" rel="noopener" class="${classe}"><i class="fa-solid fa-file-certificate"></i><span>${nome}</span></a>`;
}

async function anexarCertificadoAoResultado(resultado, arquivo) {
    if (!arquivo) return resultado;
    const tiposPermitidos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const nome = String(arquivo.name || "").toLowerCase();
    const extensaoOk = /\.(pdf|jpg|jpeg|png|webp)$/.test(nome);
    if (!tiposPermitidos.includes(arquivo.type) && !extensaoOk) {
        throw new Error("Certificado inválido. Envie PDF, JPG, PNG ou WEBP.");
    }
    const upload = await enviarArquivoParaFirebaseStorage(arquivo, "certificados");
    return {
        ...resultado,
        certificadoUrl: upload.fileUrl,
        certificadoStoragePath: upload.storagePath,
        certificadoNomeArquivo: upload.fileName || arquivo.name,
        certificadoMimeType: upload.mimeType || arquivo.type || "application/octet-stream",
        certificadoTamanho: upload.size || arquivo.size || 0,
        certificadoEnviadoEm: new Date().toISOString(),
        certificadoEnviadoPorId: usuarioLogado?.id || "",
        certificadoEnviadoPorNome: usuarioLogado?.nome || ""
    };
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
            { nome: "alunoCpf", label: "CPF do aluno (para vincular sem confundir homônimos)", valor: atual.alunoCpf || "" },
            { nome: "municipio", label: "Cidade", tipo: "select", valor: atual.municipio || "", options: opcoesCidadesNomeUf() },
            { nome: "escola", label: "Escola", tipo: "select", valor: atual.escola || "", options: opcoesEscolasNome(atual.municipio || "") },
            { nome: "olimpiada", label: "Olimpíada", tipo: "select", valor: atual.olimpiada || "", options: opcoesOlimpiadasNome() },
            { nome: "serie", label: "Série", tipo: "select", valor: atual.serie || "", options: SERIES_PADRAO },
            { nome: "premio", label: "Premiação", tipo: "select", valor: atual.premio || "", options: PREMIOS_PADRAO },
            { nome: "observacao", label: "Observação", tipo: "textarea", valor: atual.observacao || "" },
            { nome: "certificadoArquivo", label: "Certificado do resultado (PDF ou imagem)", tipo: "file", valor: "" }
        ],
        onDepoisMontar: () => {
            const cidadeSelect = document.getElementById("modalCampo_municipio");
            if (cidadeSelect) cidadeSelect.onchange = () => atualizarSelectEscolasModal(cidadeSelect.value);
            const fileInput = document.getElementById("modalCampo_certificadoArquivo");
            if (fileInput) fileInput.accept = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*";
            const corpo = document.getElementById("modalEdicaoCampos");
            if (corpo) {
                const box = document.createElement("div");
                box.className = "rounded-2xl border border-gray-700 bg-gray-900/60 p-4 space-y-2";
                box.innerHTML = `
                    <div class="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
                        <i class="fa-solid fa-award text-amber-400"></i> Certificado anexado
                    </div>
                    <div>${certificadoResultadoHtml(atual, "modal")}</div>
                    <p class="text-[11px] text-gray-500">Ao enviar um novo arquivo, ele substituirá o certificado exibido para este resultado.</p>
                `;
                corpo.appendChild(box);
            }
        },
        onSalvar: async (d) => {
            if (!d.aluno || !d.municipio || !d.escola || !d.olimpiada || !d.serie || !d.premio) return alert("Todos os campos do resultado são obrigatórios."), false;
            const cidades = getStorage("app_cidades");
            const escolas = getStorage("app_escolas");
            const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(d.municipio));
            const escola = escolas.find(e => normalizarTexto(e.nome) === normalizarTexto(d.escola));
            if (!cidade) return alert("Cidade inválida."), false;
            if (!escola) return alert("Escola inválida."), false;
            if (escola.cidadeId !== cidade.id) return alert("A escola selecionada não pertence à cidade escolhida."), false;

            const cpfEditado = d.alunoCpf || "";
            if (cpfEditado && !validarCpf(cpfEditado)) return alert("CPF do aluno inválido."), false;
            const alunoVinculadoPorCpf = cpfLimpo(cpfEditado) ? getStorage("app_alunos", []).find(a => cpfLimpo(a.cpf || "") === cpfLimpo(cpfEditado)) : null;
            const atualizadoBase = {
                ...atual,
                aluno: d.aluno,
                alunoCpf: cpfEditado,
                alunoId: alunoVinculadoPorCpf?.id || (cpfLimpo(cpfEditado) ? atual.alunoId || "" : ""),
                municipio: d.municipio,
                escola: d.escola,
                olimpiada: d.olimpiada,
                serie: d.serie,
                premio: d.premio,
                observacao: d.observacao || ""
            };
            const atualizado = await anexarCertificadoAoResultado(atualizadoBase, d.certificadoArquivo);
            dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chaveOriginal);
            gravarResultadoComSobrescrita(atualizado);
            salvarPremiados();
            popularSeletores();
            renderizarPlataformaDashboard();
            renderizarResultadosImportacao();
            renderizarDashboardAluno();
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

// ==================== REUNIÃO ESTRATÉGICA ADM ====================
function abrirMenuMobile() {
    document.body.classList.add("sidebar-open");
}

function fecharMenuMobile() {
    document.body.classList.remove("sidebar-open");
}

function initMobileUX() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            if (window.innerWidth < 1024) fecharMenuMobile();
        });
    });
    window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) fecharMenuMobile();
    });
}

function anosSelecionadosReuniao() {
    const inicio = document.getElementById("reuniaoAnoInicio")?.value || "2022";
    const fim = document.getElementById("reuniaoAnoFim")?.value || anoDadosAtivo;
    const a = Number(inicio), b = Number(fim);
    const min = Math.min(a, b), max = Math.max(a, b);
    return ANOS_REFERENCIA_PADRAO.filter(ano => Number(ano) >= min && Number(ano) <= max);
}

function prepararFiltrosReuniao() {
    const ini = document.getElementById("reuniaoAnoInicio");
    const fim = document.getElementById("reuniaoAnoFim");
    const opts = ANOS_REFERENCIA_PADRAO.map(a => `<option value="${a}">${a}</option>`).join("");
    if (ini && ini.options.length === 0) ini.innerHTML = opts;
    if (fim && fim.options.length === 0) fim.innerHTML = opts;
    if (ini && !ini.value) ini.value = "2022";
    if (fim) fim.value = anoDadosAtivo;
}

async function prepararTelaReuniao() {
    prepararFiltrosReuniao();
    await gerarPainelReuniao();
}

function formatoNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
}

function crescimentoPercentual(primeiro, ultimo) {
    if (!primeiro && !ultimo) return "—";
    if (!primeiro && ultimo) return "+100%";
    const pct = ((ultimo - primeiro) / Math.max(1, primeiro)) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}%`;
}

function resumoOuros(lista) {
    return lista.filter(item => classificarPremio(item.premio) === "ouro").length;
}

function resumoPratas(lista) {
    return lista.filter(item => classificarPremio(item.premio) === "prata").length;
}

function resumoBronzes(lista) {
    return lista.filter(item => classificarPremio(item.premio) === "bronze").length;
}

function melhorEntidadeTexto(ranking, tipo) {
    if (!ranking.length) return `Ainda não há ${tipo} com resultados no período.`;
    const top = ranking[0];
    return `${top.nome} lidera com ${top.total} resultado(s).`;
}

function tendenciaClasse(delta) {
    if (delta > 0) return "text-emerald-400";
    if (delta < 0) return "text-red-400";
    return "text-gray-300";
}


function nomeOlimpiadaPorIdReuniao(id) {
    const olimpiadas = getStorage("app_olimpiadas", []);
    const item = olimpiadas.find(o => String(o.id) === String(id));
    return item?.nome || "";
}

function montarItemInsight(texto, icone = "fa-lightbulb", cor = "text-blue-400") {
    return `<div class="meeting-insight bg-gray-900/60 border border-gray-700 rounded-xl p-3"><p class="text-sm text-gray-300"><i class="fa-solid ${icone} ${cor} mr-2"></i>${texto}</p></div>`;
}

async function gerarPainelReuniao() {
    if (usuarioLogado?.nivel !== "ADM") return;
    const btn = document.getElementById("btnAtualizarReuniao");
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Gerando...'; }
        const anos = anosSelecionadosReuniao();
        const dados = await carregarDadosMultianuaisRelatorio(anos);
        const premiados = filtrarListaPorEscopoResultado(dados.premiados || []);
        const alunos = dados.alunos || [];
        const cronograma = dados.cronograma || [];
        const plataforma = dados.plataforma || [];
        const porAno = agregarPorAno(premiados, anos);
        const primeiro = porAno[0]?.total || 0;
        const ultimo = porAno[porAno.length - 1]?.total || 0;
        const delta = ultimo - primeiro;
        const escolas = new Set(premiados.map(r => normalizarTexto(r.escola)).filter(Boolean));
        const cidades = new Set(premiados.map(r => normalizarTexto(r.municipio)).filter(Boolean));
        const olimpiadas = contagemPorCampo(premiados, "olimpiada", 8);
        const rankingCidades = agregarRanking(premiados, "municipio").slice(0, 8);
        const rankingEscolas = agregarRanking(premiados, "escola", "municipio").slice(0, 10);

        document.getElementById("reuniaoTotalMedalhas").innerText = formatoNumero(premiados.length);
        document.getElementById("reuniaoTotalSub").innerText = `${resumoOuros(premiados)} ouro(s), ${resumoPratas(premiados)} prata(s), ${resumoBronzes(premiados)} bronze(s)`;
        document.getElementById("reuniaoCrescimento").innerText = crescimentoPercentual(primeiro, ultimo);
        document.getElementById("reuniaoCrescimento").className = `text-3xl font-black mt-2 ${tendenciaClasse(delta)}`;
        document.getElementById("reuniaoCrescimentoSub").innerText = `${primeiro} em ${porAno[0]?.ano || "—"} → ${ultimo} em ${porAno[porAno.length-1]?.ano || "—"}`;
        document.getElementById("reuniaoEscolas").innerText = formatoNumero(escolas.size);
        document.getElementById("reuniaoEscolasSub").innerText = `${cidades.size} cidade(s) com resultado`;
        document.getElementById("reuniaoAlunos").innerText = formatoNumero(alunos.length);
        document.getElementById("reuniaoAlunosSub").innerText = `${plataforma.length} material(is) na plataforma`;

        const tbodyEvo = document.getElementById("tableReuniaoEvolucao");
        if (tbodyEvo) {
            tbodyEvo.innerHTML = porAno.map((linha, i) => {
                const anterior = i > 0 ? porAno[i-1].total : linha.total;
                const d = linha.total - anterior;
                return `<tr class="hover:bg-gray-700/20"><td class="p-4 font-bold text-white">${linha.ano}</td><td class="p-4 font-bold">${linha.total}</td><td class="p-4">${linha.ouro}</td><td class="p-4">${linha.prata}</td><td class="p-4">${linha.bronze}</td><td class="p-4 font-bold ${tendenciaClasse(d)}">${i === 0 ? "—" : (d >= 0 ? "+" : "") + d}</td></tr>`;
            }).join("") || `<tr><td colspan="6" class="p-6 text-center text-gray-500">Sem dados no período.</td></tr>`;
        }

        const insights = [];
        insights.push(montarItemInsight(gerarInsightCrescimento(porAno), delta >= 0 ? "fa-arrow-trend-up" : "fa-triangle-exclamation", delta >= 0 ? "text-emerald-400" : "text-amber-400"));
        insights.push(montarItemInsight(melhorEntidadeTexto(rankingCidades, "cidades"), "fa-city", "text-emerald-400"));
        insights.push(montarItemInsight(melhorEntidadeTexto(rankingEscolas, "escolas"), "fa-school", "text-purple-400"));
        if (olimpiadas.length) insights.push(montarItemInsight(`A olimpíada de maior impacto no período é ${olimpiadas[0].nome}, com ${olimpiadas[0].total} resultado(s).`, "fa-trophy", "text-amber-400"));
        if (!premiados.length) insights.push(montarItemInsight("Ainda não há resultados suficientes para apresentação. O foco da reunião deve ser plano de cadastro, aplicação e importação de resultados.", "fa-clipboard-list", "text-blue-400"));
        document.getElementById("reuniaoInsights").innerHTML = insights.join("");

        const tbodyCid = document.getElementById("tableReuniaoCidades");
        if (tbodyCid) tbodyCid.innerHTML = rankingCidades.map(r => `<tr class="hover:bg-gray-700/20"><td class="p-4 font-bold text-white">${textoSeguro(r.nome)}</td><td class="p-4 font-bold">${r.total}</td><td class="p-4">${melhorAnoTexto(r.porAno)}</td><td class="p-4 text-gray-400">${crescimentoEntidadeTexto(r.porAno, anos)}</td></tr>`).join("") || `<tr><td colspan="4" class="p-6 text-center text-gray-500">Sem cidades ranqueadas.</td></tr>`;

        const tbodyEsc = document.getElementById("tableReuniaoEscolas");
        if (tbodyEsc) tbodyEsc.innerHTML = rankingEscolas.map(r => `<tr class="hover:bg-gray-700/20"><td class="p-4 font-bold text-white">${textoSeguro(r.nome)}</td><td class="p-4 text-gray-400">${textoSeguro(r.secundario || "—")}</td><td class="p-4 font-bold">${r.total}</td><td class="p-4 text-gray-400">${crescimentoEntidadeTexto(r.porAno, anos)}</td></tr>`).join("") || `<tr><td colspan="4" class="p-6 text-center text-gray-500">Sem escolas ranqueadas.</td></tr>`;

        const oliBox = document.getElementById("reuniaoOlimpiadas");
        if (oliBox) oliBox.innerHTML = olimpiadas.map((o, i) => `<div class="flex items-center justify-between gap-3 bg-gray-900/60 border border-gray-700 rounded-xl p-3"><span class="font-bold text-gray-200">${i+1}. ${textoSeguro(o.nome)}</span><span class="text-blue-400 font-black">${o.total}</span></div>`).join("") || `<p class="text-gray-500">Sem resultados por olimpíada no período.</p>`;

        const agenda = cronograma
            .map(item => ({...item, temporal: classificarTemporalCronograma(item)}))
            .filter(item => item.temporal && item.temporal.codigo !== "passado" && item.temporal.codigo !== "semdata")
            .sort((a,b) => a.temporal.dataBase - b.temporal.dataBase)
            .slice(0, 6);
        const agendaBox = document.getElementById("reuniaoAgenda");
        if (agendaBox) agendaBox.innerHTML = agenda.map(item => `<div class="bg-gray-900/60 border border-gray-700 rounded-xl p-3"><p class="font-bold text-white">${textoSeguro(item.etapa || "Etapa")}</p><p class="text-xs text-gray-400 mt-1">${textoSeguro(item.data || "Data não informada")} · ${textoSeguro(nomeOlimpiadaPorIdReuniao(item.olimpiadaId) || item.olimpiada || "Olimpíada")}</p></div>`).join("") || `<p class="text-gray-500">Sem agenda futura cadastrada.</p>`;

        const enc = [];
        if (delta < 0) enc.push("Investigar queda de resultados e comparar calendário de preparação do período.");
        if (alunos.length && premiados.length) enc.push(`Cruzar ${alunos.length} aluno(s) cadastrado(s) com resultados para identificar talentos recorrentes.`);
        if (plataforma.length) enc.push(`Usar os ${plataforma.length} material(is) publicados para direcionar trilhas de estudo por nível.`);
        enc.push("Definir metas por cidade, escola e olimpíada para o próximo ciclo.");
        enc.push("Revisar eventos dos próximos 30 dias e responsáveis por inscrição/aplicação/correção.");
        document.getElementById("reuniaoEncaminhamentos").innerHTML = enc.map(x => `<div class="bg-gray-900/60 border border-gray-700 rounded-xl p-3"><i class="fa-solid fa-check text-emerald-400 mr-2"></i>${textoSeguro(x)}</div>`).join("");
    } catch (erro) {
        console.error("Erro ao gerar painel de reunião", erro);
        alert(`Erro ao gerar painel de reunião.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate mr-2"></i>Atualizar'; }
    }
}

// ==================== NAVEGAÇÃO ENTRE ABAS ====================
function navegarAba(abaId, botaoTarget) {
    if (!podeVerAba(abaId)) return;
    fecharMenuMobile();

    document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
    document.getElementById(`view-${abaId}`).classList.remove("hidden");

    const titulos = {
        dashboard: "Dashboard Analítico", calendario: "Calendário Oficial de Olimpíadas",
        meusresultados: "Meus Resultados", importar: "Importar Resultados", relatorios: "Relatórios Comparativos", reuniao: "Reunião Estratégica",
        alunos: "Cadastro de Alunos", usuarios: "Gerenciar Usuários e Permissões",
        olimpiadas: "Olimpíadas Cadastradas", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)",
        plataforma: "Plataforma de Ensino", simulados: "Simulados", aulas: "Aulas", questoes: "Banco de Questões", monitoria: "Monitoria — Salas de Atendimento", layout: "Editor de Layout"
    };
    document.getElementById("pageTitleDisplay").innerText = titulos[abaId] || "Painel Operacional";

    if (abaId === "importar") {
        popularSeletores();
        renderizarResultadosImportacao();
    }
    if (abaId === "plataforma") {
        renderizarPlataformaEnsino();
    }
    if (abaId === "simulados") {
        popularFiltrosSimulados();
        renderizarSimulados();
    }
    if (abaId === "aulas") {
        popularFiltrosAulas();
        renderizarAulas();
    }
    if (abaId === "questoes") {
        popularFiltrosQuestoes();
        renderizarBancoQuestoes();
    }
    if (abaId === "monitoria") {
        renderizarSalasMonitoria();
    }
    if (abaId === "relatorios") {
        prepararTelaRelatoriosComparativos();
    }
    if (abaId === "reuniao") {
        prepararTelaReuniao();
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
    const divProfessor = document.getElementById("divEscopoProfessorOrientador");
    if (!divCidade || !divEscola) return;

    divCidade.classList.add("hidden");
    divEscola.classList.add("hidden");
    if (divVisualizador) divVisualizador.classList.add("hidden");
    if (divProfessor) divProfessor.classList.add("hidden");

    if (nivel === "Gestor") {
        divCidade.classList.remove("hidden");
    } else if (nivel === "Escola" || nivel === "Aluno") {
        divEscola.classList.remove("hidden");
    } else if (nivel === "Visualizador") {
        if (divVisualizador) divVisualizador.classList.remove("hidden");
        popularEscopoVisualizadorCadastro();
    } else if (nivel === "Professor/Orientador") {
        if (divProfessor) divProfessor.classList.remove("hidden");
        popularEscopoProfessorOrientadorCadastro();
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
    const senha = SENHA_PADRAO_USUARIO;
    const email = document.getElementById("addUserEmail").value.trim().toLowerCase();
    const login = email;
    const telefone = document.getElementById("addUserTelefone").value.trim();

    if (!nome) return alert("Informe o nome completo do usuário.");
    if (!email || !email.includes("@")) return alert("Informe um e-mail válido. Esse e-mail será usado como login no Firebase Auth.");

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
    } else if (nivelNovo === "Professor/Orientador") {
        if (nivel !== "ADM") return alert("Apenas administradores podem criar usuários Professor/Orientador.");
        vinculoId = "";
    } else if (nivelNovo === "ADM" || nivelNovo === "Monitor") {
        if (nivel !== "ADM") return alert("Apenas administradores podem criar esse nível de usuário.");
    }

    const usuarios = getStorage("app_usuarios");
    if (usuarios.some(u => normalizarTexto(u.email) === normalizarTexto(email) || normalizarTexto(u.login) === normalizarTexto(email) || normalizarTexto(u.authEmail) === normalizarTexto(email) || normalizarTexto(u.emailAuth) === normalizarTexto(email))) return alert("Erro: já existe um usuário com esse e-mail de login/Auth.");

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
    if (nivelNovo === "Professor/Orientador") {
        novoUsuario.escopoProfessorOrientador = {
            todasEscolas: document.getElementById("addUserProfessorTodasEscolas")?.checked === true,
            escolasIds: valoresSelectMultiplo("addUserProfessorEscolas")
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
    return ["ADM", "Gestor", "Escola", "Aluno", "Monitor", "Professor/Orientador", "Visualizador"];
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

function validarCpf(valor) {
    const cpf = cpfLimpo(valor);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    return digito === Number(cpf[10]);
}

function formatarCpfAoFinal(input, obrigatorio = false) {
    if (!input) return true;
    const raw = cpfLimpo(input.value);
    if (!raw) {
        input.setCustomValidity(obrigatorio ? "CPF obrigatório." : "");
        return !obrigatorio;
    }
    if (raw.length === 11) input.value = formatarCpf(raw);
    const ok = validarCpf(raw);
    input.setCustomValidity(ok ? "" : "CPF inválido.");
    input.classList.toggle("border-red-500", !ok);
    input.classList.toggle("focus:border-red-500", !ok);
    if (!ok) input.reportValidity?.();
    return ok;
}

function initValidacaoCpfGlobal() {
    const configurar = (input) => {
        if (!input || input.dataset.cpfReady === "true") return;
        const id = String(input.id || "").toLowerCase();
        const ph = String(input.getAttribute("placeholder") || "").toLowerCase();
        const label = input.closest("div")?.querySelector("label")?.innerText?.toLowerCase() || "";
        const ehCpf = id.includes("cpf") || ph.includes("000.000.000-00") || label.includes("cpf");
        if (!ehCpf) return;
        input.dataset.cpfReady = "true";
        input.setAttribute("maxlength", "14");
        input.classList.add("cpf-input");
        input.addEventListener("input", () => {
            const d = cpfLimpo(input.value).slice(0, 11);
            if (d.length <= 3) input.value = d;
            else if (d.length <= 6) input.value = `${d.slice(0,3)}.${d.slice(3)}`;
            else if (d.length <= 9) input.value = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
            else input.value = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
            input.setCustomValidity("");
            input.classList.remove("border-red-500", "focus:border-red-500");
        });
        input.addEventListener("blur", () => formatarCpfAoFinal(input, input.required));
    };
    document.querySelectorAll("input").forEach(configurar);
    const obs = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches?.("input")) configurar(n);
        n.querySelectorAll?.("input").forEach(configurar);
    })));
    obs.observe(document.body, { childList: true, subtree: true });
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
    // E-mail é opcional no cadastro do aluno. A conta pode ser criada depois pelo botão “Inscreva-se”.
    if (!dados.cpf || !validarCpf(dados.cpf)) return "CPF do aluno é obrigatório e precisa ser válido.";
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
        etnia: document.getElementById(`${prefixo}Etnia`)?.value || "Não informado",
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

async function salvarNovoAluno(event) {
    event.preventDefault();
    if (!permissao("usuarios.podeGerenciar")) return alert("Sem permissão para cadastrar alunos.");
    const dados = montarDadosAlunoDoFormulario();
    const erro = validarDadosAluno(dados);
    if (erro) return alert(erro);
    const alunos = getStorage("app_alunos", []);
    const novoAluno = { ...dados, criadoEm: new Date().toISOString() };
    alunos.push(novoAluno);
    await setStorage("app_alunos", alunos);
    await salvarAlunoLookupPublico(novoAluno);
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
            <td class="p-4"><div class="font-mono text-xs text-gray-300">${textoSeguro(a.cpf)}</div><div class="text-[11px] text-blue-400 font-bold">${textoSeguro(a.idade || calcularIdadePorData(a.dataNascimento) || "—")} anos</div><div class="text-[11px] text-gray-500">${textoSeguro(a.etnia || "Não informado")}</div></td>
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
            { nome: "etnia", label: "Etnia / cor-raça", tipo: "select", valor: atual.etnia || "Não informado", options: ETNIAS_ALUNO_PADRAO },
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
                etnia: d.etnia || "Não informado",
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
            salvarAlunoLookupPublico(dados);
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
    removerAlunoLookupPublico(aluno);
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
    const dataNascimentoRaw = pegarValorLinhaPlanilha(linha, [
        "Data de nascimento", "Data nascimento", "Nascimento", "Data Nasc.", "Dt nascimento", "Dt. nascimento", "Data de nasc"
    ], "");
    const dataNascimento = normalizarDataPlanilha(dataNascimentoRaw);
    const sexo = validarOpcaoLista(lerLinhaPlanilha(linha, ["Sexo"], ""), SEXOS_ALUNO_PADRAO, "Sexo", erros, nl, true);
    const etnia = validarOpcaoLista(lerLinhaPlanilha(linha, ["Etnia", "Etnia / cor-raça", "Cor/raça", "Cor-raca"], "Não informado"), ETNIAS_ALUNO_PADRAO, "Etnia", erros, nl, false) || "Não informado";
    const escolaNome = lerLinhaPlanilha(linha, ["Escola", "Qual escola estuda"], "");
    const serie = validarOpcaoLista(lerLinhaPlanilha(linha, ["Série", "Serie"], ""), SERIES_PADRAO, "Série", erros, nl, true);
    const turnoTurma = lerLinhaPlanilha(linha, ["Turno/Turma", "Turno / Turma", "Turma"], "");
    const escola = escolasPermitidasParaCadastroUsuario().find(e => normalizarTexto(e.nome) === normalizarTexto(escolaNome));
    const cidade = cidadeDaEscola(escola);
    const aluno = {
        id: novoId(), nome, emailInstitucional, emailPessoal, cpf, dataNascimento,
        idade: calcularIdadePorData(dataNascimento), sexo, etnia,
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
    // E-mail é opcional também na importação em lote. A conta pode ser criada depois pelo botão “Inscreva-se”.
    if (!cpf || !validarCpf(cpf)) erros.push(`Linha ${nl}: CPF inválido ou vazio.`);
    if (!dataNascimento) erros.push(`Linha ${nl}: Data de nascimento inválida ou vazia. Valor lido: "${String(dataNascimentoRaw || "").trim() || "vazio"}".`);
    if (!escola) erros.push(`Linha ${nl}: escola não cadastrada ou fora do seu escopo (${escolaNome}).`);
    if (!turnoTurma) erros.push(`Linha ${nl}: Turno/Turma é obrigatório.`);
    if (!aluno.mae && !aluno.pai && !aluno.responsavelAcademico) erros.push(`Linha ${nl}: preencha mãe, pai ou responsável acadêmico.`);
    return aluno;
}

function normalizarDataPlanilha(valor) {
    if (valor === null || valor === undefined || valor === "") return "";

    const montarDataIsoValida = (ano, mes, dia) => {
        const y = Number(ano), m = Number(mes), d = Number(dia);
        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return "";
        if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "";
        const data = new Date(y, m - 1, d);
        if (data.getFullYear() !== y || data.getMonth() !== m - 1 || data.getDate() !== d) return "";
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    };

    // Quando o Excel entrega a célula como data real.
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return montarDataIsoValida(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
    }

    // Quando o Excel entrega a célula como número serial.
    if (typeof valor === "number" && Number.isFinite(valor)) {
        const parsed = XLSX.SSF.parse_date_code(valor);
        if (parsed) return montarDataIsoValida(parsed.y, parsed.m, parsed.d);
    }

    let s = String(valor)
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/ /g, " ")
        .trim();

    // Remove apóstrofo comum quando o Excel força texto: '20/05/2010
    if (s.startsWith("'")) s = s.slice(1).trim();

    // Date.toString(), caso alguma biblioteca entregue a data já convertida em texto inglês.
    const dataTexto = new Date(s);
    if (/^[A-Za-z]{3,}/.test(s) && !Number.isNaN(dataTexto.getTime())) {
        return montarDataIsoValida(dataTexto.getFullYear(), dataTexto.getMonth() + 1, dataTexto.getDate());
    }

    // Aceita serial do Excel vindo como texto: 40318, 40318.0 etc.
    if (/^\d{4,6}(\.0+)?$/.test(s)) {
        const n = Number(s);
        if (n > 20000 && n < 80000) {
            const parsed = XLSX.SSF.parse_date_code(n);
            if (parsed) return montarDataIsoValida(parsed.y, parsed.m, parsed.d);
        }
    }

    // Aceita 20/05/2010 00:00:00, 20/05/2010 00:00, etc.
    s = s.split(/\s+/)[0];

    // Aceita o formato técnico antigo, para não quebrar planilhas já prontas.
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return montarDataIsoValida(iso[1], iso[2], iso[3]);

    // Formato preferencial no Brasil: DD/MM/AAAA. Também aceita DD-MM-AAAA e DD.MM.AAAA.
    const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (br) {
        let ano = br[3];
        if (ano.length === 2) ano = Number(ano) <= 30 ? `20${ano}` : `19${ano}`;
        return montarDataIsoValida(ano, br[2], br[1]);
    }

    // Aceita 20052010 como DDMMAAAA quando alguém cola tudo sem barra.
    const compacto = s.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (compacto) return montarDataIsoValida(compacto[3], compacto[2], compacto[1]);

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
            sincronizarLookupPublicoAlunos(alunos);
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
        { header: "Etnia", key: "etnia", width: 22 },
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
    ws.addRow({ nome: "Maria Exemplo da Silva", emailInst: "", emailPessoal: "", cpf: "529.982.247-25", nascimento: "20/05/2010", sexo: "Feminino", etnia: "Parda", escola: escolas[0] || "Nome da Escola", serie: "8º Ano EF", turma: "Manhã / 8º A", mae: "Nome da Mãe", contatoResp: "(86) 99999-9999" });
    for (let i = 0; i < 199; i++) ws.addRow({});
    estilizarCabecalhoTemplate(ws, ws.columns.length);
    const listas = obterOuCriarAbaListas(workbook);
    const rangeSexos = escreverListaValidacao(listas, "A", "Sexos", SEXOS_ALUNO_PADRAO);
    const rangeEtnias = escreverListaValidacao(listas, "B", "Etnias", ETNIAS_ALUNO_PADRAO);
    const rangeEscolas = escreverListaValidacao(listas, "C", "Escolas", escolas);
    const rangeSeries = escreverListaValidacao(listas, "D", "Séries", SERIES_PADRAO);
    aplicarListaSuspensa(ws, "F", 2, 201, rangeSexos, "Escolha o sexo do aluno.");
    aplicarListaSuspensa(ws, "G", 2, 201, rangeEtnias, "Escolha a etnia/cor-raça do aluno.");
    aplicarListaSuspensa(ws, "H", 2, 201, rangeEscolas, "Escolha uma escola já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "I", 2, 201, rangeSeries, "Escolha a série da lista.");
    ws.getColumn("E").numFmt = "dd/mm/yyyy";
    await baixarWorkbookExcelJS(workbook, `modelo_cadastro_alunos_${anoDadosAtivo}.xlsx`);
}

function liberarResultadoManual() {
    ["addResAluno", "addResAlunoCpf", "addResCidadeSelect", "addResEscolaSelect", "addResSerieSelect"].forEach(id => {
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
    const inputCpf = document.getElementById("addResAlunoCpf");
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    const serieSelect = document.getElementById("addResSerieSelect");
    if (inputAluno) inputAluno.value = aluno.nome || "";
    if (inputCpf) inputCpf.value = aluno.cpf || "";
    if (cidadeSelect && cidade) cidadeSelect.value = `${cidade.nome} - ${cidade.uf}`;
    popularSeletoresResultadosManuais();
    if (cidadeSelect && cidade) cidadeSelect.value = `${cidade.nome} - ${cidade.uf}`;
    if (escolaSelect && escola) escolaSelect.value = escola.nome;
    if (serieSelect && aluno.serie) serieSelect.value = aluno.serie;
    ["addResAluno", "addResAlunoCpf", "addResCidadeSelect", "addResEscolaSelect"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
    });
}


// ==================== USUÁRIO DE ALUNO E SENHA ====================
function alunoJaTemUsuario(aluno) {
    const cpf = cpfLimpo(aluno?.cpf || "");
    const usuarios = getStorage("app_usuarios", []);
    return usuarios.some(u => (u.alunoId && u.alunoId === aluno?.id) || cpfLimpo(u.alunoCpf) === cpf || cpfLimpo(u.cpf) === cpf);
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
    if (usuarios.some(u => (u.alunoId && u.alunoId === aluno.id) || cpfLimpo(u.alunoCpf) === cpf || cpfLimpo(u.cpf) === cpf)) {
        return alert("Este aluno já possui usuário criado ou já existe vínculo com este CPF.");
    }

    const escola = escolaDoAluno(aluno);
    const cidade = cidadeDaEscola(escola);
    if (!escola) return alert("O aluno precisa estar vinculado a uma escola para criar usuário.");

    const emailAluno = String(aluno.emailInstitucional || aluno.emailPessoal || "").trim().toLowerCase();
    if (!emailAluno || !emailAluno.includes("@")) return alert("Este aluno ainda não tem e-mail cadastrado. Adicione um e-mail ao cadastro dele ou peça para o aluno usar o botão ‘Inscreva-se’ na tela de login para informar o próprio e-mail e criar a conta.");

    let novoUsuario = {
        id: novoId(),
        login: emailAluno,
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
        // Segurança contra homônimos: sem alunoId ou CPF, o resultado NÃO é vinculado automaticamente.
        // Dois alunos com mesmo nome e mesma escola só são distinguidos com CPF/alunoId.
        return false;
    });
}

function renderizarDashboardAluno() {
    const tbody = document.getElementById("tableAlunoResultadosCorpo");
    if (!tbody) return;
    if (!usuarioLogado || usuarioLogado.nivel !== "Aluno") {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500 text-sm">Este painel é exibido para usuários do nível Aluno.</td></tr>';
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
            <td class="p-4">${certificadoResultadoHtml(r)}</td>
        </tr>
    `).join("") || '<tr><td colspan="6" class="p-8 text-center text-gray-500 text-sm">Nenhum resultado vinculado ao seu cadastro neste ano.</td></tr>';
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
            const alunoCpfManual = document.getElementById("addResAlunoCpf")?.value?.trim() || "";
            if (alunoCpfManual && !validarCpf(alunoCpfManual)) return alert("CPF do aluno inválido. Corrija ou deixe em branco para não vincular ao aluno.");
            const municipio = document.getElementById("addResCidadeSelect").value;
            const escola = document.getElementById("addResEscolaSelect").value;
            const olimpiada = document.getElementById("addResOlimpiadaSelect").value;
            const serie = document.getElementById("addResSerieSelect").value;
            const premio = document.getElementById("addResPremioSelect").value;
            const observacao = document.getElementById("addResObservacao")?.value?.trim() || "";

            if (!aluno || !municipio || !escola || !olimpiada || !serie || !premio) return alert("Preencha todos os campos.");

            const escolas = getStorage("app_escolas");
            const cidades = getStorage("app_cidades");
            const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio));
            const escolaObj = escolas.find(ex => normalizarTexto(ex.nome) === normalizarTexto(escola));
            if (!cidade || !escolaObj) return alert("Cidade ou escola inválida.");
            if (escolaObj.cidadeId !== cidade.id) return alert("A escola não pertence à cidade selecionada.");

            const cpfFinal = alunoObjSelecionado?.cpf || alunoCpfManual || "";
            const alunoIdFinal = alunoObjSelecionado?.id || (cpfLimpo(cpfFinal) ? getStorage("app_alunos", []).find(a => cpfLimpo(a.cpf || "") === cpfLimpo(cpfFinal))?.id || "" : "");
            gravarResultadoComSobrescrita({ aluno, alunoId: alunoIdFinal, alunoCpf: cpfFinal, escola, municipio, olimpiada, serie, premio, observacao });
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
    const cpf = cpfLimpo(r.alunoCpf || r.cpf || "");
    const alunoChave = cpf ? `cpf:${cpf}` : `nome:${normalizarTexto(r.aluno)}`;
    return `${alunoChave}|${normalizarTexto(r.escola)}|${normalizarTexto(r.olimpiada)}|${normalizarTexto(r.serie)}`;
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

function obterPeriodoCronograma(evento) {
    if (!evento) return null;
    if (evento.dataInicio || evento.dataFim) {
        const texto = [evento.dataInicio, evento.dataFim].filter(Boolean).join(" a ");
        return parseDataBr(texto);
    }
    return parseDataBr(evento.data);
}

function diferencaDiasCronograma(a, b) {
    const dia = 24 * 60 * 60 * 1000;
    const aa = new Date(a); aa.setHours(0, 0, 0, 0);
    const bb = new Date(b); bb.setHours(0, 0, 0, 0);
    return Math.round((aa - bb) / dia);
}

function classificarTemporalCronograma(evento) {
    const periodo = obterPeriodoCronograma(evento);
    if (!periodo) return { codigo: "semdata", ordem: 2.5, label: "Data a confirmar", classe: "text-gray-400", dataBase: new Date(8640000000000000), dias: null };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 30);

    const inicio = new Date(periodo.inicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(periodo.fim || periodo.inicio);
    fim.setHours(23, 59, 59, 999);

    const diasParaInicio = diferencaDiasCronograma(inicio, hoje);

    if (inicio <= hoje && fim >= hoje) {
        return { codigo: "agora", ordem: 0, label: "Acontecendo agora", classe: "text-amber-300", dataBase: inicio, dias: 0 };
    }
    if (fim < hoje) {
        return { codigo: "passado", ordem: 3, label: "Já aconteceu", classe: "text-gray-500", dataBase: inicio, dias: diferencaDiasCronograma(hoje, fim) };
    }
    if (inicio <= limite) {
        const label = diasParaInicio === 0 ? "Hoje" : `Faltam ${diasParaInicio} dia${diasParaInicio === 1 ? "" : "s"}`;
        return { codigo: "proximo", ordem: 1, label, classe: "text-emerald-400", dataBase: inicio, dias: diasParaInicio };
    }
    return { codigo: "futuro", ordem: 2, label: `Faltam ${diasParaInicio} dias`, classe: "text-blue-400", dataBase: inicio, dias: diasParaInicio };
}

function cronogramaEventoNoMes(evento, mesFiltro) {
    if (!mesFiltro || mesFiltro === "TODOS") return true;
    const periodo = obterPeriodoCronograma(evento);
    if (!periodo) return false;
    const alvo = Number(mesFiltro) - 1;
    const inicio = new Date(periodo.inicio);
    const fim = new Date(periodo.fim || periodo.inicio);
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor <= limite) {
        if (cursor.getMonth() === alvo) return true;
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return false;
}

function formatarPeriodoCronograma(evento) {
    if (evento?.dataInicio || evento?.dataFim) {
        const ini = evento.dataInicio || "";
        const fim = evento.dataFim || "";
        return ini && fim && normalizarTexto(ini) !== normalizarTexto(fim) ? `${ini} a ${fim}` : (ini || fim || "");
    }
    return evento?.data || "";
}

function ordenarCronogramaAutomatico(lista) {
    return [...lista].sort((a, b) => {
        const ca = classificarTemporalCronograma(a);
        const cb = classificarTemporalCronograma(b);
        if (ca.ordem !== cb.ordem) return ca.ordem - cb.ordem;
        if (ca.codigo === "passado" && cb.codigo === "passado") return cb.dataBase - ca.dataBase;
        return ca.dataBase - cb.dataBase;
    });
}

function ordenarCronogramaPorModo(lista) {
    // Regra atual do calendário: organização sempre automática por data.
    return ordenarCronogramaAutomatico(lista);
}

function badgeTemporalCronograma(evento) {
    const status = classificarTemporalCronograma(evento);
    const icone = status.codigo === "agora" ? "fa-bell" : status.codigo === "passado" ? "fa-check" : "fa-hourglass-half";
    return `<div class="mt-1 text-[10px] uppercase tracking-wider font-bold ${status.classe}"><i class="fa-solid ${icone} mr-1"></i>${textoSeguro(status.label)}</div>`;
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
    const filtroOlimpiada = document.getElementById("filterCronogramaOlimpiada")?.value || "TODOS";
    const filtroMes = document.getElementById("filterCronogramaMes")?.value || "TODOS";

    const cronogramaFiltrado = ordenarCronogramaPorModo(cronograma.filter(c => {
        const info = normalizarEtapaCronograma(c.etapa);
        const porGrupo = filtroGrupo === "TODOS" ||
            (filtroGrupo === "NAO_PADRONIZADA" ? !info.padronizada : info.etapaGrupo === filtroGrupo);
        const porEtapa = filtroEtapa === "TODOS" || normalizarTexto(info.etapa) === normalizarTexto(filtroEtapa);
        const porOlimpiada = filtroOlimpiada === "TODOS" || String(c.olimpiadaId) === String(filtroOlimpiada);
        const porMes = cronogramaEventoNoMes(c, filtroMes);
        return porGrupo && porEtapa && porOlimpiada && porMes;
    }));

    if (!cronogramaFiltrado.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-500 text-sm">Nenhum evento encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = cronogramaFiltrado.map(c => {
        const oli = olimpiadas.find(o => o.id === c.olimpiadaId);
        const temporal = classificarTemporalCronograma(c);
        const rowExtra = temporal.codigo === "passado" ? " opacity-70" : (temporal.codigo === "agora" ? " bg-amber-500/5 ring-1 ring-amber-500/20" : "");
        return `
            <tr class="hover:bg-gray-800/40 transition${rowExtra}">
                <td class="p-4 font-bold text-white">${oli ? textoSeguro(oli.nome) : "Desconhecida"}</td>
                <td class="p-4 text-xs font-semibold">${etapaVisualCronograma(c)}</td>
                <td class="p-4 text-amber-400 font-mono text-xs"><i class="fa-regular fa-clock mr-1"></i> ${textoSeguro(formatarPeriodoCronograma(c))}${badgeTemporalCronograma(c)}</td>
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
            } else if (u.nivel === "Professor/Orientador") {
                const escopo = u.escopoProfessorOrientador || {};
                const qtdEscolas = escopo.todasEscolas ? "todas" : (Array.isArray(escopo.escolasIds) ? escopo.escolasIds.length : 0);
                vinculo = `<span class="text-emerald-300 font-semibold">Orientador</span><br><span class="text-[10px] text-gray-500">Escolas vinculadas: ${qtdEscolas}</span>`;
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
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center text-gray-500 text-sm">Nenhum resultado encontrado para os filtros selecionados.</td></tr>`;
        return;
    }
    tbody.innerHTML = filtrados.map(r => {
        const chave = encodeURIComponent(chaveResultado(r));
        return `
            <tr class="hover:bg-gray-700/30 text-xs">
                <td class="p-4 font-bold text-white">${textoSeguro(r.aluno)}</td>
                <td class="p-4 text-gray-400 font-mono">${textoSeguro(r.alunoCpf || "—")}</td>
                <td class="p-4 text-gray-300">${textoSeguro(r.escola)}</td>
                <td class="p-4 text-blue-400 font-semibold">${textoSeguro(r.municipio)}</td>
                <td class="p-4 text-gray-300 font-medium">${textoSeguro(r.serie || "Não informada")}</td>
                <td class="p-4 text-gray-400">${textoSeguro(r.olimpiada)}</td>
                <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">${textoSeguro(r.premio)}</span></td>
                <td class="p-4 text-gray-400 max-w-xs"><span title="${textoSeguro(r.observacao || '')}">${textoSeguro(r.observacao || '—')}</span></td>
                <td class="p-4">${certificadoResultadoHtml(r)}</td>
                <td class="p-4 text-right">${podeEditar ? `<button onclick="editarResultado('${chave}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td>
            </tr>
        `;
    }).join("");
}

async function excluirResultado(chaveCodificada) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem apagar resultados."), false;
    const chave = decodeURIComponent(chaveCodificada);
    const resultado = dadosTrabalho.find(r => chaveResultado(r) === chave);
    if (!resultado) return alert("Resultado não encontrado."), false;
    if (!confirmarExclusao("o resultado", `${resultado.aluno} - ${resultado.olimpiada}`)) return false;

    dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chave);
    await salvarPremiados();

    popularSeletores();
    renderizarPlataformaDashboard();
    renderizarResultadosImportacao();
    renderizarDashboardAluno();
    if (!document.getElementById("view-reuniao")?.classList.contains("hidden")) prepararTelaReuniao();
    if (!document.getElementById("view-relatorios")?.classList.contains("hidden")) prepararTelaRelatoriosComparativos();
    return true;
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
                const alunoCpf = String(linha.CPF || linha.Cpf || linha["CPF do aluno"] || linha["CPF DO ALUNO"] || "").trim();
                const escola = String(linha.Escola || "").trim();
                const municipio = String(linha.Municipio || linha.Município || "").trim();
                const olimpiada = String(linha.Olimpiada || linha.Olimpíada || "").trim();
                const premio = String(linha.Premio || linha.Prêmio || "").trim();
                const serie = String(linha.Serie || linha["Série"] || "").trim();
                const observacao = String(linha.Observacao || linha["Observação"] || linha.OBSERVACAO || linha["OBSERVAÇÃO"] || "").trim();
                const nl = idx + 2;
                if (!aluno && !escola && !municipio && !olimpiada && !serie && !premio) return;
                if (!aluno || !escola || !municipio || !olimpiada || !serie || !premio) { erros.push(`Linha ${nl}: campo obrigatório vazio.`); return; }
                if (!escolas.some(e => normalizarTexto(e.nome) === normalizarTexto(escola))) { erros.push(`Linha ${nl}: escola não cadastrada (${escola}).`); return; }
                if (!cidades.some(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio))) { erros.push(`Linha ${nl}: município não cadastrado (${municipio}).`); return; }
                if (!olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(olimpiada))) { erros.push(`Linha ${nl}: olimpíada não cadastrada (${olimpiada}).`); return; }
                if (!SERIES_PADRAO.some(s => normalizarTexto(s) === normalizarTexto(serie))) { erros.push(`Linha ${nl}: série inválida (${serie}).`); return; }
                if (!PREMIOS_PADRAO.some(p => normalizarTexto(p) === normalizarTexto(premio))) { erros.push(`Linha ${nl}: prêmio inválido (${premio}).`); return; }
                const alunoCadastrado = cpfLimpo(alunoCpf) ? getStorage("app_alunos", []).find(a => cpfLimpo(a.cpf || "") === cpfLimpo(alunoCpf)) : null;
                gravarResultadoComSobrescrita({ aluno, alunoCpf, alunoId: alunoCadastrado?.id || "", escola, municipio, olimpiada, serie, premio, observacao });
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
        { header: "CPF", key: "cpf", width: 18 },
        { header: "Escola", key: "escola", width: 42 },
        { header: "Municipio", key: "municipio", width: 26 },
        { header: "Olimpiada", key: "olimpiada", width: 54 },
        { header: "Serie", key: "serie", width: 18 },
        { header: "Premio", key: "premio", width: 20 },
        { header: "Observacao", key: "observacao", width: 46 }
    ];

    const escolas = listaEscolasParaTemplate();
    const municipios = listaMunicipiosParaTemplate();
    const olimpiadas = listaOlimpiadasParaTemplate();

    ws.addRow({
        aluno: "Nome Completo",
        cpf: "529.982.247-25",
        escola: escolas[0] || "Nome da Escola",
        municipio: municipios[0] || "Cidade - UF",
        olimpiada: olimpiadas[0] || "Nome da Olimpíada",
        serie: "6º Ano EF",
        premio: "Ouro",
        observacao: "Texto livre opcional"
    });

    // Linhas em branco para preenchimento em lote
    for (let i = 0; i < 199; i++) ws.addRow({});

    estilizarCabecalhoTemplate(ws, 8);

    const listas = obterOuCriarAbaListas(workbook);
    const rangeEscolas = escreverListaValidacao(listas, "A", "Escolas cadastradas", escolas);
    const rangeMunicipios = escreverListaValidacao(listas, "B", "Municípios cadastrados", municipios);
    const rangeOlimpiadas = escreverListaValidacao(listas, "C", "Olimpíadas cadastradas", olimpiadas);
    const rangeSeries = escreverListaValidacao(listas, "D", "Séries", SERIES_PADRAO);
    const rangePremios = escreverListaValidacao(listas, "E", "Prêmios", PREMIOS_PADRAO);

    aplicarListaSuspensa(ws, "C", 2, 201, rangeEscolas, "Escolha uma escola já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "D", 2, 201, rangeMunicipios, "Escolha um município já cadastrado no sistema.");
    aplicarListaSuspensa(ws, "E", 2, 201, rangeOlimpiadas, "Escolha uma olimpíada já cadastrada no sistema.");
    aplicarListaSuspensa(ws, "F", 2, 201, rangeSeries, "Escolha uma série da lista.");
    aplicarListaSuspensa(ws, "G", 2, 201, rangePremios, "Escolha um prêmio da lista.");

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

function normalizarCabecalhoPlanilha(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}

function pegarValorLinhaPlanilha(linha, nomes, padrao = "") {
    if (!linha) return padrao;
    for (const nome of nomes) {
        if (linha[nome] !== undefined && linha[nome] !== null && String(linha[nome]).trim() !== "") return linha[nome];
    }
    const mapa = {};
    Object.keys(linha).forEach(k => { mapa[normalizarCabecalhoPlanilha(k)] = linha[k]; });
    for (const nome of nomes) {
        const chave = normalizarCabecalhoPlanilha(nome);
        const valor = mapa[chave];
        if (valor !== undefined && valor !== null && String(valor).trim() !== "") return valor;
    }
    return padrao;
}

function lerLinhaPlanilha(linha, nomes, padrao = "") {
    const valor = pegarValorLinhaPlanilha(linha, nomes, padrao);
    if (valor === padrao) return padrao;
    return String(valor).trim();
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
    app_plataforma: "sistema_plataforma",
    app_simulados: "sistema_simulados",
    app_simulados_envios: "sistema_simulados_envios",
    app_aulas: "sistema_aulas",
    app_questoes: "sistema_questoes",
    app_listas_suspensas: "sistema_listas_suspensas"
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
    return { ...m, disciplina, area: disciplina, nivel, tipoMaterial, tipo: tipoLegado, interacoes: Array.isArray(m.interacoes) ? m.interacoes : [], concluidos: normalizarConclusoesMaterial(m), avaliacoes: normalizarAvaliacoesMaterial(m) };
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


function normalizarAvaliacoesMaterial(m) {
    if (!m) return [];
    if (Array.isArray(m.avaliacoes)) {
        return m.avaliacoes
            .filter(a => a && a.nota !== undefined && a.nota !== null)
            .map(a => ({ ...a, nota: Math.max(0, Math.min(5, Number(a.nota) || 0)) }));
    }
    if (m.notas && typeof m.notas === "object") {
        return Object.values(m.notas)
            .filter(Boolean)
            .map(a => ({ ...a, nota: Math.max(0, Math.min(5, Number(a.nota) || 0)) }));
    }
    return [];
}

function mediaAvaliacoesMaterial(m) {
    const avaliacoes = normalizarAvaliacoesMaterial(m);
    if (!avaliacoes.length) return { media: null, total: 0 };
    const soma = avaliacoes.reduce((acc, a) => acc + (Number(a.nota) || 0), 0);
    return { media: soma / avaliacoes.length, total: avaliacoes.length };
}

function minhaAvaliacaoMaterial(m) {
    if (!usuarioLogado) return null;
    const uid = String(usuarioLogado.id || usuarioLogado.authUid || usuarioLogado.login || "");
    return normalizarAvaliacoesMaterial(m).find(a => String(a.usuarioId || a.id || a.login || "") === uid) || null;
}

function estrelasTexto(media) {
    if (media === null || media === undefined || Number.isNaN(Number(media))) return "Sem notas";
    const n = Math.round(Number(media));
    return `${"★".repeat(n)}${"☆".repeat(5 - n)}`;
}

function renderizarResumoAvaliacaoMaterial(m) {
    const { media, total } = mediaAvaliacoesMaterial(m);
    if (!total) {
        return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900 border border-gray-700 text-[10px] font-bold text-gray-400 uppercase"><i class="fa-regular fa-star"></i> Sem notas</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-300 uppercase" title="Média ${media.toFixed(2)} em ${total} avaliação(ões)"><i class="fa-solid fa-star"></i> ${media.toFixed(1)} / 5 <span class="text-amber-200/70">(${total})</span></span>`;
}

function renderizarWidgetAvaliacaoMaterial(m) {
    const minha = minhaAvaliacaoMaterial(m);
    const notaAtual = minha ? Number(minha.nota) : null;
    const botoes = [0,1,2,3,4,5].map(n => {
        const ativo = notaAtual === n;
        const label = n === 0 ? "0" : "★".repeat(n);
        return `<button type="button" onclick="avaliarMaterialPlataforma('${m.id}', ${n})" class="px-3 py-2 rounded-xl border ${ativo ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-gray-950 border-gray-700 text-gray-400 hover:text-amber-300 hover:border-amber-500/50'} text-xs font-black transition" title="Dar nota ${n}">${label}</button>`;
    }).join("");
    return `
        <div class="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider"><i class="fa-solid fa-star text-amber-400 mr-2"></i>Avalie esta atividade</h4>
                    <p class="text-[11px] text-gray-500 mt-1">Sua nota ajuda outros alunos a identificarem os materiais mais úteis.</p>
                </div>
                ${renderizarResumoAvaliacaoMaterial(m)}
            </div>
            <div class="flex flex-wrap gap-2">${botoes}</div>
            ${minha ? `<p class="text-[10px] text-gray-500 mt-2">Sua avaliação atual: <b class="text-amber-300">${notaAtual}/5</b> · ${formatarDataHora(minha.avaliadoEm)}</p>` : `<p class="text-[10px] text-gray-500 mt-2">Você ainda não avaliou esta atividade.</p>`}
        </div>
    `;
}

function usuarioPodeVerNotasDetalhadas() {
    return ["ADM", "Staff"].includes(usuarioLogado?.nivel);
}

function renderizarPainelNotasAdmMaterial(m) {
    if (!usuarioPodeVerNotasDetalhadas()) return "";
    const avaliacoes = normalizarAvaliacoesMaterial(m).sort((a,b)=>Number(b.avaliadoEm||0)-Number(a.avaliadoEm||0));
    const linhas = avaliacoes.length ? avaliacoes.map(a => `
        <tr class="border-t border-gray-800">
            <td class="p-2 text-xs text-gray-200">${textoSeguro(a.usuarioNome || 'Usuário')}</td>
            <td class="p-2 text-xs text-gray-400">${textoSeguro(a.usuarioNivel || '')}</td>
            <td class="p-2 text-xs text-amber-300 font-black">${Number(a.nota || 0).toFixed(0)} / 5</td>
            <td class="p-2 text-xs text-gray-500">${formatarDataHora(a.avaliadoEm)}</td>
        </tr>
    `).join("") : `<tr><td colspan="4" class="p-3 text-xs text-gray-500 italic">Nenhuma avaliação registrada.</td></tr>`;
    return `
        <details class="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
            <summary class="cursor-pointer text-xs font-black text-gray-200 uppercase tracking-wider"><i class="fa-solid fa-chart-simple text-amber-400 mr-2"></i>Notas dos usuários — ADM/Staff (${avaliacoes.length})</summary>
            <div class="overflow-x-auto mt-3">
                <table class="w-full min-w-[520px]">
                    <thead><tr class="text-left text-[10px] uppercase text-gray-500"><th class="p-2">Usuário</th><th class="p-2">Nível</th><th class="p-2">Nota</th><th class="p-2">Quando</th></tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>
        </details>
    `;
}

function obterUrlMaterial(m) {
    return m?.arquivoUrl || m?.dados || m?.url || "";
}

function tipoVisualizacaoMaterial(m) {
    const url = obterUrlMaterial(m);
    const mime = String(m?.mimeType || m?.tipoMime || "").toLowerCase();
    const nome = String(m?.nomeArquivo || url || "").toLowerCase();
    if (m?.tipo === "video" || converterUrlYoutube(url)) return "video";
    if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(nome)) return "imagem";
    if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(nome)) return "video-arquivo";
    if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(nome)) return "audio";
    if (mime.includes("pdf") || /\.pdf(\?|$)/i.test(nome)) return "pdf";
    if (/\.(docx?|pptx?|xlsx?)(\?|$)/i.test(nome) || mime.includes("word") || mime.includes("presentation") || mime.includes("spreadsheet")) return "office";
    if (m?.tipo === "link") return "link";
    return "arquivo";
}

function renderizarMidiaInternaMaterial(m) {
    const url = obterUrlMaterial(m);
    if (!url) return `<div class="p-8 rounded-2xl bg-gray-950 border border-gray-800 text-center text-sm text-gray-500">Nenhuma mídia vinculada.</div>`;
    const tipo = tipoVisualizacaoMaterial(m);
    const safeUrl = textoSeguro(url);
    const embedYoutube = converterUrlYoutube(url);
    if (embedYoutube) return `<div class="aspect-video rounded-2xl overflow-hidden bg-gray-950 border border-gray-800"><iframe src="${textoSeguro(embedYoutube)}" class="w-full h-full" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
    if (tipo === "imagem") return `<div class="rounded-2xl bg-gray-950 border border-gray-800 p-3 flex justify-center"><img src="${safeUrl}" class="max-h-[72vh] max-w-full object-contain rounded-xl" alt="Mídia da atividade"></div>`;
    if (tipo === "video-arquivo" || tipo === "video") return `<video src="${safeUrl}" controls class="w-full max-h-[72vh] rounded-2xl bg-black border border-gray-800"></video>`;
    if (tipo === "audio") return `<div class="rounded-2xl bg-gray-950 border border-gray-800 p-6"><audio src="${safeUrl}" controls class="w-full"></audio></div>`;
    if (tipo === "pdf") return `<iframe src="${safeUrl}" class="w-full h-[76vh] rounded-2xl bg-gray-950 border border-gray-800"></iframe>`;
    if (tipo === "office") {
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
        return `<iframe src="${textoSeguro(officeUrl)}" class="w-full h-[76vh] rounded-2xl bg-gray-950 border border-gray-800"></iframe>`;
    }
    if (tipo === "link") {
        return `<div class="rounded-2xl bg-gray-950 border border-gray-800 p-8 text-center"><i class="fa-solid fa-arrow-up-right-from-square text-3xl text-blue-400 mb-3"></i><h4 class="font-black text-white mb-2">Link externo</h4><p class="text-xs text-gray-500 mb-4">Links externos podem bloquear exibição interna. Use o botão abaixo para abrir em uma nova aba.</p><a href="${safeUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider"><i class="fa-solid fa-up-right-from-square"></i>Abrir link externo</a></div>`;
    }
    return `<div class="rounded-2xl bg-gray-950 border border-gray-800 p-8 text-center"><i class="fa-solid fa-file text-3xl text-orange-400 mb-3"></i><h4 class="font-black text-white mb-2">Arquivo anexado</h4><p class="text-xs text-gray-500 mb-4">Este tipo de arquivo pode não ter pré-visualização nativa no navegador.</p><a href="${safeUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider"><i class="fa-solid fa-download"></i>Abrir / baixar arquivo</a></div>`;
}

function renderizarConteudoMaterial(m) {
    const tipo = tipoVisualizacaoMaterial(m);
    const isLinkExterno = tipo === "link";
    const label = isLinkExterno ? "Abrir contexto / link" : "Abrir atividade";
    const cor = isLinkExterno ? "bg-blue-600 hover:bg-blue-500" : "bg-indigo-600 hover:bg-indigo-500";
    return `
        <button onclick="abrirAtividadePlataforma('${m.id}')" class="w-full text-center py-3 ${cor} rounded-xl text-white text-xs font-black uppercase tracking-wider transition my-3">
            <i class="fa-solid ${isLinkExterno ? 'fa-arrow-up-right-from-square' : 'fa-up-right-and-down-left-from-center'} mr-2"></i>${label}
        </button>
    `;
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
                ${i.imagemUrl ? `<button type="button" onclick="abrirVisualizadorGenerico('${textoSeguro(i.imagemUrl)}','Imagem enviada')" class="inline-block mt-2 text-left"><img src="${textoSeguro(i.imagemUrl)}" class="max-h-48 rounded-xl border border-gray-700 object-contain bg-gray-950" alt="Imagem enviada"></button>` : ""}
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
                                        ${renderizarResumoAvaliacaoMaterial(m)}
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
                                ${renderizarSolucaoMaterial(m)}
                                <div class="text-[10px] text-gray-500 border-t border-gray-800 pt-2"><i class="fa-solid fa-comments text-blue-400 mr-1"></i>${Array.isArray(m.interacoes) ? m.interacoes.length : 0} comentário(s) · <i class="fa-solid fa-star text-amber-400 ml-2 mr-1"></i>${mediaAvaliacoesMaterial(m).total} avaliação(ões)</div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }).join("");
}

function renderizarSolucaoMaterial(m) {
    if (!m.solucaoUrl && !m.solucaoArquivoUrl) return "";
    return `<details class="mt-2 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3"><summary class="cursor-pointer text-[11px] font-bold text-emerald-300 uppercase"><i class="fa-solid fa-key mr-1"></i>Ver gabarito / resolução</summary><div class="mt-3 flex flex-wrap gap-2">${m.solucaoUrl ? `<a href="${m.solucaoUrl}" target="_blank" class="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Abrir link</a>` : ""}${m.solucaoArquivoUrl ? `<a href="${m.solucaoArquivoUrl}" target="_blank" class="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"><i class="fa-solid fa-file-circle-check mr-1"></i>Abrir arquivo</a>` : ""}</div></details>`;
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


let atividadePlataformaAbertaId = null;

function buscarMaterialMemoria(materialId) {
    return getStorage("app_plataforma", []).map(normalizarMaterialPlataforma).find(m => String(m.id) === String(materialId));
}

async function abrirAtividadePlataforma(materialId) {
    atividadePlataformaAbertaId = String(materialId);
    let material = buscarMaterialMemoria(materialId);
    if (!material) {
        try { await carregarMateriaisPlataforma(); material = buscarMaterialMemoria(materialId); } catch (_) {}
    }
    if (!material) return alert("Atividade não encontrada.");
    const modal = document.getElementById("modalAtividadePlataforma");
    const conteudo = document.getElementById("modalAtividadePlataformaConteudo");
    if (!modal || !conteudo) return alert("Visualizador interno não encontrado no HTML.");
    const icon = iconeMaterialPlataforma(material);
    conteudo.innerHTML = `
        <div class="p-5 border-b border-gray-700 flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <div class="flex flex-wrap gap-2 mb-2">
                    <span class="px-2 py-1 rounded-full bg-gray-900 border border-gray-700 text-[10px] font-black uppercase text-gray-300"><i class="fa-solid ${icon.icone} ${icon.cor} mr-1"></i>${textoSeguro(material.tipoMaterial || 'Material')}</span>
                    <span class="px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase text-blue-300">${textoSeguro(material.disciplina || 'Geral')}</span>
                    <span class="px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black uppercase text-purple-300">${textoSeguro(material.nivel || 'Geral')}</span>
                    ${renderizarResumoAvaliacaoMaterial(material)}
                </div>
                <h3 class="text-xl font-black text-white leading-tight">${textoSeguro(material.titulo || 'Atividade')}</h3>
                <p class="text-xs text-gray-500 mt-1">Postado por ${textoSeguro(material.criadoPor || 'Sistema')} · ${formatarDataHora(material.criadoEm)}</p>
            </div>
            <button onclick="fecharAtividadePlataforma()" class="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-bold"><i class="fa-solid fa-xmark mr-1"></i>Fechar</button>
        </div>
        <div class="p-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
            <div class="space-y-4 min-w-0">
                ${material.descricao ? `<div class="bg-gray-900/60 border border-gray-700 rounded-2xl p-4"><h4 class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Descrição / orientação</h4><p class="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">${textoSeguro(material.descricao)}</p></div>` : ""}
                ${renderizarMidiaInternaMaterial(material)}
                ${renderizarSolucaoMaterial(material)}
            </div>
            <aside class="space-y-4">
                ${renderizarWidgetAvaliacaoMaterial(material)}
                <div class="bg-gray-900/60 border border-gray-700 rounded-2xl p-4">
                    <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2"><i class="fa-solid fa-circle-check text-emerald-400 mr-2"></i>Progresso</h4>
                    <label class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${materialFeitoPorUsuario(material) ? 'border-emerald-700 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-950 text-gray-400'} text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none">
                        <input type="checkbox" ${materialFeitoPorUsuario(material) ? 'checked' : ''} onchange="alternarMaterialFeito('${material.id}', this.checked)" class="accent-emerald-500">
                        ${materialFeitoPorUsuario(material) ? 'Marcado como feito' : 'Marcar como feito'}
                    </label>
                </div>
                ${renderizarPainelNotasAdmMaterial(material)}
                ${renderizarInteracoesMaterial(material)}
            </aside>
        </div>
    `;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function fecharAtividadePlataforma() {
    const modal = document.getElementById("modalAtividadePlataforma");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
    atividadePlataformaAbertaId = null;
}

function abrirVisualizadorGenerico(url, titulo = "Mídia") {
    const modal = document.getElementById("modalVisualizadorGenerico");
    const conteudo = document.getElementById("modalVisualizadorGenericoConteudo");
    if (!modal || !conteudo) return window.open(url, "_blank", "noopener");
    const fake = { url, tipo: "arquivo", titulo, nomeArquivo: url };
    conteudo.innerHTML = `
        <div class="p-4 border-b border-gray-700 flex items-center justify-between gap-3">
            <h3 class="text-sm font-black text-white uppercase tracking-wider">${textoSeguro(titulo)}</h3>
            <button onclick="fecharVisualizadorGenerico()" class="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-bold"><i class="fa-solid fa-xmark mr-1"></i>Fechar</button>
        </div>
        <div class="p-4">${renderizarMidiaInternaMaterial(fake)}</div>
    `;
    modal.classList.remove("hidden"); modal.classList.add("flex");
}
function fecharVisualizadorGenerico() {
    const modal = document.getElementById("modalVisualizadorGenerico");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
}

async function avaliarMaterialPlataforma(materialId, nota) {
    if (!usuarioLogado) return alert("Você precisa estar logado para avaliar.");
    nota = Math.max(0, Math.min(5, Number(nota) || 0));
    initFirebase();
    if (!firebaseFirestore) return alert("Cloud Firestore não inicializado.");
    try {
        const ref = firebaseFirestore.collection(getMateriaisCollectionName()).doc(String(materialId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error("Atividade não encontrada.");
        const material = snap.data() || {};
        const uid = String(usuarioLogado.id || usuarioLogado.authUid || usuarioLogado.login || "");
        let avaliacoes = normalizarAvaliacoesMaterial(material).filter(a => String(a.usuarioId || a.id || a.login || "") !== uid);
        avaliacoes.push({
            usuarioId: uid,
            usuarioNome: usuarioLogado.nome || "Usuário",
            usuarioNivel: usuarioLogado.nivel || "",
            nota,
            avaliadoEm: Date.now()
        });
        await ref.update({ avaliacoes, atualizadoEm: Date.now() });
        await carregarChaveFirebase("app_plataforma", []);
        await renderizarPlataformaEnsino();
        if (atividadePlataformaAbertaId === String(materialId)) await abrirAtividadePlataforma(materialId);
        if (atividadePlataformaAbertaId === String(materialId)) await abrirAtividadePlataforma(materialId);
    } catch (erro) {
        console.error("Erro ao avaliar material:", erro);
        alert(`Erro ao avaliar atividade.\n\n${erro.message || erro}`);
    }
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
    const solucaoArquivo = document.getElementById("matSolucaoArquivo")?.files?.[0] || null;
    const solucaoUrl = document.getElementById("matSolucaoUrl")?.value.trim() || "";
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
            avaliacoes: [],
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
        if (solucaoUrl) material.solucaoUrl = solucaoUrl;
        if (solucaoArquivo) {
            const upSol = await enviarArquivoParaFirebaseStorage(solucaoArquivo, "materiais_solucoes");
            material.solucaoArquivoUrl = upSol.fileUrl;
            material.solucaoStoragePath = upSol.storagePath;
            material.solucaoNomeArquivo = upSol.fileName;
            material.solucaoMimeType = upSol.mimeType;
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
        if (atividadePlataformaAbertaId === String(materialId)) await abrirAtividadePlataforma(materialId);
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
    corTextoEscuro: "#f9fafb",
    corTextoSecundarioEscuro: "#cbd5e1",
    corTextoClaro: "#111827",
    corTextoSecundarioClaro: "#374151",
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


function hexParaRgbLayout(hex) {
    const limpo = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(limpo)) return null;
    return {
        r: parseInt(limpo.slice(0, 2), 16),
        g: parseInt(limpo.slice(2, 4), 16),
        b: parseInt(limpo.slice(4, 6), 16)
    };
}

function luminanciaLayout(hex) {
    const rgb = hexParaRgbLayout(hex);
    if (!rgb) return 0;
    const canal = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(rgb.r) + 0.7152 * canal(rgb.g) + 0.0722 * canal(rgb.b);
}

function contrasteLayout(corA, corB) {
    const l1 = luminanciaLayout(corA);
    const l2 = luminanciaLayout(corB);
    const claro = Math.max(l1, l2);
    const escuro = Math.min(l1, l2);
    return (claro + 0.05) / (escuro + 0.05);
}

function corLegivelLayout(fundo, preferidaClara = "#f9fafb", preferidaEscura = "#111827") {
    const cClara = contrasteLayout(fundo, preferidaClara);
    const cEscura = contrasteLayout(fundo, preferidaEscura);
    return cClara >= cEscura ? preferidaClara : preferidaEscura;
}

function corSecundariaLegivelLayout(fundo, textoPrincipal) {
    const principalClaro = luminanciaLayout(textoPrincipal) > 0.5;
    const candidata = principalClaro ? "#cbd5e1" : "#374151";
    if (contrasteLayout(fundo, candidata) >= 4.5) return candidata;
    return textoPrincipal;
}

function aplicarLayoutVisual(config = {}) {
    layoutVisualAtual = { ...LAYOUT_PADRAO, ...config };
    const c = layoutVisualAtual;

    const textoEscuro = contrasteLayout(c.corCard || c.corFundo || "#111827", c.corTextoEscuro || "#f9fafb") >= 4.5
        ? (c.corTextoEscuro || "#f9fafb")
        : corLegivelLayout(c.corCard || c.corFundo || "#111827", "#f9fafb", "#111827");
    const textoSecundarioEscuro = contrasteLayout(c.corCard || c.corFundo || "#111827", c.corTextoSecundarioEscuro || "#cbd5e1") >= 4.5
        ? (c.corTextoSecundarioEscuro || "#cbd5e1")
        : corSecundariaLegivelLayout(c.corCard || c.corFundo || "#111827", textoEscuro);
    const textoClaro = contrasteLayout(c.corCardClaro || c.corFundoClaro || "#ffffff", c.corTextoClaro || "#111827") >= 4.5
        ? (c.corTextoClaro || "#111827")
        : corLegivelLayout(c.corCardClaro || c.corFundoClaro || "#ffffff", "#f9fafb", "#111827");
    const textoSecundarioClaro = contrasteLayout(c.corCardClaro || c.corFundoClaro || "#ffffff", c.corTextoSecundarioClaro || "#374151") >= 4.5
        ? (c.corTextoSecundarioClaro || "#374151")
        : corSecundariaLegivelLayout(c.corCardClaro || c.corFundoClaro || "#ffffff", textoClaro);

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
            body:not(.theme-light) { background: ${fundoBase} !important; background-attachment: fixed !important; color: ${textoEscuro} !important; }
            ${imagemFundoCss}

            body:not(.theme-light) .bg-gray-900 { background-color: ${c.corFundo} !important; }
            body:not(.theme-light) .bg-gray-950 { background-color: color-mix(in srgb, ${c.corFundo} 78%, black) !important; }
            body:not(.theme-light) .bg-gray-800, body:not(.theme-light) .bg-gray-700 { background-color: ${c.corCard} !important; }
            body:not(.theme-light) .bg-gray-800\/40, body:not(.theme-light) .bg-gray-800\/50, body:not(.theme-light) .bg-gray-900\/40, body:not(.theme-light) .bg-gray-900\/50 { background-color: color-mix(in srgb, ${c.corCard} 82%, transparent) !important; }
            body:not(.theme-light) .border-gray-700, body:not(.theme-light) .border-gray-800, body:not(.theme-light) .divide-gray-700 > :not([hidden]) ~ :not([hidden]) { border-color: ${c.corBorda} !important; }
            body:not(.theme-light) .text-white, body:not(.theme-light) .text-gray-50, body:not(.theme-light) .text-gray-100, body:not(.theme-light) .text-gray-200, body:not(.theme-light) .text-gray-300, body:not(.theme-light) table, body:not(.theme-light) th, body:not(.theme-light) td { color: ${textoEscuro} !important; }
            body:not(.theme-light) .text-gray-400, body:not(.theme-light) .text-gray-500, body:not(.theme-light) label, body:not(.theme-light) .text-xs.text-gray-500, body:not(.theme-light) .text-xs.text-gray-400 { color: ${textoSecundarioEscuro} !important; }
            body:not(.theme-light) input, body:not(.theme-light) select, body:not(.theme-light) textarea { background-color: color-mix(in srgb, ${c.corFundo} 86%, black) !important; color: ${textoEscuro} !important; border-color: ${c.corBorda} !important; }
            body:not(.theme-light) input::placeholder, body:not(.theme-light) textarea::placeholder { color: color-mix(in srgb, ${textoSecundarioEscuro} 70%, transparent) !important; opacity: 1 !important; }
            body:not(.theme-light) option { background: ${c.corCard} !important; color: ${textoEscuro} !important; }
            body:not(.theme-light) table thead tr { background-color: color-mix(in srgb, ${c.corFundo} 88%, black) !important; }
            body:not(.theme-light) [disabled], body:not(.theme-light) .opacity-50 { color: color-mix(in srgb, ${textoEscuro} 72%, transparent) !important; opacity: .75 !important; }

            body.theme-light { background: ${c.corFundoClaro || "#f8fafc"} !important; color: ${textoClaro} !important; }
            body.theme-light .bg-gray-900, body.theme-light .bg-gray-950 { background-color: ${c.corFundoClaro || "#f8fafc"} !important; }
            body.theme-light .bg-gray-800, body.theme-light .bg-gray-700, body.theme-light .bg-gray-800\/40, body.theme-light .bg-gray-800\/50, body.theme-light .bg-gray-900\/40, body.theme-light .bg-gray-900\/50 { background-color: ${c.corCardClaro || "#ffffff"} !important; }
            body.theme-light .border-gray-700, body.theme-light .border-gray-800, body.theme-light .divide-gray-700 > :not([hidden]) ~ :not([hidden]) { border-color: ${c.corBordaClaro || "#d1d5db"} !important; }
            body.theme-light .text-white, body.theme-light .text-gray-50, body.theme-light .text-gray-100, body.theme-light .text-gray-200, body.theme-light .text-gray-300, body.theme-light table, body.theme-light th, body.theme-light td { color: ${textoClaro} !important; }
            body.theme-light .text-gray-400, body.theme-light .text-gray-500, body.theme-light label, body.theme-light .text-xs.text-gray-500, body.theme-light .text-xs.text-gray-400 { color: ${textoSecundarioClaro} !important; }
            body.theme-light input, body.theme-light select, body.theme-light textarea { background-color: ${c.corCardClaro || "#ffffff"} !important; color: ${textoClaro} !important; border-color: ${c.corBordaClaro || "#d1d5db"} !important; }
            body.theme-light input::placeholder, body.theme-light textarea::placeholder { color: color-mix(in srgb, ${textoSecundarioClaro} 70%, transparent) !important; opacity: 1 !important; }
            body.theme-light option { background: ${c.corCardClaro || "#ffffff"} !important; color: ${textoClaro} !important; }
            body.theme-light table thead tr { background-color: color-mix(in srgb, ${c.corFundoClaro || "#f8fafc"} 88%, #e2e8f0) !important; }
            body.theme-light .nav-item:hover, body.theme-light .hover\:bg-gray-800\/40:hover, body.theme-light .hover\:bg-gray-900:hover { background-color: color-mix(in srgb, ${c.corBordaClaro || "#d1d5db"} 45%, transparent) !important; color: ${textoClaro} !important; }
            body.theme-light [disabled], body.theme-light .opacity-50 { color: color-mix(in srgb, ${textoClaro} 72%, transparent) !important; opacity: .75 !important; }

            .bg-blue-600, .hover\:bg-blue-700:hover { background-color: ${c.corPrimaria} !important; }
            .text-blue-400 { color: ${c.corDestaque} !important; }
            .border-blue-500\/20, .border-blue-700, .focus\:border-blue-500:focus { border-color: ${c.corDestaque} !important; }
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
        corTextoEscuro: document.getElementById("layoutCorTextoEscuro")?.value || LAYOUT_PADRAO.corTextoEscuro,
        corTextoSecundarioEscuro: document.getElementById("layoutCorTextoSecundarioEscuro")?.value || LAYOUT_PADRAO.corTextoSecundarioEscuro,
        corTextoClaro: document.getElementById("layoutCorTextoClaro")?.value || LAYOUT_PADRAO.corTextoClaro,
        corTextoSecundarioClaro: document.getElementById("layoutCorTextoSecundarioClaro")?.value || LAYOUT_PADRAO.corTextoSecundarioClaro,
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
        layoutCorTextoEscuro: c.corTextoEscuro,
        layoutCorTextoSecundarioEscuro: c.corTextoSecundarioEscuro,
        layoutCorTextoClaro: c.corTextoClaro,
        layoutCorTextoSecundarioClaro: c.corTextoSecundarioClaro,
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

    const salasBase = typeof SALAS_MONITORIA !== "undefined" ? SALAS_MONITORIA : [];
    const podeVerSalaOrientador = usuarioLogado?.nivel === "ADM" || usuarioLogado?.nivel === "Professor/Orientador";
    const salas = salasBase.filter(sala => !sala.restritoOrientador || podeVerSalaOrientador);
    const coresBorder = { blue: "border-blue-700/40 hover:border-blue-500/60", purple: "border-purple-700/40 hover:border-purple-500/60", emerald: "border-emerald-700/40 hover:border-emerald-500/60", amber: "border-amber-700/40 hover:border-amber-500/60", rose: "border-rose-700/40 hover:border-rose-500/60", cyan: "border-cyan-700/40 hover:border-cyan-500/60" };
    const coresIcone = { blue: "text-blue-400 bg-blue-500/10", purple: "text-purple-400 bg-purple-500/10", emerald: "text-emerald-400 bg-emerald-500/10", amber: "text-amber-400 bg-amber-500/10", rose: "text-rose-400 bg-rose-500/10", cyan: "text-cyan-400 bg-cyan-500/10" };
    const coresBtn = { blue: "bg-blue-600 hover:bg-blue-500", purple: "bg-purple-600 hover:bg-purple-500", emerald: "bg-emerald-600 hover:bg-emerald-500", amber: "bg-amber-600 hover:bg-amber-500", rose: "bg-rose-600 hover:bg-rose-500", cyan: "bg-cyan-600 hover:bg-cyan-500" };

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
    const salasBase = typeof SALAS_MONITORIA !== "undefined" ? SALAS_MONITORIA : [];
    const podeVerSalaOrientador = usuarioLogado?.nivel === "ADM" || usuarioLogado?.nivel === "Professor/Orientador";
    const salas = salasBase.filter(sala => !sala.restritoOrientador || podeVerSalaOrientador);
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
        const usuarioEhMonitor = ["ADM", "Monitor", "Professor/Orientador"].includes(usuarioLogado.nivel);
        const usuarioPodeSalaOrientador = usuarioLogado.nivel === "ADM" || usuarioLogado.nivel === "Professor/Orientador";
        const haMonitorNaSala = ativosOutros.some(([_, v]) => ["ADM", "Monitor", "Professor/Orientador"].includes(v.nivel));
        const haNaoMonitorNaSala = ativosOutros.some(([_, v]) => !["ADM", "Monitor", "Professor/Orientador"].includes(v.nivel));

        if (sala.restritoOrientador && !usuarioPodeSalaOrientador) {
            return alert("Esta sala é exclusiva para Professor/Orientador e ADM.");
        }

        if (!jaEsta) {
            if (ativosOutros.length >= 2) {
                return alert("Esta sala está cheia.\n\nRegra da monitoria: no máximo 2 pessoas por sala.");
            }

            if (sala.restritoOrientador) {
                // Salas do orientador: exclusivas para ADM e Professor/Orientador. Monitor comum e aluno não entram.
                // Mantém limite de 2 pessoas para conversa objetiva.
            } else if (usuarioEhMonitor) {
                if (haMonitorNaSala) {
                    return alert("Já existe um orientador/monitor nesta sala.\n\nRegra da monitoria: apenas 1 orientador/monitor e 1 participante por atendimento.");
                }
            } else {
                if (!haMonitorNaSala) {
                    return alert("Aguarde um monitor/orientador entrar nesta sala.\n\nRegra da monitoria: a sala só abre atendimento quando houver 1 monitor disponível.");
                }
                if (haNaoMonitorNaSala) {
                    return alert("Esta sala já está em atendimento com outro participante.\n\nRegra da monitoria: apenas 1 monitor/orientador e 1 participante por vez.");
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
window.abrirAtividadePlataforma = abrirAtividadePlataforma;
window.fecharAtividadePlataforma = fecharAtividadePlataforma;
window.avaliarMaterialPlataforma = avaliarMaterialPlataforma;
window.abrirVisualizadorGenerico = abrirVisualizadorGenerico;
window.fecharVisualizadorGenerico = fecharVisualizadorGenerico;
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
        opcoes = ["ADM", "Gestor", "Escola", "Aluno", "Monitor", "Professor/Orientador", "Visualizador"].map(n => ({ value: n, text: n }));
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
    carregarConfigListasSuspensasEmMemoria();
    aplicarCustomizacoesListasSuspensas(document);
    popularFiltrosSimulados(); renderizarSimulados();
    popularFiltrosAulas(); renderizarAulas();
    prepararFiltrosRelatoriosComparativos();
    ativarPrimeiraAbaPermitida();
}

window.atualizarEstadoEscopoProfessorCadastro = atualizarEstadoEscopoProfessorCadastro;

// ==================== MÓDULO SIMULADOS ====================
function podeGerenciarSimulados() {
    return ["ADM", "Monitor", "Professor/Orientador"].includes(usuarioLogado?.nivel);
}

function podeGerenciarAulas() {
    return ["ADM", "Monitor", "Professor/Orientador"].includes(usuarioLogado?.nivel);
}

function selectValores(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    return Array.from(el.selectedOptions || []).map(o => o.value).filter(Boolean);
}

function popularSelectUnico(id, valores, todosLabel = "Todos") {
    const el = document.getElementById(id);
    if (!el) return;
    const atual = el.value;
    const unicos = Array.from(new Set((valores || []).filter(Boolean))).sort((a,b) => String(a).localeCompare(String(b), "pt-BR"));
    el.innerHTML = `<option value="TODOS">${todosLabel}</option>` + unicos.map(v => `<option value="${textoSeguro(v)}">${textoSeguro(v)}</option>`).join("");
    if (unicos.includes(atual)) el.value = atual;
}

function atualizarDestinoSimulado() {
    const tipo = document.getElementById("simDestinoTipo")?.value || "todos";
    const wrap = document.getElementById("simDestinoWrap");
    const sel = document.getElementById("simDestinoValores");
    if (!wrap || !sel) return;
    if (tipo === "todos") {
        wrap.classList.add("hidden");
        sel.innerHTML = "";
        return;
    }
    wrap.classList.remove("hidden");
    let opcoes = [];
    if (tipo === "nivel") {
        opcoes = ["Nível 1 — 6º/7º Ano", "Nível 2 — 8º/9º Ano", "Ensino Médio", "ITA/IME", "Geral"].map(v => ({ value: v, text: v }));
    } else if (tipo === "cidade") {
        opcoes = getStorage("app_cidades", []).map(c => ({ value: c.id, text: `${c.nome} - ${c.uf}` }));
    } else if (tipo === "escola") {
        opcoes = getStorage("app_escolas", []).map(e => ({ value: e.id, text: e.nome }));
    } else if (tipo === "aluno") {
        const escolas = getStorage("app_escolas", []);
        opcoes = getStorage("app_alunos", []).map(a => {
            const escola = escolas.find(e => e.id === a.escolaId || e.nome === a.escola);
            return { value: a.id, text: `${a.nome} — ${a.cpf || "sem CPF"} — ${escola?.nome || a.escola || "sem escola"}` };
        });
    }
    sel.innerHTML = opcoes.map(o => `<option value="${textoSeguro(o.value)}">${textoSeguro(o.text)}</option>`).join("");
}

function ajustarCamposSimulado() {
    const formato = document.getElementById("simFormato")?.value || "objetivo";
    const gabarito = document.getElementById("simGabarito");
    const wrap = document.getElementById("simGabaritoObjetivoWrap");
    if (wrap) wrap.classList.toggle("hidden", formato === "dissertativo");
    if (gabarito) {
        gabarito.placeholder = formato === "dissertativo"
            ? "Critérios de correção, rubrica ou observações para o orientador."
            : "Critérios de correção, rubrica ou observações. O gabarito objetivo fica na grade acima.";
    }
    if (formato !== "dissertativo") gerarCamposGabaritoSimulado(false);
}

function gerarCamposGabaritoSimulado(focar = true) {
    const grid = document.getElementById("simGabaritoObjetivoGrid");
    if (!grid) return;
    const qtd = Math.max(1, Math.min(120, Number(document.getElementById("simQtdQuestoes")?.value || 20)));
    const alternativas = ["", "A", "B", "C", "D", "E"];
    const anteriores = {};
    grid.querySelectorAll("select[data-q]").forEach(sel => { anteriores[sel.dataset.q] = sel.value; });
    grid.innerHTML = Array.from({ length: qtd }, (_, i) => {
        const n = i + 1;
        return `<div class="rounded-xl border border-gray-700 bg-gray-950/60 p-2"><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Q${n}</label><select data-q="${n}" class="simGabSelect w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none">${alternativas.map(a => `<option value="${a}" ${anteriores[n] === a ? "selected" : ""}>${a || "—"}</option>`).join("")}</select></div>`;
    }).join("");
    if (focar) grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function lerGabaritoObjetivoSimulado() {
    const grid = document.getElementById("simGabaritoObjetivoGrid");
    if (!grid) return [];
    return Array.from(grid.querySelectorAll("select[data-q]")).map(sel => ({
        numero: Number(sel.dataset.q),
        resposta: String(sel.value || "").toUpperCase()
    })).filter(item => item.resposta);
}

function renderGradeRespostaObjetiva(sim, envio) {
    const gab = Array.isArray(sim.gabaritoObjetivo) ? sim.gabaritoObjetivo : [];
    if (!gab.length || sim.formato === "dissertativo") return "";
    const respostas = Array.isArray(envio?.respostasObjetivas) ? envio.respostasObjetivas : [];
    const mapa = new Map(respostas.map(r => [Number(r.numero), String(r.resposta || "").toUpperCase()]));
    const alternativas = ["", "A", "B", "C", "D", "E"];
    return `<div class="mt-3 rounded-2xl border border-gray-700 bg-gray-950/50 p-3"><div class="flex items-center justify-between gap-2 mb-2"><h5 class="text-[11px] font-bold text-gray-300 uppercase">Cartão-resposta objetivo</h5><span class="text-[10px] text-gray-500">${gab.length} questões</span></div><div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">${gab.map(q => `<div class="rounded-xl bg-gray-900 border border-gray-700 p-2"><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Q${q.numero}</label><select data-q="${q.numero}" class="simRespObj_${sim.id} w-full p-2 rounded-lg bg-gray-950 border border-gray-700 text-xs text-gray-200 focus:outline-none">${alternativas.map(a => `<option value="${a}" ${mapa.get(Number(q.numero)) === a ? "selected" : ""}>${a || "—"}</option>`).join("")}</select></div>`).join("")}</div></div>`;
}

function lerRespostaObjetivaSimulado(simuladoId) {
    return Array.from(document.querySelectorAll(`.simRespObj_${CSS.escape(simuladoId)}[data-q]`)).map(sel => ({
        numero: Number(sel.dataset.q),
        resposta: String(sel.value || "").toUpperCase()
    })).filter(item => item.resposta);
}

function corrigirRespostaObjetiva(gabarito, respostas) {
    const gab = Array.isArray(gabarito) ? gabarito.filter(q => q.resposta) : [];
    const mapaResp = new Map((Array.isArray(respostas) ? respostas : []).map(r => [Number(r.numero), String(r.resposta || "").toUpperCase()]));
    let acertos = 0;
    let respondidas = 0;
    gab.forEach(q => {
        const r = mapaResp.get(Number(q.numero));
        if (r) respondidas++;
        if (r && r === String(q.resposta || "").toUpperCase()) acertos++;
    });
    const total = gab.length;
    const percentual = total ? Math.round((acertos / total) * 1000) / 10 : null;
    return { acertos, total, respondidas, percentual };
}

function classeDesempenhoSimulado(percentual) {
    if (percentual === null || percentual === undefined) return "text-gray-400";
    if (percentual >= 80) return "text-emerald-300";
    if (percentual >= 60) return "text-blue-300";
    if (percentual >= 40) return "text-amber-300";
    return "text-red-300";
}

function popularFiltrosSimulados() {
    const sims = getStorage("app_simulados", []);
    popularSelectUnico("filtroSimDisciplina", sims.map(s => s.disciplina), "Todas");
    popularSelectUnico("filtroSimNivel", sims.map(s => s.nivel), "Todos");
    atualizarDestinoSimulado();
    const painel = document.getElementById("painelAddSimulado");
    if (painel) painel.classList.toggle("hidden", !podeGerenciarSimulados());
    ajustarCamposSimulado();
    atualizarSelectRankingSimulados();
}

function alunoDoUsuarioLogado() {
    if (!usuarioLogado) return null;
    if (usuarioLogado.alunoId) return getStorage("app_alunos", []).find(a => a.id === usuarioLogado.alunoId) || null;
    const email = normalizarTexto(usuarioLogado.email || usuarioLogado.emailAuth || usuarioLogado.authEmail);
    return getStorage("app_alunos", []).find(a => normalizarTexto(a.emailInstitucional) === email || normalizarTexto(a.emailPessoal) === email || normalizarTexto(a.cpf) === normalizarTexto(usuarioLogado.cpf)) || null;
}

function simuladoDestinadoAoUsuario(sim) {
    if (!usuarioLogado) return false;
    if (["ADM", "Monitor"].includes(usuarioLogado.nivel)) return true;
    if (usuarioLogado.nivel === "Professor/Orientador") return true;
    if (usuarioLogado.nivel === "Visualizador") return true;
    const destino = sim.destino || { tipo: "todos", valores: [] };
    if (!destino.tipo || destino.tipo === "todos") return true;
    const valores = (destino.valores || []).map(String);
    const escolas = getStorage("app_escolas", []);
    const aluno = alunoDoUsuarioLogado();
    const escolaAluno = aluno ? escolas.find(e => e.id === aluno.escolaId || e.nome === aluno.escola) : null;
    if (destino.tipo === "nivel") {
        return valores.includes(sim.nivel) || valores.includes(aluno?.nivel) || valores.includes(aluno?.serie) || valores.includes(usuarioLogado.nivel);
    }
    if (destino.tipo === "cidade") {
        const cidadeId = usuarioLogado.cidadeId || escolaAluno?.cidadeId || getEscolaVinculadaUsuario()?.cidadeId;
        return valores.includes(String(cidadeId));
    }
    if (destino.tipo === "escola") {
        const escolaId = usuarioLogado.vinculoId || aluno?.escolaId || escolaAluno?.id;
        return valores.includes(String(escolaId));
    }
    if (destino.tipo === "aluno") {
        return !!aluno && valores.includes(String(aluno.id));
    }
    return true;
}

function enviosDoSimulado(sim) {
    const simuladoId = String(sim?.id || "");
    const externos = getStorage("app_simulados_envios", []).filter(e => String(e.simuladoId) === simuladoId);
    const legados = Array.isArray(sim?.envios) ? sim.envios.map(e => ({ ...e, simuladoId })) : [];
    const mapa = new Map();
    [...legados, ...externos].forEach(e => {
        const chave = String(e.id || `${simuladoId}_${e.usuarioId || e.alunoId || novoId()}`);
        mapa.set(chave, { ...e, id: chave, simuladoId: e.simuladoId || simuladoId });
    });
    return Array.from(mapa.values());
}

function envioSimuladoUsuario(sim) {
    const uid = String(usuarioLogado?.authUid || usuarioLogado?.id || "");
    return enviosDoSimulado(sim).find(e => String(e.usuarioId) === uid) || null;
}


function dataFimSimuladoComoData(sim) {
    const valor = String(sim?.dataFim || "").trim();
    if (!valor) return null;
    // input date salva yyyy-mm-dd. Considera encerrado depois das 23:59:59 do prazo.
    const d = new Date(`${valor}T23:59:59`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function simuladoPrazoEncerrado(sim) {
    const fim = dataFimSimuladoComoData(sim);
    return !!fim && Date.now() > fim.getTime();
}

function simuladoAindaNaoAbriu(sim) {
    const valor = String(sim?.dataAbertura || "").trim();
    if (!valor) return false;
    const d = new Date(`${valor}T00:00:00`);
    return !Number.isNaN(d.getTime()) && Date.now() < d.getTime();
}

function textoPrazoSimulado(sim) {
    if (simuladoAindaNaoAbriu(sim)) return `Abre em ${textoSeguro(sim.dataAbertura)}`;
    if (simuladoPrazoEncerrado(sim)) return "Prazo encerrado";
    return sim?.dataFim ? `Prazo: ${textoSeguro(sim.dataFim)}` : "Sem prazo definido";
}

function minutosDuracaoSimulado(sim) {
    const raw = String(sim?.duracao || "").toLowerCase().trim();
    if (!raw || raw.includes("sem limite")) return 0;
    if (raw.includes("1h30")) return 90;
    if (raw.includes("2h30")) return 150;
    if (raw.includes("3h30")) return 210;
    const m = raw.match(/(\d+)\s*h/);
    if (m) return Number(m[1]) * 60;
    const min = raw.match(/(\d+)\s*min/);
    if (min) return Number(min[1]);
    return 0;
}

function podeVerGabaritoSimulado(sim) {
    if (podeGerenciarSimulados()) return true;
    return simuladoPrazoEncerrado(sim);
}

function podeIniciarSimulado(sim) {
    if (podeGerenciarSimulados()) return false;
    if (simuladoAindaNaoAbriu(sim)) return false;
    if (simuladoPrazoEncerrado(sim)) return false;
    const envio = envioSimuladoUsuario(sim);
    return !(envio && envio.status === "encerrado");
}

function renderLinksGabaritoSimulado(sim) {
    const temSolucao = !!(sim.solucaoUrl || sim.solucaoArquivoUrl || sim.gabarito || (Array.isArray(sim.gabaritoObjetivo) && sim.gabaritoObjetivo.length));
    if (!temSolucao) return "";
    if (!podeVerGabaritoSimulado(sim)) {
        return `<div class="w-full mt-2 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-400 text-xs font-bold"><i class="fa-solid fa-lock mr-1"></i>Gabarito/resolução liberado somente após o prazo final.</div>`;
    }
    const gabObj = Array.isArray(sim.gabaritoObjetivo) && sim.gabaritoObjetivo.length
        ? `<details class="w-full mt-2"><summary class="cursor-pointer px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold inline-block"><i class="fa-solid fa-key mr-1"></i>Ver gabarito objetivo</summary><div class="mt-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">${sim.gabaritoObjetivo.map(q=>`<div class="rounded-xl bg-gray-950 border border-gray-700 p-2 text-xs"><span class="text-gray-500 font-bold">Q${q.numero}</span><b class="block text-emerald-300 text-base">${textoSeguro(q.resposta)}</b></div>`).join("")}</div></details>`
        : "";
    const criterios = sim.gabarito ? `<details class="w-full mt-2"><summary class="cursor-pointer px-3 py-2 rounded-xl bg-emerald-900/40 text-emerald-300 text-xs font-bold inline-block">Ver critérios/observações</summary><p class="mt-2 text-sm text-gray-300 bg-gray-950/60 border border-gray-700 rounded-xl p-3 whitespace-pre-wrap">${textoSeguro(sim.gabarito)}</p></details>` : "";
    const links = (sim.solucaoUrl || sim.solucaoArquivoUrl) ? `<details class="w-full mt-2"><summary class="cursor-pointer px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold inline-block"><i class="fa-solid fa-file-circle-check mr-1"></i>Ver resolução / solução</summary><div class="mt-2 flex flex-wrap gap-2">${sim.solucaoUrl ? `<a href="${sim.solucaoUrl}" target="_blank" class="px-3 py-2 rounded-xl bg-emerald-900/40 text-emerald-300 text-xs font-bold">Abrir link</a>` : ""}${sim.solucaoArquivoUrl ? `<a href="${sim.solucaoArquivoUrl}" target="_blank" class="px-3 py-2 rounded-xl bg-emerald-900/40 text-emerald-300 text-xs font-bold">Abrir arquivo</a>` : ""}</div></details>` : "";
    return gabObj + criterios + links;
}

function renderGradeRespostaObjetivaAmbiente(sim, envio) {
    const gab = Array.isArray(sim.gabaritoObjetivo) ? sim.gabaritoObjetivo : [];
    if (!gab.length || sim.formato === "dissertativo") return "";
    const respostas = Array.isArray(envio?.respostasObjetivas) ? envio.respostasObjetivas : [];
    const mapa = new Map(respostas.map(r => [Number(r.numero), String(r.resposta || "").toUpperCase()]));
    const alternativas = ["", "A", "B", "C", "D", "E"];
    return `<div class="rounded-2xl border border-gray-700 bg-gray-950/50 p-4"><div class="flex items-center justify-between gap-2 mb-3"><h4 class="text-xs font-bold text-gray-300 uppercase">Cartão-resposta</h4><span class="text-[10px] text-gray-500">${gab.length} questões</span></div><div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">${gab.map(q => `<div class="rounded-xl bg-gray-900 border border-gray-700 p-2"><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Q${q.numero}</label><select data-q="${q.numero}" class="simAmbResp w-full p-2 rounded-lg bg-gray-950 border border-gray-700 text-xs text-gray-200 focus:outline-none">${alternativas.map(a => `<option value="${a}" ${mapa.get(Number(q.numero)) === a ? "selected" : ""}>${a || "—"}</option>`).join("")}</select></div>`).join("")}</div></div>`;
}

function lerRespostaObjetivaAmbiente() {
    return Array.from(document.querySelectorAll(`#simuladoAmbienteOverlay .simAmbResp[data-q]`)).map(sel => ({
        numero: Number(sel.dataset.q),
        resposta: String(sel.value || "").toUpperCase()
    })).filter(item => item.resposta);
}

function formatarTempoMs(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h ? String(h).padStart(2,"0") + ":" : ""}${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function atualizarTimerSimulado() {
    const box = document.getElementById("simAmbTimer");
    if (!box || !simuladoSessaoAtual?.iniciado) return;
    if (!simuladoSessaoAtual.limiteMs) {
        box.textContent = `Tempo decorrido: ${formatarTempoMs(Date.now() - simuladoSessaoAtual.inicio)}`;
        return;
    }
    const restante = simuladoSessaoAtual.limiteMs - (Date.now() - simuladoSessaoAtual.inicio);
    box.textContent = `Tempo restante: ${formatarTempoMs(restante)}`;
    if (restante <= 0) {
        finalizarSimuladoAmbiente(true, "tempo_esgotado");
    }
}

function abrirAmbienteSimulado(simuladoId) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoId));
    if (!sim) return alert("Simulado não encontrado.");
    if (!podeIniciarSimulado(sim)) {
        const envio = envioSimuladoUsuario(sim);
        if (envio?.status === "encerrado") return alert("Você já encerrou este simulado. O envio registrado está disponível para a equipe pedagógica.");
        if (simuladoAindaNaoAbriu(sim)) return alert("Este simulado ainda não está aberto.");
        if (simuladoPrazoEncerrado(sim)) return alert("O prazo deste simulado já foi encerrado.");
    }
    simuladoSessaoAtual = { simuladoId: String(simuladoId), iniciado: false, inicio: null, limiteMs: minutosDuracaoSimulado(sim) * 60 * 1000 };
    renderizarAmbienteSimulado();
    document.getElementById("simuladoAmbienteOverlay")?.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

async function fecharAmbienteSimulado() {
    if (simuladoSessaoAtual?.iniciado) {
        if (!(await confirmarPlataforma("Ao sair deste ambiente, o simulado será encerrado e as respostas marcadas até agora serão enviadas. Deseja sair e enviar?", "Sair do simulado", "Sair e enviar", "Continuar prova"))) return;
        finalizarSimuladoAmbiente(false, "saida_da_pagina");
        return;
    }
    limparAmbienteSimulado();
}

function limparAmbienteSimulado() {
    if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);
    simuladoTimerInterval = null;
    simuladoSessaoAtual = null;
    document.getElementById("simuladoAmbienteOverlay")?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

function iniciarSimuladoCronometrado() {
    if (!simuladoSessaoAtual) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    simuladoSessaoAtual.iniciado = true;
    simuladoSessaoAtual.inicio = Date.now();
    renderizarAmbienteSimulado();
    if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);
    simuladoTimerInterval = setInterval(atualizarTimerSimulado, 1000);
    atualizarTimerSimulado();
}

function renderizarAmbienteSimulado() {
    const box = document.getElementById("simuladoAmbienteConteudo");
    if (!box || !simuladoSessaoAtual) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    const envio = envioSimuladoUsuario(sim);
    if (!simuladoSessaoAtual.iniciado) {
        const mins = minutosDuracaoSimulado(sim);
        box.innerHTML = `<div class="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center text-2xl"><i class="fa-solid fa-stopwatch"></i></div><div class="flex-1"><h2 class="text-2xl font-black text-white">Ambiente cronometrado</h2><p class="text-sm text-gray-400 mt-2 leading-relaxed">Você irá iniciar o simulado <b class="text-gray-200">${textoSeguro(sim.titulo)}</b>. Após clicar em <b>Iniciar simulado</b>, suas respostas serão registradas em um ambiente próprio. Se você sair desta página/ambiente depois de iniciar, o simulado será considerado encerrado e as questões marcadas até o momento serão enviadas.</p><div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Prazo</p><p class="text-sm text-gray-200 font-bold mt-1">${textoPrazoSimulado(sim)}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo</p><p class="text-sm text-gray-200 font-bold mt-1">${mins ? `${mins} minutos` : "Sem limite definido"}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Formato</p><p class="text-sm text-gray-200 font-bold mt-1">${textoSeguro(sim.formato || "simulado")}</p></div></div><div class="mt-6 flex flex-col sm:flex-row gap-3"><button onclick="iniciarSimuladoCronometrado()" class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs"><i class="fa-solid fa-play mr-2"></i>Iniciar simulado</button><button onclick="fecharAmbienteSimulado()" class="px-5 py-3 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold uppercase text-xs">Cancelar</button></div></div></div></div>`;
        return;
    }
    const embed = sim.arquivoUrl ? `<iframe src="${sim.arquivoUrl}" class="w-full h-[65vh] rounded-2xl border border-gray-700 bg-black"></iframe><a href="${sim.arquivoUrl}" target="_blank" class="inline-block mt-2 text-xs text-blue-300 font-bold">Abrir arquivo em nova aba</a>` : `<div class="rounded-2xl border border-gray-700 bg-gray-950 p-8 text-center text-gray-500">Nenhum arquivo de simulado anexado. Use as instruções abaixo.</div>`;
    box.innerHTML = `<div class="space-y-4"><div class="sticky top-0 z-10 bg-gray-900/95 border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] text-gray-500 uppercase font-bold">Simulado em andamento</p><h2 class="text-lg font-black text-white">${textoSeguro(sim.titulo)}</h2></div><div class="flex flex-wrap items-center gap-2"><span id="simAmbTimer" class="px-4 py-2 rounded-xl bg-amber-900/40 text-amber-200 border border-amber-800/50 text-sm font-black">--:--</span><button onclick="finalizarSimuladoAmbiente(false, 'finalizado_pelo_aluno')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-paper-plane mr-1"></i>Finalizar e enviar</button><button onclick="fecharAmbienteSimulado()" class="px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/50 text-red-200 text-xs font-bold uppercase">Sair</button></div></div><div class="grid grid-cols-1 xl:grid-cols-2 gap-5"><div class="space-y-3"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4">${embed}</div>${sim.imagemUrl ? `<img src="${sim.imagemUrl}" class="w-full rounded-2xl border border-gray-700 bg-gray-950">` : ""}${sim.descricao ? `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Instruções</h4><p class="text-sm text-gray-300 whitespace-pre-wrap">${textoSeguro(sim.descricao)}</p></div>` : ""}</div><div class="space-y-4"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4">${renderGradeRespostaObjetivaAmbiente(sim, envio)}<label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Resposta dissertativa / observações</label><textarea id="simAmbTexto" rows="5" class="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200 focus:outline-none resize-none" placeholder="Digite comentários, justificativas ou resposta dissertativa...">${textoSeguro(envio?.texto || "")}</textarea><label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Anexo de resolução</label><input type="file" id="simAmbArquivo" accept="image/*,.pdf,.doc,.docx" class="w-full p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300">${envio?.arquivoUrl ? `<a href="${envio.arquivoUrl}" target="_blank" class="text-blue-400 text-xs font-bold mt-2 inline-block">Anexo enviado anteriormente</a>` : ""}</div></div></div></div>`;
    atualizarTimerSimulado();
}

async function finalizarSimuladoAmbiente(automatico = false, motivo = "finalizado") {
    if (!simuladoSessaoAtual || simuladoEnvioEmAndamento) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    simuladoEnvioEmAndamento = true;
    try {
        const uid = String(usuarioLogado.authUid || usuarioLogado.id);
        const respostasObjetivas = lerRespostaObjetivaAmbiente();
        const texto = document.getElementById("simAmbTexto")?.value?.trim() || "";
        const arquivo = document.getElementById("simAmbArquivo")?.files?.[0] || null;
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostasObjetivas);
        const alunoAtual = alunoDoUsuarioLogado();
        const envioAnterior = envioSimuladoUsuario(sim);
        const inicio = simuladoSessaoAtual.inicio || Date.now();
        const envio = {
            id: `${sim.id}_${uid}`,
            simuladoId: sim.id,
            simuladoTitulo: sim.titulo || "",
            usuarioId: uid,
            usuarioNome: usuarioLogado.nome,
            usuarioNivel: usuarioLogado.nivel,
            alunoId: usuarioLogado.alunoId || alunoAtual?.id || "",
            alunoNome: alunoAtual?.nome || usuarioLogado.nome || "",
            escolaId: alunoAtual?.escolaId || usuarioLogado.vinculoId || "",
            escolaNome: alunoAtual?.escola || "",
            respostasObjetivas,
            texto,
            acertos: correcao.acertos,
            totalObjetivas: correcao.total,
            respondidasObjetivas: correcao.respondidas,
            percentual: correcao.percentual,
            iniciadoEm: envioAnterior?.iniciadoEm || inicio,
            enviadoEm: envioAnterior?.enviadoEm || Date.now(),
            encerradoEm: Date.now(),
            tempoGastoSegundos: Math.max(0, Math.round((Date.now() - inicio) / 1000)),
            status: "encerrado",
            motivoEncerramento: motivo,
            automatico: !!automatico
        };
        if (arquivo) {
            const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados_respostas");
            Object.assign(envio, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType });
        } else if (envioAnterior?.arquivoUrl) {
            Object.assign(envio, { arquivoUrl: envioAnterior.arquivoUrl, arquivoStoragePath: envioAnterior.arquivoStoragePath || "", arquivoNome: envioAnterior.arquivoNome || "", arquivoMimeType: envioAnterior.arquivoMimeType || "" });
        }
        await salvarEnvioSimuladoFirestore(envio);
        limparAmbienteSimulado();
        renderizarSimulados();
        alert(automatico ? "Tempo encerrado. Suas respostas foram enviadas." : "Simulado encerrado e enviado com sucesso.");
    } catch (erro) {
        console.error("Erro ao finalizar simulado", erro);
        alert(`Erro ao finalizar/enviar simulado.\n\n${erro.message || erro}`);
    } finally {
        simuladoEnvioEmAndamento = false;
    }
}

window.addEventListener("beforeunload", (e) => {
    if (simuladoSessaoAtual?.iniciado) {
        e.preventDefault();
        e.returnValue = "Seu simulado está em andamento. Se sair, ele será considerado encerrado.";
        return e.returnValue;
    }
});

async function salvarEnvioSimuladoFirestore(envio) {
    initFirebase();
    if (!firebaseFirestore) throw new Error("Cloud Firestore não inicializado.");
    const dados = { ...envio, atualizadoEm: Date.now() };
    if (!dados.id) dados.id = `${dados.simuladoId}_${dados.usuarioId}`;
    await firebaseFirestore.collection(getFirebaseCollectionName("app_simulados_envios")).doc(String(dados.id)).set(dados, { merge: true });
    const lista = getStorage("app_simulados_envios", []);
    const idx = lista.findIndex(e => String(e.id) === String(dados.id));
    if (idx >= 0) lista[idx] = { ...lista[idx], ...dados };
    else lista.push(dados);
    setStorageLocal("app_simulados_envios", lista);
    return dados;
}

async function salvarNovoSimulado(event) {
    event.preventDefault();
    if (!podeGerenciarSimulados()) return alert("Apenas ADM, monitores e professores/orientadores podem publicar simulados.");
    const btn = event.submitter || document.querySelector('#formCadSimulado button[type="submit"]');
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Publicando...'; }
        const file = document.getElementById("simArquivo")?.files?.[0] || null;
        const img = document.getElementById("simImagem")?.files?.[0] || null;
        const solArquivo = document.getElementById("simSolucaoArquivo")?.files?.[0] || null;
        const solUrl = document.getElementById("simSolucaoUrl")?.value.trim() || "";
        const sim = {
            id: novoId(),
            titulo: document.getElementById("simTitulo").value.trim(),
            disciplina: document.getElementById("simDisciplina").value,
            nivel: document.getElementById("simNivel").value,
            formato: document.getElementById("simFormato").value,
            dataAbertura: document.getElementById("simDataAbertura").value || "",
            dataFim: document.getElementById("simDataFim").value || "",
            duracao: document.getElementById("simDuracao").value || "",
            quantidadeQuestoes: Number(document.getElementById("simQtdQuestoes")?.value || 0),
            gabaritoObjetivo: lerGabaritoObjetivoSimulado(),
            gabarito: document.getElementById("simGabarito").value.trim(),
            descricao: document.getElementById("simDescricao").value.trim(),
            destino: { tipo: document.getElementById("simDestinoTipo").value, valores: selectValores("simDestinoValores") },
            criadoPor: usuarioLogado?.nome || "Sistema",
            criadoPorId: usuarioLogado?.authUid || usuarioLogado?.id || "",
            criadoPorNivel: usuarioLogado?.nivel || "",
            criadoEm: Date.now(),
            atualizadoEm: Date.now(),
            envios: []
        };
        if (!sim.titulo) return alert("Informe o título do simulado.");
        if (["objetivo", "misto"].includes(sim.formato) && !sim.gabaritoObjetivo.length) {
            if (!confirm("Você não preencheu o gabarito objetivo. O aluno ainda poderá enviar resposta, mas não haverá correção automática/ranking por acertos. Deseja publicar assim mesmo?")) return;
        }
        if (file) {
            const up = await enviarArquivoParaFirebaseStorage(file, "simulados");
            Object.assign(sim, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType, arquivoTamanho: up.size });
        }
        if (img) {
            const up = await enviarArquivoParaFirebaseStorage(img, "simulados_imagens");
            Object.assign(sim, { imagemUrl: up.fileUrl, imagemStoragePath: up.storagePath, imagemNome: up.fileName });
        }
        if (solUrl) sim.solucaoUrl = solUrl;
        if (solArquivo) {
            const up = await enviarArquivoParaFirebaseStorage(solArquivo, "simulados_solucoes");
            Object.assign(sim, { solucaoArquivoUrl: up.fileUrl, solucaoStoragePath: up.storagePath, solucaoNomeArquivo: up.fileName });
        }
        const lista = getStorage("app_simulados", []);
        lista.push(sim);
        await setStorage("app_simulados", lista);
        document.getElementById("formCadSimulado").reset();
        gerarCamposGabaritoSimulado(false);
        atualizarDestinoSimulado();
        popularFiltrosSimulados();
        renderizarSimulados();
        alert("Simulado publicado com sucesso.");
    } catch (erro) {
        console.error("Erro ao salvar simulado", erro);
        alert(`Erro ao salvar simulado.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Publicar Simulado'; }
    }
}

async function enviarRespostaSimulado(simuladoId) {
    if (!usuarioLogado) return alert("Faça login para enviar resposta.");
    const simulado = getStorage("app_simulados", []).find(s => s.id === simuladoId);
    if (!simulado) return alert("Simulado não encontrado.");
    const texto = document.getElementById(`simRespTexto_${simuladoId}`)?.value?.trim() || "";
    const arquivo = document.getElementById(`simRespArquivo_${simuladoId}`)?.files?.[0] || null;
    const respostasObjetivas = lerRespostaObjetivaSimulado(simuladoId);
    const temGabaritoObjetivo = Array.isArray(simulado.gabaritoObjetivo) && simulado.gabaritoObjetivo.length > 0;
    if (!texto && !arquivo && !respostasObjetivas.length) return alert("Preencha o cartão-resposta, digite uma resposta ou envie uma imagem/arquivo de resolução.");
    if (temGabaritoObjetivo && respostasObjetivas.length < simulado.gabaritoObjetivo.length) {
        if (!(await confirmarPlataforma(`Você respondeu ${respostasObjetivas.length} de ${simulado.gabaritoObjetivo.length} questões objetivas. Enviar mesmo assim?`, "Respostas pendentes", "Enviar mesmo assim", "Voltar"))) return;
    }
    try {
        const uid = String(usuarioLogado.authUid || usuarioLogado.id);
        const correcao = corrigirRespostaObjetiva(simulado.gabaritoObjetivo, respostasObjetivas);
        const alunoAtual = alunoDoUsuarioLogado();
        const envioAnterior = envioSimuladoUsuario(simulado);
        const envio = {
            id: `${simuladoId}_${uid}`,
            simuladoId,
            simuladoTitulo: simulado.titulo || "",
            usuarioId: uid,
            usuarioNome: usuarioLogado.nome,
            usuarioNivel: usuarioLogado.nivel,
            alunoId: usuarioLogado.alunoId || alunoAtual?.id || "",
            alunoNome: alunoAtual?.nome || usuarioLogado.nome || "",
            escolaId: alunoAtual?.escolaId || usuarioLogado.vinculoId || "",
            escolaNome: alunoAtual?.escola || "",
            respostasObjetivas,
            texto,
            acertos: correcao.acertos,
            totalObjetivas: correcao.total,
            respondidasObjetivas: correcao.respondidas,
            percentual: correcao.percentual,
            enviadoEm: envioAnterior?.enviadoEm || Date.now()
        };
        if (arquivo) {
            const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados_respostas");
            Object.assign(envio, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType });
        } else if (envioAnterior?.arquivoUrl) {
            Object.assign(envio, {
                arquivoUrl: envioAnterior.arquivoUrl,
                arquivoStoragePath: envioAnterior.arquivoStoragePath || "",
                arquivoNome: envioAnterior.arquivoNome || "",
                arquivoMimeType: envioAnterior.arquivoMimeType || ""
            });
        }
        await salvarEnvioSimuladoFirestore(envio);
        renderizarSimulados();
        alert("Resposta enviada com sucesso.");
    } catch (erro) {
        console.error("Erro ao enviar resposta", erro);
        alert(`Erro ao enviar resposta.\n\n${erro.message || erro}`);
    }
}

async function excluirSimulado(id) {
    if (!podeGerenciarSimulados()) return;
    const sim = getStorage("app_simulados", []).find(s => s.id === id);
    if (!sim) return;
    if (!confirm(`Apagar o simulado "${sim.titulo}"?`)) return;
    await setStorage("app_simulados", getStorage("app_simulados", []).filter(s => s.id !== id));
    renderizarSimulados();
}

function renderizarSimulados() {
    popularFiltrosSimulados();
    const grid = document.getElementById("gridSimulados");
    if (!grid) return;
    const fd = document.getElementById("filtroSimDisciplina")?.value || "TODOS";
    const fn = document.getElementById("filtroSimNivel")?.value || "TODOS";
    const ff = document.getElementById("filtroSimFormato")?.value || "TODOS";
    const fs = document.getElementById("filtroSimStatus")?.value || "TODOS";
    const busca = normalizarTexto(document.getElementById("filtroSimBusca")?.value || "");
    let sims = getStorage("app_simulados", []).filter(simuladoDestinadoAoUsuario);
    sims = sims.filter(s => (fd === "TODOS" || s.disciplina === fd) && (fn === "TODOS" || s.nivel === fn) && (ff === "TODOS" || s.formato === ff));
    if (busca) sims = sims.filter(s => normalizarTexto(`${s.titulo} ${s.descricao} ${s.disciplina} ${s.nivel}`).includes(busca));
    if (fs !== "TODOS") sims = sims.filter(s => fs === "RESPONDIDOS" ? !!envioSimuladoUsuario(s) : !envioSimuladoUsuario(s));
    sims.sort((a,b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    if (!sims.length) {
        grid.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-10 text-center text-gray-500"><i class="fa-solid fa-clipboard-question text-3xl mb-3 opacity-40"></i><p>Nenhum simulado encontrado para este filtro.</p></div>`;
        return;
    }
    grid.innerHTML = sims.map(s => {
        const envio = envioSimuladoUsuario(s);
        const encerrado = simuladoPrazoEncerrado(s);
        const aindaNaoAbriu = simuladoAindaNaoAbriu(s);
        const notaTexto = envio && envio.totalObjetivas && (podeGerenciarSimulados() || podeVerGabaritoSimulado(s)) ? `<span class="px-2 py-1 rounded-lg bg-gray-950 border border-gray-700 ${classeDesempenhoSimulado(envio.percentual)} text-[10px] font-bold uppercase">${envio.acertos}/${envio.totalObjetivas} · ${envio.percentual}%</span>` : "";
        const enviadoTexto = envio ? `<span class="px-2 py-1 rounded-lg bg-emerald-900/40 text-emerald-300 text-[10px] font-bold uppercase">Respondido</span>${notaTexto}` : `<span class="px-2 py-1 rounded-lg bg-amber-900/40 text-amber-300 text-[10px] font-bold uppercase">Pendente</span>`;
        const prazoBadge = encerrado ? `<span class="px-2 py-1 rounded-lg bg-red-900/30 text-red-300 text-[10px] font-bold uppercase">Prazo encerrado</span>` : (aindaNaoAbriu ? `<span class="px-2 py-1 rounded-lg bg-blue-900/30 text-blue-300 text-[10px] font-bold uppercase">Ainda não abriu</span>` : `<span class="px-2 py-1 rounded-lg bg-emerald-900/30 text-emerald-300 text-[10px] font-bold uppercase">Aberto</span>`);
        const ger = podeGerenciarSimulados() ? `<button onclick="excluirSimulado('${s.id}')" class="px-3 py-2 rounded-xl bg-red-900/30 text-red-300 border border-red-900/40 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i>Apagar</button>` : "";
        const botaoAluno = !podeGerenciarSimulados() ? (podeIniciarSimulado(s)
            ? `<button onclick="abrirAmbienteSimulado('${s.id}')" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-stopwatch mr-1"></i>Entrar no simulado</button>`
            : `<button disabled class="px-4 py-2.5 rounded-xl bg-gray-700 text-gray-400 text-xs font-black uppercase cursor-not-allowed"><i class="fa-solid fa-lock mr-1"></i>${envio?.status === "encerrado" ? "Simulado encerrado" : (encerrado ? "Prazo encerrado" : "Indisponível")}</button>`)
            : "";
        const rankingMini = rankingSimulado(s).slice(0, 5);
        const enviosResumo = podeGerenciarSimulados() ? `<details class="mt-4"><summary class="cursor-pointer text-xs font-bold text-blue-300 uppercase">Ver ranking e envios (${enviosDoSimulado(s).length})</summary><div class="mt-3 space-y-3">${rankingMini.length ? `<div class="rounded-xl border border-gray-700 overflow-hidden"><table class="w-full text-xs"><thead class="bg-gray-950 text-gray-400 uppercase"><tr><th class="p-2 text-left">#</th><th class="p-2 text-left">Aluno</th><th class="p-2 text-left">Pontuação</th><th class="p-2 text-left">Tempo</th><th class="p-2 text-left">Resposta</th></tr></thead><tbody>${rankingMini.map((e,i)=>`<tr class="border-t border-gray-800"><td class="p-2 font-bold text-gray-400">${i+1}</td><td class="p-2 text-gray-200">${textoSeguro(e.alunoNome || e.usuarioNome)}</td><td class="p-2 ${classeDesempenhoSimulado(e.percentual)} font-bold">${e.totalObjetivas ? `${e.acertos}/${e.totalObjetivas} · ${e.percentual}%` : "Correção manual"}</td><td class="p-2 text-gray-400">${e.tempoGastoSegundos ? formatarTempoMs(e.tempoGastoSegundos * 1000) : "—"}</td><td class="p-2">${e.arquivoUrl ? `<a href="${e.arquivoUrl}" target="_blank" class="text-blue-400 font-bold">Anexo</a>` : `<span class="text-gray-500">—</span>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="text-gray-500 text-xs">Sem envios ainda.</p>`}${enviosDoSimulado(s).map(e => `<div class="bg-gray-950/60 border border-gray-700 rounded-xl p-3"><p class="font-bold text-gray-200">${textoSeguro(e.alunoNome || e.usuarioNome)}</p><p class="text-xs text-gray-400 mt-1">${textoSeguro(e.texto || "—")}</p>${e.arquivoUrl ? `<a href="${e.arquivoUrl}" target="_blank" class="text-blue-400 text-xs font-bold mt-2 inline-block"><i class="fa-solid fa-paperclip mr-1"></i>Abrir anexo</a>` : ""}</div>`).join("")}</div></details>` : "";
        return `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-start gap-4">
                <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-2">${enviadoTexto}${prazoBadge}<span class="px-2 py-1 rounded-lg bg-blue-900/30 text-blue-300 text-[10px] font-bold uppercase">${textoSeguro(s.formato || "simulado")}</span><span class="px-2 py-1 rounded-lg bg-gray-900 text-gray-400 text-[10px] font-bold uppercase">${textoSeguro(s.nivel || "Geral")}</span></div>
                    <h3 class="text-lg font-black text-white">${textoSeguro(s.titulo)}</h3>
                    <p class="text-xs text-gray-400 mt-1">${textoSeguro(s.disciplina || "Geral")} · ${textoPrazoSimulado(s)} · ${textoSeguro(s.duracao || "")}</p>
                    ${s.descricao ? `<p class="text-sm text-gray-300 mt-3 leading-relaxed">${textoSeguro(s.descricao)}</p>` : ""}
                    <div class="flex flex-wrap gap-2 mt-4">${s.arquivoUrl && podeGerenciarSimulados() ? `<a href="${s.arquivoUrl}" target="_blank" class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"><i class="fa-solid fa-file-arrow-down mr-1"></i>Abrir simulado</a>` : ""}${s.imagemUrl && podeGerenciarSimulados() ? `<a href="${s.imagemUrl}" target="_blank" class="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold"><i class="fa-solid fa-image mr-1"></i>Imagem</a>` : ""}${botaoAluno}${ger}</div>
                    <div class="mt-3">${renderLinksGabaritoSimulado(s)}</div>
                </div>
                ${!podeGerenciarSimulados() ? `<div class="w-full lg:w-80 bg-gray-900/70 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-300 uppercase mb-2">Como responder</h4><p class="text-xs text-gray-400 leading-relaxed">Clique em <b>Entrar no simulado</b>. O simulado será aberto em um ambiente próprio, com cronômetro, arquivo da prova e cartão-resposta. Ao sair depois de iniciar, o envio será encerrado automaticamente.</p>${envio ? `<div class="mt-3 rounded-xl bg-emerald-900/30 border border-emerald-900/40 p-3 text-xs text-emerald-200"><b>Último envio:</b><br>${envio.encerradoEm ? new Date(envio.encerradoEm).toLocaleString("pt-BR") : "registrado"}</div>` : ""}</div>` : ""}
            </div>${enviosResumo}</div>`;
    }).join("");
    atualizarSelectRankingSimulados();
    renderizarRankingSimulado(false);
}

// ==================== RANKING E RELATÓRIOS DE SIMULADOS ====================
function rankingSimulado(sim) {
    return enviosDoSimulado(sim).map(e => ({ ...e })).sort((a, b) => {
        const pa = Number(a.percentual ?? -1);
        const pb = Number(b.percentual ?? -1);
        if (pb !== pa) return pb - pa;
        const aa = Number(a.acertos ?? -1);
        const ab = Number(b.acertos ?? -1);
        if (ab !== aa) return ab - aa;
        return Number(a.enviadoEm || 0) - Number(b.enviadoEm || 0);
    });
}

function atualizarSelectRankingSimulados() {
    const painel = document.getElementById("painelRankingSimulados");
    const sel = document.getElementById("selectRankingSimulado");
    if (painel) painel.classList.toggle("hidden", !podeGerenciarSimulados());
    if (!sel || !podeGerenciarSimulados()) return;
    const atual = sel.value;
    const sims = getStorage("app_simulados", []).filter(simuladoDestinadoAoUsuario).sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0));
    sel.innerHTML = `<option value="">Selecione um simulado</option>` + sims.map(s => `<option value="${textoSeguro(s.id)}">${textoSeguro(s.titulo)} — ${textoSeguro(s.nivel || "Geral")}</option>`).join("");
    if (sims.some(s => s.id === atual)) sel.value = atual;
}

function renderizarRankingSimulado(mostrarVazio = true) {
    const box = document.getElementById("rankingSimuladoResumo");
    const sel = document.getElementById("selectRankingSimulado");
    if (!box || !sel || !podeGerenciarSimulados()) return;
    const sim = getStorage("app_simulados", []).find(s => s.id === sel.value);
    if (!sim) {
        box.innerHTML = mostrarVazio ? `<p class="text-xs text-gray-500">Selecione um simulado para ver ranking, desempenho e relatório.</p>` : "";
        return;
    }
    const rank = rankingSimulado(sim);
    const comCorrecao = rank.filter(e => Number(e.totalObjetivas || 0) > 0);
    const media = comCorrecao.length ? Math.round((comCorrecao.reduce((acc,e)=>acc+Number(e.percentual||0),0)/comCorrecao.length)*10)/10 : null;
    const melhor = comCorrecao[0];
    box.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Envios</p><h4 class="text-2xl font-black text-white">${rank.length}</h4></div>
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Média</p><h4 class="text-2xl font-black ${classeDesempenhoSimulado(media)}">${media === null ? "—" : `${media}%`}</h4></div>
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Melhor desempenho</p><h4 class="text-sm font-black text-white truncate">${textoSeguro(melhor?.alunoNome || melhor?.usuarioNome || "—")}</h4></div>
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Questões objetivas</p><h4 class="text-2xl font-black text-white">${Array.isArray(sim.gabaritoObjetivo) ? sim.gabaritoObjetivo.length : 0}</h4></div>
    </div>
    <div class="overflow-x-auto rounded-2xl border border-gray-700"><table class="w-full text-xs"><thead class="bg-gray-950 text-gray-400 uppercase"><tr><th class="p-3 text-left">#</th><th class="p-3 text-left">Aluno</th><th class="p-3 text-left">Escola</th><th class="p-3 text-left">Acertos</th><th class="p-3 text-left">%</th><th class="p-3 text-left">Enviado em</th><th class="p-3 text-left">Anexo</th></tr></thead><tbody>${rank.map((e,i)=>`<tr class="border-t border-gray-800"><td class="p-3 font-bold text-gray-400">${i+1}</td><td class="p-3 text-gray-200 font-bold">${textoSeguro(e.alunoNome || e.usuarioNome)}</td><td class="p-3 text-gray-400">${textoSeguro(e.escolaNome || "—")}</td><td class="p-3 text-gray-300">${e.totalObjetivas ? `${e.acertos}/${e.totalObjetivas}` : "—"}</td><td class="p-3 ${classeDesempenhoSimulado(e.percentual)} font-bold">${e.percentual === null || e.percentual === undefined ? "—" : `${e.percentual}%`}</td><td class="p-3 text-gray-400">${e.enviadoEm ? new Date(e.enviadoEm).toLocaleString("pt-BR") : "—"}</td><td class="p-3">${e.arquivoUrl ? `<a href="${e.arquivoUrl}" target="_blank" class="text-blue-400 font-bold">Abrir</a>` : `<span class="text-gray-500">—</span>`}</td></tr>`).join("") || `<tr><td colspan="7" class="p-6 text-center text-gray-500">Nenhum envio ainda.</td></tr>`}</tbody></table></div>`;
}

function exportarRankingSimuladoCSV() {
    const sel = document.getElementById("selectRankingSimulado");
    const sim = getStorage("app_simulados", []).find(s => s.id === sel?.value);
    if (!sim) return alert("Selecione um simulado para exportar.");
    const rank = rankingSimulado(sim);
    const linhas = [["Posição", "Aluno", "Escola", "Acertos", "Total", "Percentual", "Texto", "Anexo"]];
    rank.forEach((e,i)=>linhas.push([i+1, e.alunoNome || e.usuarioNome || "", e.escolaNome || "", e.acertos ?? "", e.totalObjetivas ?? "", e.percentual ?? "", e.texto || "", e.arquivoUrl || ""]));
    const csv = linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ranking_${(sim.titulo || "simulado").replace(/[^a-z0-9]+/gi,"_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ==================== MÓDULO AULAS ====================
function ajustarCamposAula() {
    const origem = document.getElementById("aulaOrigem")?.value || "youtube";
    document.getElementById("aulaUrlWrap")?.classList.toggle("hidden", origem === "upload");
    document.getElementById("aulaArquivoWrap")?.classList.toggle("hidden", origem !== "upload");
}

function popularFiltrosAulas() {
    const aulas = getStorage("app_aulas", []);
    popularSelectUnico("filtroAulaNivel", aulas.map(a => a.nivel), "Todos");
    popularSelectUnico("filtroAulaDisciplina", aulas.map(a => a.disciplina), "Todas");
    popularSelectUnico("filtroAulaPlaylist", aulas.map(a => a.playlist), "Todas");
    const painel = document.getElementById("painelAddAula");
    if (painel) painel.classList.toggle("hidden", !podeGerenciarAulas());
    ajustarCamposAula();
}

function youtubeEmbedUrl(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    const m = u.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{6,})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : "";
}

async function salvarNovaAula(event) {
    event.preventDefault();
    if (!podeGerenciarAulas()) return alert("Apenas ADM, monitores e professores/orientadores podem publicar aulas.");
    const btn = event.submitter || document.querySelector('#formCadAula button[type="submit"]');
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Publicando...'; }
        const origem = document.getElementById("aulaOrigem").value;
        const aula = {
            id: novoId(), nivel: document.getElementById("aulaNivel").value,
            disciplina: document.getElementById("aulaDisciplina").value,
            playlist: document.getElementById("aulaPlaylist").value.trim(),
            tema: document.getElementById("aulaTema").value.trim(), origem,
            url: origem !== "upload" ? document.getElementById("aulaUrl").value.trim() : "",
            descricao: document.getElementById("aulaDescricao").value.trim(),
            criadoPor: usuarioLogado?.nome || "Sistema", criadoPorId: usuarioLogado?.authUid || usuarioLogado?.id || "",
            criadoPorNivel: usuarioLogado?.nivel || "", criadoEm: Date.now(), atualizadoEm: Date.now()
        };
        if (!aula.playlist || !aula.tema) return alert("Informe playlist e tema da aula.");
        if (origem === "upload") {
            const arquivo = document.getElementById("aulaArquivo")?.files?.[0] || null;
            if (!arquivo) return alert("Selecione um arquivo de vídeo.");
            const up = await enviarArquivoParaFirebaseStorage(arquivo, "aulas_videos");
            Object.assign(aula, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType, url: up.fileUrl });
        } else if (!aula.url) return alert("Informe a URL da aula.");
        const lista = getStorage("app_aulas", []);
        lista.push(aula);
        await setStorage("app_aulas", lista);
        document.getElementById("formCadAula").reset();
        ajustarCamposAula();
        popularFiltrosAulas(); renderizarAulas();
        alert("Aula publicada com sucesso.");
    } catch (erro) {
        console.error("Erro ao salvar aula", erro);
        alert(`Erro ao salvar aula.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2"></i>Publicar Aula'; }
    }
}

async function excluirAula(id) {
    if (!podeGerenciarAulas()) return;
    const aula = getStorage("app_aulas", []).find(a => a.id === id);
    if (!aula) return;
    if (!confirm(`Apagar a aula "${aula.tema}"?`)) return;
    await setStorage("app_aulas", getStorage("app_aulas", []).filter(a => a.id !== id));
    renderizarAulas();
}

function renderizarAulas() {
    popularFiltrosAulas();
    const grid = document.getElementById("gridAulas");
    if (!grid) return;
    const fn = document.getElementById("filtroAulaNivel")?.value || "TODOS";
    const fd = document.getElementById("filtroAulaDisciplina")?.value || "TODOS";
    const fp = document.getElementById("filtroAulaPlaylist")?.value || "TODOS";
    const busca = normalizarTexto(document.getElementById("filtroAulaBusca")?.value || "");
    let aulas = getStorage("app_aulas", []);
    aulas = aulas.filter(a => (fn === "TODOS" || a.nivel === fn) && (fd === "TODOS" || a.disciplina === fd) && (fp === "TODOS" || a.playlist === fp));
    if (busca) aulas = aulas.filter(a => normalizarTexto(`${a.tema} ${a.playlist} ${a.descricao} ${a.disciplina}`).includes(busca));
    aulas.sort((a,b) => String(a.nivel).localeCompare(String(b.nivel), "pt-BR") || String(a.disciplina).localeCompare(String(b.disciplina), "pt-BR") || String(a.playlist).localeCompare(String(b.playlist), "pt-BR") || (a.criadoEm||0)-(b.criadoEm||0));
    if (!aulas.length) {
        grid.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-10 text-center text-gray-500"><i class="fa-solid fa-video text-3xl mb-3 opacity-40"></i><p>Nenhuma aula encontrada.</p></div>`;
        return;
    }
    const grupos = {};
    aulas.forEach(a => {
        const k = `${a.nivel}||${a.disciplina}||${a.playlist}`;
        if (!grupos[k]) grupos[k] = { nivel: a.nivel, disciplina: a.disciplina, playlist: a.playlist, aulas: [] };
        grupos[k].aulas.push(a);
    });
    grid.innerHTML = Object.values(grupos).map(g => `<div class="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
        <div class="p-5 border-b border-gray-700 bg-gray-900/40"><p class="text-[10px] uppercase tracking-widest text-blue-300 font-black">${textoSeguro(g.nivel)} · ${textoSeguro(g.disciplina)}</p><h3 class="text-lg font-black text-white mt-1"><i class="fa-solid fa-play mr-2 text-blue-400"></i>${textoSeguro(g.playlist)}</h3></div>
        <div class="divide-y divide-gray-700/50">${g.aulas.map(a => {
            const embed = a.origem === "youtube" ? youtubeEmbedUrl(a.url) : "";
            const media = embed ? `<iframe class="w-full aspect-video rounded-xl border border-gray-700 bg-black" src="${embed}" allowfullscreen></iframe>` : (a.url ? `<a href="${a.url}" target="_blank" class="inline-flex items-center px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"><i class="fa-solid fa-up-right-from-square mr-1"></i>Abrir aula</a>` : "");
            const del = podeGerenciarAulas() ? `<button onclick="excluirAula('${a.id}')" class="px-3 py-2 rounded-xl bg-red-900/30 text-red-300 border border-red-900/40 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i>Apagar</button>` : "";
            return `<div class="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4"><div class="lg:col-span-2"><h4 class="font-black text-white">${textoSeguro(a.tema)}</h4><p class="text-xs text-gray-500 mt-1">Postado por ${textoSeguro(a.criadoPor || "Sistema")}</p>${a.descricao ? `<p class="text-sm text-gray-300 mt-3">${textoSeguro(a.descricao)}</p>` : ""}<div class="mt-3 flex gap-2 flex-wrap">${del}</div></div><div>${media}</div></div>`;
        }).join("")}</div>
    </div>`).join("");
}

// ==================== AJUSTES AVANÇADOS: QUESTÕES, SIMULADOS E LOGIN ====================
function toggleSenhaLogin() {
    const input = document.getElementById("auth-pass");
    const icon = document.getElementById("iconeSenhaLogin");
    if (!input) return;
    const mostrando = input.type === "text";
    input.type = mostrando ? "password" : "text";
    if (icon) {
        icon.classList.toggle("fa-eye", mostrando);
        icon.classList.toggle("fa-eye-slash", !mostrando);
    }
}

function podeGerenciarQuestoes() {
    return !!usuarioLogado && ["ADM", "Monitor", "Professor/Orientador"].includes(usuarioLogado.nivel);
}

function normalizarListaUnicaOrdenada(lista) {
    return Array.from(new Set((lista || []).map(v => String(v || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function popularSelectSimples(selectId, valores, rotuloTodos = "Todos") {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const atual = sel.value;
    const lista = normalizarListaUnicaOrdenada(valores);
    sel.innerHTML = `<option value="TODOS">${textoSeguro(rotuloTodos)}</option>` + lista.map(v => `<option value="${textoSeguro(v)}">${textoSeguro(v)}</option>`).join("");
    if (Array.from(sel.options).some(o => o.value === atual)) sel.value = atual;
}

function popularFiltrosQuestoes() {
    const painel = document.getElementById("painelAddQuestao");
    if (painel) painel.classList.toggle("hidden", !podeGerenciarQuestoes());
    if (!podeGerenciarQuestoes()) return;
    const qs = getStorage("app_questoes", []);
    popularSelectSimples("filtroQuestaoDisciplina", qs.map(q => q.disciplina), "Todas");
    popularSelectSimples("filtroQuestaoNivel", qs.map(q => q.nivel), "Todos");
    popularSelectSimples("filtroQuestaoDificuldade", qs.map(q => q.dificuldade), "Todas");
    popularSelectSimples("filtroQuestaoTipo", qs.map(q => q.tipo), "Todos");
}

async function uploadListaArquivos(inputId, pasta) {
    const input = document.getElementById(inputId);
    const files = Array.from(input?.files || []);
    const uploads = [];
    for (const file of files) {
        const up = await enviarArquivoParaFirebaseStorage(file, pasta);
        uploads.push({
            url: up.fileUrl,
            storagePath: up.storagePath,
            nome: up.fileName,
            mimeType: up.mimeType,
            tamanho: up.size
        });
    }
    return uploads;
}

function tagsComoLista(valor) {
    return String(valor || "").split(",").map(t => t.trim()).filter(Boolean);
}

async function salvarNovaQuestao(event) {
    event.preventDefault();
    if (!podeGerenciarQuestoes()) return alert("Apenas ADM, Monitor e Professor/Orientador podem cadastrar questões.");
    const btn = event.submitter || document.querySelector('#formCadQuestao button[type="submit"]');
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Salvando...'; }
        const arquivos = await uploadListaArquivos("questaoArquivo", "banco_questoes");
        const arquivosSolucao = await uploadListaArquivos("questaoSolucaoArquivo", "banco_questoes_solucoes");
        const solucaoTexto = document.getElementById("questaoSolucaoTexto")?.value.trim() || "";
        const questao = {
            id: novoId(),
            titulo: document.getElementById("questaoTitulo")?.value.trim() || "Questão sem título",
            disciplina: document.getElementById("questaoDisciplina")?.value || "Geral",
            nivel: document.getElementById("questaoNivel")?.value || "Geral",
            tema: document.getElementById("questaoTema")?.value.trim() || "",
            subtema: document.getElementById("questaoSubtema")?.value.trim() || "",
            dificuldade: document.getElementById("questaoDificuldade")?.value || "Médio",
            tipo: document.getElementById("questaoTipo")?.value || "Múltipla escolha",
            fonte: document.getElementById("questaoFonte")?.value.trim() || "",
            ano: document.getElementById("questaoAno")?.value || "Não informado",
            alternativaCorreta: document.getElementById("questaoAlternativa")?.value || "",
            tags: tagsComoLista(document.getElementById("questaoTags")?.value),
            enunciado: document.getElementById("questaoEnunciado")?.value.trim() || "",
            arquivos,
            solucoes: [],
            criadaEm: Date.now(),
            criadaPorId: usuarioLogado?.id || usuarioLogado?.authUid || "",
            criadaPorNome: usuarioLogado?.nome || "",
            criadaPorNivel: usuarioLogado?.nivel || ""
        };
        if (solucaoTexto || arquivosSolucao.length) {
            questao.solucoes.push({
                id: novoId(),
                texto: solucaoTexto,
                arquivos: arquivosSolucao,
                criadaEm: Date.now(),
                criadaPorId: usuarioLogado?.id || usuarioLogado?.authUid || "",
                criadaPorNome: usuarioLogado?.nome || "",
                criadaPorNivel: usuarioLogado?.nivel || "",
                tipo: "Solução inicial"
            });
        }
        const lista = getStorage("app_questoes", []);
        lista.push(questao);
        await setStorage("app_questoes", lista);
        document.getElementById("formCadQuestao")?.reset();
        popularFiltrosQuestoes();
        renderizarBancoQuestoes();
        alert("Questão salva no banco com sucesso.");
    } catch (erro) {
        console.error("Erro ao salvar questão", erro);
        alert(`Erro ao salvar questão.\n\n${erro.message || erro}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Salvar questão'; }
    }
}

function questaoPassaFiltros(q) {
    const disc = document.getElementById("filtroQuestaoDisciplina")?.value || "TODOS";
    const nivel = document.getElementById("filtroQuestaoNivel")?.value || "TODOS";
    const dif = document.getElementById("filtroQuestaoDificuldade")?.value || "TODOS";
    const tipo = document.getElementById("filtroQuestaoTipo")?.value || "TODOS";
    const busca = normalizarTexto(document.getElementById("filtroQuestaoBusca")?.value || "");
    if (disc !== "TODOS" && q.disciplina !== disc) return false;
    if (nivel !== "TODOS" && q.nivel !== nivel) return false;
    if (dif !== "TODOS" && q.dificuldade !== dif) return false;
    if (tipo !== "TODOS" && q.tipo !== tipo) return false;
    if (busca) {
        const texto = normalizarTexto([q.titulo, q.disciplina, q.nivel, q.tema, q.subtema, q.dificuldade, q.tipo, q.fonte, q.ano, q.enunciado, ...(q.tags || [])].join(" "));
        if (!texto.includes(busca)) return false;
    }
    return true;
}

function renderArquivoLinks(arquivos) {
    if (!Array.isArray(arquivos) || !arquivos.length) return "";
    return `<div class="flex flex-wrap gap-2 mt-2">${arquivos.map((a, i) => `<a href="${a.url}" target="_blank" class="px-3 py-1 rounded-lg bg-blue-950/40 text-blue-300 border border-blue-900/40 text-[11px] font-bold"><i class="fa-solid fa-paperclip mr-1"></i>${textoSeguro(a.nome || `Arquivo ${i+1}`)}</a>`).join("")}</div>`;
}

function renderizarSolucoesQuestao(q) {
    const sols = Array.isArray(q.solucoes) ? q.solucoes : [];
    if (!sols.length) return `<p class="text-xs text-gray-500 mt-2">Nenhuma solução cadastrada ainda.</p>`;
    return `<div class="space-y-2 mt-3">${sols.map(s => `<div class="rounded-xl bg-gray-950/60 border border-gray-700 p-3"><div class="flex justify-between gap-2"><span class="text-[10px] text-emerald-300 uppercase font-bold">${textoSeguro(s.tipo || "Solução")}</span><span class="text-[10px] text-gray-500">${textoSeguro(s.criadaPorNome || "Equipe")} · ${s.criadaEm ? new Date(s.criadaEm).toLocaleString("pt-BR") : ""}</span></div>${s.texto ? `<p class="text-sm text-gray-300 whitespace-pre-wrap mt-2">${textoSeguro(s.texto)}</p>` : ""}${renderArquivoLinks(s.arquivos)}</div>`).join("")}</div>`;
}

function renderizarBancoQuestoes() {
    const grid = document.getElementById("gridQuestoes");
    if (!grid) return;
    if (!podeGerenciarQuestoes()) {
        grid.innerHTML = `<div class="rounded-2xl bg-gray-800 border border-gray-700 p-8 text-center text-gray-400"><i class="fa-solid fa-lock text-3xl mb-3 text-gray-600"></i><p class="font-bold">Banco de Questões restrito.</p><p class="text-xs mt-1">Acesso exclusivo para ADM, Monitor e Professor/Orientador.</p></div>`;
        return;
    }
    const questoes = getStorage("app_questoes", []).filter(questaoPassaFiltros)
        .sort((a,b) => String(a.disciplina || "").localeCompare(String(b.disciplina || ""), "pt-BR") || String(a.tema || "").localeCompare(String(b.tema || ""), "pt-BR") || String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR"));
    if (!questoes.length) {
        grid.innerHTML = `<div class="rounded-2xl bg-gray-800 border border-gray-700 p-8 text-center text-gray-500"><i class="fa-solid fa-database text-3xl mb-3 text-gray-600"></i><p class="font-bold">Nenhuma questão encontrada.</p><p class="text-xs mt-1">Cadastre questões ou ajuste os filtros.</p></div>`;
        return;
    }
    grid.innerHTML = questoes.map(q => `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-sm"><div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><h4 class="text-base font-black text-white">${textoSeguro(q.titulo)}</h4><div class="flex flex-wrap gap-2 mt-2"><span class="px-2 py-1 rounded-lg bg-blue-950/40 text-blue-300 text-[10px] font-bold">${textoSeguro(q.disciplina)}</span><span class="px-2 py-1 rounded-lg bg-purple-950/40 text-purple-300 text-[10px] font-bold">${textoSeguro(q.nivel)}</span><span class="px-2 py-1 rounded-lg bg-amber-950/40 text-amber-300 text-[10px] font-bold">${textoSeguro(q.dificuldade)}</span><span class="px-2 py-1 rounded-lg bg-gray-900 text-gray-300 text-[10px] font-bold">${textoSeguro(q.tipo)}</span>${q.alternativaCorreta ? `<span class="px-2 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 text-[10px] font-bold">Gabarito: ${textoSeguro(q.alternativaCorreta)}</span>` : ""}</div></div><button onclick="adicionarSolucaoQuestao('${q.id}')" class="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"><i class="fa-solid fa-plus mr-1"></i>Nova solução</button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4"><div class="lg:col-span-2"><p class="text-xs text-gray-500 uppercase font-bold">${textoSeguro([q.fonte, q.ano, q.tema, q.subtema].filter(Boolean).join(" · "))}</p><p class="text-sm text-gray-300 whitespace-pre-wrap mt-2">${textoSeguro(q.enunciado || "")}</p>${renderArquivoLinks(q.arquivos)}</div><div class="rounded-2xl bg-gray-900/60 border border-gray-700 p-3"><details><summary class="cursor-pointer text-xs font-black uppercase text-emerald-300">Ver soluções (${(q.solucoes || []).length})</summary>${renderizarSolucoesQuestao(q)}</details>${Array.isArray(q.tags) && q.tags.length ? `<div class="mt-3 flex flex-wrap gap-1">${q.tags.map(t => `<span class="text-[10px] px-2 py-1 rounded-full bg-gray-950 text-gray-400">#${textoSeguro(t)}</span>`).join("")}</div>` : ""}</div></div></div>`).join("");
}

async function adicionarSolucaoQuestao(questaoId) {
    if (!podeGerenciarQuestoes()) return alert("Sem permissão para adicionar solução.");
    const texto = prompt("Digite a solução/comentário pedagógico. Para anexos, use o campo de solução inicial ao cadastrar ou edite depois pelo Firestore por enquanto.");
    if (texto === null) return;
    const lista = getStorage("app_questoes", []);
    const idx = lista.findIndex(q => String(q.id) === String(questaoId));
    if (idx < 0) return alert("Questão não encontrada.");
    lista[idx].solucoes = Array.isArray(lista[idx].solucoes) ? lista[idx].solucoes : [];
    lista[idx].solucoes.push({ id: novoId(), texto: texto.trim(), arquivos: [], tipo: "Solução complementar", criadaEm: Date.now(), criadaPorId: usuarioLogado?.id || usuarioLogado?.authUid || "", criadaPorNome: usuarioLogado?.nome || "", criadaPorNivel: usuarioLogado?.nivel || "" });
    await setStorage("app_questoes", lista);
    renderizarBancoQuestoes();
}

function popularFiltrosGeradorSimulado() {
    const qs = getStorage("app_questoes", []);
    popularSelectSimples("gerSimDisciplina", qs.map(q => q.disciplina), "Todas");
    popularSelectSimples("gerSimNivel", qs.map(q => q.nivel), "Todos");
    popularSelectSimples("gerSimDificuldade", qs.map(q => q.dificuldade), "Todas");
}

function popularFiltrosSimulados() {
    const sims = getStorage("app_simulados", []);
    popularSelectUnico("filtroSimDisciplina", sims.map(s => s.disciplina), "Todas");
    popularSelectUnico("filtroSimNivel", sims.map(s => s.nivel), "Todos");
    atualizarDestinoSimulado();
    const painel = document.getElementById("painelAddSimulado");
    if (painel) painel.classList.toggle("hidden", !podeGerenciarSimulados());
    const gerador = document.getElementById("painelGeradorSimuladoQuestoes");
    if (gerador) gerador.classList.toggle("hidden", !podeGerenciarQuestoes());
    popularFiltrosGeradorSimulado();
    ajustarCamposSimulado();
    atualizarSelectRankingSimulados();
}

async function gerarSimuladoPeloBancoQuestoes() {
    if (!podeGerenciarQuestoes()) return alert("Apenas ADM, Monitor e Professor/Orientador podem gerar simulados pelo banco de questões.");
    const disc = document.getElementById("gerSimDisciplina")?.value || "TODOS";
    const nivel = document.getElementById("gerSimNivel")?.value || "TODOS";
    const dif = document.getElementById("gerSimDificuldade")?.value || "TODOS";
    const tema = normalizarTexto(document.getElementById("gerSimTema")?.value || "");
    const qtd = Math.max(1, Number(document.getElementById("gerSimQtd")?.value || 10));
    let qs = getStorage("app_questoes", []).filter(q => {
        if (disc !== "TODOS" && q.disciplina !== disc) return false;
        if (nivel !== "TODOS" && q.nivel !== nivel) return false;
        if (dif !== "TODOS" && q.dificuldade !== dif) return false;
        if (tema && !normalizarTexto([q.tema, q.subtema, q.tags?.join(" "), q.enunciado, q.titulo].join(" ")).includes(tema)) return false;
        return true;
    });
    qs = qs.sort(() => Math.random() - 0.5).slice(0, qtd);
    if (!qs.length) return alert("Nenhuma questão encontrada com esses filtros.");
    const sim = {
        id: novoId(),
        titulo: document.getElementById("gerSimTitulo")?.value.trim() || `Simulado gerado — ${new Date().toLocaleDateString("pt-BR")}`,
        disciplina: disc === "TODOS" ? "Geral" : disc,
        nivel: nivel === "TODOS" ? "Geral" : nivel,
        formato: document.getElementById("gerSimFormato")?.value || "objetivo",
        dataAbertura: "",
        dataFim: document.getElementById("gerSimPrazo")?.value || "",
        duracao: document.getElementById("gerSimDuracao")?.value || "Sem limite definido",
        quantidadeQuestoes: qs.length,
        geradoDoBanco: true,
        questoesBanco: qs.map((q, i) => ({ numero: i + 1, questaoId: q.id, titulo: q.titulo, disciplina: q.disciplina, nivel: q.nivel, tema: q.tema, subtema: q.subtema, dificuldade: q.dificuldade, tipo: q.tipo, fonte: q.fonte, ano: q.ano, enunciado: q.enunciado, arquivos: q.arquivos || [], alternativaCorreta: q.alternativaCorreta || "" })),
        gabaritoObjetivo: qs.map((q, i) => ({ numero: i + 1, resposta: String(q.alternativaCorreta || "").toUpperCase() })).filter(g => g.resposta),
        gabarito: "Simulado gerado a partir do Banco de Questões.",
        descricao: "Leia cada questão no ambiente cronometrado e preencha o cartão-resposta. O gabarito/resolução só será liberado após o prazo final.",
        destino: { tipo: "todos", valores: [] },
        criadoEm: Date.now(),
        criadoPorId: usuarioLogado?.id || usuarioLogado?.authUid || "",
        criadoPorNome: usuarioLogado?.nome || "",
        criadoPorNivel: usuarioLogado?.nivel || ""
    };
    const lista = getStorage("app_simulados", []);
    lista.push(sim);
    await setStorage("app_simulados", lista);
    document.getElementById("gerSimResumo").innerHTML = `<span class="text-emerald-300 font-bold">Simulado criado com ${qs.length} questões.</span>`;
    renderizarSimulados();
    atualizarSelectRankingSimulados();
    alert("Simulado criado a partir do Banco de Questões.");
}

function renderizarQuestoesDoSimuladoSeguro(sim) {
    const qs = Array.isArray(sim.questoesBanco) ? sim.questoesBanco : [];
    if (!qs.length) return "";
    return `<div class="simulado-secure-area space-y-4">${qs.map(q => `<div class="rounded-2xl bg-gray-950/60 border border-gray-700 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><h4 class="text-sm font-black text-white">Questão ${q.numero}</h4><span class="text-[10px] text-gray-500 uppercase font-bold">${textoSeguro([q.disciplina, q.tema, q.dificuldade].filter(Boolean).join(" · "))}</span></div><p class="text-sm text-gray-300 whitespace-pre-wrap mt-3 leading-relaxed">${textoSeguro(q.enunciado || q.titulo || "")}</p>${renderArquivoLinks(q.arquivos)}</div>`).join("")}</div>`;
}

function renderizarAmbienteSimulado() {
    const box = document.getElementById("simuladoAmbienteConteudo");
    if (!box || !simuladoSessaoAtual) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    const envio = envioSimuladoUsuario(sim);
    if (!simuladoSessaoAtual.iniciado) {
        const mins = minutosDuracaoSimulado(sim);
        box.innerHTML = `<div class="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center text-2xl"><i class="fa-solid fa-stopwatch"></i></div><div class="flex-1"><h2 class="text-2xl font-black text-white">Ambiente cronometrado</h2><p class="text-sm text-gray-400 mt-2 leading-relaxed">Você irá iniciar o simulado <b class="text-gray-200">${textoSeguro(sim.titulo)}</b>. Após clicar em <b>Iniciar simulado</b>, suas respostas serão registradas em um ambiente próprio. Se você sair desta página/ambiente depois de iniciar, o simulado será considerado encerrado e as questões marcadas até o momento serão enviadas.</p><div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Prazo</p><p class="text-sm text-gray-200 font-bold mt-1">${textoPrazoSimulado(sim)}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo</p><p class="text-sm text-gray-200 font-bold mt-1">${mins ? `${mins} minutos` : "Sem limite definido"}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Formato</p><p class="text-sm text-gray-200 font-bold mt-1">${textoSeguro(sim.formato || "simulado")}</p></div></div><div class="mt-6 flex flex-col sm:flex-row gap-3"><button onclick="iniciarSimuladoCronometrado()" class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs"><i class="fa-solid fa-play mr-2"></i>Iniciar simulado</button><button onclick="fecharAmbienteSimulado()" class="px-5 py-3 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold uppercase text-xs">Cancelar</button></div></div></div></div>`;
        return;
    }
    const questoesHTML = renderizarQuestoesDoSimuladoSeguro(sim);
    const embed = questoesHTML || (sim.arquivoUrl ? `<div class="simulado-secure-area"><iframe src="${sim.arquivoUrl}#toolbar=0&navpanes=0&scrollbar=1" class="simulado-secure-viewer w-full rounded-2xl border border-gray-700 bg-black"></iframe><p class="mt-2 text-[10px] text-gray-500">Visualização protegida por interface: copiar/selecionar/contexto ficam bloqueados no ambiente. Arquivos PDF ainda podem ter limitações do visualizador do navegador.</p></div>` : `<div class="rounded-2xl border border-gray-700 bg-gray-950 p-8 text-center text-gray-500">Nenhum arquivo de simulado anexado. Use as instruções abaixo.</div>`);
    box.innerHTML = `<div class="space-y-4 simulado-secure-area"><div class="sticky top-0 z-10 bg-gray-900/95 border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] text-gray-500 uppercase font-bold">Simulado em andamento</p><h2 class="text-lg font-black text-white">${textoSeguro(sim.titulo)}</h2></div><div class="flex flex-wrap items-center gap-2"><span id="simAmbTimer" class="px-4 py-2 rounded-xl bg-amber-900/40 text-amber-200 border border-amber-800/50 text-sm font-black">--:--</span><button onclick="finalizarSimuladoAmbiente(false, 'finalizado_pelo_aluno')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-paper-plane mr-1"></i>Finalizar e enviar</button><button onclick="fecharAmbienteSimulado()" class="px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/50 text-red-200 text-xs font-bold uppercase">Sair</button></div></div><div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.85fr)] gap-5"><div class="space-y-3"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4">${embed}</div>${sim.imagemUrl ? `<img src="${sim.imagemUrl}" class="w-full rounded-2xl border border-gray-700 bg-gray-950">` : ""}${sim.descricao ? `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Instruções</h4><p class="text-sm text-gray-300 whitespace-pre-wrap">${textoSeguro(sim.descricao)}</p></div>` : ""}</div><div class="space-y-4"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4">${renderGradeRespostaObjetivaAmbiente(sim, envio)}<label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Resposta dissertativa / observações</label><textarea id="simAmbTexto" rows="5" class="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200 focus:outline-none resize-none" placeholder="Digite comentários, justificativas ou resposta dissertativa...">${textoSeguro(envio?.texto || "")}</textarea><label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Anexo de resolução</label><input type="file" id="simAmbArquivo" accept="image/*,.pdf,.doc,.docx" class="w-full p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300">${envio?.arquivoUrl ? `<a href="${envio.arquivoUrl}" target="_blank" class="text-blue-400 text-xs font-bold mt-2 inline-block">Anexo enviado anteriormente</a>` : ""}</div></div></div></div>`;
    atualizarTimerSimulado();
}

["copy", "cut", "contextmenu", "selectstart", "dragstart"].forEach(evt => {
    document.addEventListener(evt, (e) => {
        const overlay = document.getElementById("simuladoAmbienteOverlay");
        if (overlay && !overlay.classList.contains("hidden") && e.target.closest("#simuladoAmbienteOverlay")) {
            if (evt !== "dragstart" || !["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) e.preventDefault();
        }
    }, true);
});

/* =========================================================
   PATCH CONSOLIDADO — MODERAÇÃO, GERADOR INTELIGENTE, LINK PÚBLICO E RELATÓRIOS
   ========================================================= */

// -------------------- Moderação local preventiva --------------------
const MODERACAO_BLOQUEIOS = {
  sexual: [
    /\bsexo\s+expl[ií]cito\b/i, /\bporn[oô]\b/i, /\bpornografia\b/i, /\bnudez\b/i,
    /\bgenital(?:ais)?\b/i, /\bp[ée]nis\b/i, /\bvagina\b/i, /\bestupro\b/i,
    /\babus[oa]\s+sexual\b/i, /\bincesto\b/i
  ],
  ofensa: [
    /\b(vai\s+tomar\s+no|filho\s+da\s+p|fdp|idiota|burro|imbecil|retardado|lixo|merda)\b/i,
    /\b(seu|sua|voc[eê])\s+(idiota|burro|imbecil|retardado|lixo)\b/i
  ],
  palavrao: [
    /\b(caralho|porra|puta|puto|foda-se|bosta|cu|cacete)\b/i
  ]
};

function analisarConteudoSeguroIA(texto) {
  const alvo = String(texto || "").trim();
  if (!alvo) return { ok: true, categorias: [] };
  const categorias = [];
  Object.entries(MODERACAO_BLOQUEIOS).forEach(([cat, regs]) => {
    if (regs.some(rx => rx.test(alvo))) categorias.push(cat);
  });
  return { ok: categorias.length === 0, categorias };
}

function validarConteudoEducacionalIA(textos, contexto = "conteúdo") {
  const unido = (Array.isArray(textos) ? textos : [textos]).filter(Boolean).join("\n");
  const analise = analisarConteudoSeguroIA(unido);
  if (!analise.ok) {
    alert(`A publicação foi bloqueada pela moderação preventiva.\n\nMotivo: ${analise.categorias.join(", ")}\n\nRevise o ${contexto}. Esta é uma plataforma para adolescentes.`);
    return false;
  }
  return true;
}

// -------------------- Listas amplas de temas/subtemas --------------------
const TAXONOMIA_TEMAS_QUESTOES = {
  "Matemática": {
    "Aritmética": ["Operações", "Divisibilidade", "MDC/MMC", "Primos", "Restos", "Frações", "Porcentagem", "Razão e proporção", "Médias", "Potenciação", "Radiciação"],
    "Álgebra": ["Equações", "Inequações", "Sistemas", "Produtos notáveis", "Fatoração", "Funções", "Sequências", "PA/PG", "Polinômios"],
    "Geometria": ["Ângulos", "Triângulos", "Quadriláteros", "Circunferência", "Áreas", "Volumes", "Semelhança", "Teorema de Pitágoras", "Geometria espacial"],
    "Combinatória e Probabilidade": ["Princípio fundamental da contagem", "Permutações", "Combinações", "Probabilidade", "Invariantes", "Casa dos pombos"],
    "Lógica e Problemas": ["Estratégia", "Padrões", "Jogos", "Criptaritmos", "Tabelas", "Diagramas"]
  },
  "Física": {
    "Mecânica": ["Cinemática", "Dinâmica", "Leis de Newton", "Energia", "Quantidade de movimento", "Gravitação"],
    "Termologia": ["Calorimetria", "Dilatação", "Gases", "Termodinâmica"],
    "Óptica": ["Reflexão", "Refração", "Lentes", "Espelhos"],
    "Eletricidade": ["Eletrostática", "Circuitos", "Resistores", "Potência elétrica"],
    "Ondulatória": ["Ondas", "Som", "Interferência", "Efeito Doppler"]
  },
  "Química": {
    "Química Geral": ["Matéria", "Átomos", "Tabela periódica", "Ligações químicas", "Funções inorgânicas"],
    "Físico-química": ["Soluções", "Estequiometria", "Termoquímica", "Cinética", "Equilíbrio", "Eletroquímica"],
    "Orgânica": ["Hidrocarbonetos", "Funções orgânicas", "Isomeria", "Reações orgânicas"]
  },
  "Biologia": {
    "Citologia": ["Células", "Organelas", "Membrana", "Metabolismo"],
    "Genética": ["Leis de Mendel", "Heredogramas", "DNA/RNA", "Biotecnologia"],
    "Ecologia": ["Cadeias alimentares", "Ciclos biogeoquímicos", "Relações ecológicas", "Impactos ambientais"],
    "Fisiologia": ["Digestório", "Respiratório", "Circulatório", "Nervoso", "Endócrino"],
    "Evolução": ["Seleção natural", "Evidências", "Especiação"]
  },
  "Ciências": {
    "Terra e Universo": ["Sistema Solar", "Estações do ano", "Lua", "Clima", "Rochas"],
    "Vida e Ambiente": ["Ecossistemas", "Saúde", "Corpo humano", "Microrganismos"],
    "Matéria e Energia": ["Misturas", "Transformações", "Energia", "Máquinas simples"]
  },
  "Astronomia": {
    "Astronomia básica": ["Esfera celeste", "Constelações", "Sistema Solar", "Fases da Lua", "Eclipses"],
    "Astrofísica introdutória": ["Estrelas", "Galáxias", "Gravidade", "Luz", "Escalas astronômicas"]
  },
  "Tecnologia / Robótica": {
    "Programação": ["Algoritmos", "Condicionais", "Laços", "Funções", "Estruturas de dados"],
    "Robótica": ["Sensores", "Motores", "Controle", "Montagem", "Estratégia de competição"],
    "Computação": ["Lógica", "Grafos", "Busca", "Ordenação", "Criptografia básica"]
  },
  "Linguagem": {
    "Português": ["Interpretação", "Gramática", "Coesão", "Figuras de linguagem", "Gêneros textuais"],
    "Redação": ["Argumentação", "Estrutura textual", "Repertório", "Coerência"],
    "Inglês": ["Reading", "Vocabulário", "Gramática", "Listening"]
  },
  "Humanas": {
    "História": ["Antiguidade", "Idade Média", "Brasil Colônia", "Brasil Império", "República", "Guerras Mundiais"],
    "Geografia": ["Cartografia", "Geopolítica", "Clima", "Relevo", "População", "Globalização"],
    "Atualidades": ["Conflitos", "Economia", "Meio ambiente", "Organizações internacionais"]
  }
};

function todosTemasQuestoes() { return Object.values(TAXONOMIA_TEMAS_QUESTOES).flatMap(grupos => Object.keys(grupos)).sort((a,b)=>a.localeCompare(b,"pt-BR")); }
function todosSubtemasQuestoes() { return Object.values(TAXONOMIA_TEMAS_QUESTOES).flatMap(grupos => Object.values(grupos).flat()).sort((a,b)=>a.localeCompare(b,"pt-BR")); }

function popularTaxonomiaQuestoes() {
  const temas = Array.from(new Set([...todosTemasQuestoes(), ...getStorage("app_questoes", []).map(q=>q.tema).filter(Boolean)])).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const subtemas = Array.from(new Set([...todosSubtemasQuestoes(), ...getStorage("app_questoes", []).map(q=>q.subtema).filter(Boolean)])).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const dlTemas = document.getElementById("listaTemasQuestoes");
  const dlSubs = document.getElementById("listaSubtemasQuestoes");
  if (dlTemas) dlTemas.innerHTML = temas.map(t=>`<option value="${textoSeguro(t)}"></option>`).join("");
  if (dlSubs) dlSubs.innerHTML = subtemas.map(t=>`<option value="${textoSeguro(t)}"></option>`).join("");
  ["gerSimTemas", "gerSimSubtemas"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const vals = id.includes("Sub") ? subtemas : temas;
    const anteriores = Array.from(sel.selectedOptions || []).map(o=>o.value);
    sel.innerHTML = vals.map(v=>`<option value="${textoSeguro(v)}">${textoSeguro(v)}</option>`).join("");
    anteriores.forEach(v => { const o = Array.from(sel.options).find(op=>op.value===v); if(o) o.selected = true; });
  });
}

// -------------------- Simulado: questões manuais --------------------
function adicionarQuestaoManualSimulado(dados = {}) {
  const lista = document.getElementById("simQuestoesManuaisLista");
  if (!lista) return;
  const n = lista.querySelectorAll(".sim-questao-manual").length + 1;
  const id = `simQuestaoManual_${Date.now()}_${Math.floor(Math.random()*999)}`;
  const wrap = document.createElement("div");
  wrap.className = "sim-questao-manual rounded-xl border border-blue-900/40 bg-gray-900/60 p-3 space-y-2";
  wrap.innerHTML = `
    <div class="flex items-center justify-between gap-2"><span class="text-xs font-black text-blue-200 uppercase">Questão manual ${n}</span><button type="button" onclick="this.closest('.sim-questao-manual').remove()" class="text-red-300 text-xs font-bold">Remover</button></div>
    <textarea data-campo="enunciado" rows="3" class="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200" placeholder="Enunciado da questão...">${textoSeguro(dados.enunciado||"")}</textarea>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
      <select data-campo="tipo" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option>Múltipla escolha</option><option>Dissertativa</option><option>Mista</option><option>Verdadeiro ou Falso</option></select>
      <select data-campo="dificuldade" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option>Fácil</option><option>Médio</option><option>Difícil</option><option>Muito difícil</option><option>Olímpica</option><option>Vestibular</option></select>
      <select data-campo="alternativaCorreta" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option value="">Sem gabarito</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select>
      <input data-campo="tema" list="listaTemasQuestoes" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200" placeholder="Tema">
    </div>`;
  lista.appendChild(wrap);
  if (dados.tipo) wrap.querySelector('[data-campo="tipo"]').value = dados.tipo;
  if (dados.dificuldade) wrap.querySelector('[data-campo="dificuldade"]').value = dados.dificuldade;
  if (dados.alternativaCorreta) wrap.querySelector('[data-campo="alternativaCorreta"]').value = dados.alternativaCorreta;
  if (dados.tema) wrap.querySelector('[data-campo="tema"]').value = dados.tema;
}

function lerQuestoesManuaisSimulado() {
  return Array.from(document.querySelectorAll("#simQuestoesManuaisLista .sim-questao-manual")).map((el, idx) => ({
    numero: idx + 1,
    questaoId: `manual_${idx+1}`,
    titulo: `Questão ${idx+1}`,
    enunciado: el.querySelector('[data-campo="enunciado"]')?.value?.trim() || "",
    tipo: el.querySelector('[data-campo="tipo"]')?.value || "Múltipla escolha",
    dificuldade: el.querySelector('[data-campo="dificuldade"]')?.value || "Médio",
    tema: el.querySelector('[data-campo="tema"]')?.value || "",
    alternativaCorreta: el.querySelector('[data-campo="alternativaCorreta"]')?.value || "",
    arquivos: []
  })).filter(q => q.enunciado);
}

// -------------------- Gerador de simulado: distribuição --------------------
function selecionadosMult(id) {
  const el = document.getElementById(id);
  const vals = Array.from(el?.selectedOptions || []).map(o=>o.value).filter(Boolean);
  return vals.includes("TODOS") || !vals.length ? ["TODOS"] : vals;
}
function numCampo(id){ return Math.max(0, Number(document.getElementById(id)?.value || 0)); }
function distribuicaoGeradorSimulado() {
  return {
    "Fácil": numCampo("gerSimQtdFacil"),
    "Médio": numCampo("gerSimQtdMedio"),
    "Difícil": numCampo("gerSimQtdDificil"),
    "Muito difícil": numCampo("gerSimQtdMuitoDificil"),
    "Olímpica": numCampo("gerSimQtdOlimpica"),
    "Vestibular": numCampo("gerSimQtdVestibular")
  };
}
function atualizarDistribuicaoGeradorSimulado() {
  const total = Math.max(1, Number(document.getElementById("gerSimQtd")?.value || 10));
  const dist = distribuicaoGeradorSimulado();
  let soma = Object.values(dist).reduce((a,b)=>a+b,0);
  if (soma > total) {
    const ativo = document.activeElement;
    if (ativo && ativo.classList?.contains("ger-sim-dist")) {
      const excesso = soma - total;
      ativo.value = Math.max(0, Number(ativo.value || 0) - excesso);
      soma = total;
    }
  }
  const atual = document.getElementById("gerSimDistribAtual");
  const tot = document.getElementById("gerSimDistribTotal");
  if (atual) { atual.textContent = String(soma); atual.className = soma === total ? "text-emerald-300" : soma > total ? "text-red-300" : "text-purple-200"; }
  if (tot) tot.textContent = String(total);
}
function dificuldadeProxima(dif) {
  const ordem = ["Fácil", "Médio", "Difícil", "Muito difícil", "Olímpica", "Vestibular"];
  const i = ordem.indexOf(dif);
  return [...ordem.slice(0, i).reverse(), ...ordem.slice(i+1)];
}

// -------------------- Override: gabarito, prazos e duração --------------------
const __dataFimSimuladoComoData = window.dataFimSimuladoComoData;
window.dataFimSimuladoComoData = function(sim) {
  if (sim?.dataFim) {
    try { return new Date(`${sim.dataFim}T${sim.horaFim || "23:59"}`); } catch(_) {}
  }
  return __dataFimSimuladoComoData ? __dataFimSimuladoComoData(sim) : null;
};
const __minutosDuracaoSimulado = window.minutosDuracaoSimulado;
window.minutosDuracaoSimulado = function(sim) {
  if (Number(sim?.duracaoMinutos) > 0) return Number(sim.duracaoMinutos);
  return __minutosDuracaoSimulado ? __minutosDuracaoSimulado(sim) : 0;
};

function renderizarQuestoesDoSimuladoSeguro(sim) {
  const qs = Array.isArray(sim.questoesBanco) ? sim.questoesBanco : [];
  if (!qs.length) return "";
  return `<div class="simulado-secure-area space-y-4">${qs.map(q => `<div class="rounded-2xl bg-gray-950/60 border border-gray-700 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><h4 class="text-sm font-black text-white">Questão ${q.numero}</h4><span class="text-[10px] text-gray-500 uppercase font-bold">${textoSeguro([q.disciplina, q.tema, q.dificuldade].filter(Boolean).join(" · "))}</span></div><p class="text-sm text-gray-300 whitespace-pre-wrap mt-3 leading-relaxed">${textoSeguro(q.enunciado || q.titulo || "")}</p>${renderArquivoLinks(q.arquivos)}</div>`).join("")}</div>`;
}

function renderizarAmbienteSimulado() {
  const box = document.getElementById("simuladoAmbienteConteudo");
  if (!box || !simuladoSessaoAtual) return;
  const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
  if (!sim) return;
  const envio = envioSimuladoUsuario(sim);
  if (!simuladoSessaoAtual.iniciado) {
    const mins = minutosDuracaoSimulado(sim);
    box.innerHTML = `<div class="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center text-2xl"><i class="fa-solid fa-stopwatch"></i></div><div class="flex-1"><h2 class="text-2xl font-black text-white">Ambiente cronometrado</h2><p class="text-sm text-gray-400 mt-2 leading-relaxed">Você irá iniciar o simulado <b class="text-gray-200">${textoSeguro(sim.titulo)}</b>. Após clicar em <b>Iniciar simulado</b>, se você sair deste ambiente, o simulado será encerrado e as respostas marcadas até o momento serão enviadas.</p><div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Prazo</p><p class="text-sm text-gray-200 font-bold mt-1">${textoPrazoSimulado(sim)} ${sim.horaFim ? `às ${textoSeguro(sim.horaFim)}` : ""}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo</p><p class="text-sm text-gray-200 font-bold mt-1">${mins ? `${mins} minutos` : "Sem limite definido"}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Formato</p><p class="text-sm text-gray-200 font-bold mt-1">${textoSeguro(sim.formato || "simulado")}</p></div></div><div class="mt-6 flex flex-col sm:flex-row gap-3"><button onclick="iniciarSimuladoCronometrado()" class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs"><i class="fa-solid fa-play mr-2"></i>Iniciar simulado</button><button onclick="fecharAmbienteSimulado()" class="px-5 py-3 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold uppercase text-xs">Cancelar</button></div></div></div></div>`;
    return;
  }
  const questoesHTML = renderizarQuestoesDoSimuladoSeguro(sim);
  const embed = questoesHTML || (sim.arquivoUrl ? `<div class="simulado-secure-area"><iframe src="${sim.arquivoUrl}#toolbar=0&navpanes=0&scrollbar=1" class="simulado-secure-viewer w-full rounded-2xl border border-gray-700 bg-black"></iframe><p class="mt-2 text-[10px] text-gray-500">Ambiente protegido: copiar, selecionar texto, arrastar e botão direito ficam bloqueados.</p></div>` : `<div class="rounded-2xl border border-gray-700 bg-gray-950 p-8 text-center text-gray-500">Nenhum arquivo de simulado anexado. Use as instruções abaixo.</div>`);
  box.innerHTML = `<div class="space-y-4 simulado-secure-area"><div class="sticky top-0 z-10 bg-gray-900/95 border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] text-gray-500 uppercase font-bold">Simulado em andamento</p><h2 class="text-lg font-black text-white">${textoSeguro(sim.titulo)}</h2></div><div class="flex flex-wrap items-center gap-2"><span id="simAmbTimer" class="px-4 py-2 rounded-xl bg-amber-900/40 text-amber-200 border border-amber-800/50 text-sm font-black">--:--</span><button onclick="finalizarSimuladoAmbiente(false, 'finalizado_pelo_aluno')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-paper-plane mr-1"></i>Finalizar e enviar</button><button onclick="fecharAmbienteSimulado()" class="px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/50 text-red-200 text-xs font-bold uppercase">Sair</button></div></div><div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,2.2fr)_minmax(360px,0.8fr)] gap-5"><div class="space-y-3"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4 min-h-[75vh]">${embed}</div>${sim.imagemUrl ? `<img src="${sim.imagemUrl}" class="w-full rounded-2xl border border-gray-700 bg-gray-950">` : ""}${sim.descricao ? `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Instruções</h4><p class="text-sm text-gray-300 whitespace-pre-wrap">${textoSeguro(sim.descricao)}</p></div>` : ""}</div><div class="space-y-4"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4">${renderGradeRespostaObjetivaAmbiente(sim, envio)}<label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Resposta dissertativa / observações</label><textarea id="simAmbTexto" rows="5" class="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200 focus:outline-none resize-none" placeholder="Digite comentários, justificativas ou resposta dissertativa...">${textoSeguro(envio?.texto || "")}</textarea><label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Anexo de resolução</label><input type="file" id="simAmbArquivo" accept="image/*,.pdf,.doc,.docx" class="w-full p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300">${envio?.arquivoUrl ? `<a href="${envio.arquivoUrl}" target="_blank" class="text-blue-400 text-xs font-bold mt-2 inline-block">Anexo enviado anteriormente</a>` : ""}</div></div></div></div>`;
  atualizarTimerSimulado();
}

// -------------------- Override: salvar simulado com horários, público e questões manuais --------------------
async function salvarNovoSimulado(event) {
  event.preventDefault();
  if (!podeGerenciarSimulados()) return alert("Sem permissão para publicar simulados.");
  const btn = event.submitter || document.querySelector('#formCadSimulado button[type="submit"]');
  try {
    const titulo = document.getElementById("simTitulo")?.value.trim() || "Simulado sem título";
    const descricao = document.getElementById("simDescricao")?.value.trim() || "";
    const gabaritoTexto = document.getElementById("simGabarito")?.value.trim() || "";
    if (!validarConteudoEducacionalIA([titulo, descricao, gabaritoTexto, ...lerQuestoesManuaisSimulado().map(q=>q.enunciado)], "simulado")) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Publicando...'; }
    const arquivo = document.getElementById("simArquivo")?.files?.[0] || null;
    const imagem = document.getElementById("simImagem")?.files?.[0] || null;
    const solucaoArquivo = document.getElementById("simSolucaoArquivo")?.files?.[0] || null;
    const questoesManuais = lerQuestoesManuaisSimulado();
    const horas = Math.max(0, Number(document.getElementById("simDuracaoHoras")?.value || 0));
    const minutos = Math.max(0, Number(document.getElementById("simDuracaoMinutos")?.value || 0));
    const sim = {
      id: novoId(), titulo,
      disciplina: document.getElementById("simDisciplina")?.value || "Geral",
      nivel: document.getElementById("simNivel")?.value || "Geral",
      formato: document.getElementById("simFormato")?.value || "objetivo",
      dataAbertura: document.getElementById("simDataAbertura")?.value || "",
      horaAbertura: document.getElementById("simHoraAbertura")?.value || "",
      dataFim: document.getElementById("simDataFim")?.value || "",
      horaFim: document.getElementById("simHoraFim")?.value || "",
      duracaoMinutos: horas * 60 + minutos,
      duracao: horas || minutos ? `${horas}h ${minutos}min` : "Sem limite definido",
      quantidadeQuestoes: Number(document.getElementById("simQtdQuestoes")?.value || questoesManuais.length || 0),
      questoesBanco: questoesManuais,
      gabaritoObjetivo: questoesManuais.length ? questoesManuais.map((q,i)=>({numero:i+1,resposta:q.alternativaCorreta})).filter(g=>g.resposta) : lerGabaritoObjetivoSimulado(),
      gabarito: gabaritoTexto,
      descricao,
      solucaoUrl: document.getElementById("simSolucaoUrl")?.value.trim() || "",
      publico: !!document.getElementById("simPublico")?.checked,
      destino: { tipo: document.getElementById("simDestinoTipo")?.value || "todos", valores: Array.from(document.getElementById("simDestinoValores")?.selectedOptions || []).map(o=>o.value) },
      criadoEm: Date.now(), criadoPorId: usuarioLogado?.id || usuarioLogado?.authUid || "", criadoPorNome: usuarioLogado?.nome || "", criadoPorNivel: usuarioLogado?.nivel || ""
    };
    if (arquivo) Object.assign(sim, { arquivoUrl: (await enviarArquivoParaFirebaseStorage(arquivo, "simulados")).fileUrl });
    if (imagem) Object.assign(sim, { imagemUrl: (await enviarArquivoParaFirebaseStorage(imagem, "simulados_imagens")).fileUrl });
    if (solucaoArquivo) { const up = await enviarArquivoParaFirebaseStorage(solucaoArquivo, "simulados_solucoes"); sim.solucaoArquivoUrl = up.fileUrl; sim.solucaoStoragePath = up.storagePath; }
    const lista = getStorage("app_simulados", []); lista.push(sim); await setStorage("app_simulados", lista);
    document.getElementById("formCadSimulado")?.reset(); document.getElementById("simQuestoesManuaisLista") && (document.getElementById("simQuestoesManuaisLista").innerHTML = ""); gerarCamposGabaritoSimulado(false);
    renderizarSimulados(); atualizarSelectRankingSimulados();
    alert(sim.publico ? `Simulado publicado. Link público:\n${location.origin + location.pathname}?simuladoPublico=${sim.id}&ano=${anoDadosAtivo}` : "Simulado publicado com sucesso.");
  } catch (erro) { console.error(erro); alert(`Erro ao publicar simulado.\n\n${erro.message || erro}`); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Publicar Simulado'; } }
}

// -------------------- Override: gerador inteligente --------------------
async function gerarSimuladoPeloBancoQuestoes() {
  if (!podeGerenciarQuestoes()) return alert("Apenas ADM, Monitor e Professor/Orientador podem gerar simulados pelo banco de questões.");
  const total = Math.max(1, Number(document.getElementById("gerSimQtd")?.value || 10));
  atualizarDistribuicaoGeradorSimulado();
  const dist = distribuicaoGeradorSimulado();
  const soma = Object.values(dist).reduce((a,b)=>a+b,0);
  if (soma > total) return alert("A distribuição por dificuldade não pode ultrapassar o total de questões.");
  const disciplinas = selecionadosMult("gerSimDisciplina");
  const niveis = selecionadosMult("gerSimNivel");
  const temas = selecionadosMult("gerSimTemas").filter(v=>v!=="TODOS");
  const subtemas = selecionadosMult("gerSimSubtemas").filter(v=>v!=="TODOS");
  let base = getStorage("app_questoes", []).filter(q => {
    if (!disciplinas.includes("TODOS") && !disciplinas.includes(q.disciplina)) return false;
    if (!niveis.includes("TODOS") && !niveis.includes(q.nivel)) return false;
    if (temas.length && !temas.includes(q.tema)) return false;
    if (subtemas.length && !subtemas.includes(q.subtema)) return false;
    return true;
  });
  if (!base.length) return alert("Nenhuma questão encontrada com esses filtros.");
  base = base.sort(() => Math.random() - 0.5);
  const escolhidas = [];
  const usados = new Set();
  function pegarPorDificuldade(dif, qtd) {
    let candidatas = base.filter(q => !usados.has(q.id) && q.dificuldade === dif);
    if (candidatas.length < qtd) {
      dificuldadeProxima(dif).forEach(d2 => { if (candidatas.length < qtd) candidatas.push(...base.filter(q => !usados.has(q.id) && q.dificuldade === d2)); });
    }
    candidatas.slice(0, qtd).forEach(q => { if (!usados.has(q.id)) { usados.add(q.id); escolhidas.push(q); } });
  }
  Object.entries(dist).forEach(([dif,qtd]) => { if (qtd) pegarPorDificuldade(dif,qtd); });
  if (escolhidas.length < total) base.forEach(q => { if (escolhidas.length < total && !usados.has(q.id)) { usados.add(q.id); escolhidas.push(q); } });
  if (!escolhidas.length) return alert("Não foi possível montar o simulado com os filtros selecionados.");
  const horas = Math.max(0, Number(document.getElementById("gerSimHoras")?.value || 0));
  const minutos = Math.max(0, Number(document.getElementById("gerSimMinutos")?.value || 0));
  const sim = {
    id: novoId(),
    titulo: document.getElementById("gerSimTitulo")?.value.trim() || `Simulado gerado — ${new Date().toLocaleDateString("pt-BR")}`,
    disciplina: disciplinas.includes("TODOS") ? "Geral" : disciplinas.join(", "), nivel: niveis.includes("TODOS") ? "Geral" : niveis.join(", "),
    formato: document.getElementById("gerSimFormato")?.value || "objetivo",
    dataFim: document.getElementById("gerSimPrazo")?.value || "", horaFim: "23:59",
    duracaoMinutos: horas * 60 + minutos, duracao: horas || minutos ? `${horas}h ${minutos}min` : "Sem limite definido",
    quantidadeQuestoes: escolhidas.length, publico: !!document.getElementById("gerSimPublico")?.checked,
    geradoDoBanco: true,
    questoesBanco: escolhidas.map((q, i) => ({ numero: i + 1, questaoId: q.id, titulo: q.titulo, disciplina: q.disciplina, nivel: q.nivel, tema: q.tema, subtema: q.subtema, dificuldade: q.dificuldade, tipo: q.tipo, fonte: q.fonte, ano: q.ano, enunciado: q.enunciado, arquivos: q.arquivos || [], alternativaCorreta: q.alternativaCorreta || "" })),
    gabaritoObjetivo: escolhidas.map((q, i) => ({ numero: i + 1, resposta: String(q.alternativaCorreta || "").toUpperCase() })).filter(g => g.resposta),
    gabarito: "Simulado gerado a partir do Banco de Questões.", descricao: "Leia cada questão no ambiente cronometrado e preencha o cartão-resposta. O gabarito/resolução só será liberado após o prazo final.", destino: { tipo: "todos", valores: [] },
    criadoEm: Date.now(), criadoPorId: usuarioLogado?.id || usuarioLogado?.authUid || "", criadoPorNome: usuarioLogado?.nome || "", criadoPorNivel: usuarioLogado?.nivel || ""
  };
  const lista = getStorage("app_simulados", []); lista.push(sim); await setStorage("app_simulados", lista);
  document.getElementById("gerSimResumo").innerHTML = `<span class="text-emerald-300 font-bold">Simulado criado com ${escolhidas.length} questões.</span>` + (sim.publico ? `<br><span class="text-purple-200">Link público: ${location.origin + location.pathname}?simuladoPublico=${sim.id}&ano=${anoDadosAtivo}</span>` : "");
  renderizarSimulados(); atualizarSelectRankingSimulados();
  alert("Simulado criado a partir do Banco de Questões.");
}

// -------------------- Banco de questões: moderação e soluções elaboradas --------------------
const __salvarNovaQuestao = window.salvarNovaQuestao;
window.salvarNovaQuestao = async function(event) {
  const textos = ["questaoTitulo", "questaoTema", "questaoSubtema", "questaoFonte", "questaoTags", "questaoEnunciado", "questaoSolucaoTexto"].map(id=>document.getElementById(id)?.value || "");
  if (!validarConteudoEducacionalIA(textos, "questão/solução")) { event.preventDefault(); return; }
  return __salvarNovaQuestao ? __salvarNovaQuestao(event) : undefined;
};
const __salvarNovoMaterial = window.salvarNovoMaterial;
window.salvarNovoMaterial = async function(event) {
  const textos = ["matTitulo", "matDescricao", "matUrl", "matSolucaoUrl"].map(id=>document.getElementById(id)?.value || "");
  if (!validarConteudoEducacionalIA(textos, "material")) { event.preventDefault(); return; }
  return __salvarNovoMaterial ? __salvarNovoMaterial(event) : undefined;
};
const __publicarInteracaoMaterial = window.publicarInteracaoMaterial;
window.publicarInteracaoMaterial = async function(materialId, event) {
  const texto = document.getElementById(`interacaoTexto_${materialId}`)?.value || "";
  if (!validarConteudoEducacionalIA(texto, "comentário/interação")) { event.preventDefault(); return; }
  return __publicarInteracaoMaterial ? __publicarInteracaoMaterial(materialId, event) : undefined;
};

async function adicionarSolucaoQuestao(questaoId) {
  if (!podeGerenciarQuestoes()) return alert("Sem permissão para adicionar solução.");
  const texto = prompt("Digite a solução/comentário pedagógico. Você também pode informar um link de vídeo curto no começo ou fim do texto.");
  if (texto === null) return;
  if (!validarConteudoEducacionalIA(texto, "solução")) return;
  const linkVideo = (texto.match(/https?:\/\/\S+/i) || [""])[0];
  const lista = getStorage("app_questoes", []);
  const idx = lista.findIndex(q => String(q.id) === String(questaoId));
  if (idx < 0) return alert("Questão não encontrada.");
  lista[idx].solucoes = Array.isArray(lista[idx].solucoes) ? lista[idx].solucoes : [];
  lista[idx].solucoes.push({ id: novoId(), texto: texto.trim(), videoUrl: linkVideo, arquivos: [], tipo: linkVideo ? "Solução em texto/vídeo" : "Solução complementar", criadaEm: Date.now(), criadaPorId: usuarioLogado?.id || usuarioLogado?.authUid || "", criadaPorNome: usuarioLogado?.nome || "", criadaPorNivel: usuarioLogado?.nivel || "" });
  await setStorage("app_questoes", lista);
  renderizarBancoQuestoes();
}

// -------------------- Relatórios: gráficos e peça --------------------
let chartRelEvolucaoInst = null;
let chartRelRankingInst = null;
function desenharGraficosRelatorios() {
  try {
    const evol = Array.from(document.querySelectorAll("#tableRelEvolucao tr")).map(tr => Array.from(tr.children).map(td => td.innerText.trim())).filter(r=>r.length>=2);
    const cidades = Array.from(document.querySelectorAll("#tableRelCidades tr")).map(tr => Array.from(tr.children).map(td => td.innerText.trim())).filter(r=>r.length>=2).slice(0,8);
    const c1 = document.getElementById("chartRelEvolucao");
    const c2 = document.getElementById("chartRelRanking");
    if (c1 && typeof Chart !== "undefined") {
      if (chartRelEvolucaoInst) chartRelEvolucaoInst.destroy();
      chartRelEvolucaoInst = new Chart(c1, { type: "line", data: { labels: evol.map(r=>r[0]), datasets: [{ label: "Medalhas", data: evol.map(r=>Number(String(r[1]).replace(/\D/g,""))||0), tension: .25 }] }, options: { responsive: true, plugins:{legend:{display:false}} } });
    }
    if (c2 && typeof Chart !== "undefined") {
      if (chartRelRankingInst) chartRelRankingInst.destroy();
      chartRelRankingInst = new Chart(c2, { type: "bar", data: { labels: cidades.map(r=>r[0]), datasets: [{ label: "Total", data: cidades.map(r=>Number(String(r[1]).replace(/\D/g,""))||0) }] }, options: { responsive: true, plugins:{legend:{display:false}} } });
    }
  } catch(e) { console.warn("Não foi possível desenhar gráficos", e); }
}
const __gerarRelatoriosComparativos = window.gerarRelatoriosComparativos;
window.gerarRelatoriosComparativos = async function() { const r = await __gerarRelatoriosComparativos?.(); setTimeout(desenharGraficosRelatorios, 100); return r; };
const __renderizarPreviewRelatorioCriativo = window.renderizarPreviewRelatorioCriativo;
window.renderizarPreviewRelatorioCriativo = function(rel) {
  __renderizarPreviewRelatorioCriativo?.(rel);
  const alvo = document.getElementById("relPreviewCriativo");
  if (alvo && rel) {
    const box = document.createElement("div");
    box.className = "grid grid-cols-1 lg:grid-cols-2 gap-4";
    box.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-4"><h3 class="text-xs font-black uppercase text-gray-300 mb-3">Gráfico da peça — Indicadores</h3><canvas id="chartPecaCards"></canvas></div><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4"><h3 class="text-xs font-black uppercase text-gray-300 mb-3">Como usar a peça</h3><p class="text-sm text-gray-300 leading-relaxed">“Gerar peça” monta uma versão narrativa e apresentável do relatório, com tom institucional, pedagógico ou executivo. Depois você pode exportar em PDF, DOCX ou Excel.</p></div>`;
    alvo.prepend(box);
    setTimeout(()=>{ const c=document.getElementById("chartPecaCards"); if(c && typeof Chart!=="undefined") new Chart(c,{type:"bar",data:{labels:(rel.cards||[]).map(x=>x.nome),datasets:[{label:"Indicadores",data:(rel.cards||[]).map(x=>Number(String(x.valor).replace(/[^0-9.-]/g,""))||0)}]},options:{plugins:{legend:{display:false}}}});},50);
  }
};

// -------------------- Público visitante --------------------
async function carregarSimuladoPublicoPorId(id, ano) {
  initFirebase();
  const ref = firebaseFirestore.collection(`anos/${ano || anoDadosAtivo}/sistema_simulados`).doc(String(id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Simulado público não encontrado.");
  const sim = { id: snap.id, ...snap.data() };
  if (!sim.publico) throw new Error("Este simulado não está liberado por link público.");
  return sim;
}
function renderGradeRespostaPublica(sim) {
  const total = Number(sim.quantidadeQuestoes || sim.gabaritoObjetivo?.length || sim.questoesBanco?.length || 0);
  if (!total) return "";
  return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">${Array.from({length: total},(_,i)=>`<div class="rounded-xl bg-gray-900 border border-gray-700 p-2"><p class="text-[10px] text-gray-500 font-bold uppercase mb-1">Questão ${i+1}</p><div class="flex gap-1">${["A","B","C","D","E"].map(a=>`<label class="flex-1 text-center text-xs bg-gray-950 rounded-lg py-1 cursor-pointer"><input type="radio" name="pub_q_${i+1}" value="${a}" class="hidden peer"><span class="peer-checked:text-emerald-300 peer-checked:font-black">${a}</span></label>`).join("")}</div></div>`).join("")}</div>`;
}
async function abrirSimuladoPublico() {
  const params = new URLSearchParams(location.search);
  const id = params.get("simuladoPublico");
  if (!id) return;
  try {
    const ano = params.get("ano") || String(new Date().getFullYear());
    const sim = await carregarSimuladoPublicoPorId(id, ano);
    document.getElementById("loginScreen")?.classList.add("hidden");
    const ov = document.getElementById("simuladoPublicoOverlay");
    const box = document.getElementById("simuladoPublicoConteudo");
    if (!ov || !box) return;
    ov.classList.remove("hidden");
    box.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl space-y-5"><div><p class="text-xs text-purple-300 font-black uppercase tracking-wider">Simulado público</p><h1 class="text-2xl font-black text-white mt-1">${textoSeguro(sim.titulo)}</h1><p class="text-sm text-gray-400 mt-2">Preencha seus dados para iniciar como visitante. Suas informações ficarão disponíveis para contato pedagógico.</p></div><div id="pubDados" class="grid grid-cols-1 md:grid-cols-4 gap-3"><input id="pubNome" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Nome completo" required><input id="pubEmail" type="email" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="E-mail" required><input id="pubCidade" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Cidade"><input id="pubWhatsapp" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="WhatsApp"></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4">${renderizarQuestoesDoSimuladoSeguro(sim) || (sim.arquivoUrl ? `<iframe src="${sim.arquivoUrl}#toolbar=0&navpanes=0" class="w-full h-[75vh] rounded-xl bg-black"></iframe>` : "")}</div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><h3 class="text-sm font-bold text-white uppercase mb-3">Cartão-resposta</h3>${renderGradeRespostaPublica(sim)}<textarea id="pubTexto" rows="4" class="w-full mt-4 p-3 rounded-xl bg-gray-950 border border-gray-700 text-gray-200" placeholder="Resposta textual / observações"></textarea></div><button onclick="enviarSimuladoPublico('${sim.id}','${ano}')" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase">Enviar simulado</button></div>`;
  } catch(e) { alert(e.message || e); }
}
async function enviarSimuladoPublico(simuladoId, ano) {
  const nome = document.getElementById("pubNome")?.value.trim();
  const email = document.getElementById("pubEmail")?.value.trim();
  if (!nome || !email) return alert("Informe nome e e-mail.");
  if (!validarConteudoEducacionalIA([nome, email, document.getElementById("pubTexto")?.value], "envio público")) return;
  const respostas = {};
  document.querySelectorAll('[name^="pub_q_"]:checked').forEach(inp => { respostas[inp.name.replace("pub_q_","")] = inp.value; });
  const doc = { id: `${simuladoId}_visitante_${Date.now()}`, simuladoId, publico: true, visitante: true, nome, email, cidade: document.getElementById("pubCidade")?.value.trim() || "", whatsapp: document.getElementById("pubWhatsapp")?.value.trim() || "", respostasObjetivas: respostas, texto: document.getElementById("pubTexto")?.value.trim() || "", enviadoEm: Date.now(), status: "visitante_enviado" };
  await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_envios`).doc(doc.id).set(doc);
  await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_leads`).doc(doc.id).set(doc);
  alert("Simulado enviado com sucesso. Obrigado pela participação!");
}

// -------------------- Inicializações do patch --------------------
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { popularTaxonomiaQuestoes(); atualizarDistribuicaoGeradorSimulado(); abrirSimuladoPublico(); }, 1200);
});

// ==================== EXPORTAÇÕES EXCEL OPERACIONAIS (RESULTADOS / CALENDÁRIO / OLIMPÍADAS) ====================
function nivelPodeExportarExcelOperacional() {
    return ["ADM", "Staff", "Gestor", "Escola"].includes(usuarioLogado?.nivel);
}

function bloquearExportacaoExcelSeNecessario() {
    if (nivelPodeExportarExcelOperacional()) return false;
    alert("Exportação em Excel disponível apenas para ADM, Staff, Gestor e Escola.");
    return true;
}

function nomeArquivoSeguro(nome) {
    return String(nome || "relatorio")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
}

function exportarLinhasParaExcel(nomeArquivo, nomeAba, colunas, linhas) {
    if (bloquearExportacaoExcelSeNecessario()) return;
    if (typeof XLSX === "undefined") {
        alert("Biblioteca XLSX não carregada. Atualize a página e tente novamente.");
        return;
    }
    const dados = [colunas.map(c => c.titulo)];
    linhas.forEach(item => dados.push(colunas.map(c => {
        const valor = typeof c.valor === "function" ? c.valor(item) : item[c.valor];
        if (Array.isArray(valor)) return valor.join(", ");
        return valor ?? "";
    })));

    const ws = XLSX.utils.aoa_to_sheet(dados);
    ws["!cols"] = colunas.map(c => ({ wch: c.largura || Math.max(12, String(c.titulo).length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomeAba.substring(0, 31));

    const data = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${nomeArquivoSeguro(nomeArquivo)}_${anoDadosAtivo || "ano"}_${data}.xlsx`);
}

function resultadosFiltradosAtuaisParaExportacao() {
    const nFiltro = document.getElementById("filterResultadoNome")?.value?.trim().toLowerCase() || "";
    const cFiltro = document.getElementById("filterResultadoCidade")?.value || "TODOS";
    const eFiltro = document.getElementById("filterResultadoEscola")?.value || "TODOS";
    const pFiltro = document.getElementById("filterResultadoPremio")?.value || "TODOS";
    return (dadosTrabalho || []).filter(r => {
        const porMuni = resultadoDentroDoEscopoResultadosUsuario(r);
        const porNome = !nFiltro || normalizarTexto(r.aluno).includes(nFiltro);
        const porCidade = cFiltro === "TODOS" || normalizarTexto(r.municipio) === normalizarTexto(cFiltro);
        const porEscola = eFiltro === "TODOS" || normalizarTexto(r.escola) === normalizarTexto(eFiltro);
        const porPremio = pFiltro === "TODOS" || normalizarTexto(r.premio) === normalizarTexto(pFiltro);
        return porMuni && porNome && porCidade && porEscola && porPremio;
    });
}

function exportarResultadosFiltradosExcel() {
    const linhas = resultadosFiltradosAtuaisParaExportacao();
    if (!linhas.length) return alert("Não há resultados exibidos para exportar.");
    exportarLinhasParaExcel("resultados_filtrados", "Resultados", [
        { titulo: "Aluno", valor: r => r.aluno, largura: 28 },
        { titulo: "CPF", valor: r => r.alunoCpf || "", largura: 16 },
        { titulo: "Escola", valor: r => r.escola, largura: 28 },
        { titulo: "Cidade", valor: r => r.municipio, largura: 22 },
        { titulo: "Série", valor: r => r.serie || "", largura: 15 },
        { titulo: "Olimpíada", valor: r => r.olimpiada, largura: 34 },
        { titulo: "Prêmio", valor: r => r.premio, largura: 16 },
        { titulo: "Observação", valor: r => r.observacao || "", largura: 45 },
        { titulo: "Certificado", valor: r => r.certificadoUrl || "", largura: 45 }
    ], linhas);
}

function cronogramaFiltradoAtualParaExportacao() {
    const cronograma = getStorage("app_cronograma");
    const filtroGrupo = document.getElementById("filterCronogramaGrupoEtapa")?.value || "TODOS";
    const filtroEtapa = document.getElementById("filterCronogramaEtapa")?.value || "TODOS";
    const filtroOlimpiada = document.getElementById("filterCronogramaOlimpiada")?.value || "TODOS";
    const filtroMes = document.getElementById("filterCronogramaMes")?.value || "TODOS";
    return ordenarCronogramaPorModo(cronograma.filter(c => {
        const info = normalizarEtapaCronograma(c.etapa);
        const porGrupo = filtroGrupo === "TODOS" ||
            (filtroGrupo === "NAO_PADRONIZADA" ? !info.padronizada : info.etapaGrupo === filtroGrupo);
        const porEtapa = filtroEtapa === "TODOS" || normalizarTexto(info.etapa) === normalizarTexto(filtroEtapa);
        const porOlimpiada = filtroOlimpiada === "TODOS" || String(c.olimpiadaId) === String(filtroOlimpiada);
        const porMes = cronogramaEventoNoMes(c, filtroMes);
        return porGrupo && porEtapa && porOlimpiada && porMes;
    }));
}

function exportarCalendarioFiltradoExcel() {
    const olimpiadas = getStorage("app_olimpiadas");
    const linhas = cronogramaFiltradoAtualParaExportacao().map(c => {
        const oli = olimpiadas.find(o => String(o.id) === String(c.olimpiadaId));
        const etapaInfo = normalizarEtapaCronograma(c.etapa);
        const temporal = classificarTemporalCronograma(c);
        return { ...c, olimpiadaNome: oli?.nome || "Desconhecida", etapaNome: etapaInfo.etapa, etapaGrupoNome: etapaInfo.etapaGrupoNome || "", periodo: formatarPeriodoCronograma(c), statusTemporal: temporal.label };
    });
    if (!linhas.length) return alert("Não há eventos exibidos para exportar.");
    exportarLinhasParaExcel("calendario_olimpico_filtrado", "Calendário", [
        { titulo: "Olimpíada", valor: r => r.olimpiadaNome, largura: 36 },
        { titulo: "Etapa", valor: r => r.etapaNome, largura: 30 },
        { titulo: "Grupo da etapa", valor: r => r.etapaGrupoNome, largura: 34 },
        { titulo: "Período", valor: r => r.periodo, largura: 22 },
        { titulo: "Status temporal", valor: r => r.statusTemporal, largura: 25 },
        { titulo: "Séries/Público", valor: r => r.segmento || "", largura: 24 },
        { titulo: "Diretriz operacional", valor: r => r.acao || "", largura: 55 }
    ], linhas);
}

function exportarOlimpiadasExibidasExcel() {
    const linhas = getStorage("app_olimpiadas");
    if (!linhas.length) return alert("Não há olimpíadas exibidas para exportar.");
    exportarLinhasParaExcel("olimpiadas_exibidas", "Olimpíadas", [
        { titulo: "ID", valor: r => r.id, largura: 12 },
        { titulo: "Nome", valor: r => r.nome, largura: 42 },
        { titulo: "Sigla / Frente", valor: r => r.categoria || r.sigla || "", largura: 18 },
        { titulo: "Séries", valor: r => r.series || r.seriesAtendidas || "", largura: 34 },
        { titulo: "Ano referência", valor: r => r.anoReferencia || "", largura: 18 },
        { titulo: "Área(s)", valor: r => r.areas || r.area || "", largura: 30 },
        { titulo: "Abrangência", valor: r => r.abrangencia || "", largura: 22 },
        { titulo: "Status", valor: r => r.status || "", largura: 18 },
        { titulo: "Site", valor: r => r.siteOficial || "", largura: 38 },
        { titulo: "Instagram", valor: r => r.instagramOficial || "", largura: 28 }
    ], linhas);
}

window.exportarResultadosFiltradosExcel = exportarResultadosFiltradosExcel;
window.exportarCalendarioFiltradoExcel = exportarCalendarioFiltradoExcel;
window.exportarOlimpiadasExibidasExcel = exportarOlimpiadasExibidasExcel;


// ==================== PATCH FINAL — SIMULADOS: CONTEXTO, PÚBLICO, EDIÇÃO E JANELA 6H ====================
function niveisGestoresSimulados() {
    return ["ADM", "Staff", "Monitor", "Professor/Orientador"];
}

function podeGerenciarSimulados() {
    return niveisGestoresSimulados().includes(usuarioLogado?.nivel);
}

function dataInicioSimuladoComoData(sim) {
    const data = String(sim?.dataAbertura || "").trim();
    if (!data) return null;
    const hora = String(sim?.horaAbertura || "00:00").trim() || "00:00";
    const d = new Date(`${data}T${hora}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function dataFimSimuladoComoData(sim) {
    const data = String(sim?.dataFim || "").trim();
    if (!data) return null;
    const hora = String(sim?.horaFim || "23:59").trim() || "23:59";
    const d = new Date(`${data}T${hora}:59`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function simuladoAindaNaoAbriu(sim) {
    const inicio = dataInicioSimuladoComoData(sim);
    return !!inicio && Date.now() < inicio.getTime();
}

function simuladoPrazoEncerrado(sim) {
    const fim = dataFimSimuladoComoData(sim);
    return !!fim && Date.now() > fim.getTime();
}

function simuladoDentroDaJanelaSeisHoras(sim) {
    const inicio = dataInicioSimuladoComoData(sim);
    if (!inicio) return true;
    return Date.now() >= inicio.getTime() - (6 * 60 * 60 * 1000);
}

function textoPrazoSimulado(sim) {
    const inicio = dataInicioSimuladoComoData(sim);
    const fim = dataFimSimuladoComoData(sim);
    if (inicio && Date.now() < inicio.getTime()) {
        const diff = inicio.getTime() - Date.now();
        const horas = Math.ceil(diff / (60 * 60 * 1000));
        return `Abre em ${inicio.toLocaleString("pt-BR")} · faltam ${horas}h`;
    }
    if (fim && Date.now() > fim.getTime()) return `Prazo encerrado em ${fim.toLocaleString("pt-BR")}`;
    if (fim) return `Prazo: ${fim.toLocaleString("pt-BR")}`;
    return "Sem prazo definido";
}

function minutosDuracaoSimulado(sim) {
    if (Number(sim?.duracaoMinutos) > 0) return Number(sim.duracaoMinutos);
    const raw = String(sim?.duracao || "").toLowerCase().trim();
    if (!raw || raw.includes("sem limite")) return 0;
    const h = raw.match(/(\d+)\s*h/);
    const m = raw.match(/(\d+)\s*min/);
    return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

function simuladoDestinadoAoUsuario(sim) {
    if (!usuarioLogado) return false;
    if (podeGerenciarSimulados() || usuarioLogado.nivel === "Visualizador") return true;
    if (!simuladoDentroDaJanelaSeisHoras(sim)) return false;
    const destino = sim.destino || { tipo: "todos", valores: [] };
    if (!destino.tipo || destino.tipo === "todos") return true;
    const valores = (destino.valores || []).map(String);
    const escolas = getStorage("app_escolas", []);
    const aluno = alunoDoUsuarioLogado();
    const escolaAluno = aluno ? escolas.find(e => e.id === aluno.escolaId || e.nome === aluno.escola) : null;
    if (destino.tipo === "nivel") return valores.includes(sim.nivel) || valores.includes(aluno?.nivel) || valores.includes(aluno?.serie) || valores.includes(usuarioLogado.nivel);
    if (destino.tipo === "cidade") {
        const cidadeId = usuarioLogado.cidadeId || escolaAluno?.cidadeId || getEscolaVinculadaUsuario()?.cidadeId;
        return valores.includes(String(cidadeId));
    }
    if (destino.tipo === "escola") {
        const escolaId = usuarioLogado.vinculoId || aluno?.escolaId || escolaAluno?.id;
        return valores.includes(String(escolaId));
    }
    if (destino.tipo === "aluno") return !!aluno && valores.includes(String(aluno.id));
    return true;
}

function podeIniciarSimulado(sim) {
    if (podeGerenciarSimulados()) return true;
    if (!simuladoDentroDaJanelaSeisHoras(sim)) return false;
    if (simuladoAindaNaoAbriu(sim)) return false;
    if (simuladoPrazoEncerrado(sim)) return false;
    const envio = envioSimuladoUsuario(sim);
    return !(envio && envio.status === "encerrado");
}

function linkPublicoSimulado(sim) {
    return `${location.origin}${location.pathname}?simuladoPublico=${encodeURIComponent(sim.id)}&ano=${encodeURIComponent(anoDadosAtivo || new Date().getFullYear())}`;
}

async function copiarLinkSimuladoPublico(id) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(id));
    if (!sim) return alert("Simulado não encontrado.");
    const link = linkPublicoSimulado(sim);
    try {
        await navigator.clipboard.writeText(link);
        alert("Link público copiado para a área de transferência.");
    } catch (_) {
        prompt("Copie o link público:", link);
    }
}

function abrirLinkPublicoSimulado(id) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(id));
    if (!sim) return alert("Simulado não encontrado.");
    window.open(linkPublicoSimulado(sim), "_blank");
}

function atualizarQuestaoManualTipo(sel) {
    const box = sel?.closest?.(".sim-questao-manual");
    if (!box) return;
    const tipo = String(sel.value || "").toLowerCase();
    const gab = box.querySelector('[data-campo="alternativaCorreta"]');
    const gabWrap = box.querySelector('[data-wrap="gabaritoManual"]');
    const dis = tipo.includes("dissertativa");
    if (gabWrap) gabWrap.classList.toggle("hidden", dis);
    if (gab && dis) gab.value = "";
}

function adicionarQuestaoManualSimulado(dados = {}) {
    const lista = document.getElementById("simQuestoesManuaisLista");
    if (!lista) return;
    const n = lista.querySelectorAll(".sim-questao-manual").length + 1;
    const wrap = document.createElement("div");
    wrap.className = "sim-questao-manual rounded-xl border border-blue-900/40 bg-gray-900/60 p-3 space-y-2";
    wrap.innerHTML = `
        <div class="flex items-center justify-between gap-2"><span class="text-xs font-black text-blue-200 uppercase">Questão manual ${n}</span><button type="button" onclick="this.closest('.sim-questao-manual').remove()" class="text-red-300 text-xs font-bold">Remover</button></div>
        <textarea data-campo="enunciado" rows="3" class="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200" placeholder="Enunciado da questão...">${textoSeguro(dados.enunciado||"")}</textarea>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select data-campo="tipo" onchange="atualizarQuestaoManualTipo(this)" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option>Múltipla escolha</option><option>Dissertativa</option><option>Mista</option><option>Verdadeiro ou Falso</option></select>
          <select data-campo="dificuldade" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option>Fácil</option><option>Médio</option><option>Difícil</option><option>Muito difícil</option><option>Olímpica</option><option>Vestibular</option></select>
          <div data-wrap="gabaritoManual"><select data-campo="alternativaCorreta" class="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option value="">Sem gabarito</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select></div>
          <input data-campo="tema" list="listaTemasQuestoes" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200" placeholder="Tema">
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input type="file" data-campo="arquivoQuestao" accept="image/*,.pdf,.doc,.docx" class="w-full p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300">
          <p class="text-[10px] text-gray-500 self-center">Opcional: anexe imagem/PDF da questão. Para questão dissertativa, o aluno poderá anexar foto/PDF da resolução no ambiente da prova.</p>
        </div>`;
    lista.appendChild(wrap);
    wrap.querySelector('[data-campo="tipo"]').value = dados.tipo || "Múltipla escolha";
    wrap.querySelector('[data-campo="dificuldade"]').value = dados.dificuldade || "Médio";
    wrap.querySelector('[data-campo="alternativaCorreta"]').value = dados.alternativaCorreta || "";
    wrap.querySelector('[data-campo="tema"]').value = dados.tema || "";
    if (Array.isArray(dados.arquivos) && dados.arquivos.length) wrap.dataset.arquivos = JSON.stringify(dados.arquivos);
    atualizarQuestaoManualTipo(wrap.querySelector('[data-campo="tipo"]'));
}

function lerQuestoesManuaisSimulado() {
    return Array.from(document.querySelectorAll("#simQuestoesManuaisLista .sim-questao-manual")).map((el, idx) => ({
        numero: idx + 1,
        questaoId: `manual_${idx+1}`,
        titulo: `Questão ${idx+1}`,
        enunciado: el.querySelector('[data-campo="enunciado"]')?.value?.trim() || "",
        tipo: el.querySelector('[data-campo="tipo"]')?.value || "Múltipla escolha",
        dificuldade: el.querySelector('[data-campo="dificuldade"]')?.value || "Médio",
        tema: el.querySelector('[data-campo="tema"]')?.value || "",
        alternativaCorreta: String(el.querySelector('[data-campo="tipo"]')?.value || "").toLowerCase().includes("dissertativa") ? "" : (el.querySelector('[data-campo="alternativaCorreta"]')?.value || ""),
        arquivos: el.dataset.arquivos ? JSON.parse(el.dataset.arquivos) : [],
        _fileInput: el.querySelector('[data-campo="arquivoQuestao"]')
    })).filter(q => q.enunciado);
}

async function lerQuestoesManuaisSimuladoComUploads() {
    const qs = lerQuestoesManuaisSimulado();
    for (const q of qs) {
        const file = q._fileInput?.files?.[0] || null;
        delete q._fileInput;
        if (file) {
            const up = await enviarArquivoParaFirebaseStorage(file, "simulados_questoes");
            q.arquivos = [...(q.arquivos || []), { nome: up.fileName, url: up.fileUrl, storagePath: up.storagePath, mimeType: up.mimeType, tipo: "anexo" }];
        }
    }
    return qs;
}

function renderizarQuestoesDoSimuladoSeguro(sim) {
    const qs = Array.isArray(sim.questoesBanco) ? sim.questoesBanco : [];
    if (!qs.length) return "";
    return `<div class="simulado-secure-area space-y-4">${qs.map(q => `<div class="rounded-2xl bg-gray-950/60 border border-gray-700 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><h4 class="text-sm font-black text-white">Questão ${q.numero}</h4><span class="text-[10px] text-gray-500 uppercase font-bold">${textoSeguro([q.disciplina, q.tema, q.dificuldade, q.tipo].filter(Boolean).join(" · "))}</span></div><p class="text-sm text-gray-300 whitespace-pre-wrap mt-3 leading-relaxed">${textoSeguro(q.enunciado || q.titulo || "")}</p>${renderArquivoLinks(q.arquivos)}</div>`).join("")}</div>`;
}

function prepararEdicaoSimulado(id) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(id));
    if (!sim) return alert("Simulado não encontrado.");
    const form = document.getElementById("formCadSimulado");
    if (!form) return alert("Formulário de simulado não encontrado.");
    let hidden = document.getElementById("simEditId");
    if (!hidden) { hidden = document.createElement("input"); hidden.type = "hidden"; hidden.id = "simEditId"; form.appendChild(hidden); }
    hidden.value = sim.id;
    const set = (idCampo, valor) => { const el = document.getElementById(idCampo); if (el) el.value = valor || ""; };
    set("simTitulo", sim.titulo); set("simDisciplina", sim.disciplina); set("simNivel", sim.nivel); set("simFormato", sim.formato); set("simDataAbertura", sim.dataAbertura); set("simHoraAbertura", sim.horaAbertura); set("simDataFim", sim.dataFim); set("simHoraFim", sim.horaFim); set("simDescricao", sim.descricao); set("simGabarito", sim.gabarito); set("simSolucaoUrl", sim.solucaoUrl);
    const horas = Math.floor(Number(sim.duracaoMinutos || 0) / 60); const minutos = Number(sim.duracaoMinutos || 0) % 60;
    set("simDuracaoHoras", horas); set("simDuracaoMinutos", minutos);
    const publico = document.getElementById("simPublico"); if (publico) publico.checked = !!sim.publico;
    const qtd = document.getElementById("simQtdQuestoes"); if (qtd) qtd.value = sim.quantidadeQuestoes || sim.gabaritoObjetivo?.length || 20;
    const lista = document.getElementById("simQuestoesManuaisLista"); if (lista) { lista.innerHTML = ""; (sim.questoesBanco || []).filter(q => String(q.questaoId||"").startsWith("manual_")).forEach(q => adicionarQuestaoManualSimulado(q)); }
    if (Array.isArray(sim.gabaritoObjetivo) && sim.gabaritoObjetivo.length) { gerarCamposGabaritoSimulado(false); setTimeout(()=>sim.gabaritoObjetivo.forEach(g=>{ const el=document.querySelector(`#simGabaritoObjetivoGrid select[data-q="${g.numero}"]`); if(el) el.value=g.resposta; }),50); }
    atualizarDestinoSimulado(); ajustarCamposSimulado();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    alert("Simulado carregado para edição. Faça os ajustes e clique em Publicar/Salvar Simulado.");
}

function previsualizarSimulado(id) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(id));
    if (!sim) return alert("Simulado não encontrado.");
    simuladoSessaoAtual = { simuladoId: String(id), iniciado: false, inicio: null, limiteMs: minutosDuracaoSimulado(sim) * 60 * 1000, preview: true };
    renderizarAmbienteSimulado();
    document.getElementById("simuladoAmbienteOverlay")?.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function finalizarSimuladoPodeProsseguir(sim, automatico) {
    if (automatico || simuladoSessaoAtual?.preview) return true;
    const respostasObjetivas = lerRespostaObjetivaAmbiente();
    const totalObj = Array.isArray(sim.gabaritoObjetivo) ? sim.gabaritoObjetivo.length : 0;
    const texto = document.getElementById("simAmbTexto")?.value?.trim() || "";
    const arquivo = document.getElementById("simAmbArquivo")?.files?.[0] || null;
    const faltas = [];
    if (["objetivo", "misto"].includes(String(sim.formato || "").toLowerCase()) && totalObj && respostasObjetivas.length < totalObj) faltas.push(`${totalObj - respostasObjetivas.length} questão(ões) objetiva(s)`);
    if (["dissertativo", "misto"].includes(String(sim.formato || "").toLowerCase()) && !texto && !arquivo) faltas.push("resposta/anexo dissertativo");
    if (faltas.length) return confirm(`Ainda falta(m): ${faltas.join(", ")}.

Deseja concluir mesmo assim?`);
    return true;
}

async function finalizarSimuladoAmbiente(automatico = false, motivo = "finalizado") {
    if (!simuladoSessaoAtual || simuladoEnvioEmAndamento) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    if (simuladoSessaoAtual.preview) { limparAmbienteSimulado(); alert("Pré-visualização encerrada. Nenhum envio foi registrado."); return; }
    if (!finalizarSimuladoPodeProsseguir(sim, automatico)) return;
    simuladoEnvioEmAndamento = true;
    try {
        const uid = String(usuarioLogado.authUid || usuarioLogado.id);
        const respostasObjetivas = lerRespostaObjetivaAmbiente();
        const texto = document.getElementById("simAmbTexto")?.value?.trim() || "";
        const arquivo = document.getElementById("simAmbArquivo")?.files?.[0] || null;
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostasObjetivas);
        const alunoAtual = alunoDoUsuarioLogado();
        const envioAnterior = envioSimuladoUsuario(sim);
        const inicio = simuladoSessaoAtual.inicio || Date.now();
        const envio = { id: `${sim.id}_${uid}`, simuladoId: sim.id, simuladoTitulo: sim.titulo || "", publico: false, visitante: false, usuarioId: uid, usuarioNome: usuarioLogado.nome, usuarioNivel: usuarioLogado.nivel, alunoId: usuarioLogado.alunoId || alunoAtual?.id || "", alunoNome: alunoAtual?.nome || usuarioLogado.nome || "", escolaId: alunoAtual?.escolaId || usuarioLogado.vinculoId || "", escolaNome: alunoAtual?.escola || getEscolaVinculadaUsuario()?.nome || "", cidade: alunoAtual?.cidade || "", email: usuarioLogado.emailAuth || usuarioLogado.email || alunoAtual?.emailInstitucional || alunoAtual?.emailPessoal || "", whatsapp: alunoAtual?.contato || alunoAtual?.telefone || "", respostasObjetivas, texto, acertos: correcao.acertos, totalObjetivas: correcao.total, respondidasObjetivas: correcao.respondidas, percentual: correcao.percentual, iniciadoEm: envioAnterior?.iniciadoEm || inicio, enviadoEm: Date.now(), encerradoEm: Date.now(), tempoGastoSegundos: Math.max(0, Math.round((Date.now() - inicio) / 1000)), status: "encerrado", motivoEncerramento: motivo, automatico: !!automatico };
        if (arquivo) { const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados_respostas"); Object.assign(envio, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType }); }
        else if (envioAnterior?.arquivoUrl) Object.assign(envio, { arquivoUrl: envioAnterior.arquivoUrl, arquivoStoragePath: envioAnterior.arquivoStoragePath || "", arquivoNome: envioAnterior.arquivoNome || "", arquivoMimeType: envioAnterior.arquivoMimeType || "" });
        await salvarEnvioSimuladoFirestore(envio);
        limparAmbienteSimulado(); renderizarSimulados();
        alert(automatico ? "Tempo encerrado. Suas respostas foram enviadas." : "Parabéns! Simulado concluído e enviado com sucesso.");
    } catch (erro) { console.error("Erro ao finalizar simulado", erro); alert(`Erro ao finalizar/enviar simulado.\n\n${erro.message || erro}`); }
    finally { simuladoEnvioEmAndamento = false; }
}

function abrirAmbienteSimulado(simuladoId) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoId));
    if (!sim) return alert("Simulado não encontrado.");
    if (!podeGerenciarSimulados() && !podeIniciarSimulado(sim)) {
        const envio = envioSimuladoUsuario(sim);
        if (envio?.status === "encerrado") return alert("Você já encerrou este simulado. O envio registrado está disponível para a equipe pedagógica.");
        if (!simuladoDentroDaJanelaSeisHoras(sim)) return alert("Este simulado só aparecerá para o aluno faltando até 6 horas para o início.");
        if (simuladoAindaNaoAbriu(sim)) return alert("Este simulado ainda não está aberto.");
        if (simuladoPrazoEncerrado(sim)) return alert("O prazo deste simulado já foi encerrado.");
    }
    simuladoSessaoAtual = { simuladoId: String(simuladoId), iniciado: false, inicio: null, limiteMs: minutosDuracaoSimulado(sim) * 60 * 1000, preview: podeGerenciarSimulados() };
    renderizarAmbienteSimulado();
    document.getElementById("simuladoAmbienteOverlay")?.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function renderizarAmbienteSimulado() {
    const box = document.getElementById("simuladoAmbienteConteudo");
    if (!box || !simuladoSessaoAtual) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    const envio = simuladoSessaoAtual.preview ? null : envioSimuladoUsuario(sim);
    if (!simuladoSessaoAtual.iniciado) {
        const mins = minutosDuracaoSimulado(sim);
        const previewBadge = simuladoSessaoAtual.preview ? `<span class="inline-block mt-2 px-3 py-1 rounded-xl bg-purple-900/40 text-purple-200 text-xs font-black uppercase">Pré-visualização da equipe — não registra envio</span>` : "";
        box.innerHTML = `<div class="max-w-3xl mx-auto bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center text-2xl"><i class="fa-solid fa-stopwatch"></i></div><div class="flex-1"><h2 class="text-2xl font-black text-white">Ambiente cronometrado</h2>${previewBadge}<p class="text-sm text-gray-400 mt-2 leading-relaxed">Você irá iniciar o simulado <b class="text-gray-200">${textoSeguro(sim.titulo)}</b>. Após clicar em <b>Iniciar simulado</b>, não saia da janela antes de concluir. Caso saia, o simulado será encerrado e as respostas marcadas até o momento serão salvas.</p><div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Prazo</p><p class="text-sm text-gray-200 font-bold mt-1">${textoPrazoSimulado(sim)}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo</p><p class="text-sm text-gray-200 font-bold mt-1">${mins ? `${mins} minutos` : "Sem limite definido"}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Formato</p><p class="text-sm text-gray-200 font-bold mt-1">${textoSeguro(sim.formato || "simulado")}</p></div></div><div class="mt-6 flex flex-col sm:flex-row gap-3"><button onclick="iniciarSimuladoCronometrado()" class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs"><i class="fa-solid fa-play mr-2"></i>Iniciar simulado</button><button onclick="fecharAmbienteSimulado()" class="px-5 py-3 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold uppercase text-xs">Cancelar</button></div></div></div></div>`;
        return;
    }
    const questoesHTML = renderizarQuestoesDoSimuladoSeguro(sim);
    const embed = questoesHTML || (sim.arquivoUrl ? `<div class="simulado-secure-area"><iframe src="${sim.arquivoUrl}#toolbar=0&navpanes=0&scrollbar=1" class="simulado-secure-viewer w-full rounded-2xl border border-gray-700 bg-black"></iframe><a href="${sim.arquivoUrl}" target="_blank" class="inline-block mt-2 text-xs text-blue-300 font-bold">Abrir arquivo em nova aba caso o navegador bloqueie a visualização</a></div>` : `<div class="rounded-2xl border border-gray-700 bg-gray-950 p-8 text-center text-gray-500">Nenhum arquivo de simulado anexado. Use as instruções abaixo.</div>`);
    box.innerHTML = `<div class="space-y-4 simulado-secure-area"><div class="sticky top-0 z-10 bg-gray-900/95 border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] text-gray-500 uppercase font-bold">${simuladoSessaoAtual.preview ? "Pré-visualização" : "Simulado em andamento"}</p><h2 class="text-lg font-black text-white">${textoSeguro(sim.titulo)}</h2></div><div class="flex flex-wrap items-center gap-2"><span id="simAmbTimer" class="px-4 py-2 rounded-xl bg-amber-900/40 text-amber-200 border border-amber-800/50 text-sm font-black">--:--</span><button onclick="finalizarSimuladoAmbiente(false, 'finalizado_pelo_aluno')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-paper-plane mr-1"></i>${simuladoSessaoAtual.preview ? "Encerrar preview" : "Finalizar e enviar"}</button><button onclick="fecharAmbienteSimulado()" class="px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/50 text-red-200 text-xs font-bold uppercase">Sair</button></div></div><div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,2.2fr)_minmax(360px,0.8fr)] gap-5"><div class="space-y-3"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4 min-h-[75vh]">${embed}</div>${sim.imagemUrl ? `<img src="${sim.imagemUrl}" class="w-full rounded-2xl border border-gray-700 bg-gray-950">` : ""}${sim.descricao ? `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Instruções</h4><p class="text-sm text-gray-300 whitespace-pre-wrap">${textoSeguro(sim.descricao)}</p></div>` : ""}</div><div class="space-y-4"><div class="bg-gray-800 border border-gray-700 rounded-2xl p-4">${renderGradeRespostaObjetivaAmbiente(sim, envio)}<label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Resposta dissertativa / observações</label><textarea id="simAmbTexto" rows="5" class="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200 focus:outline-none resize-none" placeholder="Digite comentários, justificativas ou resposta dissertativa...">${textoSeguro(envio?.texto || "")}</textarea><label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Anexo de resolução</label><input type="file" id="simAmbArquivo" accept="image/*,.pdf,.doc,.docx" class="w-full p-2 rounded-xl bg-gray-950 border border-gray-700 text-xs text-gray-300"><p class="text-[10px] text-gray-500 mt-1">Aceita foto, PDF, DOC/DOCX. Ideal para questões dissertativas.</p>${envio?.arquivoUrl ? `<a href="${envio.arquivoUrl}" target="_blank" class="text-blue-400 text-xs font-bold mt-2 inline-block">Anexo enviado anteriormente</a>` : ""}</div></div></div></div>`;
    atualizarTimerSimulado();
}

async function salvarNovoSimulado(event) {
    event.preventDefault();
    if (!podeGerenciarSimulados()) return alert("Sem permissão para publicar simulados.");
    const btn = event.submitter || document.querySelector('#formCadSimulado button[type="submit"]');
    try {
        const editId = document.getElementById("simEditId")?.value || "";
        const titulo = document.getElementById("simTitulo")?.value.trim() || "Simulado sem título";
        const descricao = document.getElementById("simDescricao")?.value.trim() || "";
        const gabaritoTexto = document.getElementById("simGabarito")?.value.trim() || "";
        const questoesManuais = await lerQuestoesManuaisSimuladoComUploads();
        if (!validarConteudoEducacionalIA([titulo, descricao, gabaritoTexto, ...questoesManuais.map(q=>q.enunciado)], "simulado")) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Salvando...'; }
        const horas = Math.max(0, Number(document.getElementById("simDuracaoHoras")?.value || 0));
        const minutos = Math.max(0, Number(document.getElementById("simDuracaoMinutos")?.value || 0));
        const lista = getStorage("app_simulados", []);
        const antigo = editId ? lista.find(s => String(s.id) === String(editId)) : null;
        const sim = { ...(antigo || {}), id: editId || novoId(), titulo, disciplina: document.getElementById("simDisciplina")?.value || "Geral", nivel: document.getElementById("simNivel")?.value || "Geral", formato: document.getElementById("simFormato")?.value || "objetivo", dataAbertura: document.getElementById("simDataAbertura")?.value || "", horaAbertura: document.getElementById("simHoraAbertura")?.value || "", dataFim: document.getElementById("simDataFim")?.value || "", horaFim: document.getElementById("simHoraFim")?.value || "", duracaoMinutos: horas * 60 + minutos, duracao: horas || minutos ? `${horas}h ${minutos}min` : "Sem limite definido", quantidadeQuestoes: Number(document.getElementById("simQtdQuestoes")?.value || questoesManuais.length || 0), questoesBanco: questoesManuais.length ? questoesManuais : (antigo?.questoesBanco || []), gabaritoObjetivo: questoesManuais.length ? questoesManuais.map((q,i)=>({numero:i+1,resposta:q.alternativaCorreta})).filter(g=>g.resposta) : lerGabaritoObjetivoSimulado(), gabarito: gabaritoTexto, descricao, solucaoUrl: document.getElementById("simSolucaoUrl")?.value.trim() || antigo?.solucaoUrl || "", publico: !!document.getElementById("simPublico")?.checked, destino: { tipo: document.getElementById("simDestinoTipo")?.value || "todos", valores: Array.from(document.getElementById("simDestinoValores")?.selectedOptions || []).map(o=>o.value) }, criadoEm: antigo?.criadoEm || Date.now(), criadoPorId: antigo?.criadoPorId || usuarioLogado?.id || usuarioLogado?.authUid || "", criadoPorNome: antigo?.criadoPorNome || usuarioLogado?.nome || "", criadoPorNivel: antigo?.criadoPorNivel || usuarioLogado?.nivel || "", atualizadoEm: Date.now() };
        const arquivo = document.getElementById("simArquivo")?.files?.[0] || null;
        const imagem = document.getElementById("simImagem")?.files?.[0] || null;
        const solucaoArquivo = document.getElementById("simSolucaoArquivo")?.files?.[0] || null;
        if (arquivo) { const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados"); Object.assign(sim, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType, arquivoTamanho: up.size }); }
        if (imagem) { const up = await enviarArquivoParaFirebaseStorage(imagem, "simulados_imagens"); Object.assign(sim, { imagemUrl: up.fileUrl, imagemStoragePath: up.storagePath, imagemNome: up.fileName }); }
        if (solucaoArquivo) { const up = await enviarArquivoParaFirebaseStorage(solucaoArquivo, "simulados_solucoes"); Object.assign(sim, { solucaoArquivoUrl: up.fileUrl, solucaoStoragePath: up.storagePath, solucaoNomeArquivo: up.fileName }); }
        if (!questoesManuais.length && ["objetivo", "misto"].includes(sim.formato) && !sim.gabaritoObjetivo.length && !(await confirmarPlataforma("Você não preencheu o gabarito objetivo. Publicar mesmo assim?", "Publicar sem gabarito", "Publicar", "Voltar"))) return;
        const idx = lista.findIndex(s => String(s.id) === String(sim.id));
        if (idx >= 0) lista[idx] = { ...lista[idx], ...sim }; else lista.push(sim);
        await setStorage("app_simulados", lista);
        document.getElementById("formCadSimulado")?.reset();
        const h = document.getElementById("simEditId"); if (h) h.value = "";
        const l = document.getElementById("simQuestoesManuaisLista"); if (l) l.innerHTML = "";
        gerarCamposGabaritoSimulado(false); renderizarSimulados(); atualizarSelectRankingSimulados();
        alert(sim.publico ? `Simulado salvo. Link público:\n${linkPublicoSimulado(sim)}` : "Simulado salvo com sucesso.");
    } catch (erro) { console.error(erro); alert(`Erro ao publicar simulado.\n\n${erro.message || erro}`); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Publicar Simulado'; } }
}

function renderizarSimulados() {
    popularFiltrosSimulados();
    const grid = document.getElementById("gridSimulados");
    if (!grid) return;
    const fd = document.getElementById("filtroSimDisciplina")?.value || "TODOS";
    const fn = document.getElementById("filtroSimNivel")?.value || "TODOS";
    const ff = document.getElementById("filtroSimFormato")?.value || "TODOS";
    const fs = document.getElementById("filtroSimStatus")?.value || "TODOS";
    const busca = normalizarTexto(document.getElementById("filtroSimBusca")?.value || "");
    let sims = getStorage("app_simulados", []).filter(simuladoDestinadoAoUsuario);
    sims = sims.filter(s => (fd === "TODOS" || s.disciplina === fd) && (fn === "TODOS" || s.nivel === fn) && (ff === "TODOS" || s.formato === ff));
    if (busca) sims = sims.filter(s => normalizarTexto(`${s.titulo} ${s.descricao} ${s.disciplina} ${s.nivel}`).includes(busca));
    if (fs !== "TODOS") sims = sims.filter(s => fs === "RESPONDIDOS" ? !!envioSimuladoUsuario(s) : !envioSimuladoUsuario(s));
    sims.sort((a,b) => (dataInicioSimuladoComoData(a)?.getTime() || b.criadoEm || 0) - (dataInicioSimuladoComoData(b)?.getTime() || a.criadoEm || 0));
    if (!sims.length) { grid.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-10 text-center text-gray-500"><i class="fa-solid fa-clipboard-question text-3xl mb-3 opacity-40"></i><p>Nenhum simulado encontrado para este filtro.</p></div>`; return; }
    grid.innerHTML = sims.map(s => {
        const envio = envioSimuladoUsuario(s);
        const encerrado = simuladoPrazoEncerrado(s);
        const aindaNaoAbriu = simuladoAindaNaoAbriu(s);
        const notaTexto = envio && envio.totalObjetivas && (podeGerenciarSimulados() || podeVerGabaritoSimulado(s)) ? `<span class="px-2 py-1 rounded-lg bg-gray-950 border border-gray-700 ${classeDesempenhoSimulado(envio.percentual)} text-[10px] font-bold uppercase">${envio.acertos}/${envio.totalObjetivas} · ${envio.percentual}%</span>` : "";
        const enviadoTexto = envio ? `<span class="px-2 py-1 rounded-lg bg-emerald-900/40 text-emerald-300 text-[10px] font-bold uppercase">Respondido</span>${notaTexto}` : `<span class="px-2 py-1 rounded-lg bg-amber-900/40 text-amber-300 text-[10px] font-bold uppercase">Pendente</span>`;
        const prazoBadge = encerrado ? `<span class="px-2 py-1 rounded-lg bg-red-900/30 text-red-300 text-[10px] font-bold uppercase">Prazo encerrado</span>` : (aindaNaoAbriu ? `<span class="px-2 py-1 rounded-lg bg-blue-900/30 text-blue-300 text-[10px] font-bold uppercase">Ainda não abriu</span>` : `<span class="px-2 py-1 rounded-lg bg-emerald-900/30 text-emerald-300 text-[10px] font-bold uppercase">Aberto</span>`);
        const publicoBtns = podeGerenciarSimulados() && s.publico ? `<button onclick="copiarLinkSimuladoPublico('${s.id}')" class="px-3 py-2 rounded-xl bg-purple-900/40 text-purple-200 border border-purple-800/40 text-xs font-bold"><i class="fa-solid fa-link mr-1"></i>Copiar link</button><button onclick="abrirLinkPublicoSimulado('${s.id}')" class="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold">Abrir link</button>` : "";
        const ger = podeGerenciarSimulados() ? `<button onclick="previsualizarSimulado('${s.id}')" class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"><i class="fa-solid fa-eye mr-1"></i>Pré-visualizar</button><button onclick="abrirRelatorioCorrecaoSimulado('${s.id}')" class="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black"><i class="fa-solid fa-clipboard-list mr-1"></i>Respostas / presença / correção</button><button onclick="prepararEdicaoSimulado('${s.id}')" class="px-3 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button onclick="excluirSimulado('${s.id}')" class="px-3 py-2 rounded-xl bg-red-900/30 text-red-300 border border-red-900/40 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i>Apagar</button>${publicoBtns}` : "";
        const botaoAluno = !podeGerenciarSimulados() ? (podeIniciarSimulado(s) ? `<button onclick="abrirAmbienteSimulado('${s.id}')" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-stopwatch mr-1"></i>Entrar no simulado</button>` : `<button disabled class="px-4 py-2.5 rounded-xl bg-gray-700 text-gray-400 text-xs font-black uppercase cursor-not-allowed"><i class="fa-solid fa-lock mr-1"></i>${envio?.status === "encerrado" ? "Simulado encerrado" : (encerrado ? "Prazo encerrado" : "Indisponível")}</button>`) : "";
        const rankingMini = rankingSimulado(s).slice(0, 5);
        const enviosResumo = podeGerenciarSimulados() ? `<details class="mt-4"><summary class="cursor-pointer text-xs font-bold text-blue-300 uppercase">Ver ranking e envios (${enviosDoSimulado(s).length})</summary><div class="mt-3 space-y-3">${rankingMini.length ? `<div class="rounded-xl border border-gray-700 overflow-hidden"><table class="w-full text-xs"><thead class="bg-gray-950 text-gray-400 uppercase"><tr><th class="p-2 text-left">#</th><th class="p-2 text-left">Aluno/Visitante</th><th class="p-2 text-left">Escola</th><th class="p-2 text-left">Cidade</th><th class="p-2 text-left">Pontuação</th><th class="p-2 text-left">Contato</th><th class="p-2 text-left">Resposta</th></tr></thead><tbody>${rankingMini.map((e,i)=>`<tr class="border-t border-gray-800"><td class="p-2 font-bold text-gray-400">${i+1}</td><td class="p-2 text-gray-200">${textoSeguro(e.alunoNome || e.usuarioNome || e.nome)}</td><td class="p-2 text-gray-400">${textoSeguro(e.escolaNome || e.escolaOrigem || "—")}</td><td class="p-2 text-gray-400">${textoSeguro(e.cidade || "—")}</td><td class="p-2 ${classeDesempenhoSimulado(e.percentual)} font-bold">${e.totalObjetivas ? `${e.acertos}/${e.totalObjetivas} · ${e.percentual}%` : "Correção manual"}</td><td class="p-2 text-gray-400">${textoSeguro([e.email,e.whatsapp].filter(Boolean).join(" · ") || "—")}</td><td class="p-2">${e.arquivoUrl ? `<a href="${e.arquivoUrl}" target="_blank" class="text-blue-400 font-bold">Anexo</a>` : `<span class="text-gray-500">—</span>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="text-gray-500 text-xs">Sem envios ainda.</p>`}</div></details>` : "";
        return `<div class="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl"><div class="flex flex-col lg:flex-row lg:items-start gap-4"><div class="flex-1"><div class="flex flex-wrap items-center gap-2 mb-2">${enviadoTexto}${prazoBadge}${s.publico ? `<span class="px-2 py-1 rounded-lg bg-purple-900/40 text-purple-200 text-[10px] font-bold uppercase">Link público</span>` : ""}<span class="px-2 py-1 rounded-lg bg-blue-900/30 text-blue-300 text-[10px] font-bold uppercase">${textoSeguro(s.formato || "simulado")}</span><span class="px-2 py-1 rounded-lg bg-gray-900 text-gray-400 text-[10px] font-bold uppercase">${textoSeguro(s.nivel || "Geral")}</span></div><h3 class="text-lg font-black text-white">${textoSeguro(s.titulo)}</h3><p class="text-xs text-gray-400 mt-1">${textoSeguro(s.disciplina || "Geral")} · ${textoPrazoSimulado(s)} · ${textoSeguro(s.duracao || "")}</p>${s.descricao ? `<p class="text-sm text-gray-300 mt-3 leading-relaxed">${textoSeguro(s.descricao)}</p>` : ""}<div class="flex flex-wrap gap-2 mt-4">${botaoAluno}${ger}</div><div class="mt-3">${renderLinksGabaritoSimulado(s)}</div></div>${!podeGerenciarSimulados() ? `<div class="w-full lg:w-80 bg-gray-900/70 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-300 uppercase mb-2">Como responder</h4><p class="text-xs text-gray-400 leading-relaxed">Clique em <b>Entrar no simulado</b>. Ele abrirá em ambiente próprio e cronometrado. Ao sair depois de iniciar, o envio será encerrado automaticamente.</p>${envio ? `<div class="mt-3 rounded-xl bg-emerald-900/30 border border-emerald-900/40 p-3 text-xs text-emerald-200"><b>Último envio:</b><br>${envio.encerradoEm ? new Date(envio.encerradoEm).toLocaleString("pt-BR") : "registrado"}</div>` : ""}</div>` : ""}</div>${enviosResumo}</div>`;
    }).join("");
    atualizarSelectRankingSimulados(); renderizarRankingSimulado(false);
}

async function enviarSimuladoPublico(simuladoId, ano) {
    const nome = document.getElementById("pubNome")?.value.trim();
    const escolaOrigem = document.getElementById("pubEscola")?.value.trim();
    const cidade = document.getElementById("pubCidade")?.value.trim();
    const email = document.getElementById("pubEmail")?.value.trim();
    const whatsapp = document.getElementById("pubWhatsapp")?.value.trim();
    if (!nome || !escolaOrigem || !cidade || !email || !whatsapp) return alert("Informe nome completo, escola de origem, cidade, e-mail e WhatsApp.");
    if (!validarConteudoEducacionalIA([nome, escolaOrigem, cidade, email, whatsapp, document.getElementById("pubTexto")?.value], "envio público")) return;
    const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
    const respostas = [];
    document.querySelectorAll('[name^="pub_q_"]:checked').forEach(inp => { respostas.push({ numero: Number(inp.name.replace("pub_q_", "")), resposta: inp.value }); });
    const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostas);
    const doc = { id: `${simuladoId}_visitante_${Date.now()}`, simuladoId, simuladoTitulo: sim.titulo || "", publico: true, visitante: true, alunoNome: nome, nome, escolaOrigem, escolaNome: escolaOrigem, cidade, email, whatsapp, respostasObjetivas: respostas, texto: document.getElementById("pubTexto")?.value.trim() || "", acertos: correcao.acertos, totalObjetivas: correcao.total, respondidasObjetivas: correcao.respondidas, percentual: correcao.percentual, enviadoEm: Date.now(), encerradoEm: Date.now(), status: "visitante_enviado" };
    await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_envios`).doc(doc.id).set(doc);
    await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_leads`).doc(doc.id).set(doc);
    alert("Simulado enviado com sucesso. Obrigado pela participação!");
}

async function abrirSimuladoPublico() {
    const params = new URLSearchParams(location.search);
    const id = params.get("simuladoPublico");
    if (!id) return;
    try {
        const ano = params.get("ano") || String(new Date().getFullYear());
        const sim = await carregarSimuladoPublicoPorId(id, ano);
        document.getElementById("loginScreen")?.classList.add("hidden");
        const ov = document.getElementById("simuladoPublicoOverlay");
        const box = document.getElementById("simuladoPublicoConteudo");
        if (!ov || !box) return;
        ov.classList.remove("hidden");
        box.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl space-y-5"><div><p class="text-xs text-purple-300 font-black uppercase tracking-wider">Simulado público</p><h1 class="text-2xl font-black text-white mt-1">${textoSeguro(sim.titulo)}</h1><p class="text-sm text-gray-400 mt-2">Preencha seus dados para iniciar como visitante. Suas informações e respostas ficarão no mesmo painel de envios do simulado.</p></div><div id="pubDados" class="grid grid-cols-1 md:grid-cols-5 gap-3"><input id="pubNome" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Nome completo" required><input id="pubEscola" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Escola de origem" required><input id="pubCidade" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Cidade" required><input id="pubEmail" type="email" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="E-mail" required><input id="pubWhatsapp" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="WhatsApp" required></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4">${renderizarQuestoesDoSimuladoSeguro(sim) || (sim.arquivoUrl ? `<iframe src="${sim.arquivoUrl}#toolbar=0&navpanes=0" class="w-full h-[75vh] rounded-xl bg-black"></iframe>` : "")}</div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><h3 class="text-sm font-bold text-white uppercase mb-3">Cartão-resposta</h3>${renderGradeRespostaPublica(sim)}<textarea id="pubTexto" rows="4" class="w-full mt-4 p-3 rounded-xl bg-gray-950 border border-gray-700 text-gray-200" placeholder="Resposta textual / observações"></textarea></div><button onclick="enviarSimuladoPublico('${sim.id}','${ano}')" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase">Enviar simulado</button></div>`;
    } catch(e) { alert(e.message || e); }
}


// ============================================================================
// PATCH SIMULADOS — formato prova pronta/manual, mídia interna e layout melhor
// ============================================================================
function podeGerenciarSimulados() {
    return ["ADM", "Staff", "Gestor", "Monitor", "Professor/Orientador"].includes(usuarioLogado?.nivel);
}

function simuladoEhManual(sim) {
    return String(sim?.tipoCriacao || sim?.formato || "").toLowerCase() === "manual" || (Array.isArray(sim?.questoesBanco) && sim.questoesBanco.length && sim.tipoCriacao !== "arquivo");
}

function formatarNomeFormatoSimulado(valor) {
    const v = String(valor || "").toLowerCase();
    if (v === "manual") return "Prova manual";
    if (v === "misto") return "Misto — prova pronta";
    if (v === "dissertativo") return "Dissertativo — prova pronta";
    return "Objetivo — prova pronta";
}

function numeroQuestoesObjetivasSimulado(sim) {
    if (Array.isArray(sim?.gabaritoObjetivo) && sim.gabaritoObjetivo.length) return sim.gabaritoObjetivo.length;
    if (Number(sim?.quantidadeObjetivas) > 0) return Number(sim.quantidadeObjetivas);
    if (String(sim?.formato).toLowerCase() === "objetivo") return Number(sim?.quantidadeQuestoes || 0);
    return 0;
}

function numeroQuestoesDissertativasSimulado(sim) {
    if (simuladoEhManual(sim)) {
        return (Array.isArray(sim?.questoesBanco) ? sim.questoesBanco : []).filter(q => String(q.tipo || "").toLowerCase().includes("dissertativa") || String(q.tipo || "").toLowerCase().includes("mista")).length;
    }
    if (Number(sim?.quantidadeDissertativas) > 0) return Number(sim.quantidadeDissertativas);
    if (String(sim?.formato).toLowerCase() === "dissertativo") return Number(sim?.quantidadeQuestoes || 0);
    return 0;
}

function ajustarCamposSimulado() {
    const formato = document.getElementById("simFormato")?.value || "objetivo";
    const manual = formato === "manual";
    const objetivo = formato === "objetivo";
    const dissertativo = formato === "dissertativo";
    const misto = formato === "misto";
    const arquivoWrap = document.getElementById("simArquivo")?.closest("div");
    const imagemWrap = document.getElementById("simImagem")?.closest("div");
    const manWrap = document.getElementById("simQuestoesManuaisWrap") || document.getElementById("simQuestoesManuaisLista")?.closest(".rounded-2xl");
    const qtdObjWrap = document.getElementById("simQtdObjetivasWrap") || document.getElementById("simQtdQuestoes")?.closest("div");
    const qtdDisWrap = document.getElementById("simQtdDissertativasWrap");
    const gabWrap = document.getElementById("simGabaritoObjetivoWrap");
    const gabTxt = document.getElementById("simGabarito");
    if (arquivoWrap) arquivoWrap.classList.toggle("hidden", manual);
    if (imagemWrap) imagemWrap.classList.toggle("hidden", manual);
    if (manWrap) manWrap.classList.toggle("hidden", !manual);
    if (qtdObjWrap) qtdObjWrap.classList.toggle("hidden", dissertativo || manual);
    if (qtdDisWrap) qtdDisWrap.classList.toggle("hidden", objetivo || manual);
    if (gabWrap) gabWrap.classList.toggle("hidden", dissertativo || manual);
    if (gabTxt) {
        gabTxt.placeholder = manual
            ? "Critérios gerais de correção da prova manual."
            : dissertativo
                ? "Critérios de correção, rubrica ou observações para questões dissertativas."
                : "Critérios gerais. O gabarito objetivo fica na grade acima.";
    }
    if (!manual && (objetivo || misto)) gerarCamposGabaritoSimulado(false);
}

function gerarCamposGabaritoSimulado(focar = true) {
    const grid = document.getElementById("simGabaritoObjetivoGrid");
    if (!grid) return;
    const formato = document.getElementById("simFormato")?.value || "objetivo";
    if (["manual", "dissertativo"].includes(formato)) {
        grid.innerHTML = "";
        return;
    }
    const qtd = Math.max(0, Math.min(120, Number(document.getElementById("simQtdQuestoes")?.value || 0)));
    const alternativas = ["", "A", "B", "C", "D", "E"];
    const anteriores = {};
    grid.querySelectorAll("select[data-q]").forEach(sel => { anteriores[sel.dataset.q] = sel.value; });
    grid.innerHTML = Array.from({ length: qtd }, (_, i) => {
        const n = i + 1;
        return `<div class="rounded-xl border border-gray-700 bg-gray-950/60 p-2"><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Q${n}</label><select data-q="${n}" class="simGabSelect w-full p-2 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-200 focus:outline-none">${alternativas.map(a => `<option value="${a}" ${anteriores[n] === a ? "selected" : ""}>${a || "—"}</option>`).join("")}</select></div>`;
    }).join("");
    if (focar) grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function handlePasteImagemQuestaoManual(event, el) {
    const itens = Array.from(event.clipboardData?.items || []);
    const item = itens.find(i => i.type && i.type.startsWith("image/"));
    if (!item) return;
    event.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    const box = el.closest(".sim-questao-manual");
    const status = box?.querySelector("[data-campo='pasteStatus']");
    try {
        if (status) status.textContent = "Enviando imagem colada...";
        const nome = `imagem-colada-${Date.now()}.png`;
        const arquivo = new File([file], nome, { type: file.type || "image/png" });
        const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados_questoes");
        const atuais = box.dataset.arquivos ? JSON.parse(box.dataset.arquivos) : [];
        atuais.push({ nome: up.fileName, url: up.fileUrl, storagePath: up.storagePath, mimeType: up.mimeType, tipo: "imagem_colada" });
        box.dataset.arquivos = JSON.stringify(atuais);
        renderPreviewArquivosQuestaoManual(box);
        if (status) status.textContent = "Imagem colada e anexada abaixo do enunciado.";
    } catch (erro) {
        console.error(erro);
        if (status) status.textContent = "Erro ao enviar imagem colada.";
        alert(`Erro ao colar imagem na questão.\n\n${erro.message || erro}`);
    }
}

function renderPreviewArquivosQuestaoManual(box) {
    const area = box?.querySelector("[data-campo='previewArquivos']");
    if (!area) return;
    const arquivos = box.dataset.arquivos ? JSON.parse(box.dataset.arquivos) : [];
    area.innerHTML = arquivos.length ? arquivos.map((a, idx) => `
        <div class="rounded-xl border border-gray-700 bg-gray-950/70 p-2">
            ${String(a.mimeType || "").startsWith("image/") ? `<img src="${a.url}" class="max-h-56 rounded-lg border border-gray-700 mx-auto">` : `<div class="text-xs text-gray-300 font-bold"><i class="fa-solid fa-paperclip mr-1"></i>${textoSeguro(a.nome || `Anexo ${idx+1}`)}</div>`}
            <button type="button" onclick="removerArquivoQuestaoManual(this, ${idx})" class="mt-2 text-[10px] text-red-300 font-bold">Remover anexo</button>
        </div>`).join("") : `<p class="text-[10px] text-gray-500">Imagens coladas no enunciado aparecem aqui.</p>`;
}

function removerArquivoQuestaoManual(btn, idx) {
    const box = btn.closest(".sim-questao-manual");
    const arquivos = box.dataset.arquivos ? JSON.parse(box.dataset.arquivos) : [];
    arquivos.splice(idx, 1);
    box.dataset.arquivos = JSON.stringify(arquivos);
    renderPreviewArquivosQuestaoManual(box);
}

function atualizarQuestaoManualTipo(sel) {
    const box = sel?.closest?.(".sim-questao-manual");
    if (!box) return;
    const tipo = String(sel.value || "").toLowerCase();
    const gab = box.querySelector('[data-campo="alternativaCorreta"]');
    const gabWrap = box.querySelector('[data-wrap="gabaritoManual"]');
    const dis = tipo.includes("dissertativa");
    if (gabWrap) gabWrap.classList.toggle("hidden", dis);
    if (gab && dis) gab.value = "";
}

function adicionarQuestaoManualSimulado(dados = {}) {
    const lista = document.getElementById("simQuestoesManuaisLista");
    if (!lista) return;
    const n = lista.querySelectorAll(".sim-questao-manual").length + 1;
    const wrap = document.createElement("div");
    wrap.className = "sim-questao-manual rounded-xl border border-blue-900/40 bg-gray-900/60 p-3 space-y-3";
    wrap.innerHTML = `
        <div class="flex items-center justify-between gap-2"><span class="text-xs font-black text-blue-200 uppercase">Questão manual ${n}</span><button type="button" onclick="this.closest('.sim-questao-manual').remove()" class="text-red-300 text-xs font-bold">Remover</button></div>
        <textarea data-campo="enunciado" onpaste="handlePasteImagemQuestaoManual(event, this)" rows="4" class="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200" placeholder="Enunciado da questão. Você pode copiar uma imagem e colar aqui com Ctrl+V; ela aparecerá abaixo do texto.">${textoSeguro(dados.enunciado||"")}</textarea>
        <p data-campo="pasteStatus" class="text-[10px] text-blue-200/70">Dica: cole imagens com Ctrl+V dentro do enunciado. Elas ficam incorporadas abaixo da questão, sem abrir em outra aba.</p>
        <div data-campo="previewArquivos" class="grid grid-cols-1 md:grid-cols-2 gap-2"></div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select data-campo="tipo" onchange="atualizarQuestaoManualTipo(this)" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option>Múltipla escolha</option><option>Dissertativa</option><option>Mista</option><option>Verdadeiro ou Falso</option></select>
          <select data-campo="dificuldade" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option>Fácil</option><option>Médio</option><option>Difícil</option><option>Muito difícil</option><option>Olímpica</option><option>Vestibular</option></select>
          <div data-wrap="gabaritoManual"><select data-campo="alternativaCorreta" class="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-300"><option value="">Sem gabarito</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select></div>
          <input data-campo="tema" list="listaTemasQuestoes" class="p-2.5 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-200" placeholder="Tema">
        </div>`;
    lista.appendChild(wrap);
    wrap.querySelector('[data-campo="tipo"]').value = dados.tipo || "Múltipla escolha";
    wrap.querySelector('[data-campo="dificuldade"]').value = dados.dificuldade || "Médio";
    wrap.querySelector('[data-campo="alternativaCorreta"]').value = dados.alternativaCorreta || "";
    wrap.querySelector('[data-campo="tema"]').value = dados.tema || "";
    wrap.dataset.arquivos = JSON.stringify(Array.isArray(dados.arquivos) ? dados.arquivos : []);
    renderPreviewArquivosQuestaoManual(wrap);
    atualizarQuestaoManualTipo(wrap.querySelector('[data-campo="tipo"]'));
}

function lerQuestoesManuaisSimulado() {
    return Array.from(document.querySelectorAll("#simQuestoesManuaisLista .sim-questao-manual")).map((el, idx) => {
        const tipo = el.querySelector('[data-campo="tipo"]')?.value || "Múltipla escolha";
        const dis = String(tipo).toLowerCase().includes("dissertativa");
        return {
            numero: idx + 1,
            questaoId: `manual_${idx+1}`,
            titulo: `Questão ${idx+1}`,
            enunciado: el.querySelector('[data-campo="enunciado"]')?.value?.trim() || "",
            tipo,
            dificuldade: el.querySelector('[data-campo="dificuldade"]')?.value || "Médio",
            tema: el.querySelector('[data-campo="tema"]')?.value || "",
            alternativaCorreta: dis ? "" : (el.querySelector('[data-campo="alternativaCorreta"]')?.value || ""),
            arquivos: el.dataset.arquivos ? JSON.parse(el.dataset.arquivos) : []
        };
    }).filter(q => q.enunciado || (q.arquivos || []).length);
}

async function lerQuestoesManuaisSimuladoComUploads() {
    return lerQuestoesManuaisSimulado();
}

function renderMidiaInternaSimulado(url, mime = "", nome = "") {
    if (!url) return "";
    const safeUrl = String(url);
    const lower = `${mime} ${nome} ${url}`.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
        const id = extrairIdYoutube ? extrairIdYoutube(safeUrl) : "";
        return id ? `<iframe src="https://www.youtube.com/embed/${id}" class="w-full min-h-[70vh] rounded-2xl border border-gray-700 bg-black" allowfullscreen></iframe>` : `<iframe src="${safeUrl}" class="w-full min-h-[70vh] rounded-2xl border border-gray-700 bg-black"></iframe>`;
    }
    if (lower.includes("image/") || /\.(png|jpe?g|webp|gif)(\?|$)/.test(lower)) return `<img src="${safeUrl}" class="max-w-full rounded-2xl border border-gray-700 bg-gray-950 mx-auto">`;
    if (lower.includes("video/") || /\.(mp4|webm|mov)(\?|$)/.test(lower)) return `<video controls src="${safeUrl}" class="w-full max-h-[75vh] rounded-2xl border border-gray-700 bg-black"></video>`;
    if (lower.includes("audio/") || /\.(mp3|wav|ogg)(\?|$)/.test(lower)) return `<audio controls src="${safeUrl}" class="w-full"></audio>`;
    return `<iframe src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=1" class="w-full min-h-[75vh] rounded-2xl border border-gray-700 bg-black"></iframe><p class="text-[10px] text-gray-500 mt-2">Se o navegador bloquear a prévia, o arquivo foi mantido no ambiente. Use o botão de download do próprio visualizador.</p>`;
}

function renderArquivosQuestaoInline(arquivos) {
    if (!Array.isArray(arquivos) || !arquivos.length) return "";
    return `<div class="mt-3 grid grid-cols-1 gap-3">${arquivos.map(a => `<div class="rounded-xl border border-gray-700 bg-gray-900/60 p-3"><p class="text-[10px] text-gray-500 uppercase font-bold mb-2">${textoSeguro(a.nome || "Mídia da questão")}</p>${renderMidiaInternaSimulado(a.url, a.mimeType, a.nome)}</div>`).join("")}</div>`;
}

function renderizarQuestoesDoSimuladoSeguro(sim) {
    const qs = Array.isArray(sim.questoesBanco) ? sim.questoesBanco : [];
    if (!qs.length) return "";
    return `<div class="space-y-4">${qs.map(q => `<article class="rounded-2xl bg-gray-950/60 border border-gray-700 p-5"><div class="flex flex-wrap items-center justify-between gap-2"><h4 class="text-base font-black text-white">Questão ${q.numero}</h4><span class="text-[10px] text-gray-500 uppercase font-bold">${textoSeguro([q.tipo, q.tema, q.dificuldade].filter(Boolean).join(" · "))}</span></div><p class="text-base text-gray-200 whitespace-pre-wrap mt-4 leading-relaxed">${textoSeguro(q.enunciado || q.titulo || "")}</p>${renderArquivosQuestaoInline(q.arquivos)}</article>`).join("")}</div>`;
}

function renderGradeRespostaObjetivaAmbiente(sim, envio) {
    const gab = Array.isArray(sim.gabaritoObjetivo) ? sim.gabaritoObjetivo : [];
    if (!gab.length) return "";
    const respostas = Array.isArray(envio?.respostasObjetivas) ? envio.respostasObjetivas : [];
    const mapa = new Map(respostas.map(r => [Number(r.numero), String(r.resposta || "").toUpperCase()]));
    const alternativas = ["", "A", "B", "C", "D", "E"];
    return `<section class="rounded-2xl border border-blue-900/40 bg-blue-950/20 p-4"><div class="flex items-center justify-between gap-2 mb-3"><h4 class="text-sm font-black text-blue-100 uppercase">Cartão-resposta objetivo</h4><span class="text-xs text-blue-200/70">${gab.length} questões</span></div><div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">${gab.map(q => `<div class="rounded-xl bg-gray-950 border border-gray-700 p-3"><label class="block text-[11px] font-black text-gray-400 uppercase mb-1">Questão ${q.numero}</label><select data-q="${q.numero}" class="simAmbResp w-full p-3 rounded-xl bg-gray-900 border border-gray-700 text-base text-gray-100 focus:outline-none">${alternativas.map(a => `<option value="${a}" ${mapa.get(Number(q.numero)) === a ? "selected" : ""}>${a || "—"}</option>`).join("")}</select></div>`).join("")}</div></section>`;
}

function renderCamposDissertativosAmbiente(sim, envio) {
    const respostas = Array.isArray(envio?.respostasDissertativas) ? envio.respostasDissertativas : [];
    const mapa = new Map(respostas.map(r => [Number(r.numero), r]));
    let itens = [];
    if (simuladoEhManual(sim)) {
        itens = (Array.isArray(sim.questoesBanco) ? sim.questoesBanco : [])
            .filter(q => String(q.tipo || "").toLowerCase().includes("dissertativa") || String(q.tipo || "").toLowerCase().includes("mista"))
            .map((q, idx) => ({ numero: Number(q.numero || idx + 1), titulo: `Questão ${q.numero || idx + 1}` }));
    } else {
        const qtd = numeroQuestoesDissertativasSimulado(sim);
        itens = Array.from({ length: qtd }, (_, i) => ({ numero: i + 1, titulo: `Questão discursiva ${i + 1}` }));
    }
    if (!itens.length) return "";
    return `<section class="rounded-2xl border border-purple-900/40 bg-purple-950/20 p-4"><div class="flex items-center justify-between gap-2 mb-3"><h4 class="text-sm font-black text-purple-100 uppercase">Respostas dissertativas</h4><span class="text-xs text-purple-200/70">Texto e anexo por questão</span></div><div class="space-y-4">${itens.map(item => { const r = mapa.get(Number(item.numero)) || {}; return `<div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><label class="block text-xs font-black text-gray-300 uppercase mb-2">${textoSeguro(item.titulo)}</label><textarea data-q="${item.numero}" class="simAmbDiscTexto w-full min-h-[150px] p-3 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-100 focus:outline-none resize-y" placeholder="Digite sua resposta desta questão...">${textoSeguro(r.texto || "")}</textarea><div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 items-center"><input type="file" data-q="${item.numero}" accept="image/*,.pdf,.doc,.docx" class="simAmbDiscArquivo w-full p-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-gray-300"><p class="text-[10px] text-gray-500">Opcional: foto/PDF/DOC da resolução desta questão.</p></div>${r.arquivoUrl ? `<div class="mt-2 text-xs text-blue-300 font-bold">Anexo já enviado: ${textoSeguro(r.arquivoNome || "arquivo")}</div>` : ""}</div>`; }).join("")}</div></section>`;
}

function lerRespostasDissertativasAmbiente(envioAnterior) {
    const anteriores = new Map((Array.isArray(envioAnterior?.respostasDissertativas) ? envioAnterior.respostasDissertativas : []).map(r => [Number(r.numero), r]));
    return Array.from(document.querySelectorAll(`#simuladoAmbienteOverlay .simAmbDiscTexto[data-q]`)).map(txt => {
        const numero = Number(txt.dataset.q);
        const ant = anteriores.get(numero) || {};
        return { numero, texto: txt.value.trim(), arquivoUrl: ant.arquivoUrl || "", arquivoStoragePath: ant.arquivoStoragePath || "", arquivoNome: ant.arquivoNome || "", arquivoMimeType: ant.arquivoMimeType || "" };
    });
}

async function anexarArquivosDissertativosAmbiente(respostas) {
    for (const inp of Array.from(document.querySelectorAll(`#simuladoAmbienteOverlay .simAmbDiscArquivo[data-q]`))) {
        const file = inp.files?.[0] || null;
        if (!file) continue;
        const numero = Number(inp.dataset.q);
        const alvo = respostas.find(r => Number(r.numero) === numero);
        if (!alvo) continue;
        const up = await enviarArquivoParaFirebaseStorage(file, "simulados_respostas");
        Object.assign(alvo, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType });
    }
    return respostas.filter(r => r.texto || r.arquivoUrl);
}

function renderizarAmbienteSimulado() {
    const box = document.getElementById("simuladoAmbienteConteudo");
    if (!box || !simuladoSessaoAtual) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    const envio = envioSimuladoUsuario(sim);
    if (!simuladoSessaoAtual.iniciado) {
        const mins = minutosDuracaoSimulado(sim);
        box.innerHTML = `<div class="max-w-4xl mx-auto bg-gray-800 border border-gray-700 rounded-3xl p-7 shadow-2xl"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center text-2xl"><i class="fa-solid fa-stopwatch"></i></div><div class="flex-1"><h2 class="text-2xl font-black text-white">Ambiente cronometrado</h2><p class="text-sm text-gray-400 mt-2 leading-relaxed">Você irá iniciar <b class="text-gray-200">${textoSeguro(sim.titulo)}</b>. Depois de iniciar, sair da janela encerra a prova e salva o que estiver respondido.</p><div class="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5"><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Prazo</p><p class="text-sm text-gray-200 font-bold mt-1">${textoPrazoSimulado(sim)} ${sim.horaFim ? `às ${textoSeguro(sim.horaFim)}` : ""}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo</p><p class="text-sm text-gray-200 font-bold mt-1">${mins ? `${mins} minutos` : "Sem limite"}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Formato</p><p class="text-sm text-gray-200 font-bold mt-1">${formatarNomeFormatoSimulado(sim.formato)}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Respostas</p><p class="text-sm text-gray-200 font-bold mt-1">${numeroQuestoesObjetivasSimulado(sim)} obj. · ${numeroQuestoesDissertativasSimulado(sim)} disc.</p></div></div><div class="mt-6 flex flex-col sm:flex-row gap-3"><button onclick="iniciarSimuladoCronometrado()" class="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs"><i class="fa-solid fa-play mr-2"></i>Iniciar simulado</button><button onclick="fecharAmbienteSimulado()" class="px-5 py-3 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold uppercase text-xs">Cancelar</button></div></div></div></div>`;
        return;
    }
    const questoesHTML = simuladoEhManual(sim) ? renderizarQuestoesDoSimuladoSeguro(sim) : "";
    const provaHTML = questoesHTML || (sim.arquivoUrl ? renderMidiaInternaSimulado(sim.arquivoUrl, sim.arquivoMimeType, sim.arquivoNome) : `<div class="rounded-2xl border border-gray-700 bg-gray-950 p-10 text-center text-gray-500">Nenhum PDF/imagem de prova anexado.</div>`);
    box.innerHTML = `<div class="space-y-4"><div class="sticky top-0 z-20 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p class="text-[10px] text-gray-500 uppercase font-bold">${simuladoSessaoAtual.preview ? "Pré-visualização" : "Simulado em andamento"}</p><h2 class="text-xl font-black text-white">${textoSeguro(sim.titulo)}</h2></div><div class="flex flex-wrap items-center gap-2"><span id="simAmbTimer" class="px-4 py-2 rounded-xl bg-amber-900/40 text-amber-200 border border-amber-800/50 text-sm font-black">--:--</span><button onclick="finalizarSimuladoAmbiente(false, 'finalizado_pelo_aluno')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-paper-plane mr-1"></i>${simuladoSessaoAtual.preview ? "Encerrar preview" : "Finalizar e enviar"}</button><button onclick="fecharAmbienteSimulado()" class="px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/50 text-red-200 text-xs font-bold uppercase">Sair</button></div></div><div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.45fr)_minmax(520px,0.9fr)] gap-5"><main class="bg-gray-800 border border-gray-700 rounded-2xl p-5 min-h-[78vh]"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-black text-white uppercase">Caderno de questões</h3><span class="text-[10px] text-gray-500 font-bold uppercase">Tudo aberto dentro da plataforma</span></div>${provaHTML}${sim.imagemUrl ? `<div class="mt-4">${renderMidiaInternaSimulado(sim.imagemUrl, "image/", sim.imagemNome)}</div>` : ""}${sim.descricao ? `<div class="mt-4 bg-gray-900 border border-gray-700 rounded-2xl p-4"><h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Instruções</h4><p class="text-sm text-gray-300 whitespace-pre-wrap">${textoSeguro(sim.descricao)}</p></div>` : ""}</main><aside class="bg-gray-800 border border-gray-700 rounded-2xl p-5 min-h-[78vh] space-y-5"><div><h3 class="text-sm font-black text-white uppercase">Área de respostas</h3><p class="text-xs text-gray-500 mt-1">Campos maiores para o aluno responder sem aperto.</p></div>${renderGradeRespostaObjetivaAmbiente(sim, envio)}${renderCamposDissertativosAmbiente(sim, envio)}<section class="rounded-2xl border border-gray-700 bg-gray-950/50 p-4"><label class="block text-xs font-bold text-gray-400 uppercase mb-2">Observações gerais</label><textarea id="simAmbTexto" rows="7" class="w-full min-h-[180px] p-3 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-100 focus:outline-none resize-y" placeholder="Use este espaço para observações gerais, rascunho ou justificativas complementares...">${textoSeguro(envio?.texto || "")}</textarea></section></aside></div></div>`;
    atualizarTimerSimulado();
}

async function finalizarSimuladoAmbiente(automatico = false, motivo = "finalizado") {
    if (!simuladoSessaoAtual || simuladoEnvioEmAndamento) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    if (simuladoSessaoAtual.preview) { limparAmbienteSimulado(); return; }
    const respostasObjetivas = lerRespostaObjetivaAmbiente();
    const envioAnterior = envioSimuladoUsuario(sim);
    let respostasDissertativas = lerRespostasDissertativasAmbiente(envioAnterior);
    const texto = document.getElementById("simAmbTexto")?.value?.trim() || "";
    const totalObj = numeroQuestoesObjetivasSimulado(sim);
    const totalDisc = numeroQuestoesDissertativasSimulado(sim);
    const discRespondidas = respostasDissertativas.filter(r => r.texto || r.arquivoUrl || document.querySelector(`.simAmbDiscArquivo[data-q="${r.numero}"]`)?.files?.[0]).length;
    if (!automatico && motivo === "finalizado_pelo_aluno") {
        const pendencias = [];
        if (totalObj && respostasObjetivas.length < totalObj) pendencias.push(`${totalObj - respostasObjetivas.length} objetiva(s)`);
        if (totalDisc && discRespondidas < totalDisc) pendencias.push(`${totalDisc - discRespondidas} dissertativa(s)`);
        if (pendencias.length && !(await confirmarPlataforma(`Ainda faltam respostas: ${pendencias.join(" e ")}. Deseja concluir mesmo assim?`, "Respostas pendentes", "Concluir mesmo assim", "Voltar para a prova"))) return;
    }
    simuladoEnvioEmAndamento = true;
    try {
        const uid = String(usuarioLogado.authUid || usuarioLogado.id);
        respostasDissertativas = await anexarArquivosDissertativosAmbiente(respostasDissertativas);
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostasObjetivas);
        const alunoAtual = alunoDoUsuarioLogado();
        const inicio = simuladoSessaoAtual.inicio || Date.now();
        const envio = {
            id: `${sim.id}_${uid}`,
            simuladoId: sim.id,
            simuladoTitulo: sim.titulo || "",
            usuarioId: uid,
            usuarioNome: usuarioLogado.nome,
            usuarioNivel: usuarioLogado.nivel,
            alunoId: usuarioLogado.alunoId || alunoAtual?.id || "",
            alunoNome: alunoAtual?.nome || usuarioLogado.nome || "",
            escolaId: alunoAtual?.escolaId || usuarioLogado.vinculoId || "",
            escolaNome: alunoAtual?.escola || "",
            respostasObjetivas,
            respostasDissertativas,
            texto,
            acertos: correcao.acertos,
            totalObjetivas: correcao.total,
            respondidasObjetivas: correcao.respondidas,
            percentual: correcao.percentual,
            iniciadoEm: envioAnterior?.iniciadoEm || inicio,
            enviadoEm: envioAnterior?.enviadoEm || Date.now(),
            encerradoEm: Date.now(),
            tempoGastoSegundos: Math.max(0, Math.round((Date.now() - inicio) / 1000)),
            status: "encerrado",
            motivoEncerramento: motivo,
            automatico: !!automatico
        };
        await salvarEnvioSimuladoFirestore(envio);
        limparAmbienteSimulado();
        renderizarSimulados();
        const completo = (!totalObj || respostasObjetivas.length >= totalObj) && (!totalDisc || respostasDissertativas.length >= totalDisc);
        alert(automatico ? "Tempo encerrado. Suas respostas foram enviadas." : (completo ? "Parabéns! Simulado concluído e enviado com sucesso." : "Simulado enviado com respostas pendentes registradas."));
    } catch (erro) {
        console.error("Erro ao finalizar simulado", erro);
        alert(`Erro ao finalizar/enviar simulado.\n\n${erro.message || erro}`);
    } finally {
        simuladoEnvioEmAndamento = false;
    }
}

async function salvarNovoSimulado(event) {
    event.preventDefault();
    if (!podeGerenciarSimulados()) return alert("Sem permissão para publicar simulados.");
    const btn = event.submitter || document.querySelector('#formCadSimulado button[type="submit"]');
    try {
        const editId = document.getElementById("simEditId")?.value || "";
        const titulo = document.getElementById("simTitulo")?.value.trim() || "Simulado sem título";
        const descricao = document.getElementById("simDescricao")?.value.trim() || "";
        const gabaritoTexto = document.getElementById("simGabarito")?.value.trim() || "";
        const formato = document.getElementById("simFormato")?.value || "objetivo";
        const manual = formato === "manual";
        const questoesManuais = manual ? await lerQuestoesManuaisSimuladoComUploads() : [];
        if (!validarConteudoEducacionalIA([titulo, descricao, gabaritoTexto, ...questoesManuais.map(q=>q.enunciado)], "simulado")) return;
        if (manual && !questoesManuais.length) return alert("No modo manual, adicione pelo menos uma questão.");
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Salvando...'; }
        const horas = Math.max(0, Number(document.getElementById("simDuracaoHoras")?.value || 0));
        const minutos = Math.max(0, Number(document.getElementById("simDuracaoMinutos")?.value || 0));
        const qtdObj = manual ? questoesManuais.filter(q => q.alternativaCorreta).length : (formato === "dissertativo" ? 0 : Number(document.getElementById("simQtdQuestoes")?.value || 0));
        const qtdDisc = manual ? questoesManuais.filter(q => String(q.tipo || "").toLowerCase().includes("dissertativa") || String(q.tipo || "").toLowerCase().includes("mista")).length : (formato === "objetivo" ? 0 : Number(document.getElementById("simQtdDissertativas")?.value || (formato === "dissertativo" ? document.getElementById("simQtdQuestoes")?.value || 0 : 0)));
        const lista = getStorage("app_simulados", []);
        const antigo = editId ? lista.find(s => String(s.id) === String(editId)) : null;
        const sim = { ...(antigo || {}), id: editId || novoId(), titulo, disciplina: document.getElementById("simDisciplina")?.value || "Geral", nivel: document.getElementById("simNivel")?.value || "Geral", formato, tipoCriacao: manual ? "manual" : "arquivo", dataAbertura: document.getElementById("simDataAbertura")?.value || "", horaAbertura: document.getElementById("simHoraAbertura")?.value || "", dataFim: document.getElementById("simDataFim")?.value || "", horaFim: document.getElementById("simHoraFim")?.value || "", duracaoMinutos: horas * 60 + minutos, duracao: horas || minutos ? `${horas}h ${minutos}min` : "Sem limite definido", quantidadeQuestoes: qtdObj + qtdDisc, quantidadeObjetivas: qtdObj, quantidadeDissertativas: qtdDisc, questoesBanco: manual ? questoesManuais : [], gabaritoObjetivo: manual ? questoesManuais.map((q,i)=>({numero:Number(q.numero || i+1),resposta:q.alternativaCorreta})).filter(g=>g.resposta) : lerGabaritoObjetivoSimulado(), gabarito: gabaritoTexto, descricao, solucaoUrl: document.getElementById("simSolucaoUrl")?.value.trim() || antigo?.solucaoUrl || "", publico: !!document.getElementById("simPublico")?.checked, destino: { tipo: document.getElementById("simDestinoTipo")?.value || "todos", valores: Array.from(document.getElementById("simDestinoValores")?.selectedOptions || []).map(o=>o.value) }, criadoEm: antigo?.criadoEm || Date.now(), criadoPorId: antigo?.criadoPorId || usuarioLogado?.id || usuarioLogado?.authUid || "", criadoPorNome: antigo?.criadoPorNome || usuarioLogado?.nome || "", criadoPorNivel: antigo?.criadoPorNivel || usuarioLogado?.nivel || "", atualizadoEm: Date.now() };
        const arquivo = document.getElementById("simArquivo")?.files?.[0] || null;
        const imagem = document.getElementById("simImagem")?.files?.[0] || null;
        const solucaoArquivo = document.getElementById("simSolucaoArquivo")?.files?.[0] || null;
        if (!manual && !arquivo && !antigo?.arquivoUrl && !(await confirmarPlataforma("Você escolheu prova pronta, mas não anexou PDF/imagem da prova. Publicar mesmo assim?", "Publicar sem anexo", "Publicar", "Voltar"))) return;
        if (arquivo) { const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados"); Object.assign(sim, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType, arquivoTamanho: up.size }); }
        if (imagem) { const up = await enviarArquivoParaFirebaseStorage(imagem, "simulados_imagens"); Object.assign(sim, { imagemUrl: up.fileUrl, imagemStoragePath: up.storagePath, imagemNome: up.fileName }); }
        if (solucaoArquivo) { const up = await enviarArquivoParaFirebaseStorage(solucaoArquivo, "simulados_solucoes"); Object.assign(sim, { solucaoArquivoUrl: up.fileUrl, solucaoStoragePath: up.storagePath, solucaoNomeArquivo: up.fileName }); }
        if (["objetivo", "misto"].includes(formato) && !sim.gabaritoObjetivo.length && !(await confirmarPlataforma("Você não preencheu o gabarito objetivo. Publicar mesmo assim?", "Publicar sem gabarito", "Publicar", "Voltar"))) return;
        const idx = lista.findIndex(s => String(s.id) === String(sim.id));
        if (idx >= 0) lista[idx] = { ...lista[idx], ...sim }; else lista.push(sim);
        await setStorage("app_simulados", lista);
        document.getElementById("formCadSimulado")?.reset();
        const h = document.getElementById("simEditId"); if (h) h.value = "";
        const l = document.getElementById("simQuestoesManuaisLista"); if (l) l.innerHTML = "";
        ajustarCamposSimulado(); renderizarSimulados(); atualizarSelectRankingSimulados();
        alert(sim.publico ? `Simulado salvo. Link público:\n${linkPublicoSimulado(sim)}` : "Simulado salvo com sucesso.");
    } catch (erro) { console.error(erro); alert(`Erro ao publicar simulado.\n\n${erro.message || erro}`); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Publicar Simulado'; } }
}

function prepararEdicaoSimulado(id) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(id));
    if (!sim) return alert("Simulado não encontrado.");
    const form = document.getElementById("formCadSimulado");
    if (!form) return alert("Formulário de simulado não encontrado.");
    let hidden = document.getElementById("simEditId");
    if (!hidden) { hidden = document.createElement("input"); hidden.type = "hidden"; hidden.id = "simEditId"; form.appendChild(hidden); }
    hidden.value = sim.id;
    const set = (idCampo, valor) => { const el = document.getElementById(idCampo); if (el) el.value = valor ?? ""; };
    set("simTitulo", sim.titulo); set("simDisciplina", sim.disciplina); set("simNivel", sim.nivel); set("simFormato", sim.formato || (simuladoEhManual(sim) ? "manual" : "objetivo")); set("simDataAbertura", sim.dataAbertura); set("simHoraAbertura", sim.horaAbertura); set("simDataFim", sim.dataFim); set("simHoraFim", sim.horaFim); set("simDescricao", sim.descricao); set("simGabarito", sim.gabarito); set("simSolucaoUrl", sim.solucaoUrl);
    const horas = Math.floor(Number(sim.duracaoMinutos || 0) / 60); const minutos = Number(sim.duracaoMinutos || 0) % 60;
    set("simDuracaoHoras", horas); set("simDuracaoMinutos", minutos); set("simQtdQuestoes", sim.quantidadeObjetivas || sim.gabaritoObjetivo?.length || sim.quantidadeQuestoes || 0); set("simQtdDissertativas", sim.quantidadeDissertativas || 0);
    const publico = document.getElementById("simPublico"); if (publico) publico.checked = !!sim.publico;
    const lista = document.getElementById("simQuestoesManuaisLista"); if (lista) { lista.innerHTML = ""; (sim.questoesBanco || []).forEach(q => adicionarQuestaoManualSimulado(q)); }
    ajustarCamposSimulado();
    if (Array.isArray(sim.gabaritoObjetivo) && sim.gabaritoObjetivo.length) { gerarCamposGabaritoSimulado(false); setTimeout(()=>sim.gabaritoObjetivo.forEach(g=>{ const el=document.querySelector(`#simGabaritoObjetivoGrid select[data-q="${g.numero}"]`); if(el) el.value=g.resposta; }),50); }
    atualizarDestinoSimulado(); form.scrollIntoView({ behavior: "smooth", block: "start" });
    alert("Simulado carregado para edição.");
}

// Ajusta tela ao carregar o módulo, sem depender de recarregar página.
setTimeout(() => { try { ajustarCamposSimulado(); } catch(e) { console.warn(e); } }, 800);

// ============================================================================
// PATCH SIMULADOS — correção manual por questão + presença/tempo/respostas
// ============================================================================
function simuladoPrecisaCorrecaoManual(sim) {
    const formato = String(sim?.formato || "").toLowerCase();
    return formato === "dissertativo" || formato === "misto" || numeroQuestoesDissertativasSimulado(sim) > 0;
}

function questoesDissertativasDoSimulado(sim) {
    if (simuladoEhManual(sim)) {
        return (Array.isArray(sim?.questoesBanco) ? sim.questoesBanco : [])
            .filter(q => {
                const t = String(q.tipo || "").toLowerCase();
                return t.includes("dissertativa") || t.includes("mista");
            })
            .map((q, idx) => ({
                numero: Number(q.numero || idx + 1),
                titulo: `Questão ${q.numero || idx + 1}`,
                enunciado: q.enunciado || q.titulo || "",
                arquivos: Array.isArray(q.arquivos) ? q.arquivos : []
            }));
    }
    const qtd = numeroQuestoesDissertativasSimulado(sim);
    return Array.from({ length: qtd }, (_, i) => ({
        numero: i + 1,
        titulo: `Questão dissertativa ${i + 1}`,
        enunciado: "",
        arquivos: []
    }));
}

function mapaCorrecaoQuestoes(envio) {
    return new Map((Array.isArray(envio?.correcaoQuestoes) ? envio.correcaoQuestoes : []).map(c => [Number(c.numero), c]));
}

function resumoCorrecaoManual(envio, sim) {
    const precisa = simuladoPrecisaCorrecaoManual(sim);
    if (!precisa) return { precisa: false, status: "Correção automática", classe: "text-emerald-300", nota: null };
    const qs = questoesDissertativasDoSimulado(sim);
    const corr = Array.isArray(envio?.correcaoQuestoes) ? envio.correcaoQuestoes : [];
    const corrigidas = corr.filter(c => c.nota !== "" && c.nota !== null && c.nota !== undefined).length;
    const soma = corr.reduce((acc, c) => acc + Number(c.nota || 0), 0);
    const max = Math.max(0, qs.length * 10);
    const percentual = max ? Math.round((soma / max) * 1000) / 10 : null;
    if (!qs.length) return { precisa: true, status: "Sem questões dissertativas", classe: "text-gray-400", nota: percentual };
    if (corrigidas >= qs.length) return { precisa: true, status: `Corrigido · ${soma}/${max}`, classe: "text-emerald-300", nota: percentual };
    if (corrigidas > 0) return { precisa: true, status: `Parcial · ${corrigidas}/${qs.length}`, classe: "text-amber-300", nota: percentual };
    return { precisa: true, status: "Pendente de correção", classe: "text-red-300", nota: percentual };
}

function notaFinalSimulado(envio, sim) {
    const manual = resumoCorrecaoManual(envio, sim);
    if (manual.precisa && manual.nota !== null && manual.nota !== undefined) return manual.nota;
    if (envio?.percentual !== null && envio?.percentual !== undefined) return Number(envio.percentual);
    return null;
}

function textoPresencaSimulado(envio) {
    if (!envio) return "Ausente";
    if (envio.status === "encerrado") return "Presente / enviado";
    if (envio.iniciadoEm) return "Iniciado";
    return "Registrado";
}

function criarOverlayCorrecaoSimulado() {
    let ov = document.getElementById("simuladoCorrecaoOverlay");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.id = "simuladoCorrecaoOverlay";
    ov.className = "hidden fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto";
    ov.innerHTML = `<div class="max-w-7xl mx-auto bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden"><div class="sticky top-0 z-10 bg-gray-900/95 border-b border-gray-700 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p class="text-[10px] text-blue-300 uppercase font-black tracking-wider">Correção de simulado</p><h2 id="simuladoCorrecaoTitulo" class="text-xl font-black text-white">Correção</h2></div><div class="flex flex-wrap gap-2"><button id="btnSalvarCorrecaoSimulado" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-floppy-disk mr-1"></i>Salvar correção</button><button onclick="fecharPainelCorrecaoSimulado()" class="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold uppercase">Fechar</button></div></div><div id="simuladoCorrecaoConteudo" class="p-5"></div></div>`;
    document.body.appendChild(ov);
    return ov;
}

function fecharPainelCorrecaoSimulado() {
    document.getElementById("simuladoCorrecaoOverlay")?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

function renderRespostaDissertativaCorrecao(resp) {
    if (!resp) return `<div class="rounded-xl border border-gray-700 bg-gray-950 p-4 text-sm text-gray-500">Sem resposta enviada para esta questão.</div>`;
    const anexo = resp.arquivoUrl ? `<div class="mt-3 rounded-xl border border-gray-700 bg-gray-950 p-3"><p class="text-[10px] text-gray-500 uppercase font-bold mb-2">Anexo do aluno: ${textoSeguro(resp.arquivoNome || "arquivo")}</p>${renderMidiaInternaSimulado(resp.arquivoUrl, resp.arquivoMimeType, resp.arquivoNome)}</div>` : "";
    return `<div class="rounded-xl border border-gray-700 bg-gray-950 p-4"><p class="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">${textoSeguro(resp.texto || "Sem texto digitado.")}</p>${anexo}</div>`;
}

function renderObjetivasCorrecao(sim, envio) {
    const gab = Array.isArray(sim?.gabaritoObjetivo) ? sim.gabaritoObjetivo : [];
    if (!gab.length) return "";
    const resp = new Map((Array.isArray(envio?.respostasObjetivas) ? envio.respostasObjetivas : []).map(r => [Number(r.numero), String(r.resposta || "").toUpperCase()]));
    return `<section class="rounded-2xl border border-emerald-900/40 bg-emerald-950/10 p-4"><div class="flex items-center justify-between gap-2 mb-3"><h3 class="text-sm font-black text-emerald-200 uppercase">Objetivas — correção automática</h3><span class="text-xs ${classeDesempenhoSimulado(envio?.percentual)} font-bold">${envio?.totalObjetivas ? `${envio.acertos}/${envio.totalObjetivas} · ${envio.percentual}%` : "—"}</span></div><div class="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-8 gap-2">${gab.map(q => { const r = resp.get(Number(q.numero)) || ""; const ok = r && r === String(q.resposta || "").toUpperCase(); return `<div class="rounded-xl border ${ok ? "border-emerald-700 bg-emerald-950/30" : "border-gray-700 bg-gray-950"} p-3"><p class="text-[10px] text-gray-500 uppercase font-bold">Q${q.numero}</p><p class="text-sm text-gray-200 mt-1">Aluno: <b>${textoSeguro(r || "—")}</b></p><p class="text-xs text-gray-400">Gab.: <b class="text-emerald-300">${textoSeguro(q.resposta || "—")}</b></p></div>`; }).join("")}</div></section>`;
}

function abrirPainelCorrecaoSimulado(simuladoId, envioId) {
    if (!podeGerenciarSimulados()) return alert("Sem permissão para corrigir simulados.");
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoId));
    if (!sim) return alert("Simulado não encontrado.");
    const envio = enviosDoSimulado(sim).find(e => String(e.id) === String(envioId));
    if (!envio) return alert("Envio não encontrado.");
    const ov = criarOverlayCorrecaoSimulado();
    const titulo = document.getElementById("simuladoCorrecaoTitulo");
    const box = document.getElementById("simuladoCorrecaoConteudo");
    const btn = document.getElementById("btnSalvarCorrecaoSimulado");
    if (titulo) titulo.textContent = `${sim.titulo || "Simulado"} — ${envio.alunoNome || envio.usuarioNome || envio.nome || "Aluno"}`;
    const respostasDisc = new Map((Array.isArray(envio.respostasDissertativas) ? envio.respostasDissertativas : []).map(r => [Number(r.numero), r]));
    const correcoes = mapaCorrecaoQuestoes(envio);
    const questoesDisc = questoesDissertativasDoSimulado(sim);
    const resumo = resumoCorrecaoManual(envio, sim);
    const dadosAluno = `<section class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5"><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Aluno/visitante</p><p class="text-sm text-white font-black mt-1">${textoSeguro(envio.alunoNome || envio.usuarioNome || envio.nome || "—")}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Escola</p><p class="text-sm text-gray-200 font-bold mt-1">${textoSeguro(envio.escolaNome || envio.escolaOrigem || "—")}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Presença</p><p class="text-sm text-emerald-300 font-bold mt-1">${textoPresencaSimulado(envio)}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo de prova</p><p class="text-sm text-amber-200 font-bold mt-1">${envio.tempoGastoSegundos ? formatarTempoMs(envio.tempoGastoSegundos * 1000) : "—"}</p></div><div class="rounded-2xl bg-gray-950 border border-gray-700 p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Status correção</p><p class="text-sm ${resumo.classe} font-bold mt-1">${textoSeguro(resumo.status)}</p></div></section>`;
    const geral = envio.texto ? `<section class="rounded-2xl border border-gray-700 bg-gray-800 p-4 mb-5"><h3 class="text-xs font-black text-gray-300 uppercase mb-2">Observações gerais / rascunho do aluno</h3><p class="text-sm text-gray-200 whitespace-pre-wrap">${textoSeguro(envio.texto)}</p></section>` : "";
    const discHTML = questoesDisc.length ? `<section class="space-y-4"><h3 class="text-sm font-black text-purple-200 uppercase">Correção manual por questão</h3>${questoesDisc.map(q => { const r = respostasDisc.get(Number(q.numero)); const c = correcoes.get(Number(q.numero)) || {}; return `<article class="rounded-2xl border border-purple-900/40 bg-purple-950/10 p-4 space-y-3"><div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div class="flex-1"><h4 class="text-base font-black text-white">${textoSeguro(q.titulo)}</h4>${q.enunciado ? `<p class="text-sm text-gray-400 whitespace-pre-wrap mt-2">${textoSeguro(q.enunciado)}</p>` : ""}${renderArquivosQuestaoInline(q.arquivos)}</div><div class="w-full lg:w-56 rounded-xl bg-gray-950 border border-gray-700 p-3"><label class="block text-[10px] text-gray-500 uppercase font-bold mb-1">Nota da questão (0 a 10)</label><input data-q="${q.numero}" class="simCorrNota w-full p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white" type="number" min="0" max="10" step="0.1" value="${c.nota ?? ""}" placeholder="Ex: 8.5"></div></div><div><h5 class="text-xs font-bold text-gray-400 uppercase mb-2">Resposta do aluno</h5>${renderRespostaDissertativaCorrecao(r)}</div><div><label class="block text-xs font-bold text-gray-400 uppercase mb-2">Comentário do corretor para esta questão</label><textarea data-q="${q.numero}" class="simCorrComentario w-full min-h-[120px] p-3 rounded-xl bg-gray-950 border border-gray-700 text-sm text-gray-100 resize-y" placeholder="Escreva observações, apontamentos de correção, erros e acertos...">${textoSeguro(c.comentario || "")}</textarea></div></article>`; }).join("")}</section>` : `<section class="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-gray-500 text-sm">Este simulado não possui questões dissertativas configuradas para correção manual.</section>`;
    if (box) box.innerHTML = `${dadosAluno}${renderObjetivasCorrecao(sim, envio)}<div class="h-5"></div>${geral}${discHTML}`;
    if (btn) btn.onclick = () => salvarCorrecaoManualSimulado(sim.id, envio.id);
    ov.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

async function salvarCorrecaoManualSimulado(simuladoId, envioId) {
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoId));
    if (!sim) return alert("Simulado não encontrado.");
    const envio = enviosDoSimulado(sim).find(e => String(e.id) === String(envioId));
    if (!envio) return alert("Envio não encontrado.");
    const comentarios = new Map(Array.from(document.querySelectorAll("#simuladoCorrecaoOverlay .simCorrComentario[data-q]")).map(el => [Number(el.dataset.q), el.value.trim()]));
    const correcaoQuestoes = Array.from(document.querySelectorAll("#simuladoCorrecaoOverlay .simCorrNota[data-q]")).map(el => {
        const numero = Number(el.dataset.q);
        const bruto = String(el.value || "").replace(",", ".").trim();
        const nota = bruto === "" ? "" : Math.max(0, Math.min(10, Number(bruto)));
        return { numero, nota, comentario: comentarios.get(numero) || "", corrigidoPor: usuarioLogado?.nome || "", corrigidoPorId: usuarioLogado?.authUid || usuarioLogado?.id || "", corrigidoEm: Date.now() };
    });
    const validas = correcaoQuestoes.filter(c => c.nota !== "" && !Number.isNaN(Number(c.nota)));
    const soma = validas.reduce((acc, c) => acc + Number(c.nota || 0), 0);
    const max = Math.max(0, correcaoQuestoes.length * 10);
    const percentualManual = max ? Math.round((soma / max) * 1000) / 10 : null;
    const statusCorrecao = validas.length >= correcaoQuestoes.length && correcaoQuestoes.length ? "corrigido" : (validas.length ? "parcial" : "pendente");
    const atualizado = { ...envio, correcaoQuestoes, notaManual: soma, notaManualMaxima: max, percentualManual, statusCorrecao, corrigidoEm: Date.now(), corrigidoPor: usuarioLogado?.nome || "" };
    await salvarEnvioSimuladoFirestore(atualizado);
    alert("Correção salva com sucesso.");
    abrirPainelCorrecaoSimulado(simuladoId, envioId);
    renderizarRankingSimulado(false);
    renderizarSimulados();
}

function renderizarRankingSimulado(mostrarVazio = true) {
    const box = document.getElementById("rankingSimuladoResumo");
    const sel = document.getElementById("selectRankingSimulado");
    if (!box || !sel || !podeGerenciarSimulados()) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(sel.value));
    if (!sim) {
        box.innerHTML = mostrarVazio ? `<p class="text-xs text-gray-500">Selecione um simulado para ver respostas, presença, tempo de prova e correção.</p>` : "";
        return;
    }
    const envios = enviosDoSimulado(sim).sort((a, b) => Number(a.enviadoEm || 0) - Number(b.enviadoEm || 0));
    const presentes = envios.filter(e => e.status === "encerrado" || e.iniciadoEm || e.enviadoEm).length;
    const precisaManual = simuladoPrecisaCorrecaoManual(sim);
    const corrigidos = envios.filter(e => resumoCorrecaoManual(e, sim).status.startsWith("Corrigido")).length;
    const tempos = envios.map(e => Number(e.tempoGastoSegundos || 0)).filter(Boolean);
    const tempoMedio = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : 0;
    box.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4"><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Envios</p><h4 class="text-2xl font-black text-white">${envios.length}</h4></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Presenças</p><h4 class="text-2xl font-black text-emerald-300">${presentes}</h4></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Tempo médio</p><h4 class="text-2xl font-black text-amber-200">${tempoMedio ? formatarTempoMs(tempoMedio * 1000) : "—"}</h4></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Correção manual</p><h4 class="text-lg font-black ${precisaManual ? "text-purple-200" : "text-gray-400"}">${precisaManual ? `${corrigidos}/${envios.length}` : "Não exige"}</h4></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><p class="text-[10px] text-gray-500 uppercase font-bold">Questões</p><h4 class="text-lg font-black text-white">${numeroQuestoesObjetivasSimulado(sim)} obj. · ${numeroQuestoesDissertativasSimulado(sim)} disc.</h4></div></div><div class="mb-3 flex flex-wrap gap-2"><button onclick="exportarRankingSimuladoCSV()" class="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"><i class="fa-solid fa-file-csv mr-1"></i>Exportar presença/respostas</button></div><div class="overflow-x-auto rounded-2xl border border-gray-700"><table class="w-full text-xs"><thead class="bg-gray-950 text-gray-400 uppercase"><tr><th class="p-3 text-left">Aluno/visitante</th><th class="p-3 text-left">Escola</th><th class="p-3 text-left">Cidade</th><th class="p-3 text-left">Presença</th><th class="p-3 text-left">Tempo</th><th class="p-3 text-left">Objetivas</th><th class="p-3 text-left">Correção manual</th><th class="p-3 text-left">Nota final</th><th class="p-3 text-left">Ações</th></tr></thead><tbody>${envios.map(e => { const manual = resumoCorrecaoManual(e, sim); const nf = notaFinalSimulado(e, sim); return `<tr class="border-t border-gray-800 align-top"><td class="p-3 text-gray-200 font-bold">${textoSeguro(e.alunoNome || e.usuarioNome || e.nome || "—")}<div class="text-[10px] text-gray-500 font-normal mt-1">${textoSeguro([e.email, e.whatsapp].filter(Boolean).join(" · "))}</div></td><td class="p-3 text-gray-400">${textoSeguro(e.escolaNome || e.escolaOrigem || "—")}</td><td class="p-3 text-gray-400">${textoSeguro(e.cidade || "—")}</td><td class="p-3 text-emerald-300 font-bold">${textoPresencaSimulado(e)}<div class="text-[10px] text-gray-500 font-normal mt-1">${e.encerradoEm ? new Date(e.encerradoEm).toLocaleString("pt-BR") : "—"}</div></td><td class="p-3 text-amber-200 font-bold">${e.tempoGastoSegundos ? formatarTempoMs(e.tempoGastoSegundos * 1000) : "—"}</td><td class="p-3 ${classeDesempenhoSimulado(e.percentual)} font-bold">${e.totalObjetivas ? `${e.acertos}/${e.totalObjetivas} · ${e.percentual}%` : "—"}</td><td class="p-3 ${manual.classe} font-bold">${textoSeguro(manual.status)}</td><td class="p-3 ${classeDesempenhoSimulado(nf)} font-black">${nf === null || nf === undefined ? "—" : `${nf}%`}</td><td class="p-3"><button onclick="abrirPainelCorrecaoSimulado('${sim.id}','${e.id}')" class="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold"><i class="fa-solid fa-pen-to-square mr-1"></i>Ver / corrigir</button></td></tr>`; }).join("") || `<tr><td colspan="9" class="p-6 text-center text-gray-500">Nenhum envio ainda.</td></tr>`}</tbody></table></div>`;
}

function exportarRankingSimuladoCSV() {
    const sel = document.getElementById("selectRankingSimulado");
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(sel?.value));
    if (!sim) return alert("Selecione um simulado para exportar.");
    const envios = enviosDoSimulado(sim);
    const linhas = [["Aluno/Visitante", "Escola", "Cidade", "Email", "WhatsApp", "Presença", "Início", "Envio", "Tempo de prova", "Acertos objetivas", "Total objetivas", "Percentual objetivas", "Status correção", "Nota manual", "Nota manual máxima", "Percentual manual", "Observações gerais", "Respostas dissertativas"]];
    envios.forEach(e => {
        const manual = resumoCorrecaoManual(e, sim);
        const respostas = (Array.isArray(e.respostasDissertativas) ? e.respostasDissertativas : []).map(r => `Q${r.numero}: ${r.texto || ""} ${r.arquivoUrl ? "[anexo] " + r.arquivoUrl : ""}`).join(" | ");
        linhas.push([e.alunoNome || e.usuarioNome || e.nome || "", e.escolaNome || e.escolaOrigem || "", e.cidade || "", e.email || "", e.whatsapp || "", textoPresencaSimulado(e), e.iniciadoEm ? new Date(e.iniciadoEm).toLocaleString("pt-BR") : "", e.encerradoEm ? new Date(e.encerradoEm).toLocaleString("pt-BR") : "", e.tempoGastoSegundos ? formatarTempoMs(e.tempoGastoSegundos * 1000) : "", e.acertos ?? "", e.totalObjetivas ?? "", e.percentual ?? "", manual.status, e.notaManual ?? "", e.notaManualMaxima ?? "", e.percentualManual ?? "", e.texto || "", respostas]);
    });
    const csv = linhas.map(l => l.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `presenca_respostas_${(sim.titulo || "simulado").replace(/[^a-z0-9]+/gi,"_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}


// ==================== PATCH VISIBILIDADE — SIMULADOS: RESPOSTAS, PRESENÇA E CORREÇÃO ====================
function abrirRelatorioCorrecaoSimulado(simuladoId) {
    if (!podeGerenciarSimulados()) return alert("Sem permissão para ver respostas e correções de simulados.");
    const painel = document.getElementById("painelRankingSimulados");
    const sel = document.getElementById("selectRankingSimulado");
    if (!painel || !sel) return alert("Painel de respostas não encontrado nesta tela. Recarregue a página e tente novamente.");
    painel.classList.remove("hidden");
    sel.value = String(simuladoId || "");
    renderizarRankingSimulado(true);
    painel.scrollIntoView({ behavior: "smooth", block: "start" });
}

const __renderizarSimuladosBase_VisibilidadeCorrecao = renderizarSimulados;
renderizarSimulados = function() {
    __renderizarSimuladosBase_VisibilidadeCorrecao();
    const painel = document.getElementById("painelRankingSimulados");
    const box = document.getElementById("rankingSimuladoResumo");
    if (painel && podeGerenciarSimulados()) {
        painel.classList.remove("hidden");
        painel.classList.add("ring-1", "ring-purple-900/30");
    }
    if (box && podeGerenciarSimulados() && !document.getElementById("selectRankingSimulado")?.value && !box.innerHTML.trim()) {
        box.innerHTML = `<div class="rounded-2xl border border-purple-900/40 bg-purple-950/20 p-4 text-sm text-purple-100"><b>Painel de respostas, presença e correção.</b><br>Selecione um simulado acima ou clique no botão roxo <b>Respostas / presença / correção</b> dentro do card do simulado.</div>`;
    }
};

const __atualizarSelectRankingSimuladosBase_VisibilidadeCorrecao = atualizarSelectRankingSimulados;
atualizarSelectRankingSimulados = function() {
    __atualizarSelectRankingSimuladosBase_VisibilidadeCorrecao();
    const painel = document.getElementById("painelRankingSimulados");
    if (painel && podeGerenciarSimulados()) painel.classList.remove("hidden");
};


// ==================== PATCH SIMULADO PÚBLICO — UMA TENTATIVA POR DISPOSITIVO + NOTA SÓ NO FIM ====================
function chaveTentativaPublicaSimulado(simuladoId, ano) {
    return `avance_simulado_publico_finalizado_${String(ano || anoDadosAtivo || "")}_${String(simuladoId || "")}`;
}

function obterDispositivoPublicoSimulado() {
    try {
        let id = localStorage.getItem("avance_dispositivo_publico_id");
        if (!id) {
            id = `disp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
            localStorage.setItem("avance_dispositivo_publico_id", id);
        }
        return id;
    } catch (e) {
        return `disp_sem_storage_${Date.now()}`;
    }
}

function simuladoPublicoJaFeitoNesteDispositivo(simuladoId, ano) {
    try {
        return localStorage.getItem(chaveTentativaPublicaSimulado(simuladoId, ano)) === "1";
    } catch (e) {
        return false;
    }
}

function marcarSimuladoPublicoFeitoNesteDispositivo(simuladoId, ano) {
    try {
        localStorage.setItem(chaveTentativaPublicaSimulado(simuladoId, ano), "1");
        localStorage.setItem(`${chaveTentativaPublicaSimulado(simuladoId, ano)}_quando`, String(Date.now()));
    } catch (e) {
        console.warn("Não foi possível gravar bloqueio local do simulado público.", e);
    }
}

function renderizarPaginaAgradecimentoSimuladoPublico(sim, mensagem = "Simulado enviado com sucesso.") {
    const ov = document.getElementById("simuladoPublicoOverlay");
    const box = document.getElementById("simuladoPublicoConteudo");
    document.getElementById("loginScreen")?.classList.add("hidden");
    if (ov) ov.classList.remove("hidden");
    if (!box) return;
    box.innerHTML = `<div class="min-h-[80vh] flex items-center justify-center"><div class="max-w-2xl w-full bg-gray-800 border border-emerald-800/50 rounded-3xl p-8 shadow-2xl text-center"><div class="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center text-3xl mb-5"><i class="fa-solid fa-circle-check"></i></div><p class="text-xs text-emerald-300 font-black uppercase tracking-wider">Participação registrada</p><h1 class="text-3xl font-black text-white mt-2">Obrigado pela participação!</h1><p class="text-sm text-gray-300 mt-4 leading-relaxed">${textoSeguro(mensagem)}</p><div class="mt-6 rounded-2xl border border-gray-700 bg-gray-950 p-4 text-left"><p class="text-[10px] text-gray-500 uppercase font-bold">Simulado</p><p class="text-base text-white font-black mt-1">${textoSeguro(sim?.titulo || "Simulado")}</p></div><p class="text-xs text-gray-500 mt-5">Este dispositivo já concluiu este simulado público. Feche esta aba ou janela.</p></div></div>`;
}

function renderizarBloqueioSimuladoPublico(sim) {
    renderizarPaginaAgradecimentoSimuladoPublico(sim, "Este simulado já foi realizado neste dispositivo. Para preservar a validade da participação, não é possível responder novamente por este mesmo aparelho/navegador.");
}

async function abrirSimuladoPublico() {
    const params = new URLSearchParams(location.search);
    const id = params.get("simuladoPublico");
    if (!id) return;
    try {
        const ano = params.get("ano") || String(new Date().getFullYear());
        const sim = await carregarSimuladoPublicoPorId(id, ano);
        document.getElementById("loginScreen")?.classList.add("hidden");
        const ov = document.getElementById("simuladoPublicoOverlay");
        const box = document.getElementById("simuladoPublicoConteudo");
        if (!ov || !box) return;
        ov.classList.remove("hidden");

        if (simuladoPublicoJaFeitoNesteDispositivo(id, ano)) {
            renderizarBloqueioSimuladoPublico(sim);
            return;
        }

        box.innerHTML = `<div class="bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl space-y-5"><div><p class="text-xs text-purple-300 font-black uppercase tracking-wider">Simulado público</p><h1 class="text-2xl font-black text-white mt-1">${textoSeguro(sim.titulo)}</h1><p class="text-sm text-gray-400 mt-2">Preencha seus dados para iniciar como visitante. Este dispositivo poderá enviar este simulado apenas uma vez.</p></div><div class="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4 text-sm text-amber-100"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Após enviar as respostas, a página ficará travada na tela de agradecimento. Ao abrir este mesmo link novamente neste dispositivo, o simulado não poderá ser feito outra vez.</div><div id="pubDados" class="grid grid-cols-1 md:grid-cols-5 gap-3"><input id="pubNome" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Nome completo" required><input id="pubEscola" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Escola de origem" required><input id="pubCidade" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Cidade" required><input id="pubEmail" type="email" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="E-mail" required><input id="pubWhatsapp" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="WhatsApp" required></div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4">${renderizarQuestoesDoSimuladoSeguro(sim) || (sim.arquivoUrl ? `<iframe src="${sim.arquivoUrl}#toolbar=0&navpanes=0" class="w-full h-[75vh] rounded-xl bg-black"></iframe>` : "")}</div><div class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><h3 class="text-sm font-bold text-white uppercase mb-3">Cartão-resposta</h3>${renderGradeRespostaPublica(sim)}<textarea id="pubTexto" rows="5" class="w-full mt-4 p-3 rounded-xl bg-gray-950 border border-gray-700 text-gray-200" placeholder="Resposta textual / observações"></textarea></div><button id="btnEnviarSimuladoPublico" onclick="enviarSimuladoPublico('${sim.id}','${ano}')" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase">Enviar simulado</button></div>`;
    } catch(e) {
        alert(e.message || e);
    }
}

async function enviarSimuladoPublico(simuladoId, ano) {
    if (simuladoPublicoJaFeitoNesteDispositivo(simuladoId, ano)) {
        const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
        renderizarBloqueioSimuladoPublico(sim);
        return;
    }
    const nome = document.getElementById("pubNome")?.value.trim();
    const escolaOrigem = document.getElementById("pubEscola")?.value.trim();
    const cidade = document.getElementById("pubCidade")?.value.trim();
    const email = document.getElementById("pubEmail")?.value.trim();
    const whatsapp = document.getElementById("pubWhatsapp")?.value.trim();
    if (!nome || !escolaOrigem || !cidade || !email || !whatsapp) return alert("Informe nome completo, escola de origem, cidade, e-mail e WhatsApp.");
    if (!validarConteudoEducacionalIA([nome, escolaOrigem, cidade, email, whatsapp, document.getElementById("pubTexto")?.value], "envio público")) return;
    const btn = document.getElementById("btnEnviarSimuladoPublico");
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Enviando...'; }
        const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
        const respostas = [];
        document.querySelectorAll('[name^="pub_q_"]:checked').forEach(inp => { respostas.push({ numero: Number(inp.name.replace("pub_q_", "")), resposta: inp.value }); });
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostas);
        const dispositivoId = obterDispositivoPublicoSimulado();
        const agora = Date.now();
        const doc = {
            id: `${simuladoId}_visitante_${agora}_${dispositivoId}`,
            simuladoId,
            simuladoTitulo: sim.titulo || "",
            publico: true,
            visitante: true,
            dispositivoId,
            alunoNome: nome,
            nome,
            escolaOrigem,
            escolaNome: escolaOrigem,
            cidade,
            email,
            whatsapp,
            respostasObjetivas: respostas,
            texto: document.getElementById("pubTexto")?.value.trim() || "",
            acertos: correcao.acertos,
            totalObjetivas: correcao.total,
            respondidasObjetivas: correcao.respondidas,
            percentual: correcao.percentual,
            iniciadoEm: agora,
            enviadoEm: agora,
            encerradoEm: agora,
            tempoGastoSegundos: 0,
            status: "encerrado",
            statusCorrecao: simuladoPrecisaCorrecaoManual(sim) ? "pendente" : "automatica"
        };
        await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_envios`).doc(doc.id).set(doc);
        await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_leads`).doc(doc.id).set(doc);
        marcarSimuladoPublicoFeitoNesteDispositivo(simuladoId, ano);
        renderizarPaginaAgradecimentoSimuladoPublico(sim, "Suas respostas foram registradas. A equipe responsável terá acesso aos seus dados, respostas, presença e correção quando aplicável.");
    } catch(e) {
        console.error(e);
        alert(`Erro ao enviar simulado público.\n\n${e.message || e}`);
        if (btn) { btn.disabled = false; btn.innerHTML = "Enviar simulado"; }
    }
}

// ==================== PATCH SIMULADOS — TELA CHEIA CONTROLADA E SAÍDA IRREVERSÍVEL ====================
let simuladoTelaCheiaAtiva = false;
let simuladoSaidaPermitida = false;
let simuladoPublicoSessaoAtual = null;
let simuladoPublicoTimerInterval = null;
let simuladoPublicoEnvioEmAndamento = false;
let simuladoPublicoTelaCheiaAtiva = false;
let simuladoPublicoSaidaPermitida = false;

async function solicitarTelaCheiaSimuladoSeguro() {
    try {
        const alvo = document.documentElement;
        if (document.fullscreenElement) return true;
        if (!alvo.requestFullscreen) {
            alert("Este navegador não permite forçar tela cheia por código. O simulado continuará protegido por aviso de saída e registro automático quando possível.");
            return false;
        }
        await alvo.requestFullscreen({ navigationUI: "hide" });
        return true;
    } catch (erro) {
        console.warn("Tela cheia não foi ativada.", erro);
        alert("Não foi possível ativar a tela cheia automaticamente. Em alguns navegadores isso depende de permissão do usuário. O simulado continuará com aviso de saída e salvamento do envio quando possível.");
        return false;
    }
}

async function sairTelaCheiaSimuladoSeguro() {
    try {
        if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch (erro) {
        console.warn("Não foi possível sair da tela cheia automaticamente.", erro);
    }
}

function textoBloqueioTelaCheiaSimulado() {
    return "Ao iniciar, a prova entrará em modo tela cheia. Se você sair da tela cheia, trocar de aba, minimizar ou tentar abandonar o ambiente, o simulado será encerrado e o que estiver respondido será enviado.";
}

const __iniciarSimuladoCronometradoBase_TelaCheia = iniciarSimuladoCronometrado;
iniciarSimuladoCronometrado = async function() {
    if (!simuladoSessaoAtual) return;
    await solicitarTelaCheiaSimuladoSeguro();
    simuladoSaidaPermitida = false;
    simuladoTelaCheiaAtiva = !!document.fullscreenElement;
    __iniciarSimuladoCronometradoBase_TelaCheia();
};

const __finalizarSimuladoAmbienteBase_TelaCheia = finalizarSimuladoAmbiente;
finalizarSimuladoAmbiente = async function(automatico = false, motivo = "finalizado") {
    simuladoSaidaPermitida = true;
    await __finalizarSimuladoAmbienteBase_TelaCheia(automatico, motivo);
    simuladoTelaCheiaAtiva = false;
    await sairTelaCheiaSimuladoSeguro();
};

const __limparAmbienteSimuladoBase_TelaCheia = limparAmbienteSimulado;
limparAmbienteSimulado = function() {
    simuladoSaidaPermitida = true;
    simuladoTelaCheiaAtiva = false;
    __limparAmbienteSimuladoBase_TelaCheia();
    sairTelaCheiaSimuladoSeguro();
};

const __renderizarAmbienteSimuladoBase_TelaCheia = renderizarAmbienteSimulado;
renderizarAmbienteSimulado = function() {
    __renderizarAmbienteSimuladoBase_TelaCheia();
    const box = document.getElementById("simuladoAmbienteConteudo");
    if (!box || !simuladoSessaoAtual) return;
    if (!simuladoSessaoAtual.iniciado) {
        const aviso = document.createElement("div");
        aviso.className = "max-w-3xl mx-auto mt-4 rounded-2xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-100";
        aviso.innerHTML = `<i class="fa-solid fa-lock mr-2"></i><b>Modo prova protegido:</b> ${textoSeguro(textoBloqueioTelaCheiaSimulado())}`;
        box.appendChild(aviso);
    }
};

function finalizarSimuladoPorSaidaIndevida(motivo) {
    if (simuladoSessaoAtual?.iniciado && !simuladoEnvioEmAndamento && !simuladoSaidaPermitida) {
        finalizarSimuladoAmbiente(true, motivo);
    }
}

function finalizarSimuladoPublicoPorSaidaIndevida(motivo) {
    if (simuladoPublicoSessaoAtual?.iniciado && !simuladoPublicoEnvioEmAndamento && !simuladoPublicoSaidaPermitida) {
        enviarSimuladoPublico(simuladoPublicoSessaoAtual.simuladoId, simuladoPublicoSessaoAtual.ano, true, motivo);
    }
}

document.addEventListener("fullscreenchange", () => {
    if (simuladoTelaCheiaAtiva && simuladoSessaoAtual?.iniciado && !simuladoSaidaPermitida && !document.fullscreenElement) {
        finalizarSimuladoPorSaidaIndevida("saiu_da_tela_cheia");
    }
    if (simuladoPublicoTelaCheiaAtiva && simuladoPublicoSessaoAtual?.iniciado && !simuladoPublicoSaidaPermitida && !document.fullscreenElement) {
        finalizarSimuladoPublicoPorSaidaIndevida("saiu_da_tela_cheia");
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        finalizarSimuladoPorSaidaIndevida("trocou_de_aba_ou_minimizou");
        finalizarSimuladoPublicoPorSaidaIndevida("trocou_de_aba_ou_minimizou");
    }
});

window.addEventListener("blur", () => {
    // Alguns navegadores não disparam visibilitychange em todos os atalhos de alternância.
    setTimeout(() => {
        if (document.visibilityState !== "visible") {
            finalizarSimuladoPorSaidaIndevida("perdeu_foco_da_janela");
            finalizarSimuladoPublicoPorSaidaIndevida("perdeu_foco_da_janela");
        }
    }, 800);
});

function atualizarTimerSimuladoPublico() {
    const box = document.getElementById("simPubTimer");
    if (!box || !simuladoPublicoSessaoAtual?.iniciado) return;
    const limiteMs = simuladoPublicoSessaoAtual.limiteMs || 0;
    if (!limiteMs) {
        box.textContent = `Tempo decorrido: ${formatarTempoMs(Date.now() - simuladoPublicoSessaoAtual.inicio)}`;
        return;
    }
    const restante = limiteMs - (Date.now() - simuladoPublicoSessaoAtual.inicio);
    box.textContent = `Tempo restante: ${formatarTempoMs(restante)}`;
    if (restante <= 0) enviarSimuladoPublico(simuladoPublicoSessaoAtual.simuladoId, simuladoPublicoSessaoAtual.ano, true, "tempo_esgotado");
}

function renderizarProvaPublicaSimuladoSeguro(sim, ano, dados) {
    const box = document.getElementById("simuladoPublicoConteudo");
    if (!box) return;
    const embed = renderizarQuestoesDoSimuladoSeguro(sim) || (sim.arquivoUrl ? `<iframe src="${textoSeguro(sim.arquivoUrl)}#toolbar=0&navpanes=0" class="w-full h-[78vh] rounded-xl bg-black border border-gray-700"></iframe>` : `<div class="rounded-2xl border border-gray-700 bg-gray-950 p-8 text-center text-gray-500">Nenhum arquivo anexado.</div>`);
    box.innerHTML = `<div class="min-h-screen bg-gray-950 text-gray-100 p-4 space-y-4">
        <input type="hidden" id="pubNome" value="${textoSeguro(dados.nome)}"><input type="hidden" id="pubEscola" value="${textoSeguro(dados.escolaOrigem)}"><input type="hidden" id="pubCidade" value="${textoSeguro(dados.cidade)}"><input type="hidden" id="pubEmail" value="${textoSeguro(dados.email)}"><input type="hidden" id="pubWhatsapp" value="${textoSeguro(dados.whatsapp)}">
        <div class="sticky top-0 z-20 bg-gray-900/95 border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div><p class="text-[10px] text-purple-300 uppercase font-black tracking-wider">Simulado público em andamento</p><h1 class="text-xl font-black text-white">${textoSeguro(sim.titulo)}</h1><p class="text-xs text-gray-500 mt-1">Participante: ${textoSeguro(dados.nome)} · ${textoSeguro(dados.escolaOrigem)} · ${textoSeguro(dados.cidade)}</p></div>
            <div class="flex flex-wrap gap-2 items-center"><span id="simPubTimer" class="px-4 py-2 rounded-xl bg-amber-900/40 text-amber-200 border border-amber-800/50 text-sm font-black">--:--</span><button id="btnEnviarSimuladoPublico" onclick="enviarSimuladoPublico('${textoSeguro(sim.id)}','${textoSeguro(ano)}',false,'finalizado_pelo_visitante')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"><i class="fa-solid fa-paper-plane mr-1"></i>Finalizar e enviar</button></div>
        </div>
        <div class="rounded-2xl border border-red-800/50 bg-red-950/20 p-4 text-sm text-red-100"><i class="fa-solid fa-lock mr-2"></i><b>Modo prova protegido:</b> ${textoSeguro(textoBloqueioTelaCheiaSimulado())}</div>
        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(380px,0.9fr)] gap-5">
            <section class="bg-gray-900 border border-gray-700 rounded-2xl p-4">${embed}</section>
            <aside class="space-y-4"><section class="bg-gray-900 border border-gray-700 rounded-2xl p-4"><h3 class="text-sm font-bold text-white uppercase mb-3">Cartão-resposta</h3>${renderGradeRespostaPublica(sim)}<label class="block text-xs font-bold text-gray-400 uppercase mt-4 mb-1">Resposta textual / observações</label><textarea id="pubTexto" rows="9" class="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-gray-200" placeholder="Digite sua resposta, justificativa ou observações..."></textarea></section></aside>
        </div>
    </div>`;
    atualizarTimerSimuladoPublico();
}

function lerDadosPublicosSimulado() {
    const nome = document.getElementById("pubNome")?.value.trim() || "";
    const escolaOrigem = document.getElementById("pubEscola")?.value.trim() || "";
    const cidade = document.getElementById("pubCidade")?.value.trim() || "";
    const email = document.getElementById("pubEmail")?.value.trim() || "";
    const whatsapp = document.getElementById("pubWhatsapp")?.value.trim() || "";
    return { nome, escolaOrigem, cidade, email, whatsapp };
}

async function iniciarSimuladoPublicoTelaCheia(simuladoId, ano) {
    if (simuladoPublicoJaFeitoNesteDispositivo(simuladoId, ano)) {
        const simBloq = await carregarSimuladoPublicoPorId(simuladoId, ano);
        renderizarBloqueioSimuladoPublico(simBloq);
        return;
    }
    const dados = lerDadosPublicosSimulado();
    if (!dados.nome || !dados.escolaOrigem || !dados.cidade || !dados.email || !dados.whatsapp) return alert("Informe nome completo, escola de origem, cidade, e-mail e WhatsApp antes de iniciar.");
    if (!validarConteudoEducacionalIA([dados.nome, dados.escolaOrigem, dados.cidade, dados.email, dados.whatsapp], "dados do participante")) return;
    const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
    await solicitarTelaCheiaSimuladoSeguro();
    simuladoPublicoSaidaPermitida = false;
    simuladoPublicoTelaCheiaAtiva = !!document.fullscreenElement;
    simuladoPublicoSessaoAtual = { simuladoId, ano, sim, dados, iniciado: true, inicio: Date.now(), limiteMs: minutosDuracaoSimulado(sim) * 60 * 1000 };
    renderizarProvaPublicaSimuladoSeguro(sim, ano, dados);
    if (simuladoPublicoTimerInterval) clearInterval(simuladoPublicoTimerInterval);
    simuladoPublicoTimerInterval = setInterval(atualizarTimerSimuladoPublico, 1000);
    atualizarTimerSimuladoPublico();
}

abrirSimuladoPublico = async function() {
    const params = new URLSearchParams(location.search);
    const id = params.get("simuladoPublico");
    if (!id) return;
    try {
        const ano = params.get("ano") || String(new Date().getFullYear());
        const sim = await carregarSimuladoPublicoPorId(id, ano);
        document.getElementById("loginScreen")?.classList.add("hidden");
        const ov = document.getElementById("simuladoPublicoOverlay");
        const box = document.getElementById("simuladoPublicoConteudo");
        if (!ov || !box) return;
        ov.classList.remove("hidden");
        if (simuladoPublicoJaFeitoNesteDispositivo(id, ano)) { renderizarBloqueioSimuladoPublico(sim); return; }
        box.innerHTML = `<div class="min-h-[90vh] flex items-center justify-center p-4"><div class="max-w-5xl w-full bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl space-y-5"><div><p class="text-xs text-purple-300 font-black uppercase tracking-wider">Simulado público</p><h1 class="text-2xl font-black text-white mt-1">${textoSeguro(sim.titulo)}</h1><p class="text-sm text-gray-400 mt-2">Preencha seus dados. A prova só abrirá depois de clicar em <b>Iniciar simulado em tela cheia</b>.</p></div><div class="rounded-2xl border border-red-800/50 bg-red-950/20 p-4 text-sm text-red-100"><i class="fa-solid fa-lock mr-2"></i><b>Modo prova protegido:</b> ${textoSeguro(textoBloqueioTelaCheiaSimulado())}</div><div id="pubDados" class="grid grid-cols-1 md:grid-cols-5 gap-3"><input id="pubNome" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Nome completo" required><input id="pubEscola" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Escola de origem" required><input id="pubCidade" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="Cidade" required><input id="pubEmail" type="email" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="E-mail" required><input id="pubWhatsapp" class="p-3 rounded-xl bg-gray-950 border border-gray-700 text-white" placeholder="WhatsApp" required></div><button onclick="iniciarSimuladoPublicoTelaCheia('${textoSeguro(sim.id)}','${textoSeguro(ano)}')" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase"><i class="fa-solid fa-expand mr-2"></i>Iniciar simulado em tela cheia</button></div></div>`;
    } catch(e) { alert(e.message || e); }
};

enviarSimuladoPublico = async function(simuladoId, ano, automatico = false, motivo = "finalizado") {
    if (simuladoPublicoEnvioEmAndamento) return;
    if (simuladoPublicoJaFeitoNesteDispositivo(simuladoId, ano)) {
        const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
        renderizarBloqueioSimuladoPublico(sim);
        return;
    }
    const dados = simuladoPublicoSessaoAtual?.dados || lerDadosPublicosSimulado();
    if (!dados.nome || !dados.escolaOrigem || !dados.cidade || !dados.email || !dados.whatsapp) return alert("Informe nome completo, escola de origem, cidade, e-mail e WhatsApp.");
    if (!validarConteudoEducacionalIA([dados.nome, dados.escolaOrigem, dados.cidade, dados.email, dados.whatsapp, document.getElementById("pubTexto")?.value], "envio público")) return;
    const btn = document.getElementById("btnEnviarSimuladoPublico");
    try {
        simuladoPublicoEnvioEmAndamento = true;
        simuladoPublicoSaidaPermitida = true;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Enviando...'; }
        const sim = simuladoPublicoSessaoAtual?.sim || await carregarSimuladoPublicoPorId(simuladoId, ano);
        const respostas = [];
        document.querySelectorAll('[name^="pub_q_"]:checked').forEach(inp => { respostas.push({ numero: Number(inp.name.replace("pub_q_", "")), resposta: inp.value }); });
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostas);
        const dispositivoId = obterDispositivoPublicoSimulado();
        const agora = Date.now();
        const inicio = simuladoPublicoSessaoAtual?.inicio || agora;
        const doc = { id: `${simuladoId}_visitante_${agora}_${dispositivoId}`, simuladoId, simuladoTitulo: sim.titulo || "", publico: true, visitante: true, dispositivoId, alunoNome: dados.nome, nome: dados.nome, escolaOrigem: dados.escolaOrigem, escolaNome: dados.escolaOrigem, cidade: dados.cidade, email: dados.email, whatsapp: dados.whatsapp, respostasObjetivas: respostas, texto: document.getElementById("pubTexto")?.value.trim() || "", acertos: correcao.acertos, totalObjetivas: correcao.total, respondidasObjetivas: correcao.respondidas, percentual: correcao.percentual, iniciadoEm: inicio, enviadoEm: agora, encerradoEm: agora, tempoGastoSegundos: Math.max(0, Math.round((agora - inicio) / 1000)), status: "encerrado", motivoEncerramento: motivo, automatico: !!automatico, statusCorrecao: simuladoPrecisaCorrecaoManual(sim) ? "pendente" : "automatica" };
        await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_envios`).doc(doc.id).set(doc);
        await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_leads`).doc(doc.id).set(doc);
        marcarSimuladoPublicoFeitoNesteDispositivo(simuladoId, ano);
        if (simuladoPublicoTimerInterval) clearInterval(simuladoPublicoTimerInterval);
        simuladoPublicoTimerInterval = null;
        simuladoPublicoSessaoAtual = null;
        simuladoPublicoTelaCheiaAtiva = false;
        await sairTelaCheiaSimuladoSeguro();
        renderizarPaginaAgradecimentoSimuladoPublico(sim, automatico ? "O simulado foi encerrado porque houve saída da tela de prova. As respostas já marcadas foram registradas." : "Suas respostas foram registradas. A equipe responsável terá acesso aos seus dados, respostas, presença e correção quando aplicável.");
    } catch(e) {
        console.error(e);
        alert(`Erro ao enviar simulado público.\n\n${e.message || e}`);
        if (btn) { btn.disabled = false; btn.innerHTML = "Enviar simulado"; }
    } finally {
        simuladoPublicoEnvioEmAndamento = false;
    }
};

window.addEventListener("beforeunload", (e) => {
    if ((simuladoSessaoAtual?.iniciado && !simuladoSaidaPermitida) || (simuladoPublicoSessaoAtual?.iniciado && !simuladoPublicoSaidaPermitida)) {
        e.preventDefault();
        e.returnValue = "Seu simulado está em andamento. Se sair, ele será encerrado e o que estiver respondido será enviado.";
        return e.returnValue;
    }
});

// ============================================================================
// PATCH SIMULADOS — MODO HARDCORE OPCIONAL + AVISOS INTERNOS DA PLATAFORMA
// ============================================================================
function simuladoEhHardcore(sim) {
    return !!(sim && (sim.hardcore === true || sim.modoHardcore === true || sim.telaCheiaObrigatoria === true));
}

function garantirCampoHardcoreSimulado() {
    const form = document.getElementById("formCadSimulado");
    if (!form || document.getElementById("simHardcore")) return;
    const alvo = document.getElementById("simPublico")?.closest("label") || document.getElementById("simPublico")?.parentElement || form.querySelector("button[type='submit']")?.parentElement;
    const bloco = document.createElement("label");
    bloco.className = "flex items-start gap-3 rounded-2xl border border-red-800/40 bg-red-950/20 p-4 text-sm text-red-100 cursor-pointer";
    bloco.innerHTML = `<input type="checkbox" id="simHardcore" class="mt-1 scale-125 accent-red-600">
        <span><b class="text-red-200">Hardcore</b><br><span class="text-xs text-red-100/80">Ativa modo prova realista: tenta abrir em tela cheia e encerra o simulado se o aluno sair da tela cheia, trocar de aba ou minimizar. Deixe desmarcado para simulados descontraídos.</span></span>`;
    if (alvo && alvo.parentElement) alvo.parentElement.insertBefore(bloco, alvo.nextSibling);
    else form.insertBefore(bloco, form.querySelector("button[type='submit']") || null);
}

function garantirModaisInternosSimulado() {
    if (document.getElementById("modalInternoSimulado")) return;
    const div = document.createElement("div");
    div.id = "modalInternoSimulado";
    div.className = "hidden fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4";
    div.innerHTML = `<div class="w-full max-w-xl rounded-3xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
        <div class="p-5 border-b border-gray-800 flex items-start gap-3">
            <div id="modalInternoSimuladoIcone" class="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-300 flex items-center justify-center text-xl"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="flex-1"><h3 id="modalInternoSimuladoTitulo" class="text-lg font-black text-white">Aviso</h3><p id="modalInternoSimuladoTexto" class="text-sm text-gray-300 mt-1 whitespace-pre-wrap leading-relaxed"></p></div>
        </div>
        <div id="modalInternoSimuladoDetalhes" class="hidden px-5 pt-4 text-sm text-gray-300"></div>
        <div id="modalInternoSimuladoAcoes" class="p-5 flex flex-col sm:flex-row justify-end gap-3"></div>
    </div>`;
    document.body.appendChild(div);
}

function modalInternoSimulado({ titulo = "Aviso", texto = "", tipo = "aviso", detalhes = "", botoes = [] } = {}) {
    garantirModaisInternosSimulado();
    return new Promise(resolve => {
        const modal = document.getElementById("modalInternoSimulado");
        const icon = document.getElementById("modalInternoSimuladoIcone");
        const tit = document.getElementById("modalInternoSimuladoTitulo");
        const txt = document.getElementById("modalInternoSimuladoTexto");
        const det = document.getElementById("modalInternoSimuladoDetalhes");
        const acoes = document.getElementById("modalInternoSimuladoAcoes");
        const mapa = {
            sucesso: ["bg-emerald-500/10 text-emerald-300", "fa-circle-check"],
            erro: ["bg-red-500/10 text-red-300", "fa-circle-xmark"],
            pergunta: ["bg-blue-500/10 text-blue-300", "fa-circle-question"],
            aviso: ["bg-amber-500/10 text-amber-300", "fa-triangle-exclamation"]
        };
        const [cls, ic] = mapa[tipo] || mapa.aviso;
        icon.className = `w-11 h-11 rounded-2xl ${cls} flex items-center justify-center text-xl`;
        icon.innerHTML = `<i class="fa-solid ${ic}"></i>`;
        tit.textContent = titulo;
        txt.textContent = texto;
        if (detalhes) { det.classList.remove("hidden"); det.innerHTML = detalhes; } else { det.classList.add("hidden"); det.innerHTML = ""; }
        const lista = botoes.length ? botoes : [{ texto: "OK", valor: true, classe: "bg-amber-600 hover:bg-amber-500 text-white" }];
        acoes.innerHTML = lista.map((b, i) => `<button data-i="${i}" class="px-5 py-3 rounded-2xl text-xs font-black uppercase ${b.classe || 'bg-gray-700 hover:bg-gray-600 text-white'}">${b.texto}</button>`).join("");
        modal.classList.remove("hidden");
        acoes.querySelectorAll("button").forEach(btn => btn.onclick = () => {
            const i = Number(btn.dataset.i);
            const valor = lista[i]?.valor;
            modal.classList.add("hidden");
            resolve(valor);
        });
    });
}

function avisarSimuladoInterno(titulo, texto, tipo = "aviso", detalhes = "") {
    return modalInternoSimulado({ titulo, texto, tipo, detalhes });
}

function confirmarSimuladoInterno(titulo, texto, detalhes = "") {
    return modalInternoSimulado({
        titulo,
        texto,
        tipo: "pergunta",
        detalhes,
        botoes: [
            { texto: "Continuar prova", valor: false, classe: "bg-gray-700 hover:bg-gray-600 text-gray-100" },
            { texto: "Concluir mesmo assim", valor: true, classe: "bg-emerald-600 hover:bg-emerald-500 text-white" }
        ]
    });
}

const __renderizarSimuladosBase_HardcoreModal = typeof renderizarSimulados === "function" ? renderizarSimulados : null;
if (__renderizarSimuladosBase_HardcoreModal) {
    renderizarSimulados = function() {
        __renderizarSimuladosBase_HardcoreModal();
        garantirCampoHardcoreSimulado();
    };
}

document.addEventListener("DOMContentLoaded", () => setTimeout(() => { garantirCampoHardcoreSimulado(); garantirModaisInternosSimulado(); }, 300));
setTimeout(() => { garantirCampoHardcoreSimulado(); garantirModaisInternosSimulado(); }, 800);

const __salvarNovoSimuladoBase_HardcoreModal = typeof salvarNovoSimulado === "function" ? salvarNovoSimulado : null;
if (__salvarNovoSimuladoBase_HardcoreModal) {
    salvarNovoSimulado = async function(event) {
        const antes = getStorage("app_simulados", []).map(s => String(s.id));
        await __salvarNovoSimuladoBase_HardcoreModal(event);
        try {
            const lista = getStorage("app_simulados", []);
            const novo = [...lista].reverse().find(s => !antes.includes(String(s.id)));
            if (novo) {
                novo.hardcore = !!document.getElementById("simHardcore")?.checked;
                novo.modoHardcore = novo.hardcore;
                await setStorage("app_simulados", lista);
                renderizarSimulados();
            }
        } catch (e) { console.warn("Não foi possível registrar modo Hardcore no simulado.", e); }
    };
}

const __prepararEdicaoSimuladoBase_HardcoreModal = typeof prepararEdicaoSimulado === "function" ? prepararEdicaoSimulado : null;
if (__prepararEdicaoSimuladoBase_HardcoreModal) {
    prepararEdicaoSimulado = function(id) {
        __prepararEdicaoSimuladoBase_HardcoreModal(id);
        garantirCampoHardcoreSimulado();
        const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(id));
        const chk = document.getElementById("simHardcore");
        if (chk && sim) chk.checked = simuladoEhHardcore(sim);
    };
}

function textoBloqueioTelaCheiaSimuladoPorSimulado(sim) {
    if (!simuladoEhHardcore(sim)) return "Modo Hardcore desativado: o simulado abre em ambiente cronometrado, mas sem encerramento automático por tela cheia/troca de aba.";
    return "Modo Hardcore ativado: ao iniciar, a prova tentará entrar em tela cheia. Se você sair da tela cheia, trocar de aba, minimizar ou abandonar o ambiente, o simulado será encerrado e o que estiver respondido será enviado.";
}

const __renderizarAmbienteSimuladoBase_HardcoreModal = typeof renderizarAmbienteSimulado === "function" ? renderizarAmbienteSimulado : null;
if (__renderizarAmbienteSimuladoBase_HardcoreModal) {
    renderizarAmbienteSimulado = function() {
        __renderizarAmbienteSimuladoBase_HardcoreModal();
        const box = document.getElementById("simuladoAmbienteConteudo");
        if (!box || !simuladoSessaoAtual) return;
        const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
        if (!sim || simuladoSessaoAtual.iniciado) return;
        const antigo = box.querySelector("[data-hardcore-aviso]");
        if (antigo) antigo.remove();
        const aviso = document.createElement("div");
        aviso.dataset.hardcoreAviso = "1";
        aviso.className = `max-w-3xl mx-auto mt-4 rounded-2xl border p-4 text-sm ${simuladoEhHardcore(sim) ? 'border-red-800/60 bg-red-950/30 text-red-100' : 'border-blue-800/60 bg-blue-950/25 text-blue-100'}`;
        aviso.innerHTML = `<i class="fa-solid ${simuladoEhHardcore(sim) ? 'fa-lock' : 'fa-face-smile'} mr-2"></i><b>${simuladoEhHardcore(sim) ? 'Hardcore ativado' : 'Hardcore desativado'}:</b> ${textoSeguro(textoBloqueioTelaCheiaSimuladoPorSimulado(sim))}`;
        box.appendChild(aviso);
    };
}

const __iniciarSimuladoCronometradoBase_HardcoreModal = typeof iniciarSimuladoCronometrado === "function" ? iniciarSimuladoCronometrado : null;
if (__iniciarSimuladoCronometradoBase_HardcoreModal) {
    iniciarSimuladoCronometrado = async function() {
        if (!simuladoSessaoAtual) return;
        const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
        if (simuladoEhHardcore(sim)) {
            await solicitarTelaCheiaSimuladoSeguro();
            simuladoSaidaPermitida = false;
            simuladoTelaCheiaAtiva = !!document.fullscreenElement;
        } else {
            simuladoSaidaPermitida = true;
            simuladoTelaCheiaAtiva = false;
        }
        __iniciarSimuladoCronometradoBase_HardcoreModal();
    };
}

async function finalizarSimuladoPodeProsseguirInterno(sim, automatico) {
    if (automatico || simuladoSessaoAtual?.preview) return true;
    const respostasObjetivas = lerRespostaObjetivaAmbiente();
    const totalObj = Array.isArray(sim.gabaritoObjetivo) ? sim.gabaritoObjetivo.length : 0;
    const texto = document.getElementById("simAmbTexto")?.value?.trim() || "";
    const arquivo = document.getElementById("simAmbArquivo")?.files?.[0] || null;
    const faltas = [];
    if (["objetivo", "misto"].includes(String(sim.formato || "").toLowerCase()) && totalObj && respostasObjetivas.length < totalObj) faltas.push(`${totalObj - respostasObjetivas.length} questão(ões) objetiva(s)`);
    if (["dissertativo", "misto"].includes(String(sim.formato || "").toLowerCase()) && !texto && !arquivo) faltas.push("resposta/anexo dissertativo");
    if (!faltas.length) return true;
    return await confirmarSimuladoInterno("Ainda há respostas pendentes", "Você ainda não respondeu tudo. Deseja concluir mesmo assim?", `<div class="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4"><p class="font-bold text-amber-200 mb-2">Pendências encontradas:</p><ul class="list-disc pl-5 space-y-1">${faltas.map(f => `<li>${textoSeguro(f)}</li>`).join("")}</ul></div>`);
}

finalizarSimuladoAmbiente = async function(automatico = false, motivo = "finalizado") {
    if (!simuladoSessaoAtual || simuladoEnvioEmAndamento) return;
    const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoSessaoAtual.simuladoId));
    if (!sim) return;
    if (simuladoSessaoAtual.preview) {
        simuladoSaidaPermitida = true;
        limparAmbienteSimulado();
        await avisarSimuladoInterno("Pré-visualização encerrada", "Nenhum envio foi registrado.", "sucesso");
        return;
    }
    const prosseguir = await finalizarSimuladoPodeProsseguirInterno(sim, automatico);
    if (!prosseguir) return;
    simuladoEnvioEmAndamento = true;
    simuladoSaidaPermitida = true;
    try {
        const uid = String(usuarioLogado.authUid || usuarioLogado.id);
        const respostasObjetivas = lerRespostaObjetivaAmbiente();
        const texto = document.getElementById("simAmbTexto")?.value?.trim() || "";
        const arquivo = document.getElementById("simAmbArquivo")?.files?.[0] || null;
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostasObjetivas);
        const alunoAtual = alunoDoUsuarioLogado();
        const envioAnterior = envioSimuladoUsuario(sim);
        const inicio = simuladoSessaoAtual.inicio || Date.now();
        const envio = { id: `${sim.id}_${uid}`, simuladoId: sim.id, simuladoTitulo: sim.titulo || "", publico: false, visitante: false, usuarioId: uid, usuarioNome: usuarioLogado.nome, usuarioNivel: usuarioLogado.nivel, alunoId: usuarioLogado.alunoId || alunoAtual?.id || "", alunoNome: alunoAtual?.nome || usuarioLogado.nome || "", escolaId: alunoAtual?.escolaId || usuarioLogado.vinculoId || "", escolaNome: alunoAtual?.escola || getEscolaVinculadaUsuario()?.nome || "", cidade: alunoAtual?.cidade || "", email: usuarioLogado.emailAuth || usuarioLogado.email || alunoAtual?.emailInstitucional || alunoAtual?.emailPessoal || "", whatsapp: alunoAtual?.contato || alunoAtual?.telefone || "", respostasObjetivas, texto, acertos: correcao.acertos, totalObjetivas: correcao.total, respondidasObjetivas: correcao.respondidas, percentual: correcao.percentual, iniciadoEm: envioAnterior?.iniciadoEm || inicio, enviadoEm: Date.now(), encerradoEm: Date.now(), tempoGastoSegundos: Math.max(0, Math.round((Date.now() - inicio) / 1000)), status: "encerrado", motivoEncerramento: motivo, automatico: !!automatico, statusCorrecao: simuladoPrecisaCorrecaoManual(sim) ? "pendente" : "automatica" };
        if (arquivo) { const up = await enviarArquivoParaFirebaseStorage(arquivo, "simulados_respostas"); Object.assign(envio, { arquivoUrl: up.fileUrl, arquivoStoragePath: up.storagePath, arquivoNome: up.fileName, arquivoMimeType: up.mimeType }); }
        else if (envioAnterior?.arquivoUrl) Object.assign(envio, { arquivoUrl: envioAnterior.arquivoUrl, arquivoStoragePath: envioAnterior.arquivoStoragePath || "", arquivoNome: envioAnterior.arquivoNome || "", arquivoMimeType: envioAnterior.arquivoMimeType || "" });
        await salvarEnvioSimuladoFirestore(envio);
        limparAmbienteSimulado(); renderizarSimulados();
        await avisarSimuladoInterno(automatico ? "Simulado encerrado" : "Parabéns!", automatico ? "O simulado foi encerrado e suas respostas foram enviadas com o que estava preenchido." : "Simulado concluído e enviado com sucesso.", automatico ? "aviso" : "sucesso");
    } catch (erro) {
        console.error("Erro ao finalizar simulado", erro);
        await avisarSimuladoInterno("Erro ao enviar simulado", String(erro.message || erro), "erro");
    } finally {
        simuladoEnvioEmAndamento = false;
        simuladoTelaCheiaAtiva = false;
        if (simuladoEhHardcore(sim)) await sairTelaCheiaSimuladoSeguro();
    }
};

const __abrirAmbienteSimuladoBase_HardcoreModal = typeof abrirAmbienteSimulado === "function" ? abrirAmbienteSimulado : null;
if (__abrirAmbienteSimuladoBase_HardcoreModal) {
    abrirAmbienteSimulado = async function(simuladoId) {
        const sim = getStorage("app_simulados", []).find(s => String(s.id) === String(simuladoId));
        if (!sim) return avisarSimuladoInterno("Simulado não encontrado", "Não foi possível localizar este simulado.", "erro");
        if (!podeGerenciarSimulados() && !podeIniciarSimulado(sim)) {
            const envio = envioSimuladoUsuario(sim);
            if (envio?.status === "encerrado") return avisarSimuladoInterno("Simulado já encerrado", "Você já encerrou este simulado. O envio registrado está disponível para a equipe pedagógica.", "aviso");
            if (!simuladoDentroDaJanelaSeisHoras(sim)) return avisarSimuladoInterno("Simulado ainda indisponível", "Este simulado só aparece para o aluno faltando até 6 horas para o início.", "aviso");
            if (simuladoAindaNaoAbriu(sim)) return avisarSimuladoInterno("Simulado ainda não aberto", "Aguarde o horário de abertura definido pela equipe.", "aviso");
            if (simuladoPrazoEncerrado(sim)) return avisarSimuladoInterno("Prazo encerrado", "O prazo deste simulado já foi encerrado.", "aviso");
        }
        simuladoSessaoAtual = { simuladoId: String(simuladoId), iniciado: false, inicio: null, limiteMs: minutosDuracaoSimulado(sim) * 60 * 1000, preview: podeGerenciarSimulados() };
        renderizarAmbienteSimulado();
        document.getElementById("simuladoAmbienteOverlay")?.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    };
}

const __renderizarProvaPublicaSimuladoSeguroBase_HardcoreModal = typeof renderizarProvaPublicaSimuladoSeguro === "function" ? renderizarProvaPublicaSimuladoSeguro : null;
if (__renderizarProvaPublicaSimuladoSeguroBase_HardcoreModal) {
    renderizarProvaPublicaSimuladoSeguro = function(sim, ano, dados) {
        __renderizarProvaPublicaSimuladoSeguroBase_HardcoreModal(sim, ano, dados);
        const box = document.getElementById("simuladoPublicoConteudo");
        if (!box) return;
        const aviso = box.querySelector(".rounded-2xl.border.border-red-800\/50, .rounded-2xl.border.border-red-800\\/50");
        // Não tentamos remover por seletor complexo em todos os navegadores; apenas acrescentamos o aviso correto no topo.
        const novo = document.createElement("div");
        novo.className = `rounded-2xl border p-4 text-sm mb-4 ${simuladoEhHardcore(sim) ? 'border-red-800/50 bg-red-950/20 text-red-100' : 'border-blue-800/50 bg-blue-950/20 text-blue-100'}`;
        novo.innerHTML = `<i class="fa-solid ${simuladoEhHardcore(sim) ? 'fa-lock' : 'fa-face-smile'} mr-2"></i><b>${simuladoEhHardcore(sim) ? 'Hardcore ativado' : 'Hardcore desativado'}:</b> ${textoSeguro(textoBloqueioTelaCheiaSimuladoPorSimulado(sim))}`;
        const container = box.firstElementChild;
        if (container) container.insertBefore(novo, container.children[1] || null);
    };
}

iniciarSimuladoPublicoTelaCheia = async function(simuladoId, ano) {
    if (simuladoPublicoJaFeitoNesteDispositivo(simuladoId, ano)) {
        const simBloq = await carregarSimuladoPublicoPorId(simuladoId, ano);
        renderizarBloqueioSimuladoPublico(simBloq);
        return;
    }
    const dados = lerDadosPublicosSimulado();
    if (!dados.nome || !dados.escolaOrigem || !dados.cidade || !dados.email || !dados.whatsapp) {
        await avisarSimuladoInterno("Dados incompletos", "Informe nome completo, escola de origem, cidade, e-mail e WhatsApp antes de iniciar.", "aviso");
        return;
    }
    const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
    if (simuladoEhHardcore(sim)) {
        await solicitarTelaCheiaSimuladoSeguro();
        simuladoPublicoSaidaPermitida = false;
        simuladoPublicoTelaCheiaAtiva = !!document.fullscreenElement;
    } else {
        simuladoPublicoSaidaPermitida = true;
        simuladoPublicoTelaCheiaAtiva = false;
    }
    simuladoPublicoSessaoAtual = { simuladoId, ano, sim, dados, iniciado: true, inicio: Date.now(), limiteMs: minutosDuracaoSimulado(sim) * 60 * 1000 };
    renderizarProvaPublicaSimuladoSeguro(sim, ano, dados);
    if (simuladoPublicoTimerInterval) clearInterval(simuladoPublicoTimerInterval);
    simuladoPublicoTimerInterval = setInterval(atualizarTimerSimuladoPublico, 1000);
    atualizarTimerSimuladoPublico();
};

const __enviarSimuladoPublicoBase_HardcoreModal = typeof enviarSimuladoPublico === "function" ? enviarSimuladoPublico : null;
enviarSimuladoPublico = async function(simuladoId, ano, automatico = false, motivo = "finalizado") {
    if (simuladoPublicoEnvioEmAndamento) return;
    if (simuladoPublicoJaFeitoNesteDispositivo(simuladoId, ano)) {
        const sim = await carregarSimuladoPublicoPorId(simuladoId, ano);
        renderizarBloqueioSimuladoPublico(sim);
        return;
    }
    const dados = simuladoPublicoSessaoAtual?.dados || lerDadosPublicosSimulado();
    if (!dados.nome || !dados.escolaOrigem || !dados.cidade || !dados.email || !dados.whatsapp) {
        await avisarSimuladoInterno("Dados incompletos", "Informe nome completo, escola de origem, cidade, e-mail e WhatsApp.", "aviso");
        return;
    }
    const btn = document.getElementById("btnEnviarSimuladoPublico");
    try {
        simuladoPublicoEnvioEmAndamento = true;
        simuladoPublicoSaidaPermitida = true;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Enviando...'; }
        const sim = simuladoPublicoSessaoAtual?.sim || await carregarSimuladoPublicoPorId(simuladoId, ano);
        if (!validarConteudoEducacionalIA([dados.nome, dados.escolaOrigem, dados.cidade, dados.email, dados.whatsapp, document.getElementById("pubTexto")?.value], "envio público")) {
            simuladoPublicoEnvioEmAndamento = false;
            if (btn) { btn.disabled = false; btn.innerHTML = "Enviar simulado"; }
            return;
        }
        const respostas = [];
        document.querySelectorAll('[name^="pub_q_"]:checked').forEach(inp => respostas.push({ numero: Number(inp.name.replace("pub_q_", "")), resposta: inp.value }));
        const correcao = corrigirRespostaObjetiva(sim.gabaritoObjetivo, respostas);
        const dispositivoId = obterDispositivoPublicoSimulado();
        const agora = Date.now();
        const inicio = simuladoPublicoSessaoAtual?.inicio || agora;
        const doc = { id: `${simuladoId}_visitante_${agora}_${dispositivoId}`, simuladoId, simuladoTitulo: sim.titulo || "", publico: true, visitante: true, dispositivoId, alunoNome: dados.nome, nome: dados.nome, escolaOrigem: dados.escolaOrigem, escolaNome: dados.escolaOrigem, cidade: dados.cidade, email: dados.email, whatsapp: dados.whatsapp, respostasObjetivas: respostas, texto: document.getElementById("pubTexto")?.value.trim() || "", acertos: correcao.acertos, totalObjetivas: correcao.total, respondidasObjetivas: correcao.respondidas, percentual: correcao.percentual, iniciadoEm: inicio, enviadoEm: agora, encerradoEm: agora, tempoGastoSegundos: Math.max(0, Math.round((agora - inicio) / 1000)), status: "encerrado", motivoEncerramento: motivo, automatico: !!automatico, statusCorrecao: simuladoPrecisaCorrecaoManual(sim) ? "pendente" : "automatica" };
        await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_envios`).doc(doc.id).set(doc);
        await firebaseFirestore.collection(`anos/${ano}/sistema_simulados_leads`).doc(doc.id).set(doc);
        marcarSimuladoPublicoFeitoNesteDispositivo(simuladoId, ano);
        if (simuladoPublicoTimerInterval) clearInterval(simuladoPublicoTimerInterval);
        simuladoPublicoTimerInterval = null;
        simuladoPublicoSessaoAtual = null;
        simuladoPublicoTelaCheiaAtiva = false;
        if (simuladoEhHardcore(sim)) await sairTelaCheiaSimuladoSeguro();
        renderizarPaginaAgradecimentoSimuladoPublico(sim, automatico ? "O simulado foi encerrado porque houve saída da tela de prova. As respostas já marcadas foram registradas." : "Suas respostas foram registradas. A equipe responsável terá acesso aos seus dados, respostas, presença e correção quando aplicável.");
    } catch(e) {
        console.error(e);
        await avisarSimuladoInterno("Erro ao enviar simulado público", String(e.message || e), "erro");
        if (btn) { btn.disabled = false; btn.innerHTML = "Enviar simulado"; }
    } finally {
        simuladoPublicoEnvioEmAndamento = false;
    }
};

// Ajusta o texto do botão/entrada pública quando o simulado não é Hardcore.
const __abrirSimuladoPublicoBase_HardcoreModal = typeof abrirSimuladoPublico === "function" ? abrirSimuladoPublico : null;
if (__abrirSimuladoPublicoBase_HardcoreModal) {
    abrirSimuladoPublico = async function() {
        await __abrirSimuladoPublicoBase_HardcoreModal();
        try {
            const params = new URLSearchParams(location.search);
            const id = params.get("simuladoPublico");
            const ano = params.get("ano") || anoDadosAtivo || String(new Date().getFullYear());
            if (!id) return;
            const sim = await carregarSimuladoPublicoPorId(id, ano);
            const btn = document.querySelector("button[onclick^='iniciarSimuladoPublicoTelaCheia']");
            if (btn) btn.innerHTML = simuladoEhHardcore(sim) ? '<i class="fa-solid fa-expand mr-2"></i>Iniciar simulado em tela cheia' : '<i class="fa-solid fa-play mr-2"></i>Iniciar simulado';
            const cards = document.querySelectorAll("#simuladoPublicoConteudo .rounded-2xl");
            cards.forEach(c => {
                if (c.textContent.includes("Modo prova protegido")) {
                    c.className = `rounded-2xl border p-4 text-sm ${simuladoEhHardcore(sim) ? 'border-red-800/50 bg-red-950/20 text-red-100' : 'border-blue-800/50 bg-blue-950/20 text-blue-100'}`;
                    c.innerHTML = `<i class="fa-solid ${simuladoEhHardcore(sim) ? 'fa-lock' : 'fa-face-smile'} mr-2"></i><b>${simuladoEhHardcore(sim) ? 'Hardcore ativado' : 'Hardcore desativado'}:</b> ${textoSeguro(textoBloqueioTelaCheiaSimuladoPorSimulado(sim))}`;
                }
            });
        } catch (e) { console.warn(e); }
    };
}

