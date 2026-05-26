import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { 
  getDatabase, ref as rRef, push, set, onChildAdded, onValue, remove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const APP_VERSION = "APP FIREBASE COMPLETO - AVANCE - 2026";
console.log(APP_VERSION);

// ========================================================
// CONFIGURAÇÃO FIREBASE OFICIAL (SUAS CREDENCIAIS ATIVAS)
// ========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDn5eAVOerIiknYMRdvMo_2YmXVXR0NwL0",
  authDomain: "avanceolimpico.firebaseapp.com",
  databaseURL: "https://avanceolimpico-default-rtdb.firebaseio.com",
  projectId: "avanceolimpico",
  storageBucket: "avanceolimpico.firebasestorage.app",
  messagingSenderId: "895771266102",
  appId: "1:895771266102:web:f4e6b32f7c631d3eb81c97",
  measurementId: "G-FPETQTFRZN"
};

// Inicialização das Instâncias dos Módulos da Nuvem
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);         // Banco Cloud Firestore (Persistência Principal)
const rtdb = getDatabase(app);       // Realtime Database (Chat de Monitoria)
const storage = getStorage(app);     // Storage (Upload de PDFs e Imagens)

// WebRTC — variáveis de chamada de voz/vídeo na monitoria
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

// Estado Global (Espelho Dinâmico Puxado do Firebase)
let chartInstance = null;
let usuarioLogado = null;
let cachedCidades = [];
let cachedEscolas = [];
let cachedOlimpiadas = [];
let cachedCronogramas = [];
let cachedResultados = [];
let cachedMateriais = [];
let cachedUsuarios = [];
let salaMoniAtual = null;
let monitoriaListenerAtivo = null;

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", async () => {
  hidratarSelectsEstaticos();
  
  // Auto-login se houver sessão ativa
  const sessaoSalva = localStorage.getItem("avance_user_session");
  if (sessaoSalva) {
    usuarioLogado = JSON.parse(sessaoSalva);
    await entrarNoDashboard();
  } else {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("dashboardApp").style.display = "none";
  }
});

function hidratarSelectsEstaticos() {
  const selectSerie = document.getElementById("resSerie");
  const selectPremio = document.getElementById("resPremio");
  
  if (selectSerie) {
    selectSerie.innerHTML = SERIES_PADRAO.map(s => `<option value="${s}">${s}</option>`).join("");
  }
  if (selectPremio) {
    selectPremio.innerHTML = PREMIOS_PADRAO.map(p => `<option value="${p}">${p}</option>`).join("");
  }
}

// ========================================================
// 🔐 SISTEMA DE AUTENTICAÇÃO (LOGIN / LOGOUT)
// ========================================================
async function executarLogin(event) {
  event.preventDefault();
  const alertBox = document.getElementById("loginAlert");
  const usernameInp = document.getElementById("loginUser").value.trim();
  const passwordInp = document.getElementById("loginPass").value;

  alertBox.classList.add("hidden");
  alertBox.textContent = "";

  // Conta Administradora Master Contingência Integrada
  if (usernameInp === "admin" && passwordInp === "123") {
    usuarioLogado = { username: "admin", fullname: "Administrador Geral Master", role: "ADM", vinculoId: "" };
    localStorage.setItem("avance_user_session", JSON.stringify(usuarioLogado));
    await entrarNoDashboard();
    return;
  }

  try {
    const q = query(collection(db, "usuarios"), where("username", "==", usernameInp), where("password", "==", passwordInp));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const userDoc = snap.docs[0].data();
      usuarioLogado = {
        username: userDoc.username,
        fullname: userDoc.fullname,
        role: userDoc.role,
        vinculoId: userDoc.vinculoId || ""
      };
      localStorage.setItem("avance_user_session", JSON.stringify(usuarioLogado));
      await entrarNoDashboard();
    } else {
      alertBox.textContent = "Usuário ou senha inválidos corporativos.";
      alertBox.classList.remove("hidden");
    }
  } catch (error) {
    console.error(error);
    alertBox.textContent = "Erro na conexão de rede com o Cloud Firestore.";
    alertBox.classList.remove("hidden");
  }
}

async function executarLogout() {
  localStorage.removeItem("avance_user_session");
  usuarioLogado = null;
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginAlert").classList.add("hidden");
  
  document.getElementById("dashboardApp").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
}

// ========================================================
// 📊 SINCRO DE DADOS E CARGA DAS TABELAS DO FIRESTORE
// ========================================================
async function entrarNoDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboardApp").style.display = "flex";
  
  document.getElementById("labelUsuarioNome").textContent = usuarioLogado.fullname;
  document.getElementById("roleBadge").textContent = usuarioLogado.role;

  // Governança Restritiva de Visibilidade UI Lateral
  aplicarGovernancaMenusUI();

  // Carrega e sincroniza tudo com a Nuvem Google Firestore
  await sincronizarBaseNuvemFirestore();
  alternarAba("aba-inicio");
}

function aplicarGovernancaMenusUI() {
  const admsOnly = ["btn-aba-cidades", "btn-aba-escolas", "btn-aba-usuarios", "btn-aba-olimpiadas"];
  if (usuarioLogado.role !== "ADM") {
    admsOnly.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    // Oculta botões de inserção e lixeiras administrativas
    document.querySelectorAll(".action-adm").forEach(el => el.style.display = "none");
  } else {
    admsOnly.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "block";
    });
    document.querySelectorAll(".action-adm").forEach(el => el.style.display = "block");
  }
}

async function sincronizarBaseNuvemFirestore() {
  const loading = document.getElementById("globalLoading");
  if (loading) loading.classList.remove("hidden");

  try {
    const [snapCid, snapEsc, snapOli, snapCro, snapRes, snapMat, snapUse] = await Promise.all([
      getDocs(collection(db, "cidades")),
      getDocs(collection(db, "escolas")),
      getDocs(collection(db, "olimpiadas")),
      getDocs(collection(db, "cronogramas")),
      getDocs(collection(db, "resultados")),
      getDocs(collection(db, "materiais")),
      getDocs(collection(db, "usuarios"))
    ]);

    cachedCidades = snapCid.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedEscolas = snapEsc.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedOlimpiadas = snapOli.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedCronogramas = snapCro.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedResultados = snapRes.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedMateriais = snapMat.docs.map(d => ({ id: d.id, ...d.data() }));
    cachedUsuarios = snapUse.docs.map(d => ({ id: d.id, ...d.data() }));

    // Atualiza contadores analíticos e listas suspensas
    recarregarMétricasCardsDashboard();
    renderizarTabelasEAbas();
    alimentarDropdownsFiltroESelects();
    atualizarGraficoDashboard();
    renderizarCardsSalasMonitoria();

  } catch (error) {
    console.error("Erro geral na sincronização Firestore: ", error);
  } finally {
    if (loading) loading.classList.add("hidden");
  }
}

