import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const APP_VERSION = "APP FIREBASE NOVO - MAXWELL - 2026-05-26-01";
console.log(APP_VERSION);

// ========================================================
// CONFIGURAÇÃO FIREBASE
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

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// ========================================================
// ESTADO GLOBAL
// ========================================================

let currentUser = null;
let cachedCidades = [];
let cachedEscolas = [];
let cachedOlimpiadas = [];
let cachedUsuarios = [];
let cachedArquivos = [];
let lastError = "Nenhum";

// ========================================================
// ATALHOS DE DOM
// ========================================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const loginScreen = $("#login-screen");
const mainSystem = $("#main-system");
const loginForm = $("#login-form");
const loginError = $("#login-error");
const btnLogout = $("#btn-logout");

// ========================================================
// BOOT
// ========================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupMenuNavigation();
  setupFormListeners();
  fillDiagnostics();

  const session = safeParse(localStorage.getItem("avance_session"));

  if (session?.username && session?.role) {
    currentUser = session;
    await bootSystem();
  }
});

// ========================================================
// LOGIN
// ========================================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = $("#username").value.trim();
  const password = $("#password").value;

  if (!username || !password) {
    showLoginError("Informe usuário e senha.");
    return;
  }

  showLoginError("Conectando ao Firebase...");

  try {
    const userQuery = query(
      collection(db, "usuarios"),
      where("username", "==", username),
      where("password", "==", password)
    );

    const snap = await getDocs(userQuery);

    if (snap.empty) {
      showLoginError("Usuário ou senha inválidos. Verifique a coleção usuarios no Firestore.");
      return;
    }

    const userDoc = snap.docs[0];
    const user = userDoc.data();

    currentUser = {
      id: userDoc.id,
      username: user.username,
      fullname: user.fullname || user.username,
      role: user.role || "Aluno",
      vinculo: user.vinculo || "",
      vinculoNome: user.vinculoNome || "Sem vínculo"
    };

    localStorage.setItem("avance_session", JSON.stringify(currentUser));
    showLoginError("");
    await bootSystem();
  } catch (error) {
    registerError(error);
    showLoginError("Erro ao acessar o Firestore. Veja o Console/F12 e as regras do Firebase.");
  }
});

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("avance_session");
  currentUser = null;
  mainSystem.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  $("#username").value = "";
  $("#password").value = "";
  showLoginError("");
});

async function bootSystem() {
  loginScreen.classList.add("hidden");
  mainSystem.classList.remove("hidden");

  $("#user-display-name").textContent = currentUser.fullname;
  $("#user-role-badge").textContent = `Painel ${currentUser.role}`;

  applyRolePermissions();
  await refreshAllData();
  showSection("view-dashboard");
}

function applyRolePermissions() {
  const isAdm = currentUser?.role === "ADM";

  toggleElement("#menu-cidades", isAdm);
  toggleElement("#menu-escolas", isAdm);
  toggleElement("#menu-usuarios", isAdm);
  toggleElement("#container-add-olimpiada", isAdm);
}

// ========================================================
// FIRESTORE: LEITURA
// ========================================================

async function refreshAllData() {
  try {
    const [
      snapCidades,
      snapEscolas,
      snapOlimpiadas,
      snapUsuarios,
      snapArquivos
    ] = await Promise.all([
      getDocs(collection(db, "cidades")),
      getDocs(collection(db, "escolas")),
      getDocs(collection(db, "olimpiadas")),
      getDocs(collection(db, "usuarios")),
      getArquivosSnapshot()
    ]);

    cachedCidades = mapSnapshot(snapCidades);
    cachedEscolas = mapSnapshot(snapEscolas);
    cachedOlimpiadas = mapSnapshot(snapOlimpiadas);
    cachedUsuarios = mapSnapshot(snapUsuarios);
    cachedArquivos = mapSnapshot(snapArquivos);

    updateDashboardCounters();
    populateDropdowns();

    renderCidadesTable();
    renderEscolasTable();
    renderUsuariosTable();
    renderOlimpiadasTable();
    renderArquivosTable();

    $("#diag-last-sync").textContent = new Date().toLocaleString("pt-BR");
    $("#diag-last-error").textContent = lastError;
  } catch (error) {
    registerError(error);
    alert("Erro ao sincronizar com Firebase. Abra o Console/F12 para ver detalhes.");
  }
}

