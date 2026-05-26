// CONTROLADOR DE ESTADO DA PLATAFORMA
let currentUser = null;

function handleLogin(event) {
    event.preventDefault();
    const userIn = document.getElementById("auth-user").value.trim();
    const passIn = document.getElementById("auth-pass").value.trim();

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const found = usuarios.find(u => u.username === userIn && u.password === passIn);

    if (found) {
        currentUser = found;
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-panel").classList.remove("hidden");
        document.getElementById("user-display").innerText = `Logado como: ${found.name} (${found.role})`;

        // Validação estrita de privilégios para o ADM
        if (found.role === "ADM") {
            document.getElementById("tab-cidades").classList.remove("hidden");
            document.getElementById("tab-escolas").classList.remove("hidden");
        } else {
            document.getElementById("tab-cidades").classList.add("hidden");
            document.getElementById("tab-escolas").classList.add("hidden");
        }

        renderOlimpiadas();
        renderCidades();
        renderEscolas();
        renderCidadeSelect();
    } else {
        alert("Credenciais incorretas! Tente novamente.");
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById("main-panel").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("login-form").reset();
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach(el => {
        el.classList.remove("border-blue-500", "text-blue-400");
        el.classList.add("border-transparent", "text-gray-400");
    });

    document.getElementById(`content-${tabId}`).classList.remove("hidden");
    event.currentTarget.classList.remove("border-transparent", "text-gray-400");
    event.currentTarget.classList.add("border-blue-500", "text-blue-400");
}

// LOGICA DE CADASTRO - EXCLUSIVA ADM
function cadastrarCidade(event) {
    event.preventDefault();
    if (currentUser?.role !== "ADM") return alert("Acesso Negado.");

    const nome = document.getElementById("cid-nome").value.trim();
    const sigla = document.getElementById("cid-sigla").value.trim().toUpperCase();
    const uf = document.getElementById("cid-uf").value.trim().toUpperCase();

    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    
    const novaCidade = {
        id: String(Date.now()),
        nome,
        sigla,
        uf
    };

    cidades.push(novaCidade);
    localStorage.setItem("cidades", JSON.stringify(cidades));
    
    event.target.reset();
    renderCidades();
    renderCidadeSelect();
}

function cadastrarEscola(event) {
    event.preventDefault();
    if (currentUser?.role !== "ADM") return alert("Acesso Negado.");

    const nome = document.getElementById("esc-nome").value.trim();
    const razaoSocial = document.getElementById("esc-razao").value.trim();
    const cnpj = document.getElementById("esc-cnpj").value.trim();
    const inep = document.getElementById("esc-inep").value.trim();
    const endereco = document.getElementById("esc-endereco").value.trim();
    const cep = document.getElementById("esc-cep").value.trim();
    const diretor = document.getElementById("esc-diretor").value.trim();
    const email = document.getElementById("esc-email").value.trim();
    const cidadeId = document.getElementById("esc-cidade-select").value;

    const escolas = JSON.parse(localStorage.getItem("escolas")) || [];

    const novaEscola = {
        id: String(Date.now()),
        nome,
        razaoSocial,
        cnpj,
        inep,
        endereco,
        cep,
        diretor,
        email,
        cidadeId
    };

    escolas.push(novaEscola);
    localStorage.setItem("escolas", JSON.stringify(escolas));

    event.target.reset();
    renderEscolas();
}

// RENDERIZADORES DA INTERFACE
function renderCidades() {
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const tbody = document.getElementById("table-cidades-body");
    tbody.innerHTML = cidades.map(c => `
        <tr class="border-b border-gray-700 hover:bg-gray-750">
            <td class="py-2 font-medium">${c.nome}</td>
            <td class="py-2">${c.sigla}</td>
            <td class="py-2 text-blue-400">${c.uf}</td>
        </tr>
    `).join("");
}

function renderEscolas() {
    const escolas = JSON.parse(localStorage.getItem("escolas")) || [];
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const tbody = document.getElementById("table-escolas-body");

    tbody.innerHTML = escolas.map(e => {
        const cidade = cidades.find(c => c.id === e.cidadeId);
        const localizacao = cidade ? `${cidade.nome} - ${cidade.uf}` : "Não mapeada";
        return `
            <tr class="border-b border-gray-700 hover:bg-gray-750 text-xs">
                <td class="py-2 pr-2 text-gray-400 font-mono">${e.inep}</td>
                <td class="py-2 pr-2 font-semibold text-white">${e.nome}</td>
                <td class="py-2 pr-2">${e.cnpj}</td>
                <td class="py-2 pr-2 text-gray-400">${e.diretor}</td>
                <td class="py-2 pr-2 text-blue-400">${localizacao}</td>
            </tr>
        `;
    }).join("");
}

function renderCidadeSelect() {
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const select = document.getElementById("esc-cidade-select");
    select.innerHTML = '<option value="">Selecione uma Cidade...</option>' + 
        cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
}

function renderOlimpiadas() {
    const listCont = document.getElementById("lista-olimpiadas");
    listCont.innerHTML = CALENDAR_DATA.map(o => `
        <div class="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-center">
            <span class="text-sm font-medium">${o.nome}</span>
            <span class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">Edital 2026 Mapeado</span>
        </div>
    `).join("");
}