function recarregarMétricasCardsDashboard() {
  document.getElementById("cardCidades").textContent = cachedCidades.length;
  document.getElementById("cardEscolas").textContent = cachedEscolas.length;
  document.getElementById("cardOlimpiadas").textContent = cachedOlimpiadas.length;
  document.getElementById("cardMedalhas").textContent = cachedResultados.length;
}

// ========================================================
// 🖥️ NAVEGAÇÃO E RE-RENDERIZAÇÃO DE INTERFACE
// ========================================================
function alternarAba(abaId) {
  document.querySelectorAll(".sub-view").forEach(view => view.style.display = "none");
  const abaAlvo = document.getElementById(abaId);
  if (abaAlvo) abaAlvo.style.display = "block";

  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("bg-gray-700", "text-white"));
  const btnActive = document.getElementById(`btn-${abaId}`);
  if (btnActive) btnActive.classList.add("bg-gray-700", "text-white");
}

function renderizarTabelasEAbas() {
  renderTabelaCidades();
  renderTabelaEscolas();
  renderTabelaUsuarios();
  renderTabelaOlimpiadas();
  filtrarTabelaCronogramas();
  filtrarTabelaResultados();
  filtrarTabelaMateriais();
}

function alimentarDropdownsFiltroESelects() {
  const sEscCidade = document.getElementById("escCidade");
  const sUserCid = document.getElementById("userVinculoCidade");
  const sUserEsc = document.getElementById("userVinculoEscola");
  const sCroOli = document.getElementById("croOlimpiadaId");
  const sFiltroCro = document.getElementById("filtroCronogramaOlimpiada");
  const sResOli = document.getElementById("resOlimpiadaId");
  const sResEsc = document.getElementById("resEscolaId");
  const sFiltroResCid = document.getElementById("filtroResCidade");
  const sFiltroResEsc = document.getElementById("filtroResEscola");
  const sMatOli = document.getElementById("matOlimpiadaId");
  const sFiltroMatOli = document.getElementById("filtroMaterialOlimpiada");
  const sFiltroGrafCid = document.getElementById("filtroGraficoCidade");
  const sFiltroGrafEsc = document.getElementById("filtroGraficoEscola");

  const cidadesOps = cachedCidades.map(c => `<option value="${c.id}">${escapeHtml(c.nome)} (${escapeHtml(c.uf)})</option>`).join("");
  const escolasOps = cachedEscolas.map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join("");
  const olimpiadasOps = cachedOlimpiadas.map(o => `<option value="${o.id}">${escapeHtml(o.nome)} [${escapeHtml(o.componente)}]</option>`).join("");

  if (sEscCidade) sEscCidade.innerHTML = cidadesOps;
  if (sUserCid) sUserCid.innerHTML = cidadesOps;
  if (sUserEsc) sUserEsc.innerHTML = escolasOps;
  if (sCroOli) sCroOli.innerHTML = olimpiadasOps;
  if (sResOli) sResOli.innerHTML = olimpiadasOps;
  if (sResEsc) sResEsc.innerHTML = escolasOps;
  if (sMatOli) sMatOli.innerHTML = olimpiadasOps;

  // Filtros estruturados
  if (sFiltroCro) sFiltroCro.innerHTML = `<option value="">Filtrar Olimpíada...</option>` + olimpiadasOps;
  if (sFiltroMatOli) sFiltroMatOli.innerHTML = `<option value="">Filtrar Olimpíada...</option>` + olimpiadasOps;
  
  if (sFiltroResCid) sFiltroResCid.innerHTML = `<option value="">Todas Cidades</option>` + cidadesOps;
  if (sFiltroResEsc) sFiltroResEsc.innerHTML = `<option value="">Todas Escolas</option>` + escolasOps;
  if (sFiltroGrafCid) sFiltroGrafCid.innerHTML = `<option value="">Cidades Consolidadas</option>` + cidadesOps;
  if (sFiltroGrafEsc) sFiltroGrafEsc.innerHTML = `<option value="">Todas Unidades</option>` + escolasOps;
}

// ========================================================
// 🏙️ OPERAÇÃO: CIDADES
// ========================================================
async function salvarNovaCidade(e) {
  e.preventDefault();
  const nome = document.getElementById("cidNome").value.trim();
  const sigla = document.getElementById("cidSigla").value.trim().toUpperCase();
  const uf = document.getElementById("cidUf").value.trim().toUpperCase();

  await addDoc(collection(db, "cidades"), { nome, sigla, uf });
  document.getElementById("formCidade").reset();
  await sincronizarBaseNuvemFirestore();
}