async function getArquivosSnapshot() {
  try {
    return await getDocs(query(collection(db, "arquivos"), orderBy("createdAt", "desc")));
  } catch {
    return await getDocs(collection(db, "arquivos"));
  }
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function updateDashboardCounters() {
  $("#dash-count-cidades").textContent = cachedCidades.length;
  $("#dash-count-escolas").textContent = cachedEscolas.length;
  $("#dash-count-olimpiadas").textContent = cachedOlimpiadas.length;
  $("#dash-count-usuarios").textContent = cachedUsuarios.length;
}

// ========================================================
// RENDERIZAÇÃO
// ========================================================

function renderCidadesTable() {
  const tbody = $("#table-cidades-body");
  tbody.innerHTML = "";

  if (!cachedCidades.length) {
    renderEmptyRow(tbody, 4, "Nenhuma cidade cadastrada no Firestore.");
    return;
  }

  cachedCidades.forEach((cidade) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><small>${escapeHtml(cidade.id.slice(0, 8))}...</small></td>
      <td><strong>${escapeHtml(cidade.nome)}</strong></td>
      <td>${escapeHtml(cidade.uf)}</td>
      <td>${deleteButton("cidades", cidade.id)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderEscolasTable() {
  const tbody = $("#table-escolas-body");
  tbody.innerHTML = "";

  let escolas = [...cachedEscolas];

  if (currentUser?.role === "Gestor") {
    escolas = escolas.filter((e) => e.cidadeId === currentUser.vinculo);
  }

  if (!escolas.length) {
    renderEmptyRow(tbody, 5, "Nenhuma escola cadastrada no Firestore.");
    return;
  }

  escolas.forEach((escola) => {
    const cidade = cachedCidades.find((c) => c.id === escola.cidadeId);
    const nomeCidade = cidade ? `${cidade.nome}-${cidade.uf}` : "Sem cidade";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(escola.razaoSocial)}</strong></td>
      <td>${escapeHtml(nomeCidade)}</td>
      <td>${escapeHtml(escola.inep || "-")}</td>
      <td>${escapeHtml(escola.diretor || "-")}</td>
      <td>${currentUser?.role === "ADM" ? deleteButton("escolas", escola.id) : `<span class="muted">Sem permissão</span>`}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderUsuariosTable() {
  const tbody = $("#table-usuarios-body");
  tbody.innerHTML = "";

  if (!cachedUsuarios.length) {
    renderEmptyRow(tbody, 5, "Nenhum usuário cadastrado no Firestore.");
    return;
  }

  cachedUsuarios.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${escapeHtml(user.username)}</code></td>
      <td>${escapeHtml(user.fullname || "-")}</td>
      <td><span class="badge badge-neutral">${escapeHtml(user.role || "-")}</span></td>
      <td><small>${escapeHtml(user.vinculoNome || "Geral/Master")}</small></td>
      <td>${deleteButton("usuarios", user.id)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderOlimpiadasTable() {
  const tbody = $("#table-olimpiadas-body");
  tbody.innerHTML = "";

  if (!cachedOlimpiadas.length) {
    renderEmptyRow(tbody, 6, "Nenhum evento cadastrado no Firestore.");
    return;
  }

  cachedOlimpiadas
    .sort((a, b) => String(a.dataInicio || "").localeCompare(String(b.dataInicio || "")))
    .forEach((evento) => {
      const hoje = new Date().toISOString().split("T")[0];

      let status = `<span class="badge badge-success">Ativa</span>`;
      if (evento.dataFim && hoje > evento.dataFim) status = `<span class="badge badge-danger">Encerrada</span>`;
      if (evento.dataInicio && hoje < evento.dataInicio) status = `<span class="badge badge-warning">Futura</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(evento.nome)}</strong></td>
        <td>${escapeHtml(evento.fase)}</td>
        <td>${formatarDataBR(evento.dataInicio)}</td>
        <td>${formatarDataBR(evento.dataFim)}</td>
        <td>${status}</td>
        <td>${currentUser?.role === "ADM" ? deleteButton("olimpiadas", evento.id) : `<i class="fa-solid fa-eye"></i>`}</td>
      `;
      tbody.appendChild(tr);
    });
}

function renderArquivosTable() {
  const tbody = $("#table-arquivos-body");
  tbody.innerHTML = "";

  if (!cachedArquivos.length) {
    renderEmptyRow(tbody, 5, "Nenhum arquivo enviado ao Firebase Storage.");
    return;
  }

  cachedArquivos.forEach((arquivo) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(arquivo.title || "-")}</strong></td>
      <td>${escapeHtml(arquivo.originalName || "-")}</td>
      <td>${formatBytes(arquivo.size || 0)}</td>
      <td>${formatTimestamp(arquivo.createdAt)}</td>
      <td>
        <a class="btn-action-open" href="${arquivo.url}" target="_blank" rel="noopener">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir
        </a>
        ${deleteButton("arquivos", arquivo.id, arquivo.storagePath || "")}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderEmptyRow(tbody, colspan, message) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td colspan="${colspan}" class="muted">${message}</td>`;
  tbody.appendChild(tr);
}

function deleteButton(collectionName, id, storagePath = "") {
  if (currentUser?.role !== "ADM") return `<span class="muted">Sem permissão</span>`;

  return `
    <button
      class="btn-action-delete"
      data-collection="${escapeHtml(collectionName)}"
      data-id="${escapeHtml(id)}"
      data-storage-path="${escapeHtml(storagePath)}"
      title="Excluir"
    >
      <i class="fa-solid fa-trash"></i>
    </button>
  `;
}

function populateDropdowns() {
  const cidadeSelect = $("#esc-cidade-select");
  if (cidadeSelect) {
    cidadeSelect.innerHTML = `<option value="">Selecione uma cidade...</option>`;
    cachedCidades.forEach((cidade) => {
      cidadeSelect.innerHTML += `<option value="${cidade.id}">${escapeHtml(cidade.nome)} (${escapeHtml(cidade.uf)})</option>`;
    });
  }

  rebuildDynamicUserFields();
}

// ========================================================
// FORMULÁRIOS
// ========================================================

function setupFormListeners() {
  $("#btn-refresh")?.addEventListener("click", refreshAllData);

  $("#form-cidade").addEventListener("submit", async (event) => {
    event.preventDefault();

    await safeAction(async () => {
      const nome = $("#cid-nome").value.trim();
      const uf = $("#cid-uf").value;

      await addDoc(collection(db, "cidades"), {
        nome,
        uf,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.username || "sistema"
      });

      event.target.reset();
      await refreshAllData();
    }, "Cidade salva no Firestore.");
  });

  $("#form-escola").addEventListener("submit", async (event) => {
    event.preventDefault();

    await safeAction(async () => {
      const data = {
        razaoSocial: $("#esc-razao").value.trim(),
        cidadeId: $("#esc-cidade-select").value,
        cnpj: $("#esc-cnpj").value.trim(),
        inep: $("#esc-inep").value.trim(),
        endereco: $("#esc-endereco").value.trim(),
        cep: $("#esc-cep").value.trim(),
        diretor: $("#esc-diretor").value.trim(),
        email: $("#esc-email").value.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser?.username || "sistema"
      };

      if (!data.cidadeId) throw new Error("Selecione uma cidade antes de salvar a escola.");

      await addDoc(collection(db, "escolas"), data);
      event.target.reset();
      await refreshAllData();
    }, "Escola salva no Firestore.");
  });

  $("#form-usuario").addEventListener("submit", async (event) => {
    event.preventDefault();

    await safeAction(async () => {
      const username = $("#user-username").value.trim();
      const password = $("#user-password").value;
      const fullname = $("#user-fullname").value.trim();
      const role = $("#user-role-select").value;

      const exists = await getDocs(query(collection(db, "usuarios"), where("username", "==", username)));
      if (!exists.empty) throw new Error("Já existe um usuário com esse login.");

      const vinculoElement = $("#user-vinculo-id");
      let vinculo = "";
      let vinculoNome = "Geral/Master";

      if (vinculoElement) {
        vinculo = vinculoElement.value;
        vinculoNome = vinculoElement.options[vinculoElement.selectedIndex]?.text || "";
      }

      await addDoc(collection(db, "usuarios"), {
        username,
        password,
        fullname,
        role,
        vinculo,
        vinculoNome,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.username || "sistema"
      });

      event.target.reset();
      $("#dynamic-user-fields").innerHTML = "";
      await refreshAllData();
    }, "Usuário criado no Firestore.");
  });

  $("#form-olimpiada").addEventListener("submit", async (event) => {
    event.preventDefault();

    await safeAction(async () => {
      const data = {
        nome: $("#olimp-nome").value.trim(),
        fase: $("#olimp-fase").value.trim(),
        dataInicio: $("#olimp-start").value,
        dataFim: $("#olimp-end").value,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.username || "sistema"
      };

      if (data.dataFim < data.dataInicio) throw new Error("A data final não pode ser anterior à data inicial.");

      await addDoc(collection(db, "olimpiadas"), data);
      event.target.reset();
      await refreshAllData();
    }, "Evento publicado no Firestore.");
  });

  $("#form-arquivo").addEventListener("submit", async (event) => {
    event.preventDefault();

    await safeAction(async () => {
      const title = $("#file-title").value.trim();
      const file = $("#file-input").files[0];

      if (!file) throw new Error("Selecione um arquivo.");

      $("#upload-status").textContent = "Enviando arquivo ao Firebase Storage...";

      const safeName = sanitizeFileName(file.name);
      const storagePath = `uploads/${Date.now()}-${safeName}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, file, {
        contentType: file.type || "application/octet-stream"
      });

      const url = await getDownloadURL(fileRef);

      await addDoc(collection(db, "arquivos"), {
        title,
        originalName: file.name,
        storagePath,
        url,
        size: file.size,
        type: file.type || "",
        createdAt: serverTimestamp(),
        createdBy: currentUser?.username || "sistema"
      });

      $("#upload-status").textContent = "Upload concluído.";
      event.target.reset();
      await refreshAllData();
    }, "Arquivo enviado ao Firebase Storage.");
  });

  $("#user-role-select").addEventListener("change", rebuildDynamicUserFields);

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".btn-action-delete");
    if (!button) return;

    const collectionName = button.dataset.collection;
    const id = button.dataset.id;
    const storagePath = button.dataset.storagePath || "";

    if (!collectionName || !id) return;

    if (currentUser?.role !== "ADM") {
      alert("Você não tem permissão para excluir registros.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este registro permanentemente?")) return;

    await safeAction(async () => {
      if (collectionName === "cidades") {
        const hasSchool = cachedEscolas.some((school) => school.cidadeId === id);
        if (hasSchool) throw new Error("Não é possível apagar cidade com escola vinculada.");
      }

      if (collectionName === "arquivos" && storagePath) {
        try {
          await deleteObject(ref(storage, storagePath));
        } catch (storageError) {
          console.warn("Arquivo não removido do Storage, removendo metadados:", storageError);
        }
      }

      await deleteDoc(doc(db, collectionName, id));
      await refreshAllData();
    }, "Registro excluído.");
  });

  $("#excel-file-input").addEventListener("change", handleExcelImport);
  $("#btn-export-template").addEventListener("click", exportExcelTemplate);

  $("#btn-clear-session").addEventListener("click", () => {
    localStorage.removeItem("avance_session");
    sessionStorage.clear();
    alert("Sessão local limpa. A página será recarregada.");
    location.reload();
  });

  $("#btn-test-firestore").addEventListener("click", async () => {
    await safeAction(async () => {
      await getDocs(collection(db, "usuarios"));
      alert("Conexão com Firestore OK. O site está acessando o projeto: " + firebaseConfig.projectId);
    }, null);
  });
}

