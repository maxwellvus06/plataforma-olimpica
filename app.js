// CONTROLADOR DE FLUXO DA PLATAFORMA AVANCE

let currentUser = null;

// Inicializa o Boot do App preenchendo os seletores e contadores de forma segura
document.addEventListener("DOMContentLoaded", () => {
    // Caso esteja na página recarregada logado ou em ambiente aberto
    updateCounters();
});

function handleLogin(event) {
    event.preventDefault();

    const userIn = document.getElementById("auth-user").value.trim();
    const passIn = document.getElementById("auth-pass").value.trim();

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const found = usuarios.find(u => u.username === userIn && u.password === passIn);

    if (found) {
        currentUser = found;
        
        // Chaves Visuais de Login
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-panel").classList.remove("hidden");
        document.getElementById("user-display").innerText = `Operador: ${found.name} | Perfil: ${found.role}`;

        // Regra Estrita de Acesso ADM
        if (found.role === "ADM") {
            document.getElementById("tab-cidades").classList.remove("hidden");
            document.getElementById("tab-escolas").classList.remove("hidden");
        } else {
            document.getElementById("tab-cidades").classList.add("hidden");
            document.getElementById("tab-escolas").classList.add("hidden");
        }

        // Renderização em Cascata do Core
        renderOlimpiadas();
        renderCidades();
        renderEscolas();
        renderCidadeSelect();
        updateCounters();
    } else {
        alert("Falha na autenticação corporativa! Credenciais inválidas para 2026.");
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

// PIPELINE DE GESTÃO E PERSISTÊNCIA (ADM)
function cadastrarCidade(event) {
    event.preventDefault();
    if (currentUser?.role !== "ADM") return alert("Acesso negado. Feature restrita ao ADM.");

    const nome = document.getElementById("cid-nome").value.trim();
    const sigla = document.getElementById("cid-sigla").value.trim().toUpperCase();
    const uf = document.getElementById("cid-uf").value.trim().toUpperCase();

    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    cidades.push({ id: String(Date.now()), nome, sigla, uf });
    
    localStorage.setItem("cidades", JSON.stringify(cidades));
    event.target.reset();

    renderCidades();
    renderCidadeSelect();
    updateCounters();
}

function cadastrarEscola(event) {
    event.preventDefault();
    if (currentUser?.role !== "ADM") return alert("Acesso negado. Feature restrita ao ADM.");

    const nome = document.getElementById("esc-nome").value.trim();
    const razaoSocial = document.getElementById("esc-razao").value.trim();
    const cnpj = document.getElementById("esc-cnpj").value.trim();
    const inep = document.getElementById("esc-inep").value.trim();
    const endereco = document.getElementById("esc-endereco").value.trim();
    const cep = document.getElementById("esc-cep").value.trim();
    const diretor = document.getElementById("esc-diretor").value.trim();
    const email = document.getElementById("esc-email").value.trim();
    const cidadeId = document.getElementById("esc-cidade-select").value;

    if (!cidadeId) return alert("Erro: Uma escola precisa pertencer obrigatoriamente a uma cidade cadastrada!");

    const escolas = JSON.parse(localStorage.getItem("escolas")) || [];
    escolas.push({ id: String(Date.now()), nome, razaoSocial, cnpj, inep, endereco, cep, diretor, email, cidadeId });

    localStorage.setItem("escolas", JSON.stringify(escolas));
    event.target.reset();

    renderEscolas();
    updateCounters();
}

// INJEÇÃO DE ELEMENTOS VISUAIS PREMIUM
function renderOlimpiadas() {
    const tbody = document.getElementById("table-olimpiadas-body");
    if (!tbody) return;

    tbody.innerHTML = OLIMPIADAS_DATA.map(o => `
        <tr class="hover:bg-gray-750 transition duration-150">
            <td class="p-4 font-semibold text-white">${o.nome}</td>
            <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold bg-gray-700 text-gray-300">${o.categoria}</span></td>
            <td class="p-4 text-blue-400 hover:underline cursor-pointer font-medium">${o.edital}</td>
            <td class="p-4"><span class="text-xs font-mono text-yellow-400">${o.status}</span></td>
        </tr>
    `).join("");
}

function renderCidades() {
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const tbody = document.getElementById("table-cidades-body");
    if (!tbody) return;

    tbody.innerHTML = cidades.map(c => `
        <tr class="hover:bg-gray-750">
            <td class="p-4 font-medium text-white">${c.nome}</td>
            <td class="p-4 font-mono">${c.sigla}</td>
            <td class="p-4 text-center text-blue-400 font-bold">${c.uf}</td>
        </tr>
    `).join("");
}

function renderEscolas() {
    const escolas = JSON.parse(localStorage.getItem("escolas")) || [];
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const tbody = document.getElementById("table-escolas-body");
    if (!tbody) return;

    tbody.innerHTML = escolas.map(e => {
        const cidade = cidades.find(c => c.id === e.cidadeId);
        const localizacao = cidade ? `${cidade.nome} (${cidade.uf})` : "Desconhecida";
        return `
            <tr class="hover:bg-gray-750 text-xs">
                <td class="p-4 font-mono text-gray-400">${e.inep}</td>
                <td class="p-4">
                    <div class="font-semibold text-white">${e.nome}</div>
                    <div class="text-gray-400 text-[10px]">${e.razaoSocial}</div>
                </td>
                <td class="p-4 font-mono">${e.cnpj}</td>
                <td class="p-4 text-gray-300">
                    <div>${e.diretor}</div>
                    <div class="text-blue-300 text-[10px]">${e.email}</div>
                </td>
                <td class="p-4 font-medium text-blue-400">${localizacao}</td>
            </tr>
        `;
    }).join("");
}

function renderCidadeSelect() {
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const select = document.getElementById("esc-cidade-select");
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma Cidade previamente cadastrada...</option>' +
        cidades.map(c => `<option value="${c.id}">${c.nome} - ${c.uf}</option>`).join("");
}

function updateCounters() {
    const cidades = JSON.parse(localStorage.getItem("cidades")) || [];
    const escolas = JSON.parse(localStorage.getItem("escolas")) || [];
    
    const countCid = document.getElementById("dash-tot-cidades");
    const countEsc = document.getElementById("dash-tot-escolas");

    if (countCid) countCid.innerText = `${cidades.length} Polos`;
    if (countEsc) countEsc.innerText = `${escolas.length} Conveniadas`;
}