function renderTabelaCidades() {
  const tbody = document.getElementById("tabelaCidadesBody");
  tbody.innerHTML = "";
  cachedCidades.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-semibold text-white">${escapeHtml(c.nome)}</td>
      <td class="p-4 text-gray-400"><code>${escapeHtml(c.sigla)}</code></td>
      <td class="p-4 text-gray-300">${escapeHtml(c.uf)}</td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirCidade('${c.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirCidade(id) {
  const vinculada = cachedEscolas.some(e => e.cidadeId === id);
  if (vinculada) return alert("Erro de Governança: Impossível excluir cidade com escolas vinculadas!");
  if (!confirm("Confirmar deleção permanente no Cloud Firestore?")) return;
  await deleteDoc(doc(db, "cidades", id));
  await sincronizarBaseNuvemFirestore();
}

// ========================================================
// 🏫 OPERAÇÃO: ESCOLAS
// ========================================================
async function salvarNovaEscola(e) {
  e.preventDefault();
  const novaEsc = {
    nome: document.getElementById("escNome").value.trim(),
    razaoSocial: document.getElementById("escRazao").value.trim(),
    cidadeId: document.getElementById("escCidade").value,
    cnpj: document.getElementById("escCnpj").value.trim(),
    inep: document.getElementById("escInep").value.trim(),
    endereco: document.getElementById("escEndereco").value.trim(),
    cep: document.getElementById("escCep").value.trim(),
    diretor: document.getElementById("escDiretor").value.trim(),
    email: document.getElementById("escEmail").value.trim()
  };

  await addDoc(collection(db, "escolas"), novaEsc);
  document.getElementById("formEscola").reset();
  await sincronizarBaseNuvemFirestore();
}

function renderTabelaEscolas() {
  const tbody = document.getElementById("tabelaEscolasBody");
  tbody.innerHTML = "";
  cachedEscolas.forEach(e => {
    const cid = cachedCidades.find(c => c.id === e.cidadeId);
    const labelCid = cid ? `${cid.nome} (${cid.uf})` : "Desconhecida";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-semibold text-white">${escapeHtml(e.nome)}<br><small class="text-gray-500">${escapeHtml(e.razaoSocial)}</small></td>
      <td class="p-4 text-gray-300 text-xs">${escapeHtml(labelCid)}</td>
      <td class="p-4 text-gray-400 text-xs">INEP: ${escapeHtml(e.inep)}<br>CNPJ: ${escapeHtml(e.cnpj)}</td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirEscola('${e.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirEscola(id) {
  if (!confirm("Remover esta escola permanentemente?")) return;
  await deleteDoc(doc(db, "escolas", id));
  await sincronizarBaseNuvemFirestore();
}

// ========================================================
// 👤 OPERAÇÃO: USUÁRIOS
// ========================================================
function ajustarCamposFormUsuario() {
  const role = document.getElementById("userRole").value;
  const blocoCid = document.getElementById("blocoVinculoCidade");
  const blocoEsc = document.getElementById("blocoVinculoEscola");

  blocoCid.classList.add("hidden");
  blocoEsc.classList.add("hidden");

  if (role === "Gestor") blocoCid.classList.remove("hidden");
  if (role === "Escola" || role === "Aluno") blocoEsc.classList.remove("hidden");
}

async function salvarNovoUsuario(e) {
  e.preventDefault();
  const role = document.getElementById("userRole").value;
  let vinculoId = "";

  if (role === "Gestor") vinculoId = document.getElementById("userVinculoCidade").value;
  if (role === "Escola" || role === "Aluno") vinculoId = document.getElementById("userVinculoEscola").value;

  const novoUser = {
    role,
    username: document.getElementById("userUsername").value.trim(),
    fullname: document.getElementById("userFullname").value.trim(),
    password: document.getElementById("userPassword").value,
    vinculoId
  };

  await addDoc(collection(db, "usuarios"), novoUser);
  document.getElementById("formUsuario").reset();
  ajustarCamposFormUsuario();
  await sincronizarBaseNuvemFirestore();
}

function renderTabelaUsuarios() {
  const tbody = document.getElementById("tabelaUsuariosBody");
  tbody.innerHTML = "";
  cachedUsuarios.forEach(u => {
    let escopo = "Acesso Geral Master";
    if (u.role === "Gestor") {
      const c = cachedCidades.find(cid => cid.id === u.vinculoId);
      if (c) escopo = `Cidade: ${c.nome}-${c.uf}`;
    } else if (u.role === "Escola" || u.role === "Aluno") {
      const e = cachedEscolas.find(esc => esc.id === u.vinculoId);
      if (e) escopo = `Escola: ${e.nome}`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-mono text-xs text-blue-400">@${escapeHtml(u.username)}</td>
      <td class="p-4 font-semibold text-white">${escapeHtml(u.fullname)}</td>
      <td class="p-4 text-xs"><span class="px-2 py-0.5 rounded bg-gray-700 text-gray-300 border border-gray-600">${escapeHtml(u.role)}</span></td>
      <td class="p-4 text-gray-400 text-xs">${escapeHtml(escopo)}</td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirUsuario('${u.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirUsuario(id) {
  if (!confirm("Deletar conta corporativa selecionada permanentemente?")) return;
  await deleteDoc(doc(db, "usuarios", id));
  await sincronizarBaseNuvemFirestore();
}

// ========================================================
// 🏆 OPERAÇÃO: OLIMPÍADAS
// ========================================================
async function salvarNovaOlimpiada(e) {
  e.preventDefault();
  const nome = document.getElementById("olimpNome").value.trim();
  const componente = document.getElementById("olimpComponente").value;

  await addDoc(collection(db, "olimpiadas"), { nome, componente });
  document.getElementById("formOlimpiada").reset();
  await sincronizarBaseNuvemFirestore();
}

function renderTabelaOlimpiadas() {
  const tbody = document.getElementById("tabelaOlimpiadasBody");
  tbody.innerHTML = "";
  cachedOlimpiadas.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-mono text-xs text-gray-500">${o.id.substring(0,6)}...</td>
      <td class="p-4 font-semibold text-white">${escapeHtml(o.nome)}</td>
      <td class="p-4 text-xs text-amber-400 font-medium"><i class="fa-solid fa-tags mr-1"></i>${escapeHtml(o.componente)}</td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirOlimpiada('${o.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirOlimpiada(id) {
  if (!confirm("Excluir esta olimpíada do catálogo?")) return;
  await deleteDoc(doc(db, "olimpiadas", id));
  await sincronizarBaseNuvemFirestore();
}

// ========================================================
// 📅 OPERAÇÃO: CRONOGRAMAS E FAZES (MANUAL / EXCEL)
// ========================================================
async function salvarNovoCronograma(e) {
  e.preventDefault();
  const novoCro = {
    olimpiadaId: document.getElementById("croOlimpiadaId").value,
    fase: document.getElementById("croFase").value.trim(),
    dataInicio: document.getElementById("croDataInicio").value,
    dataFim: document.getElementById("croDataFim").value
  };

  await addDoc(collection(db, "cronogramas"), novoCro);
  document.getElementById("formCronograma").reset();
  await sincronizarBaseNuvemFirestore();
}

function filtrarTabelaCronogramas() {
  const filtroId = document.getElementById("filtroCronogramaOlimpiada").value;
  const tbody = document.getElementById("tabelaCronogramasBody");
  tbody.innerHTML = "";

  const listaFiltrada = filtroId ? cachedCronogramas.filter(c => c.olimpiadaId === filtroId) : cachedCronogramas;
  const hojeStr = new Date().toISOString().split("T")[0];

  listaFiltrada.forEach(c => {
    const oli = cachedOlimpiadas.find(o => o.id === c.olimpiadaId);
    const labelOli = oli ? oli.nome : "Desconhecida";

    let status = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Ativo</span>`;
    if (hojeStr > c.dataFim) {
      status = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">Encerrado</span>`;
    } else if (hojeStr < c.dataInicio) {
      status = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Futuro</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-semibold text-white">${escapeHtml(labelOli)}</td>
      <td class="p-4 text-gray-300 text-xs">${escapeHtml(c.fase)}</td>
      <td class="p-4 text-gray-400 text-xs">${formatarDataBR(c.dataInicio)}</td>
      <td class="p-4 text-gray-400 text-xs">${formatarDataBR(c.dataFim)}</td>
      <td class="p-4 text-center">${status}</td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirCronograma('${c.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirCronograma(id) {
  if (!confirm("Excluir este prazo permanentemente da nuvem?")) return;
  await deleteDoc(doc(db, "cronogramas", id));
  await sincronizarBaseNuvemFirestore();
}

function downloadCronogramaTemplate() {
  const estrutura = [
    ["Olimpíada", "Fase / Evento Mapeado", "Data Início (AAAA-MM-DD)", "Data Fim (AAAA-MM-DD)"],
    ["OBMEP", "Aplicação da Prova 1ª Fase", "2026-06-02", "2026-06-02"],
    ["Canguru de Matemática", "Divulgação dos Prêmios Oficiais", "2026-05-20", "2026-05-20"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(estrutura);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cronogramas");
  XLSX.writeFile(wb, "Modelo_Cronograma_Lote.xlsx");
}

function importarLoteCronogramaExcel(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const bytes = new Uint8Array(e.target.result);
    const workbook = XLSX.read(bytes, { type: "array" });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    let importadosCount = 0;
    for (const r of rows) {
      const nomeOli = r["Olimpíada"];
      const fase = r["Fase / Evento Mapeado"];
      const start = converterDataExcel(r["Data Início (AAAA-MM-DD)"]);
      const end = converterDataExcel(r["Data Fim (AAAA-MM-DD)"]);

      if (!nomeOli || !fase) continue;

      let oli = cachedOlimpiadas.find(o => o.nome.toLowerCase() === nomeOli.trim().toLowerCase());
      if (!oli) {
        const docRef = await addDoc(collection(db, "olimpiadas"), { nome: nomeOli.trim(), componente: "Matemática" });
        oli = { id: docRef.id };
      }

      await addDoc(collection(db, "cronogramas"), {
        olimpiadaId: oli.id,
        fase: String(fase).trim(),
        dataInicio: start,
        dataFim: end
      });
      importadosCount++;
    }
    alert(`Sucesso! ${importadosCount} prazos olímpicos processados em lote para o Firestore.`);
    input.value = "";
    await sincronizarBaseNuvemFirestore();
  };
  reader.readAsArrayBuffer(file);
}

// ========================================================
// 🏅 OPERAÇÃO: RESULTADOS E MEDALHISTAS
// ========================================================
async function salvarNovoResultado(e) {
  e.preventDefault();
  const novoRes = {
    olimpiadaId: document.getElementById("resOlimpiadaId").value,
    escolaId: document.getElementById("resEscolaId").value,
    aluno: document.getElementById("resAlunoNome").value.trim(),
    serie: document.getElementById("resSerie").value,
    premio: document.getElementById("resPremio").value,
    ano: parseInt(document.getElementById("resAno").value) || 2026
  };

  await addDoc(collection(db, "resultados"), novoRes);
  document.getElementById("resAlunoNome").value = "";
  await sincronizarBaseNuvemFirestore();
}

function filtrarTabelaResultados() {
  const fCid = document.getElementById("filtroResCidade").value;
  const fEsc = document.getElementById("filtroResEscola").value;
  const fPre = document.getElementById("filtroResPremio").value;
  const tbody = document.getElementById("tabelaResultadosBody");
  tbody.innerHTML = "";

  // Escopo de Visibilidade Restrita Dinâmica para Escolas e Alunos
  let baseResultados = cachedResultados;
  if (usuarioLogado.role === "Escola" || usuarioLogado.role === "Aluno") {
    baseResultados = cachedResultados.filter(r => r.escolaId === usuarioLogado.vinculoId);
  } else if (usuarioLogado.role === "Gestor") {
    const escolasDaCidade = cachedEscolas.filter(esc => esc.cidadeId === usuarioLogado.vinculoId).map(esc => esc.id);
    baseResultados = cachedResultados.filter(r => escolasDaCidade.includes(r.escolaId));
  }

  baseResultados.forEach(r => {
    const oli = cachedOlimpiadas.find(o => o.id === r.olimpiadaId);
    const esc = cachedEscolas.find(e => e.id === r.escolaId);
    if (!oli || !esc) return; // proteção de integridade

    if (fCid && esc.cidadeId !== fCid) return;
    if (fEsc && r.escolaId !== fEsc) return;
    if (fPre && r.premio !== fPre) return;

    const cid = cachedCidades.find(c => c.id === esc.cidadeId);
    const labelLocal = cid ? `${esc.nome} (${cid.sigla})` : esc.nome;

    let badgeCor = "bg-amber-500/10 text-amber-400 border-amber-500/20"; // Ouro
    if (r.premio === "Prata") badgeCor = "bg-slate-300/10 text-slate-300 border-slate-300/20";
    if (r.premio === "Bronze") badgeCor = "bg-orange-400/10 text-orange-400 border-orange-400/20";
    if (r.premio === "Menção Honrosa") badgeCor = "bg-blue-400/10 text-blue-400 border-blue-400/20";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-bold text-white">${escapeHtml(r.aluno)}</td>
      <td class="p-4 text-gray-300 text-xs">${escapeHtml(labelLocal)}</td>
      <td class="p-4 text-gray-400 text-xs">${escapeHtml(oli.nome)}</td>
      <td class="p-4 text-gray-400 text-xs">${escapeHtml(r.serie)}</td>
      <td class="p-4 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold border ${badgeCor}">${escapeHtml(r.premio)}</span></td>
      <td class="p-4 text-center text-xs text-gray-400">${r.ano}</td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirResultado('${r.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirResultado(id) {
  if (!confirm("Remover este prêmio de aluno permanentemente do Firestore?")) return;
  await deleteDoc(doc(db, "resultados", id));
  await sincronizarBaseNuvemFirestore();
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws_data = [
    ["Estudante", "Escola Mapeada", "Olimpíada", "Série / Ano", "Medalha obtida", "Ano Letivo"],
    ["Maxwell Silva", "Unidade Escolar Propósito", "OBMEP", "9º Ano EF", "Ouro", "2026"],
    ["Ana Oliveira", "Unidade Escolar Propósito", "Canguru de Matemática", "1ª Série EM", "Prata", "2026"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Destaques");
  XLSX.writeFile(wb, "Template_Importacao_Avance.xlsx");
}

function importarLoteResultadosExcel(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const bytes = new Uint8Array(e.target.result);
    const workbook = XLSX.read(bytes, { type: "array" });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json(ws);

    let count = 0;
    for (const row of jsonRows) {
      const aluno = row["Estudante"];
      const nomeEsc = row["Escola Mapeada"];
      const nomeOli = row["Olimpíada"];
      const serie = row["Série / Ano"];
      const premio = row["Medalha obtida"];
      const ano = parseInt(row["Ano Letivo"]) || 2026;

      if (!aluno || !nomeEsc || !nomeOli || !premio) continue;

      let esc = cachedEscolas.find(e => e.nome.toLowerCase() === nomeEsc.trim().toLowerCase());
      if (!esc) {
        let defaultCid = cachedCidades[0];
        if (!defaultCid) continue;
        const refEsc = await addDoc(collection(db, "escolas"), { nome: nomeEsc.trim(), cidadeId: defaultCid.id, inep: "00000000", cnpj: "00.000.000/0001-00" });
        esc = { id: refEsc.id };
      }

      let oli = cachedOlimpiadas.find(o => o.nome.toLowerCase() === nomeOli.trim().toLowerCase());
      if (!oli) {
        const refOli = await addDoc(collection(db, "olimpiadas"), { nome: nomeOli.trim(), componente: "Matemática" });
        oli = { id: refOli.id };
      }

      await addDoc(collection(db, "resultados"), {
        aluno: String(aluno).trim(),
        escolaId: esc.id,
        olimpiadaId: oli.id,
        serie: String(serie || "9º Ano EF"),
        premio: String(premio).trim(),
        ano
      });
      count++;
    }

    alert(`Sucesso! ${count} registros estudantis injetados nativamente na nuvem.`);
    input.value = "";
    await sincronizarBaseNuvemFirestore();
  };
  reader.readAsArrayBuffer(file);
}

// ========================================================
// 📈 MOTOR DE PROCESSAMENTO DO CHART.JS (DASHBOARD)
// ========================================================
function atualizarGraficoDashboard() {
  const canvas = document.getElementById("dashboardChart");
  if (!canvas) return;

  const fCid = document.getElementById("filtroGraficoCidade").value;
  const fEsc = document.getElementById("filtroGraficoEscola").value;

  // Filtra com base nos escopos selecionados
  let resultadosProcessados = cachedResultados;
  if (fEsc) {
    resultadosProcessados = cachedResultados.filter(r => r.escolaId === fEsc);
  } else if (fCid) {
    const escIds = cachedEscolas.filter(e => e.cidadeId === fCid).map(e => e.id);
    resultadosProcessados = cachedResultados.filter(r => escIds.includes(r.escolaId));
  }

  // Agrega contadores por medalhas
  const contadores = { Ouro: 0, Prata: 0, Bronze: 0, "Menção Honrosa": 0 };
  resultadosProcessados.forEach(r => {
    if (contadores[r.premio] !== undefined) contadores[r.premio]++;
  });

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Ouro", "Prata", "Bronze", "Menção Honrosa"],
      datasets: [{
        label: "Medalhas Homologadas",
        data: [contadores.Ouro, contadores.Prata, contadores.Bronze, contadores["Menção Honrosa"]],
        backgroundColor: [
          "rgba(245, 158, 11, 0.4)", // Ouro soft
          "rgba(203, 213, 225, 0.4)", // Prata soft
          "rgba(251, 146, 60, 0.4)",  // Bronze soft
          "rgba(96, 165, 250, 0.4)"   // MH soft
        ],
        borderColor: ["#f59e0b", "#cbd5e1", "#fb923c", "#60a5fa"],
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { padding: 12, cornerRadius: 8 }
      },
      scales: {
        y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af", precision: 0 } },
        x: { grid: { display: false }, ticks: { color: "#9ca3af" } }
      }
    }
  });
}

// ========================================================
// 📁 OPERAÇÃO: MATERIAL OLÍMPICO (STORAGE + FIRESTORE)
// ========================================================
function ajustarCamposFormMaterial() {
  // Mantido para compatibilidade e futuras automações do formulário
}

async function salvarNovoMaterial(e) {
  e.preventDefault();
  const fileInput = document.getElementById("matArquivoInput");
  const btn = document.getElementById("btnSubmitMaterial");
  const file = fileInput.files[0];

  if (!file) return alert("Erro: Selecione um arquivo físico para envio!");

  btn.disabled = true;
  btn.textContent = "Carregando arquivo...";

  try {
    // 1. Envia o arquivo físico binário para o Firebase Storage
    const nomeSanitizado = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const storageRef = ref(storage, `materiais/${nomeSanitizado}`);
    const snap = await uploadBytes(storageRef, file);
    const urlDownload = await getDownloadURL(snap.ref);

    // 2. Registra o documento metadado no Cloud Firestore
    const novoDoc = {
      titulo: document.getElementById("matTitulo").value.trim(),
      olimpiadaId: document.getElementById("matOlimpiadaId").value,
      categoria: document.getElementById("matCategoria").value,
      nivel: document.getElementById("matNivel").value.trim(),
      encontro: parseInt(document.getElementById("matEncontro").value) || 0,
      fileUrl: urlDownload,
      storagePath: `materiais/${nomeSanitizado}`,
      fileSize: file.size
    };

    await addDoc(collection(db, "materiais"), novoDoc);
    document.getElementById("formMaterial").reset();
    await sincronizarBaseNuvemFirestore();
    alert("Material pedagógico hospedado e disponibilizado com sucesso!");

  } catch (error) {
    console.error("Erro no upload de material: ", error);
    alert("Falha crítica de comunicação com o Storage.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar para Nuvem Storage";
  }
}

function filtrarTabelaMateriais() {
  const fOli = document.getElementById("filtroMaterialOlimpiada").value;
  const tbody = document.getElementById("tabelaMateriaisBody");
  tbody.innerHTML = "";

  const listaFiltrada = fOli ? cachedMateriais.filter(m => m.olimpiadaId === fOli) : cachedMateriais;

  listaFiltrada.forEach(m => {
    const oli = cachedOlimpiadas.find(o => o.id === m.olimpiadaId);
    const labelOli = oli ? oli.nome : "Geral";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-4 font-semibold text-white">${escapeHtml(m.titulo)}<br><small class="text-gray-500">${escapeHtml(labelOli)}</small></td>
      <td class="p-4 text-xs text-gray-300">${escapeHtml(m.categoria)}</td>
      <td class="p-4 text-xs text-blue-400 font-mono">${escapeHtml(m.nivel)} (Mód. ${m.encontro})</td>
      <td class="p-4 text-xs text-gray-400">${formatBytes(m.fileSize)}</td>
      <td class="p-4 text-center">
        <a href="${m.fileUrl}" target="_blank" class="text-blue-400 hover:text-blue-300 text-base"><i class="fa-solid fa-cloud-arrow-down"></i></a>
      </td>
      <td class="p-4 text-center action-adm">
        <button onclick="excluirMaterial('${m.id}')" class="text-red-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  aplicarGovernancaMenusUI();
}

async function excluirMaterial(id) {
  const mat = cachedMateriais.find(m => m.id === id);
  if (!mat) return;
  if (!confirm(`Remover definitivamente "${mat.titulo}"?`)) return;

  try {
    if (mat.storagePath) {
      await deleteObject(ref(storage, mat.storagePath));
    }
    await deleteDoc(doc(db, "materiais", id));
    await sincronizarBaseNuvemFirestore();
  } catch (error) {
    console.error(error);
    // Remove o registro do Firestore mesmo se o arquivo físico foi removido do Storage manualmente
    await deleteDoc(doc(db, "materiais", id));
    await sincronizarBaseNuvemFirestore();
  }
}

// ========================================================
// 🎦 OPERAÇÃO: SALA DE MONITORIA AO VIVO (RTDB + WEBRTC)
// ========================================================
function renderizarCardsSalasMonitoria() {
  const container = document.getElementById("gradeSalasMonitoria");
  if (!container) return;
  container.innerHTML = "";

  const frentes = ["Matemática Olímpica", "Física Avançada", "Química Júnior", "Biologia e Biotec", "Astronomia e Espaço"];
  frentes.forEach(f => {
    const card = document.createElement("div");
    card.className = "bg-gray-800 border border-gray-700 p-6 rounded-2xl flex flex-col justify-between space-y-4";
    card.innerHTML = `
      <div>
        <span class="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wide">Frente Oficial</span>
        <h4 class="text-base font-bold text-white mt-2">${f}</h4>
        <p class="text-xs text-gray-400 mt-1">Sala de apoio para tirar dúvidas e resoluções.</p>
      </div>
      <button onclick="entrarSalaMonitoria('${f}')" class="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-1">
        Conectar à Sala <i class="fa-solid fa-circle-arrow-right"></i>
      </button>
    `;
    container.innerHTML += card.outerHTML;
  });
}

function entrarSalaMonitoria(tituloSala) {
  salaMoniAtual = sanitizeFileName(tituloSala);
  document.getElementById("monitoriaTituloSala").textContent = tituloSala;
  
  document.getElementById("gradeSalasMonitoria").style.display = "none";
  document.getElementById("painelSalaAberta").classList.remove("hidden");

  const msgBox = document.getElementById("monitoriaMensagensBox");
  msgBox.innerHTML = `<p class="text-center text-xs text-gray-500">Conectado. Carregando histórico em tempo real...</p>`;

  // Desconecta listeners ativos anteriores para evitar vazamento de memória
  if (monitoriaListenerAtivo) monitoriaListenerAtivo();

  // Ativa escuta em tempo real no Firebase Realtime Database
  const salaRef = rRef(rtdb, `monitorias/${salaMoniAtual}/chat`);
  onValue(salaRef, (snapshot) => {
    msgBox.innerHTML = "";
    if (!snapshot.exists()) {
      msgBox.innerHTML = `<p class="text-center text-xs text-gray-600">Nenhuma dúvida enviada nesta sala ainda.</p>`;
      return;
    }
    snapshot.forEach(child => {
      const m = child.data || child.val();
      const bubble = document.createElement("div");
      bubble.className = `p-3 rounded-xl max-w-xl text-xs space-y-1 ${m.user === usuarioLogado.fullname ? "bg-blue-600/20 border border-blue-500/30 ml-auto text-right" : "bg-gray-700/50 border border-gray-600/30 mr-auto"}`;
      
      let anexoHtml = "";
      if (m.fileUrl) {
        if (m.fileType && m.fileType.startsWith("image/")) {
          anexoHtml = `<div class="mt-2"><img src="${m.fileUrl}" class="max-w-xs rounded-lg border border-gray-700 aspect-auto block cursor-zoom-in" onclick="window.open('${m.fileUrl}')"></div>`;
        } else {
          anexoHtml = `<div class="mt-2"><a href="${m.fileUrl}" target="_blank" class="inline-flex items-center gap-1.5 p-2 bg-gray-900 rounded-lg border border-gray-700 text-blue-400 hover:underline"><i class="fa-solid fa-file-arrow-down"></i> Baixar Anexo</a></div>`;
        }
      }

      bubble.innerHTML = `
        <span class="text-[10px] font-bold block ${m.user === usuarioLogado.fullname ? "text-blue-400" : "text-amber-400"}">${escapeHtml(m.user)} <span class="text-gray-500 font-normal">(${escapeHtml(m.role)})</span></span>
        <p class="text-gray-200 block whitespace-pre-wrap mt-1">${escapeHtml(m.text)}</p>
        ${anexoHtml}
      `;
      msgBox.appendChild(bubble);
    });
    msgBox.scrollTop = msgBox.scrollHeight;
  });

  // Ativa escuta das sinalizações WebRTC para chamadas ponto-a-ponto
  ouvirSinalizacaoRTC();
}

function fecharModalMonitoria() {
  encerrarChamadaMonitoria();
  salaMoniAtual = null;
  document.getElementById("gradeSalasMonitoria").style.display = "grid";
  document.getElementById("painelSalaAberta").classWithRef = document.getElementById("painelSalaAberta").classList.add("hidden");
}

async function enviarMensagemMonitoria(fileData = null) {
  const inp = document.getElementById("monitoriaInput");
  const txt = inp.value.trim();

  if (!txt && !fileData) return;

  const msgRef = rRef(rtdb, `monitorias/${salaMoniAtual}/chat`);
  const novaMsgRef = push(msgRef);
  
  await set(novaMsgRef, {
    user: usuarioLogado.fullname,
    role: usuarioLogado.role,
    text: txt,
    timestamp: Date.now(),
    fileUrl: fileData ? fileData.url : "",
    fileType: fileData ? fileData.type : ""
  });

  inp.value = "";
}

function abrirSeletorArquivoMonitoria() {
  document.getElementById("monitoriaFileInput").click();
}

async function enviarArquivoMonitoria(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return alert("Erro: O arquivo excede o limite corporativo de 10 MB!");

  const inpTxt = document.getElementById("monitoriaInput");
  const antigoTxt = inpTxt.value;
  inpTxt.disabled = true;
  inpTxt.value = "Fazendo upload do anexo...";

  try {
    const path = `monitoria_anexos/${salaMoniAtual}_${Date.now()}_${sanitizeFileName(file.name)}`;
    const sRef = ref(storage, path);
    const snap = await uploadBytes(sRef, file);
    const url = await getDownloadURL(snap.ref);

    await enviarMensagemMonitoria({ url, type: file.type });
  } catch (error) {
    console.error(error);
    alert("Falha ao hospedar anexo na nuvem.");
  } finally {
    inpTxt.disabled = false;
    inpTxt.value = antigoTxt;
    input.value = "";
  }
}

// ========================================================
// 📞 ENGINE WEBRTC (VÍDEO / VOZ EM TEMPO REAL)
// ========================================================
function ouvirSinalizacaoRTC() {
  if (!salaMoniAtual) return;
  
  // Limpa ouvintes antigos
  rtcListenersAtivos.forEach(unsub => unsub());
  rtcListenersAtivos = [];
  rtcCandidatosProcessados.clear();

  const rootRef = rRef(rtdb, `monitorias/${salaMoniAtual}/rtc`);
  
  // Ouve Ofertas (Offers)
  onValue(rRef(rtdb, `monitorias/${salaMoniAtual}/rtc/offer`), async (snapshot) => {
    if (snapshot.exists() && !chamadaMonitoriaAtiva) {
      const offerData = snapshot.val();
      if (offerData.remetente !== usuarioLogado.username) {
        tipoChamadaMonitoriaAtual = offerData.tipo || "video";
        if (confirm(`@${offerData.remetente} está te chamando para monitoria por ${tipoChamadaMonitoriaAtual}. Aceitar?`)) {
          await responderChamadaRTC(offerData.sdp);
        }
      }
    }
  });

  // Ouve Respostas (Answers)
  onValue(rRef(rtdb, `monitorias/${salaMoniAtual}/rtc/answer`), async (snapshot) => {
    if (snapshot.exists() && rtcPeerConnection && rtcPeerConnection.signalingState === "have-local-offer") {
      const answerData = snapshot.val();
      if (answerData.remetente !== usuarioLogado.username) {
        await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(answerData.sdp));
      }
    }
  });

  // Ouve Candidatos ICE
  onValue(rRef(rtdb, `monitorias/${salaMoniAtual}/rtc/ice_candidates`), (snapshot) => {
    if (snapshot.exists() && rtcPeerConnection) {
      snapshot.forEach(child => {
        const candidateData = child.val();
        if (candidateData.remetente !== usuarioLogado.username && !rtcCandidatosProcessados.has(child.key)) {
          rtcCandidatosProcessados.add(child.key);
          rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidateData.candidate)).catch(e => {});
        }
      });
    }
  });
}

async function prepararMidiaLocal(comVideo = true) {
  try {
    localMediaStream = await navigator.mediaDevices.getUserMedia({
      video: comVideo,
      audio: true
    });
    const localVideoEl = document.getElementById("monitoriaLocalVideo");
    if (localVideoEl) localVideoEl.srcObject = localMediaStream;
  } catch (error) {
    console.warn("Dispositivo multimídia indisponível. Continuando sem captura local: ", error);
  }
}

function inicializarPeerConnection() {
  rtcPeerConnection = new RTCPeerConnection(RTC_CONFIG);
  remoteMediaStream = new MediaStream();
  
  const remoteVideoEl = document.getElementById("monitoriaRemoteVideo");
  if (remoteVideoEl) remoteVideoEl.srcObject = remoteMediaStream;

  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, localMediaStream));
  }

  rtcPeerConnection.ontrack = (event) => {
    document.getElementById("monitoriaAvisoSemConexao").style.display = "none";
    event.streams[0].getTracks().forEach(track => remoteMediaStream.addTrack(track));
  };

  rtcPeerConnection.onicecandidate = (event) => {
    if (event.candidate && salaMoniAtual) {
      const candidatesRef = rRef(rtdb, `monitorias/${salaMoniAtual}/rtc/ice_candidates`);
      push(candidatesRef, {
        remetente: usuarioLogado.username,
        candidate: event.candidate.toJSON()
      });
    }
  };
}

async function iniciarChamadaVideoMonitoria() {
  tipoChamadaMonitoriaAtual = "video";
  await dispararChamadaRTC(true);
}

async function iniciarChamadaVozMonitoria() {
  tipoChamadaMonitoriaAtual = "voz";
  await dispararChamadaRTC(false);
}

async function dispararChamadaRTC(comVideo) {
  chamadaMonitoriaAtiva = true;
  alternarEstadoBotoesRTCUI(true);

  await prepararMidiaLocal(comVideo);
  inicializarPeerConnection();

  const offer = await rtcPeerConnection.createOffer();
  await rtcPeerConnection.setLocalDescription(offer);

  const offerRef = rRef(rtdb, `monitorias/${salaMoniAtual}/rtc/offer`);
  await set(offerRef, {
    remetente: usuarioLogado.username,
    tipo: tipoChamadaMonitoriaAtual,
    sdp: offer.sdp
  });
}

async function responderChamadaRTC(offerSdp) {
  chamadaMonitoriaAtiva = true;
  alternarEstadoBotoesRTCUI(true);

  await prepararMidiaLocal(tipoChamadaMonitoriaAtual === "video");
  inicializarPeerConnection();

  await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offerSdp }));
  const answer = await rtcPeerConnection.createAnswer();
  await rtcPeerConnection.setLocalDescription(answer);

  const answerRef = rRef(rtdb, `monitorias/${salaMoniAtual}/rtc/answer`);
  await set(answerRef, {
    remetente: usuarioLogado.username,
    sdp: answer.sdp
  });
}

function alternarMicrofoneMonitoria() {
  if (localMediaStream) {
    const audioTrack = localMediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      document.getElementById("btnMoniAlternarMic").innerHTML = audioTrack.enabled ? `<i class="fa-solid fa-microphone"></i>` : `<i class="fa-solid fa-microphone-slash text-red-400"></i>`;
    }
  }
}

function alternarCameraMonitoria() {
  if (localMediaStream) {
    const videoTrack = localMediaStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      document.getElementById("btnMoniAlternarCam").innerHTML = videoTrack.enabled ? `<i class="fa-solid fa-video"></i>` : `<i class="fa-solid fa-video-slash text-red-400"></i>`;
    }
  }
}

async function encerrarChamadaMonitoria() {
  chamadaMonitoriaAtiva = false;
  alternarEstadoBotoesRTCUI(false);

  if (rtcPeerConnection) {
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
    localMediaStream = null;
  }
  
  document.getElementById("monitoriaLocalVideo").srcObject = null;
  document.getElementById("monitoriaRemoteVideo").srcObject = null;
  document.getElementById("monitoriaAvisoSemConexao").style.display = "flex";

  // Limpa referências na nuvem
  if (salaMoniAtual) {
    await remove(rRef(rtdb, `monitorias/${salaMoniAtual}/rtc`));
    ouvirSinalizacaoRTC();
  }
}

function alternarEstadoBotoesRTCUI(emChamada) {
  document.getElementById("btnMoniChamadaVideo").disabled = emChamada;
  document.getElementById("btnMoniChamadaVoz").disabled = emChamada;
  
  const idsBotoesControle = ["btnMoniAlternarMic", "btnMoniAlternarCam", "btnMoniDesconectarRTC"];
  idsBotoesControle.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = !emChamada;
      if (emChamada) {
        el.classList.remove("opacity-50");
      } else {
        el.classList.add("opacity-50");
      }
    }
  });
}

// ========================================================
// 🧮 FUNÇÕES DE SUPORTE UTILITÁRIAS
// ========================================================
function sanitizeFileName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function escapeHtml(string) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(string).replace(/[&<>"']/g, (m) => map[m]);
}

function formatarDataBR(dateString) {
  if (!dateString) return "-";
  const parts = String(dateString).split("-");
  if (parts.length !== 3) return escapeHtml(dateString);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function converterDataExcel(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.includes("/")) {
      const [day, month, year] = value.split("/");
      if (day && month && year) return `${year.padStart(4, "20")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return value;
  }
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  return "";
}

function formatBytes(bytes) {
  const size = Number(bytes);
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

// Exposição Global de Escopo para Eventos Inline do HTML
window.executarLogin = ejecutarLogin;
window.executarLogout = executarLogout;
window.alternarAba = alternarAba;
window.salvarNovaCidade = salvarNovaCidade;
window.excluirCidade = excluirCidade;
window.salvarNovaEscola = salvarNovaEscola;
window.excluirEscola = excluirEscola;
window.ajustarCamposFormUsuario = ajustarCamposFormUsuario;
window.salvarNovoUsuario = salvarNovoUsuario;
window.excluirUsuario = excluirUsuario;
window.salvarNovaOlimpiada = salvarNovaOlimpiada;
window.excluirOlimpiada = excluirOlimpiada;
window.salvarNovoCronograma = salvarNovoCronograma;
window.excluirCronograma = excluirCronograma;
window.filtrarTabelaCronogramas = filtrarTabelaCronogramas;
window.downloadCronogramaTemplate = downloadCronogramaTemplate;
window.importarLoteCronogramaExcel = importarLoteCronogramaExcel;
window.salvarNovoResultado = salvarNovoResultado;
window.excluirResultado = excluirResultado;
window.filtrarTabelaResultados = filtrarTabelaResultados;
window.downloadTemplate = downloadTemplate;
window.importarLoteResultadosExcel = importarLoteResultadosExcel;
window.atualizarGraficoDashboard = atualizarGraficoDashboard;
window.salvarNovoMaterial = salvarNovoMaterial;
window.excluirMaterial = excluirMaterial;
window.filtrarTabelaMateriais = filtrarTabelaMateriais;
window.ajustarCamposFormMaterial = ajustarCamposFormMaterial;
window.entrarSalaMonitoria = entrarSalaMonitoria;
window.fecharModalMonitoria = fecharModalMonitoria;
window.enviarMensagemMonitoria = enviarMensagemMonitoria;
window.abrirSeletorArquivoMonitoria = abrirSeletorArquivoMonitoria;
window.enviarArquivoMonitoria = enviarArquivoMonitoria;
window.iniciarChamadaVideoMonitoria = iniciarChamadaVideoMonitoria;
window.iniciarChamadaVozMonitoria = iniciarChamadaVozMonitoria;
window.alternarMicrofoneMonitoria = alternarMicrofoneMonitoria;
window.alternarCameraMonitoria = alternarCameraMonitoria;
window.encerrarChamadaMonitoria = encerrarChamadaMonitoria;