let USUARIOS_LOGADOS = { ...USERS_DB };

let MUNICIPIOS_DATA = ["São Braz - PI", "Teresina - PI", "Picos - PI"];

let ESCOLAS_DATA = [
  "U.E. Polo Municipal",
  "C.E. Estadual São Braz",
  "U.E. Clarindo Lopes"
];

let ALUNOS_REPOSITORIO = [
  {
    aluno: "Carlos Eduardo",
    escola: "U.E. Polo Municipal",
    municipio: "São Braz - PI",
    olimpiada: "Olimpíada Canguru de Matemática",
    premio: "Ouro"
  },
  {
    aluno: "Ana Clara",
    escola: "U.E. Polo Municipal",
    municipio: "São Braz - PI",
    olimpiada: "Olimpíada Canguru de Matemática",
    premio: "Prata"
  },
  {
    aluno: "Mariana Souza",
    escola: "U.E. Polo Municipal",
    municipio: "São Braz - PI",
    olimpiada: "Olimpíada Brasileira de Matemática Financeira",
    premio: "Ouro"
  },
  {
    aluno: "Mateus Lima",
    escola: "C.E. Estadual São Braz",
    municipio: "São Braz - PI",
    olimpiada: "Olimpíada Brasileira de Geopolítica",
    premio: "Ouro"
  }
];

let currentUser = null;
let chartInstance = null;

function executarLogin() {
  const userField = document.getElementById("auth-user").value.trim().toLowerCase();
  const passField = document.getElementById("auth-pass").value;

  if (USUARIOS_LOGADOS[userField] && USUARIOS_LOGADOS[userField].senha === passField) {
    currentUser = USUARIOS_LOGADOS[userField];

    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("app-container").classList.add("app-active");

    document.getElementById("nav-user-name").innerText = currentUser.nome;
    document.getElementById("nav-user-role").innerText = `Nível: ${currentUser.role}`;

    aplicarRestricoesDeNivel();
    renderizarFiltrosSelects();
    renderizarDashboard();
    renderizarCalendarioMestre();
    renderizarGestaoUsuarios();
    renderizarGestaoMunicipios();
    renderizarGestaoEscolas();
    renderizarGestaoAlunos();
  } else {
    alert("❌ Credenciais inválidas! Tente novamente.");
  }
}

function executarLogout() {
  currentUser = null;
  document.getElementById("app-container").classList.remove("app-active");
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("auth-pass").value = "";
}

function aplicarRestricoesDeNivel() {
  const btnUser = document.getElementById("btn-tab-usuarios");
  const btnMun = document.getElementById("btn-tab-municipios");
  const btnEsc = document.getElementById("btn-tab-escolas");

  if (!btnUser || !btnMun || !btnEsc) return;

  if (currentUser.role === "ADM") {
    btnUser.style.display = "block";
    btnMun.style.display = "block";
    btnEsc.style.display = "block";
  } else if (currentUser.role === "Coordenador Municipal") {
    btnUser.style.display = "none";
    btnMun.style.display = "none";
    btnEsc.style.display = "block";
  } else {
    btnUser.style.display = "none";
    btnMun.style.display = "none";
    btnEsc.style.display = "none";
  }
}

function renderizarFiltrosSelects() {
  const filterMun = document.getElementById("filtro-municipio");
  const filterOly = document.getElementById("filtro-olimpiada");

  if (filterMun) {
    filterMun.innerHTML = `<option value="todos">Todos os Municípios</option>`;

    MUNICIPIOS_DATA.forEach(m => {
      filterMun.innerHTML += `<option value="${m}">${m}</option>`;
    });

    filterMun.disabled = false;

    if (currentUser.role === "Coordenador Municipal") {
      filterMun.value = currentUser.escopo;
      filterMun.disabled = true;
    }
  }

  if (filterOly) {
    filterOly.innerHTML = `<option value="todas">Todas as Olimpíadas</option>`;

    OLYMPIADS_DB.forEach(o => {
      filterOly.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
    });
  }
}