function rebuildDynamicUserFields() {
  const role = $("#user-role-select")?.value;
  const container = $("#dynamic-user-fields");
  if (!container) return;

  container.innerHTML = "";

  if (role === "Gestor") {
    if (!cachedCidades.length) {
      container.innerHTML = `<p class="muted">Cadastre uma cidade antes de criar gestor.</p>`;
      return;
    }

    const options = cachedCidades
      .map((cidade) => `<option value="${cidade.id}">${escapeHtml(cidade.nome)}-${escapeHtml(cidade.uf)}</option>`)
      .join("");

    container.innerHTML = `
      <div class="input-group">
        <label>Cidade Vinculada</label>
        <select id="user-vinculo-id" required>${options}</select>
      </div>
    `;
  }

  if (role === "Escola" || role === "Aluno") {
    if (!cachedEscolas.length) {
      container.innerHTML = `<p class="muted">Cadastre uma escola antes de criar usuário de escola/aluno.</p>`;
      return;
    }

    const options = cachedEscolas
      .map((escola) => `<option value="${escola.id}">${escapeHtml(escola.razaoSocial)}</option>`)
      .join("");

    container.innerHTML = `
      <div class="input-group">
        <label>Escola Vinculada</label>
        <select id="user-vinculo-id" required>${options}</select>
      </div>
    `;
  }
}

