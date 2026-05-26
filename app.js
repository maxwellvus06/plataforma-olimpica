/* app.js - Inteligência de Negócio, Escopo e Gestão de Níveis */

// Bancos de Dados em Memória Volátil de Inicialização
let USUARIOS_LOGADOS = { ...USERS_DB };
let MUNICIPIOS_DATA = ["São Braz - PI", "Teresina - PI", "Picos - PI"];
let ESCOLAS_DATA = ["U.E. Polo Municipal", "C.E. Estadual São Braz", "U.E. Clarindo Lopes"];
let ALUNOS_REPOSITORIO = [
    { aluno: "Carlos Eduardo", escola: "U.E. Polo Municipal", municipio: "São Braz - PI", olimpiada: "Olimpíada Canguru de Matemática", premio: "Ouro" },
    { aluno: "Ana Clara", escola: "U.E. Polo Municipal", municipio: "São Braz - PI", olimpiada: "Olimpíada Canguru de Matemática", premio: "Prata" },
    { aluno: "Mariana Souza", escola: "U.E. Polo Municipal", municipio: "São Braz - PI", olimpiada: "Olimpíada Brasileira de Matemática Financeira", premio: "Ouro" },
    { aluno: "Mateus Lima", escola: "C.E. Estadual São Braz", municipio: "São Braz - PI", olimpiada: "Olimpíada Brasileira de Geopolítica", premio: "Ouro" }
];

let currentUser = null;
let chartInstance = null;