function renderizarDashboard() {
  const mSel = document.getElementById("filtro-municipio")?.value || "todos";
  const oSel = document.getElementById("filtro-olimpiada")?.value || "todas";

  let filtrados = ALUNOS_REPOSITORIO.filter(item => {
    const bMun = mSel === "todos" || item.municipio === mSel;
    const bOly = oSel === "todas" || item.olimpiada === oSel;

    if (currentUser.role === "Escola" && item.escola !== currentUser.escopo) {
      return false;
    }

    return bMun && bOly;
  });

  let ouro = 0;
  let prata = 0;
  let bronze = 0;
  let mencao = 0;

  filtrados.forEach(item => {
    if (item.premio === "Ouro") ouro++;
    else if (item.premio === "Prata") prata++;
    else if (item.premio === "Bronze") bronze++;
    else if (item.premio === "Menção Honrosa") mencao++;
  });

  document.getElementById("card-ouro").innerText = ouro;
  document.getElementById("card-prata").innerText = prata;
  document.getElementById("card-bronze").innerText = bronze;
  document.getElementById("card-mencao").innerText = mencao;
  document.getElementById("card-total").innerText = ouro + prata + bronze + mencao;
  document.getElementById("card-medalhas").innerText = ouro + prata + bronze;

  const canvas = document.getElementById("chartCanvas");

  if (canvas && typeof Chart !== "undefined") {
    const ctx = canvas.getContext("2d");

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Ouro", "Prata", "Bronze", "Menção"],
        datasets: [
          {
            label: "Volume de Premiações 2026",
            data: [ouro, prata, bronze, mencao],
            backgroundColor: ["#eab308", "#94a3b8", "#ea580c", "#8b5cf6"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

function renderizarCalendarioMestre() {
  const tabela = document.getElementById("tabela-calendario");
  if (!tabela) return;

  let html = "";

  OLYMPIADS_DB.forEach(oly => {
    html += `
      <tr>
        <td><strong>${oly.nome}</strong><br><small>${oly.cat}</small></td>
        <td>${oly.target}</td>
        <td>${oly.data}</td>
        <td>
          <a href="${oly.site}" target="_blank">Acessar Portal</a>
        </td>
      </tr>
    `;
  });

  tabela.innerHTML = html;
}

function renderizarGestaoUsuarios() {
  const tbody = document.getElementById("tbody-usuarios");
  if (!tbody) return;

  if (currentUser.role !== "ADM") {
    tbody.innerHTML = "";
    return;
  }

  let html = "";

  Object.keys(USUARIOS_LOGADOS).forEach(key => {
    const u = USUARIOS_LOGADOS[key];

    html += `
      <tr>
        <td>${key}</td>
        <td>${u.nome}</td>
        <td>${u.role}</td>
        <td>${u.escopo}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function cadastrarUsuario(e) {
  e.preventDefault();

  const user = document.getElementById("new-user").value.trim().toLowerCase();
  const nome = document.getElementById("new-nome").value;
  const role = document.getElementById("new-role").value;
  const senha = document.getElementById("new-pass").value;
  const escopo = document.getElementById("new-escopo").value;

  if (USUARIOS_LOGADOS[user]) {
    alert("Usuário já cadastrado!");
    return;
  }

  USUARIOS_LOGADOS[user] = { senha, role, nome, escopo };

  alert("✓ Usuário inserido com sucesso!");
  document.getElementById("form-usuarios").reset();
  renderizarGestaoUsuarios();
}

function renderizarGestaoMunicipios() {
  const tbody = document.getElementById("tbody-municipios");
  if (!tbody) return;

  let html = "";

  MUNICIPIOS_DATA.forEach((m, idx) => {
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${m}</td>
        <td>Estado do Piauí</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function cadastrarMunicipio(e) {
  e.preventDefault();

  const m = document.getElementById("new-mun-nome").value.trim();

  if (!m) return;

  MUNICIPIOS_DATA.push(m);

  alert("✓ Município cadastrado!");
  document.getElementById("form-municipios").reset();

  renderizarGestaoMunicipios();
  renderizarFiltrosSelects();
}

function renderizarGestaoEscolas() {
  const tbody = document.getElementById("tbody-escolas");
  if (!tbody) return;

  let html = "";

  ESCOLAS_DATA.forEach((esc, idx) => {
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc}</td>
        <td>Ativa</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  const selectEscola = document.getElementById("new-al-escola");

  if (selectEscola) {
    selectEscola.innerHTML = "";

    ESCOLAS_DATA.forEach(esc => {
      selectEscola.innerHTML += `<option value="${esc}">${esc}</option>`;
    });
  }
}

function cadastrarEscola(e) {
  e.preventDefault();

  const esc = document.getElementById("new-esc-nome").value.trim();

  if (!esc) return;

  ESCOLAS_DATA.push(esc);

  alert("✓ Escola integrada!");
  document.getElementById("form-escolas").reset();

  renderizarGestaoEscolas();
}

function renderizarGestaoAlunos() {
  const tbody = document.getElementById("tbody-alunos");
  if (!tbody) return;

  let filtrados = [...ALUNOS_REPOSITORIO];

  if (currentUser.role === "Escola") {
    filtrados = ALUNOS_REPOSITORIO.filter(a => a.escola === currentUser.escopo);
  }

  let html = "";

  filtrados.forEach(a => {
    html += `
      <tr>
        <td>${a.aluno}</td>
        <td>${a.escola}</td>
        <td>${a.olimpiada}</td>
        <td>${a.premio}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  const selectOly = document.getElementById("new-al-olimpiada");

  if (selectOly) {
    selectOly.innerHTML = `<option value="">Selecione a Competição</option>`;

    OLYMPIADS_DB.forEach(o => {
      selectOly.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
    });
  }
}

function cadastrarAluno(e) {
  e.preventDefault();

  const aluno = document.getElementById("new-al-nome").value.trim();
  const olimpiada = document.getElementById("new-al-olimpiada").value;
  const premio = document.getElementById("new-al-premio").value;

  let escola;

  if (currentUser.role === "Escola") {
    escola = currentUser.escopo;
  } else {
    escola = document.getElementById("new-al-escola").value;
  }

  const municipio = "São Braz - PI";

  if (!aluno || !escola || !olimpiada || !premio) {
    alert("Preencha todos os campos.");
    return;
  }

  ALUNOS_REPOSITORIO.push({
    aluno,
    escola,
    municipio,
    olimpiada,
    premio
  });

  alert("✓ Resultado olímpico computado!");

  document.getElementById("form-alunos").reset();

  renderizarGestaoAlunos();
  renderizarDashboard();
}

function switchTab(id, evt) {
  document.querySelectorAll(".tab-content").forEach(el => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach(el => {
    el.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  if (evt && evt.target) {
    evt.target.classList.add("active");
  } else if (window.event && window.event.target) {
    window.event.target.classList.add("active");
  }
}
