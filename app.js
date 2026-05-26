import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc,
  updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const APP_VERSION = "AVANCE FIREBASE FEATURES 2026-05-26-01";
console.log(APP_VERSION);

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let usuarioLogado = null;
let dados = {
  usuarios: [],
  cidades: [],
  escolas: [],
  olimpiadas: [],
  resultados: [],
  materiais: []
};

let chartInstance = null;
let salaAtual = null;
let unsubChat = null;
let unsubSalas = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let unsubCall = null;
let unsubCandidates = null;

const SALAS_MONITORIA = [
  { id: "matematica", nome: "Matemática", icon: "fa-square-root-variable", cor: "blue" },
  { id: "fisica", nome: "Física", icon: "fa-atom", cor: "purple" },
  { id: "quimica", nome: "Química", icon: "fa-flask", cor: "emerald" },
  { id: "astronomia", nome: "Astronomia", icon: "fa-meteor", cor: "amber" },
  { id: "geral", nome: "Dúvidas Gerais", icon: "fa-comments", cor: "rose" }
];

const PREMIOS_PADRAO = ["Ouro", "Prata", "Bronze", "Menção Honrosa"];
const SERIES_PADRAO = ["6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "1ª Série EM", "2ª Série EM", "3ª Série EM"];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

document.addEventListener("DOMContentLoaded", async () => {
  aplicarTemaInicial();
  configurarEventos();
  const sessao = lerJSON(sessionStorage.getItem("avance_session"));
  if (sessao?.id) {
    usuarioLogado = sessao;
    await entrarSistema();
  }
});

function configurarEventos() {
  $("#loginForm").addEventListener("submit", login);
  $("#btnLogout").addEventListener("click", logout);
  $("#btnThemeToggle").addEventListener("click", alternarTema);

  $("#filterMunicipio").addEventListener("change", renderDashboard);
  $("#filterEscola").addEventListener("change", renderDashboard);
  $("#filterOlimpiada").addEventListener("change", renderDashboard);
  $("#filterMaterialBusca").addEventListener("input", renderMateriais);

  $("#formCidade").addEventListener("submit", salvarCidade);
  $("#formEscola").addEventListener("submit", salvarEscola);
  $("#formUsuario").addEventListener("submit", salvarUsuario);
  $("#formOlimpiada").addEventListener("submit", salvarOlimpiada);
  $("#formAddMaterial").addEventListener("submit", salvarMaterial);
  $("#addUserNivel").addEventListener("change", popularVinculosUsuario);
  $("#formChatMonitoria").addEventListener("submit", enviarMensagemMonitoria);
  $("#btnCallVoice").addEventListener("click", () => iniciarChamada(false));
  $("#btnCallVideo").addEventListener("click", () => iniciarChamada(true));
  $("#btnEndCall").addEventListener("click", encerrarChamada);
}

// ================= LOGIN =================

async function login(e) {
  e.preventDefault();
  const login = $("#auth-user").value.trim().toLowerCase();
  const senha = $("#auth-pass").value.trim();
  const btn = $("#btnLogin");
  const msg = $("#loginMessage");

  btn.disabled = true;
  msg.textContent = "Conectando ao Firestore...";

  try {
    const usuariosRef = collection(db, "usuarios");

    const tentativas = [
      query(usuariosRef, where("login", "==", login), where("senha", "==", senha)),
      query(usuariosRef, where("username", "==", login), where("password", "==", senha))
    ];

    let encontrado = null;
    let id = null;

    for (const q of tentativas) {
      const snap = await getDocs(q);
      if (!snap.empty) {
        encontrado = snap.docs[0].data();
        id = snap.docs[0].id;
        break;
      }
    }

    if (!encontrado) {
      msg.textContent = "Usuário ou senha inválidos. Confira a coleção usuarios no Firestore.";
      return;
    }

    usuarioLogado = normalizarUsuario({ id, ...encontrado });
    sessionStorage.setItem("avance_session", JSON.stringify(usuarioLogado));
    msg.textContent = "";
    await entrarSistema();
  } catch (err) {
    console.error(err);
    msg.textContent = "Erro no Firestore. Verifique regras/permissões do Firebase.";
  } finally {
    btn.disabled = false;
  }
}

async function entrarSistema() {
  $("#loginScreen").classList.add("hidden");
  $("#mainPanel").classList.remove("hidden");
  $("#userLoggedNome").textContent = usuarioLogado.nome;
  $("#userLoggedNivel").textContent = usuarioLogado.nivel;

  aplicarPermissoes();
  await carregarTudo();
  navegarAba("dashboard", $("#btnNav-dashboard"));
}

function logout() {
  sessionStorage.removeItem("avance_session");
  sairSalaMonitoria(false);
  usuarioLogado = null;
  $("#mainPanel").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  $("#loginForm").reset();
}

function normalizarUsuario(u) {
  return {
    id: u.id,
    nome: u.nome || u.fullname || u.username || u.login || "Usuário",
    login: String(u.login || u.username || "").toLowerCase(),
    senha: u.senha || u.password || "",
    nivel: u.nivel || u.role || "Aluno",
    vinculoId: u.vinculoId || u.vinculo || "",
    vinculoNome: u.vinculoNome || "Geral/Master",
    email: u.email || "",
    telefone: u.telefone || ""
  };
}

function aplicarPermissoes() {
  const nivel = usuarioLogado?.nivel;
  const admin = nivel === "ADM";
  const gestor = nivel === "Gestor";
  const escola = nivel === "Escola";

  toggle("#btnNavUsuarios", admin || gestor || escola);
  toggle("#btnNavCidades", admin);
  toggle("#btnNavEscolas", admin || gestor);
  toggle("#btnNavOlimpiadas", admin);
  toggle("#painelAddMaterial", admin || nivel === "Monitor");

  if (nivel === "Aluno") {
    toggle("#btnNavUsuarios", false);
  }
}

// ================= FIRESTORE =================

async function carregarTudo() {
  const [usuarios, cidades, escolas, olimpiadas, resultados, materiais] = await Promise.all([
    listar("usuarios"), listar("cidades"), listar("escolas"), listar("olimpiadas"), listar("resultados"), listar("materiais")
  ]);

  dados.usuarios = usuarios.map(normalizarUsuario);
  dados.cidades = cidades.map(c => ({ id: c.id, nome: c.nome || c.cidade || "", uf: c.uf || "PI" }));
  dados.escolas = escolas.map(e => ({
    id: e.id,
    nome: e.nome || e.razaoSocial || "",
    razaoSocial: e.razaoSocial || e.nome || "",
    cidadeId: e.cidadeId || "",
    cnpj: e.cnpj || "",
    inep: e.inep || "",
    endereco: e.endereco || "",
    cep: e.cep || "",
    diretor: e.diretor || "",
    email: e.email || ""
  }));
  dados.olimpiadas = olimpiadas.map(o => ({
    id: o.id,
    nome: o.nome || "",
    categoria: o.categoria || o.sigla || "",
    series: o.series || ""
  }));
  dados.resultados = resultados.map(r => ({ id: r.id, ...r }));
  dados.materiais = materiais.map(m => ({ id: m.id, ...m }));

  popularSeletores();
  renderTudo();
}

async function listar(nomeColecao) {
  const snap = await getDocs(collection(db, nomeColecao));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function salvarDoc(nomeColecao, id, data) {
  if (id) {
    await updateDoc(doc(db, nomeColecao, id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const novo = await addDoc(collection(db, nomeColecao), { ...data, createdAt: serverTimestamp(), createdBy: usuarioLogado?.login || "sistema" });
  return novo.id;
}

async function apagarDoc(nomeColecao, id) {
  await deleteDoc(doc(db, nomeColecao, id));
  await carregarTudo();
}

// ================= NAVEGAÇÃO =================

window.navegarAba = function(aba, botao) {
  if (!podeAcessarAba(aba)) {
    alert("Você não tem permissão para acessar esta área.");
    return;
  }

  $$(".tab-view").forEach(v => v.classList.add("hidden"));
  $(`#view-${aba}`)?.classList.remove("hidden");

  $$(".nav-item").forEach(b => b.classList.remove("active"));
  if (botao) botao.classList.add("active");

  const titulos = {
    dashboard: "Dashboard Geral",
    monitoria: "Monitoria",
    plataforma: "Envio de Arquivos",
    usuarios: "Gerenciamento de Usuários",
    cidades: "Gerenciamento de Cidades",
    escolas: "Gerenciamento de Escolas",
    olimpiadas: "Olimpíadas / Cronograma"
  };
  $("#pageTitleDisplay").textContent = titulos[aba] || "Painel";

  if (aba === "monitoria") renderizarSalasMonitoria();
};

function podeAcessarAba(aba) {
  const nivel = usuarioLogado?.nivel;
  if (["dashboard", "monitoria", "plataforma"].includes(aba)) return true;
  if (aba === "usuarios") return ["ADM", "Gestor", "Escola"].includes(nivel);
  if (aba === "cidades") return nivel === "ADM";
  if (aba === "escolas") return ["ADM", "Gestor"].includes(nivel);
  if (aba === "olimpiadas") return nivel === "ADM";
  return false;
}

// ================= RENDER =================

function renderTudo() {
  renderDashboard();
  renderMateriais();
  renderUsuarios();
  renderCidades();
  renderEscolas();
  renderOlimpiadas();
}

function popularSeletores() {
  const cidadesOpts = [`<option value="TODOS">Todos</option>`, ...dados.cidades.map(c => `<option value="${c.id}">${esc(c.nome)} - ${esc(c.uf)}</option>`)];
  $("#filterMunicipio").innerHTML = cidadesOpts.join("");
  $("#addEscolaCidade").innerHTML = [`<option value="">Selecione...</option>`, ...dados.cidades.map(c => `<option value="${c.id}">${esc(c.nome)} - ${esc(c.uf)}</option>`)].join("");

  $("#filterEscola").innerHTML = [`<option value="TODAS">Todas</option>`, ...dados.escolas.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`)].join("");
  $("#filterOlimpiada").innerHTML = [`<option value="TODAS">Todas</option>`, ...dados.olimpiadas.map(o => `<option value="${o.id}">${esc(o.nome)}</option>`)].join("");
  $("#matOlimpiada").innerHTML = [`<option value="">Geral</option>`, ...dados.olimpiadas.map(o => `<option value="${o.id}">${esc(o.nome)}</option>`)].join("");

  popularVinculosUsuario();
}

function renderDashboard() {
  const cid = $("#filterMunicipio")?.value || "TODOS";
  const escId = $("#filterEscola")?.value || "TODAS";
  const olId = $("#filterOlimpiada")?.value || "TODAS";

  let resultados = [...dados.resultados];

  if (cid !== "TODOS") {
    const cidade = dados.cidades.find(c => c.id === cid);
    resultados = resultados.filter(r => r.cidadeId === cid || normal(r.municipio) === normal(`${cidade?.nome} - ${cidade?.uf}`));
  }
  if (escId !== "TODAS") {
    const escola = dados.escolas.find(e => e.id === escId);
    resultados = resultados.filter(r => r.escolaId === escId || normal(r.escola) === normal(escola?.nome));
  }
  if (olId !== "TODAS") {
    const olimp = dados.olimpiadas.find(o => o.id === olId);
    resultados = resultados.filter(r => r.olimpiadaId === olId || normal(r.olimpiada) === normal(olimp?.nome));
  }

  $("#cardTotalMedalhas").textContent = resultados.length;
  $("#cardTotalOuro").textContent = resultados.filter(r => normal(r.premio || r.resultado).includes("ouro")).length;
  $("#cardTotalEscolas").textContent = new Set(dados.escolas.map(e => e.id)).size;
  $("#cardTotalCidades").textContent = dados.cidades.length;

  const tbody = $("#tablePremiadosCorpo");
  tbody.innerHTML = resultados.length ? resultados.slice(0, 80).map(r => `
    <tr class="border-b" style="border-color:var(--line)">
      <td class="p-4 font-bold">${esc(r.aluno || r.estudante || "-")}</td>
      <td class="p-4 muted">${esc(r.escola || nomeEscola(r.escolaId) || "-")}</td>
      <td class="p-4 muted">${esc(r.municipio || nomeCidade(r.cidadeId) || "-")}</td>
      <td class="p-4">${esc(r.serie || "-")}</td>
      <td class="p-4">${esc(r.olimpiada || nomeOlimpiada(r.olimpiadaId) || "-")}</td>
      <td class="p-4"><span class="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">${esc(r.premio || r.resultado || "-")}</span></td>
    </tr>
  `).join("") : linhaVazia(6, "Nenhum resultado cadastrado ainda.");

  renderGrafico(resultados);
}

function renderGrafico(resultados) {
  const contagem = {};
  PREMIOS_PADRAO.forEach(p => contagem[p] = 0);
  resultados.forEach(r => {
    const p = r.premio || r.resultado || "Outros";
    contagem[p] = (contagem[p] || 0) + 1;
  });

  const ctx = $("#chartPremios");
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(contagem),
      datasets: [{ data: Object.values(contagem) }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
  });
}

// ================= CRUD CIDADES =================

async function salvarCidade(e) {
  e.preventDefault();
  if (usuarioLogado.nivel !== "ADM") return alert("Apenas ADM pode salvar cidades.");

  const id = $("#cidadeIdEdit").value;
  const nome = $("#addCidadeNome").value.trim();
  const uf = $("#addCidadeUf").value.trim().toUpperCase();

  if (!nome || !uf) return alert("Preencha cidade e UF.");

  await salvarDoc("cidades", id, { nome, uf });
  limparFormCidade();
  await carregarTudo();
}

window.limparFormCidade = function() {
  $("#cidadeIdEdit").value = "";
  $("#formCidade").reset();
};

function renderCidades() {
  $("#tableCidades").innerHTML = dados.cidades.length ? dados.cidades.map(c => `
    <tr class="border-b" style="border-color:var(--line)">
      <td class="p-4 font-bold">${esc(c.nome)}</td>
      <td class="p-4">${esc(c.uf)}</td>
      <td class="p-4">${dados.escolas.filter(e => e.cidadeId === c.id).length}</td>
      <td class="p-4 text-right">${acoes("editarCidade", "excluirCidade", c.id)}</td>
    </tr>
  `).join("") : linhaVazia(4, "Nenhuma cidade cadastrada.");
}

window.editarCidade = function(id) {
  const c = dados.cidades.find(x => x.id === id);
  if (!c) return;
  $("#cidadeIdEdit").value = c.id;
  $("#addCidadeNome").value = c.nome;
  $("#addCidadeUf").value = c.uf;
};

window.excluirCidade = async function(id) {
  if (dados.escolas.some(e => e.cidadeId === id)) return alert("Não é possível apagar cidade com escola vinculada.");
  if (confirm("Apagar cidade?")) await apagarDoc("cidades", id);
};

// ================= CRUD ESCOLAS =================

async function salvarEscola(e) {
  e.preventDefault();
  if (!["ADM", "Gestor"].includes(usuarioLogado.nivel)) return alert("Sem permissão.");

  const id = $("#escolaIdEdit").value;
  const data = {
    nome: $("#addEscolaNome").value.trim(),
    razaoSocial: $("#addEscolaRazao").value.trim(),
    cidadeId: $("#addEscolaCidade").value,
    cnpj: $("#addEscolaCnpj").value.trim(),
    inep: $("#addEscolaInep").value.trim(),
    diretor: $("#addEscolaDiretor").value.trim(),
    email: $("#addEscolaEmail").value.trim(),
    endereco: $("#addEscolaEndereco").value.trim(),
    cep: $("#addEscolaCep").value.trim()
  };

  if (!data.nome || !data.cidadeId) return alert("Nome e cidade são obrigatórios.");

  await salvarDoc("escolas", id, data);
  limparFormEscola();
  await carregarTudo();
}

window.limparFormEscola = function() {
  $("#escolaIdEdit").value = "";
  $("#formEscola").reset();
};

function renderEscolas() {
  $("#tableEscolas").innerHTML = dados.escolas.length ? dados.escolas.map(e => `
    <tr class="border-b" style="border-color:var(--line)">
      <td class="p-4 font-bold">${esc(e.nome)}</td>
      <td class="p-4">${esc(nomeCidade(e.cidadeId))}</td>
      <td class="p-4">${esc(e.inep || "-")}</td>
      <td class="p-4">${esc(e.diretor || "-")}</td>
      <td class="p-4 text-right">${acoes("editarEscola", "excluirEscola", e.id)}</td>
    </tr>
  `).join("") : linhaVazia(5, "Nenhuma escola cadastrada.");
}

window.editarEscola = function(id) {
  const e = dados.escolas.find(x => x.id === id);
  if (!e) return;
  $("#escolaIdEdit").value = e.id;
  $("#addEscolaNome").value = e.nome;
  $("#addEscolaRazao").value = e.razaoSocial;
  $("#addEscolaCidade").value = e.cidadeId;
  $("#addEscolaCnpj").value = e.cnpj;
  $("#addEscolaInep").value = e.inep;
  $("#addEscolaDiretor").value = e.diretor;
  $("#addEscolaEmail").value = e.email;
  $("#addEscolaEndereco").value = e.endereco;
  $("#addEscolaCep").value = e.cep;
};

window.excluirEscola = async function(id) {
  if (dados.usuarios.some(u => u.vinculoId === id)) return alert("Não é possível apagar escola com usuário vinculado.");
  if (confirm("Apagar escola?")) await apagarDoc("escolas", id);
};

// ================= CRUD USUARIOS =================

function popularVinculosUsuario() {
  const nivel = $("#addUserNivel")?.value;
  const select = $("#addUserVinculo");
  if (!select) return;

  if (nivel === "Gestor") {
    select.innerHTML = dados.cidades.map(c => `<option value="${c.id}">Cidade: ${esc(c.nome)} - ${esc(c.uf)}</option>`).join("");
  } else if (nivel === "Escola" || nivel === "Aluno") {
    select.innerHTML = dados.escolas.map(e => `<option value="${e.id}">Escola: ${esc(e.nome)}</option>`).join("");
  } else {
    select.innerHTML = `<option value="">Acesso global</option>`;
  }
}

async function salvarUsuario(e) {
  e.preventDefault();
  if (!["ADM", "Gestor", "Escola"].includes(usuarioLogado.nivel)) return alert("Sem permissão.");

  const id = $("#userIdEdit").value;
  const nivel = $("#addUserNivel").value;
  const senha = $("#addUserSenha").value.trim();

  if (!id && !senha) return alert("Senha é obrigatória para novo usuário.");

  const data = {
    nome: $("#addUserNome").value.trim(),
    login: $("#addUserLogin").value.trim().toLowerCase(),
    nivel,
    vinculoId: $("#addUserVinculo").value,
    vinculoNome: $("#addUserVinculo").selectedOptions[0]?.textContent || "Geral/Master"
  };

  if (senha) data.senha = senha;

  if (!data.nome || !data.login) return alert("Nome e login são obrigatórios.");

  await salvarDoc("usuarios", id, data);
  limparFormUsuario();
  await carregarTudo();
}

window.limparFormUsuario = function() {
  $("#userIdEdit").value = "";
  $("#formUsuario").reset();
  popularVinculosUsuario();
};

function renderUsuarios() {
  $("#tableUsuarios").innerHTML = dados.usuarios.length ? dados.usuarios.map(u => `
    <tr class="border-b" style="border-color:var(--line)">
      <td class="p-4 font-bold">${esc(u.nome)}</td>
      <td class="p-4"><code>${esc(u.login)}</code></td>
      <td class="p-4"><span class="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">${esc(u.nivel)}</span></td>
      <td class="p-4 muted">${esc(labelVinculo(u))}</td>
      <td class="p-4 text-right">${acoes("editarUsuario", "excluirUsuario", u.id)}</td>
    </tr>
  `).join("") : linhaVazia(5, "Nenhum usuário cadastrado.");
}

window.editarUsuario = function(id) {
  const u = dados.usuarios.find(x => x.id === id);
  if (!u) return;
  $("#userIdEdit").value = u.id;
  $("#addUserNome").value = u.nome;
  $("#addUserLogin").value = u.login;
  $("#addUserSenha").value = "";
  $("#addUserNivel").value = u.nivel;
  popularVinculosUsuario();
  $("#addUserVinculo").value = u.vinculoId || "";
};

window.excluirUsuario = async function(id) {
  if (usuarioLogado.id === id) return alert("Você não pode apagar o próprio usuário logado.");
  const alvo = dados.usuarios.find(u => u.id === id);
  if (alvo?.nivel === "ADM" && dados.usuarios.filter(u => u.nivel === "ADM").length <= 1) {
    return alert("Não é permitido apagar o último ADM.");
  }
  if (confirm("Apagar usuário?")) await apagarDoc("usuarios", id);
};

// ================= OLIMPIADAS =================

async function salvarOlimpiada(e) {
  e.preventDefault();
  if (usuarioLogado.nivel !== "ADM") return alert("Apenas ADM.");

  const id = $("#olimpiadaIdEdit").value;
  const data = {
    nome: $("#addOlimpiadaNome").value.trim(),
    categoria: $("#addOlimpiadaCategoria").value.trim().toUpperCase(),
    series: $("#addOlimpiadaSeries").value.trim()
  };

  if (!data.nome) return alert("Nome obrigatório.");

  await salvarDoc("olimpiadas", id, data);
  $("#olimpiadaIdEdit").value = "";
  $("#formOlimpiada").reset();
  await carregarTudo();
}

function renderOlimpiadas() {
  $("#tableOlimpiadas").innerHTML = dados.olimpiadas.length ? dados.olimpiadas.map(o => `
    <tr class="border-b" style="border-color:var(--line)">
      <td class="p-4 font-bold">${esc(o.nome)}</td>
      <td class="p-4">${esc(o.categoria || "-")}</td>
      <td class="p-4">${esc(o.series || "-")}</td>
      <td class="p-4 text-right">${acoes("editarOlimpiada", "excluirOlimpiada", o.id)}</td>
    </tr>
  `).join("") : linhaVazia(4, "Nenhuma olimpíada cadastrada.");
}

window.editarOlimpiada = function(id) {
  const o = dados.olimpiadas.find(x => x.id === id);
  if (!o) return;
  $("#olimpiadaIdEdit").value = o.id;
  $("#addOlimpiadaNome").value = o.nome;
  $("#addOlimpiadaCategoria").value = o.categoria;
  $("#addOlimpiadaSeries").value = o.series;
};

window.excluirOlimpiada = async function(id) {
  if (confirm("Apagar olimpíada?")) await apagarDoc("olimpiadas", id);
};

// ================= MATERIAIS / STORAGE =================

async function salvarMaterial(e) {
  e.preventDefault();
  const file = $("#matArquivo").files[0];
  const titulo = $("#matTitulo").value.trim();
  const olimpId = $("#matOlimpiada").value;

  if (!file || !titulo) return alert("Informe título e arquivo.");

  const status = $("#materialUploadStatus");
  status.textContent = "Enviando arquivo ao Firebase Storage...";

  try {
    const storagePath = `materiais/${Date.now()}-${sanitize(file.name)}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, "materiais"), {
      titulo,
      olimpiadaId: olimpId,
      olimpiadaNome: nomeOlimpiada(olimpId),
      originalName: file.name,
      storagePath,
      url,
      size: file.size,
      type: file.type || "",
      createdAt: serverTimestamp(),
      createdBy: usuarioLogado?.login || "sistema"
    });

    status.textContent = "Upload concluído.";
    $("#formAddMaterial").reset();
    await carregarTudo();
  } catch (err) {
    console.error(err);
    status.textContent = "Erro no upload. Confira as regras do Storage.";
  }
}

function renderMateriais() {
  const busca = normal($("#filterMaterialBusca")?.value || "");
  let lista = dados.materiais;
  if (busca) lista = lista.filter(m => normal(m.titulo).includes(busca) || normal(m.originalName).includes(busca));

  $("#gridMateriais").innerHTML = lista.length ? lista.map(m => `
    <div class="panel-2 rounded-2xl p-4">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><i class="fa-solid fa-file-lines"></i></div>
        <div class="min-w-0 flex-1">
          <h4 class="font-black truncate">${esc(m.titulo)}</h4>
          <p class="text-xs muted truncate">${esc(m.originalName || "arquivo")}</p>
          <p class="text-xs muted mt-1">${esc(m.olimpiadaNome || "Geral")} · ${formatBytes(m.size || 0)}</p>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <a href="${m.url}" target="_blank" class="flex-1 text-center px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">Abrir</a>
        ${usuarioLogado?.nivel === "ADM" ? `<button onclick="excluirMaterial('${m.id}')" class="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"><i class="fa-solid fa-trash"></i></button>` : ""}
      </div>
    </div>
  `).join("") : `<p class="muted">Nenhum material enviado.</p>`;
}

window.excluirMaterial = async function(id) {
  const mat = dados.materiais.find(m => m.id === id);
  if (!mat || !confirm("Apagar material?")) return;

  try {
    if (mat.storagePath) await deleteObject(ref(storage, mat.storagePath));
  } catch (err) {
    console.warn("Não consegui apagar do Storage, vou apagar o registro:", err);
  }

  await apagarDoc("materiais", id);
};

// ================= MONITORIA =================

window.renderizarSalasMonitoria = function() {
  const grid = $("#gridSalasMonitoria");
  grid.innerHTML = SALAS_MONITORIA.map(s => `
    <div class="panel rounded-2xl p-5 hover:scale-[1.01] transition">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><i class="fa-solid ${s.icon} text-xl"></i></div>
        <div>
          <h3 class="font-black">${esc(s.nome)}</h3>
          <p id="salaCount-${s.id}" class="text-xs muted">Carregando...</p>
        </div>
      </div>
      <button onclick="entrarSalaMonitoria('${s.id}')" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider">Entrar</button>
    </div>
  `).join("");

  if (unsubSalas) unsubSalas();
  unsubSalas = onSnapshot(collection(db, "monitoria_presenca"), snap => {
    const presencas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    SALAS_MONITORIA.forEach(s => {
      const p = presencas.filter(x => x.salaId === s.id);
      const monitor = p.some(x => x.nivel === "Monitor");
      const el = $(`#salaCount-${s.id}`);
      if (el) el.textContent = `${p.length}/2 na sala · ${monitor ? "com monitor" : "sem monitor"}`;
    });
  });
};

window.entrarSalaMonitoria = async function(salaId) {
  const presSnap = await getDocs(query(collection(db, "monitoria_presenca"), where("salaId", "==", salaId)));
  const presentes = presSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const temMonitor = presentes.some(p => p.nivel === "Monitor");
  const souMonitor = usuarioLogado.nivel === "Monitor";

  if (presentes.length >= 2) return alert("Sala cheia. Só entram 2 pessoas por vez.");
  if (souMonitor && temMonitor) return alert("Já existe um monitor nesta sala.");
  if (!souMonitor && !temMonitor) return alert("Aguarde um monitor entrar primeiro nesta sala.");
  if (!souMonitor && presentes.some(p => p.nivel !== "Monitor")) return alert("Já existe um aluno/usuário sendo atendido nesta sala.");

  salaAtual = salaId;

  const presId = `${salaId}_${usuarioLogado.id}`;
  await setDoc(doc(db, "monitoria_presenca", presId), {
    salaId,
    userId: usuarioLogado.id,
    nome: usuarioLogado.nome,
    nivel: usuarioLogado.nivel,
    entrouEm: serverTimestamp()
  });

  await limparChatSala(salaId);

  const sala = SALAS_MONITORIA.find(s => s.id === salaId);
  $("#painelSalaMonitoria").classList.remove("hidden");
  $("#salaMonitoriaTitulo").textContent = `Sala de ${sala?.nome || salaId}`;
  $("#salaMonitoriaStatus").textContent = "Conversa limpa para este atendimento.";

  escutarChat(salaId);
};

async function limparChatSala(salaId) {
  const snap = await getDocs(collection(db, "monitoria_chats", salaId, "mensagens"));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

function escutarChat(salaId) {
  if (unsubChat) unsubChat();
  const q = query(collection(db, "monitoria_chats", salaId, "mensagens"), orderBy("createdAt", "asc"));
  unsubChat = onSnapshot(q, snap => {
    const wrap = $("#chatMonitoriaMensagens");
    wrap.innerHTML = "";
    snap.docs.forEach(d => {
      const m = d.data();
      const meu = m.userId === usuarioLogado.id;
      const div = document.createElement("div");
      div.className = `max-w-[82%] rounded-2xl p-3 text-sm ${meu ? "chat-bubble-me" : "chat-bubble-other"}`;
      div.innerHTML = `
        <div class="text-[10px] font-black opacity-80 mb-1">${esc(m.nome || "Usuário")}</div>
        ${m.texto ? `<div>${esc(m.texto)}</div>` : ""}
        ${m.fileUrl ? `<a href="${m.fileUrl}" target="_blank" class="underline font-bold block mt-2"><i class="fa-solid fa-paperclip mr-1"></i>${esc(m.fileName || "arquivo")}</a>` : ""}
      `;
      wrap.appendChild(div);
    });
    wrap.scrollTop = wrap.scrollHeight;
  });
}

async function enviarMensagemMonitoria(e) {
  e.preventDefault();
  if (!salaAtual) return alert("Entre em uma sala primeiro.");

  const texto = $("#chatMonitoriaInput").value.trim();
  const file = $("#chatMonitoriaFile").files[0];

  if (!texto && !file) return;

  let fileUrl = "";
  let fileName = "";

  if (file) {
    const path = `monitoria/${salaAtual}/${Date.now()}-${sanitize(file.name)}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
    fileUrl = await getDownloadURL(fileRef);
    fileName = file.name;
  }

  await addDoc(collection(db, "monitoria_chats", salaAtual, "mensagens"), {
    texto,
    fileUrl,
    fileName,
    userId: usuarioLogado.id,
    nome: usuarioLogado.nome,
    nivel: usuarioLogado.nivel,
    createdAt: serverTimestamp()
  });

  $("#chatMonitoriaInput").value = "";
  $("#chatMonitoriaFile").value = "";
}

window.sairSalaMonitoria = async function(perguntar = true) {
  if (!salaAtual) return;

  if (perguntar && !confirm("Deseja sair da sala? Ao sair, a conversa deste atendimento será apagada.")) return;

  await encerrarChamada();
  await limparChatSala(salaAtual).catch(console.warn);
  await deleteDoc(doc(db, "monitoria_presenca", `${salaAtual}_${usuarioLogado.id}`)).catch(console.warn);

  if (unsubChat) unsubChat();
  unsubChat = null;
  salaAtual = null;
  $("#painelSalaMonitoria").classList.add("hidden");
};

async function iniciarChamada(video) {
  if (!salaAtual) return alert("Entre em uma sala primeiro.");

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
    $("#painelMidiaMonitoria").classList.remove("hidden");
    $("#localVideo").srcObject = localStream;
    $("#btnEndCall").classList.remove("hidden");

    alert(video ? "Câmera/microfone ativados. A estrutura de chamada está pronta para WebRTC." : "Microfone ativado. A estrutura de chamada está pronta para WebRTC.");
  } catch (err) {
    console.error(err);
    alert("Não consegui acessar câmera/microfone. Verifique permissões do navegador.");
  }
}

async function encerrarChamada() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (remoteStream) remoteStream.getTracks().forEach(t => t.stop());
  if (peerConnection) peerConnection.close();
  if (unsubCall) unsubCall();
  if (unsubCandidates) unsubCandidates();

  localStream = null;
  remoteStream = null;
  peerConnection = null;
  unsubCall = null;
  unsubCandidates = null;

  $("#localVideo").srcObject = null;
  $("#remoteVideo").srcObject = null;
  $("#painelMidiaMonitoria").classList.add("hidden");
  $("#btnEndCall").classList.add("hidden");
}

// ================= TEMA =================

function aplicarTemaInicial() {
  const tema = localStorage.getItem("avance_theme") || "dark";
  document.documentElement.setAttribute("data-theme", tema);
  atualizarBotaoTema();
}

function alternarTema() {
  const atual = document.documentElement.getAttribute("data-theme") || "dark";
  const novo = atual === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novo);
  localStorage.setItem("avance_theme", novo);
  atualizarBotaoTema();
}

function atualizarBotaoTema() {
  const tema = document.documentElement.getAttribute("data-theme") || "dark";
  const btn = $("#btnThemeToggle");
  if (!btn) return;
  btn.innerHTML = tema === "dark"
    ? `<i class="fa-solid fa-moon mr-2"></i><span>Tema escuro</span>`
    : `<i class="fa-solid fa-sun mr-2"></i><span>Tema claro</span>`;
}

// ================= HELPERS =================

function acoes(fnEdit, fnDel, id) {
  return `
    <button onclick="${fnEdit}('${id}')" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold mr-1"><i class="fa-solid fa-pen"></i></button>
    <button onclick="${fnDel}('${id}')" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"><i class="fa-solid fa-trash"></i></button>
  `;
}

function linhaVazia(colspan, texto) {
  return `<tr><td colspan="${colspan}" class="p-5 muted">${texto}</td></tr>`;
}

function nomeCidade(id) {
  const c = dados.cidades.find(x => x.id === id);
  return c ? `${c.nome} - ${c.uf}` : "";
}

function nomeEscola(id) {
  return dados.escolas.find(x => x.id === id)?.nome || "";
}

function nomeOlimpiada(id) {
  return dados.olimpiadas.find(x => x.id === id)?.nome || "";
}

function labelVinculo(u) {
  if (u.nivel === "Gestor") return nomeCidade(u.vinculoId) || u.vinculoNome || "Cidade";
  if (u.nivel === "Escola" || u.nivel === "Aluno") return nomeEscola(u.vinculoId) || u.vinculoNome || "Escola";
  return u.vinculoNome || "Geral/Master";
}

function toggle(selector, show) {
  const el = $(selector);
  if (el) el.classList.toggle("hidden", !show);
}

function normal(v) {
  return String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function esc(v) {
  return String(v ?? "").replace(/[&<>'"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[ch]));
}

function lerJSON(v) {
  try { return JSON.parse(v); } catch { return null; }
}

function sanitize(name) {
  return String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