// ========================================================
// EXCEL
// ========================================================

async function handleExcelImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  await safeAction(async () => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let count = 0;

    for (const row of rows) {
      const nome = row["Olimpíada"] || row["Olimpiada"] || row["olimpiada"];
      const fase = row["Fase"] || row["fase"];
      const inicio = row["Inicio"] || row["Início"] || row["inicio"];
      const fim = row["Fim"] || row["fim"];

      if (!nome || !fase) continue;

      await addDoc(collection(db, "olimpiadas"), {
        nome: String(nome),
        fase: String(fase),
        dataInicio: converterDataExcel(inicio),
        dataFim: converterDataExcel(fim),
        createdAt: serverTimestamp(),
        createdBy: currentUser?.username || "importacao-xlsx"
      });

      count++;
    }

    event.target.value = "";
    await refreshAllData();
    alert(`${count} evento(s) importado(s) para o Firestore.`);
  }, null);
}

function exportExcelTemplate() {
  const data = [
    ["Olimpíada", "Fase", "Inicio", "Fim"],
    ["Canguru de Matemática", "Fase Única", "2026-03-20", "2026-03-20"],
    ["OBMEP", "1ª Fase", "2026-06-02", "2026-06-02"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
  XLSX.writeFile(wb, "Template_Cronograma_Avance.xlsx");
}

// ========================================================
// NAVEGAÇÃO
// ========================================================

function setupMenuNavigation() {
  $$(".menu-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();

      $$(".menu-item").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      showSection(item.dataset.target);
    });
  });
}