// Lógica de Autenticação com Controle de Escopo
function executarLogin() {
    const userField = document.getElementById("auth-user").value.trim().toLowerCase();
    const passField = document.getElementById("auth-pass").value;

    if (USUARIOS_LOGADOS[userField] && USUARIOS_LOGADOS[userField].senha === passField) {
        currentUser = USUARIOS_LOGADOS[userField];
        document.getElementById("auth-screen").style.display = "none";
        document.getElementById("app-container").classList.add("app-active");
        
        // Atualiza elementos visuais de identificação corporativa
        document.getElementById("nav-user-name").innerText = currentUser.nome;
        document.getElementById("nav-user-role").innerText = `Nível: ${currentUser.role}`;

        // Trata os menus restritos de governança baseando-se no nível
        aplicarRestricoesDeNivel();
        
        // Inicializa as views
        renderizarFiltrosSelects();
        renderizarDashboard();
        renderizarCalendarioMestre();
        
        // Carrega as tabelas de gestão interna
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
    // Abas Administrativas
    const btnUser = document.getElementById("btn-tab-usuarios");
    const btnMun = document.getElementById("btn-tab-municipios");
    const btnEsc = document.getElementById("btn-tab-escolas");

    if (currentUser.role === "ADM") {
        btnUser.style.display = "block";
        btnMun.style.display = "block";
        btnEsc.style.display = "block";
    } else if (currentUser.role === "Coordenador Municipal") {
        btnUser.style.display = "none";
        btnMun.style.display = "none";
        btnEsc.style.display = "block"; // Coordenador do município gerencia suas escolas
    } else { // Nível Escola
        btnUser.style.display = "none";
        btnMun.style.display = "none";
        btnEsc.style.display = "none";
    }
}

// Renderização dos Filtros Superiores Inteligentes
function renderizarFiltrosSelects() {
    const filterMun = document.getElementById("filtro-municipio");
    filterMun.innerHTML = '<option value="todos">Todos os Municípios</option>';
    
    MUNICIPIOS_DATA.forEach(m => {
        filterMun.innerHTML += `<option value="${m}">${m}</option>`;
    });

    // Se o usuário tiver restrição de escopo por município, força o filtro e bloqueia
    if (currentUser.role === "Coordenador Municipal") {
        filterMun.value = currentUser.escopo;
        filterMun.disabled = true;
    }
}

// Cálculo Analítico e Renderização de Gráficos (Chart.js)
function renderizarDashboard() {
    const mSel = document.getElementById("filtro-municipio").value;
    const oSel = document.getElementById("filtro-olimpiada").value;

    let filtrados = ALUNOS_REPOSITORIO.filter(item => {
        const bMun = (mSel === "todos" || item.municipio === mSel);
        const bOly = (oSel === "todas" || item.olimpiada === oSel);
        
        // Filtro cascata do nível de Escola logado
        if (currentUser.role === "Escola" && item.escola !== currentUser.escopo) return false;
        
        return bMun && bOly;
    });

    let o = 0, p = 0, b = 0, m = 0;
    filtrados.forEach(item => {
        if (item.premio === "Ouro") o++;
        else if (item.premio === "Prata") p++;
        else if (item.premio === "Bronze") b++;
        else if (item.premio === "Menção Honrosa") m++;
    });

    document.getElementById("card-ouro").innerText = o;
    document.getElementById("card-prata").innerText = p;
    document.getElementById("card-bronze").innerText = b;
    document.getElementById("card-mencao").innerText = m;
    document.getElementById("card-total").innerText = o + p + b + m;
    document.getElementById("card-medalhas").innerText = o + p + b;

    // Inicialização segura do gráfico de barras
    const ctx = document.getElementById('chartCanvas').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['🥇 Ouro', '🥈 Prata', '🥉 Bronze', '🏅 Menção'],
            datasets: [{
                label: 'Volume de Premiações 2026',
                data: [o, p, b, m],
                backgroundColor: ['#eab308', '#94a3b8', '#ea580c', '#8b5cf6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Injeção de Dados do Mestre Calendário (45 Olimpíadas de database.js)
function renderizarCalendarioMestre() {
    let html = "";
    OLYMPIADS_DB.forEach(oly => {
        html += `<tr>
            <td><span class="badge bg-${oly.cat.toLowerCase()}">${oly.cat}</span> <b>${oly.nome}</b></td>
            <td>${oly.target}</td>
            <td style="font-weight:bold; color:#1e2a6b;">${oly.data}</td>
            <td><a href="${oly.site}" target="_blank" class="btn" style="padding:4px 8px; font-size:11px;">Acessar Portal</a></td>
        </tr>`;
    });
    document.getElementById("tabela-calendario").innerHTML = html;
}

// MÓDULOS DE GESTÃO DA PLATAFORMA

// 1. Gestão de Usuários (Apenas ADM)
function renderizarGestaoUsuarios() {
    if (currentUser.role !== "ADM") return;
    let html = "";
    Object.keys(USUARIOS_LOGADOS).forEach(key => {
        let u = USUARIOS_LOGADOS[key];
        html += `<tr><td><b>${key}</b></td><td>${u.nome}</td><td>${u.role}</td><td>${u.escopo}</td></tr>`;
    });
    document.getElementById("tbody-usuarios").innerHTML = html;
}

function cadastrarUsuario(e) {
    e.preventDefault();
    const user = document.getElementById("new-user").value.trim().toLowerCase();
    const nome = document.getElementById("new-nome").value;
    const role = document.getElementById("new-role").value;
    const senha = document.getElementById("new-pass").value;
    const escopo = document.getElementById("new-escopo").value;

    if (USUARIOS_LOGADOS[user]) { alert("Usuário já cadastrado!"); return; }
    
    USUARIOS_LOGADOS[user] = { senha, role, nome, escopo };
    alert("✓ Usuário inserido com sucesso!");
    document.getElementById("form-usuarios").reset();
    renderizarGestaoUsuarios();
}

// 2. Gestão de Municípios (Apenas ADM)
function renderizarGestaoMunicipios() {
    let html = "";
    MUNICIPIOS_DATA.forEach((m, idx) => {
        html += `<tr><td>${idx+1}</td><td><b>${m}</b></td><td>Estado do Piauí</td></tr>`;
    });
    document.getElementById("tbody-municipios").innerHTML = html;
}

function cadastrarMunicipio(e) {
    e.preventDefault();
    const m = document.getElementById("new-mun-nome").value;
    MUNICIPIOS_DATA.push(m);
    alert("✓ Município cadastrado!");
    document.getElementById("form-municipios").reset();
    renderizarGestaoMunicipios();
    renderizarFiltrosSelects();
}

// 3. Gestão de Escolas (ADM e Coordenador Municipal)
function renderizarGestaoEscolas() {
    let html = "";
    ESCOLAS_DATA.forEach((esc, idx) => {
        html += `<tr><td>${idx+1}</td><td><b>${esc}</b></td><td>Ativa</td></tr>`;
    });
    document.getElementById("tbody-escolas").innerHTML = html;
}

function cadastrarEscola(e) {
    e.preventDefault();
    const esc = document.getElementById("new-esc-nome").value;
    ESCOLAS_DATA.push(esc);
    alert("✓ Escola integrada!");
    document.getElementById("form-escolas").reset();
    renderizarGestaoEscolas();
}

// 4. Gestão de Alunos / Resultados (Todos conforme escopo)
function renderizarGestaoAlunos() {
    let html = "";
    let filtrados = ALUNOS_REPOSITORIO;
    if (currentUser.role === "Escola") {
        filtrados = ALUNOS_REPOSITORIO.filter(a => a.escola === currentUser.escopo);
    }
    
    filtrados.forEach((a, idx) => {
        html += `<tr>
            <td><b>${a.aluno}</b></td>
            <td>${a.escola}</td>
            <td>${a.olimpiada}</td>
            <td><span class="badge bg-mat">${a.premio}</span></td>
        </tr>`;
    });
    document.getElementById("tbody-alunos").innerHTML = html;
    
    // Alimenta a lista de olimpíadas no formulário de cadastro de aluno
    const selectOly = document.getElementById("new-al-olimpiada");
    if(selectOly.options.length <= 1) {
        OLYMPIADS_DB.forEach(o => {
            selectOly.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
        });
    }
}

function cadastrarAluno(e) {
    e.preventDefault();
    const aluno = document.getElementById("new-al-nome").value;
    const escola = currentUser.role === "Escola" ? currentUser.escopo : document.getElementById("new-al-escola").value;
    const municipio = currentUser.role === "Escola" ? "São Braz - PI" : "São Braz - PI"; 
    const olimpiada = document.getElementById("new-al-olimpiada").value;
    const premio = document.getElementById("new-al-premio").value;

    ALUNOS_REPOSITORIO.push({ aluno, escola, municipio, olimpiada, premio });
    alert("✓ Resultado olímpico computado!");
    document.getElementById("form-alunos").reset();
    renderizarGestaoAlunos();
    renderizarDashboard();
}

// Controle de Navegação de Abas Internas
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.target.classList.add('active');
}