function showSection(id) {
  $$(".content-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== id);
  });
}

// ========================================================
// UTILITÁRIOS
// ========================================================

async function safeAction(action, successMessage = "Operação concluída.") {
  try {
    await action();
    if (successMessage) alert(successMessage);
  } catch (error) {
    registerError(error);
    alert(error.message || "Erro inesperado. Veja o Console/F12.");
  }
}

function registerError(error) {
  console.error(error);
  lastError = error?.message || String(error);
  const diag = $("#diag-last-error");
  if (diag) diag.textContent = lastError;
}

function showLoginError(message) {
  loginError.textContent = message;
}

function fillDiagnostics() {
  $("#diag-project-id").textContent = firebaseConfig.projectId;
  $("#diag-project-id-2").textContent = firebaseConfig.projectId;
  $("#diag-storage-bucket").textContent = firebaseConfig.storageBucket;
  $("#diag-auth-domain").textContent = firebaseConfig.authDomain;
  $("#diag-app-version").textContent = APP_VERSION;
  $("#diag-data-source").textContent = "Firebase Firestore";
}

function toggleElement(selector, shouldShow) {
  const element = $(selector);
  if (!element) return;
  element.classList.toggle("hidden", !shouldShow);
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeFileName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
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
  const value = size / Math.pow(1024, index);

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTimestamp(value) {
  if (!value) return "-";

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString("pt-BR");
  }

  if (value.seconds) {
    return new Date(value.seconds * 1000).toLocaleString("pt-BR");
  }

  return "-";
}
