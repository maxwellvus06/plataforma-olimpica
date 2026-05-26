// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogado = null; // Variável global de governança do operador atual

document.addEventListener("DOMContentLoaded", () => {
    // Carrega dados iniciais do banco local
    dadosTrabalho = [...DATABASE.premiados];
    
    // Inicializa escutas de login e formulários originais
    initLogin();
    initFormularios();
    initDragAndDrop();
    
    // Configura os seletores de filtros superiores da dashboard
    document.getElementById("filterMunicipio").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterEscola").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterOlimpiada").addEventListener("change", renderizarPlataforma);
    
    // Botão de Logout Original
    document.getElementById("btnLogout").addEventListener("click", logout);
    
    // Recupera sessão se o usuário já tiver logado antes
    verificarSessao();
});

// ==================== SISTEMA DE AUTENTICAÇÃO ====================\
function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const userInput = document.getElementById("auth-user").value.trim().toLowerCase();
        const passInput = document.getElementById("auth-pass").value.trim();
        
        const contaEncontrada = DATABASE.usuarios.find(u => u.login === userInput && u.senha === passInput);

        if (contaEncontrada) {
            usuarioLogado = contaEncontrada;
            sessionStorage.setItem("avance_session", JSON.stringify(contaEncontrada));
            logarSucesso(contaEncontrada);
        } else {
            alert("Erro de Autenticação: Login ou senha inválidos para o ciclo 2026.");
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

    // A NOVO REGRA DE GOVERNANÇA: Exibe menus de gerenciamento se e somente se o cargo for ADM
    const btnNavCidades = document.getElementById("btnNavCidades");
    const btnNavEscolas = document.getElementById("btnNavEscolas");
    
    if (usuario.nivel === "ADM") {
        if(btnNavCidades) btnNavCidades.classList.remove("hidden");
        if(btnNavEscolas) btnNavEscolas.classList.remove("hidden");
    } else {
        if(btnNavCidades) btnNavCidades.classList.add("hidden");
        if(btnNavEscolas) btnNavEscolas.classList.add("hidden");
    }

    // Inicialização e preenchimento dos layouts
    popularSeletores();
    renderizarPlataforma();
    renderizarCronograma();
    renderizarTabelasGerenciais();
}

function logout() {
    sessionStorage.removeItem("avance_session");
    usuarioLogado = null;
    document.getElementById("mainPanel").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("loginForm").reset();
}

// ==================== CONTROLE DE NAVEGAÇÃO ENTRE ABAS ====================\
function navegarAba(abaId, botaoTarget) {
    // Esconde todas as sub-views
    document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
    
    // Mostra a view solicitada
    document.getElementById(`view-${abaId}`).classList.remove("hidden");
    
    // Atualiza o Título Superior Fluido da Topbar
    const titulos = {
        dashboard: "Dashboard Analítico",
        calendario: "Calendário Oficial de Olimpíadas",
        importar: "Importar Resultados de Planilhas",
        cidades: "Gerenciamento Estratégico de Cidades Polo (ADM)",
        escolas: "Gerenciamento Estratégico de Escolas Conveniadas (ADM)"
    };
    document.getElementById("pageTitleDisplay").innerText = titulos[abaId] || "Painel Operacional";

    // Altera o estilo do item ativo do menu lateral mantendo o visual original
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.remove("text-blue-400", "bg-blue-500/10");
        btn.classList.add("text-gray-400");
    });
    botaoTarget.classList.remove("text-gray-400");
    botaoTarget.classList.add("text-blue-400", "bg-blue-500/10");
}

// ==================== LÓGICA DE CADASTROS ADM (NOVAS FEATURES) ====================\
function salvarNovaCidade(event) {
    event.preventDefault();
    if (!usuarioLogado || usuarioLogado.nivel !== "ADM") return alert("Erro: Operação restrita.");

    const nome = document.getElementById("addCidNome").value.trim();
    const sigla = document.getElementById("addCidSigla").value.trim().toUpperCase();
    const uf = document.getElementById("addCidUf").value.trim().toUpperCase();

    const listaCidades = JSON.parse(localStorage.getItem("app_cidades")) || [];
    listaCidades.push({ id: String(Date.now()), nome, sigla, uf });
    
    localStorage.setItem("app_cidades", JSON.stringify(listaCidades));
    document.getElementById("formCadCidade").reset();
    
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataforma();
}

function salvarNovaEscola(event) {
    event.preventDefault();
    if (!usuarioLogado || usuarioLogado.nivel !== "ADM") return alert("Erro: Operação restrita.");

    const nome = document.getElementById("addEscNome").value.trim();
    const razaoSocial = document.getElementById("addEscRazao").value.trim();
    const cnpj = document.getElementById("addEscCnpj").value.trim();
    const inep = document.getElementById("addEscInep").value.trim();
    const endereco = document.getElementById("addEscEndereco").value.trim();
    const cep = document.getElementById("addEscCep").value.trim();
    const diretor = document.getElementById("addEscDiretor").value.trim();
    const email = document.getElementById("addEscEmail").value.trim();
    const cidadeId = document.getElementById("addEscCidadeSelect").value;

    if (!cidadeId) return alert("Erro: Cadastre e selecione uma cidade homologada!");

    const listaEscolas = JSON.parse(localStorage.getItem("app_escolas")) || [];
    listaEscolas.push({ id: String(Date.now()), nome, razaoSocial, cnpj, inep, endereco, cep, diretor, email, cidadeId });
    
    localStorage.setItem("app_escolas", JSON.stringify(listaEscolas));
    document.getElementById("formCadEscola").reset();
    
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataforma();
}

function renderizarTabelasGerenciais() {
    const cidades = JSON.parse(localStorage.getItem("app_cidades")) || [];
    const escolas = JSON.parse(localStorage.getItem("app_escolas")) || [];

    // Tabela de Cidades
    const tbodyCidades = document.getElementById("tableCidadesCorpo");
    if (tbodyCidades) {
        tbodyCidades.innerHTML = cidades.map(c => `
            <tr class="hover:bg-gray-700/30 transition">
                <td class="p-4 font-mono text-gray-500 text-xs">${c.id}</td>
                <td class="p-4 font-semibold text-white">${c.nome}</td>
                <td class="p-4 font-mono text-blue-400">${c.sigla}</td>
                <td class="p-4 font-bold text-gray-400">${c.uf}</td>
            </tr>
        `).join("");
    }

    // Tabela de Escolas
    const tbodyEscolas = document.getElementById("tableEscolasCorpo");
    if (tbodyEscolas) {
        tbodyEscolas.innerHTML = escolas.map(e => {
            const cid = cidades.find(c => c.id === e.cidadeId);
            return `
                <tr class="hover:bg-gray-700/30 transition text-xs">
                    <td class="p-4 font-mono text-purple-400">${e.inep}</td>
                    <td class="p-4">
                        <div class="font-bold text-white text-sm">${e.nome}</div>
                        <div class="text-gray-500 text-[11px]">${e.razaoSocial}</div>
                        <div class="text-gray-400 text-[10px] mt-0.5"><i class="fa-solid fa-location-dot text-gray-500"></i> ${e.endereco} - CEP: ${e.cep}</div>
                    </td>
                    <td class="p-4 font-mono text-gray-400">${e.cnpj}</td>
                    <td class="p-4">
                        <div class="text-gray-200 font-medium">${e.diretor}</div>
                        <div class="text-blue-400 font-mono text-[11px]">${e.email}</div>
                    </td>
                    <td class="p-4 font-semibold text-emerald-400">${cid ? `${cid.nome} - ${cid.uf}` : "Não vinculada"}</td>
                </tr>
            `;
        }).join("");
    }

    // Alimenta o Select do formulário de criação de escolas
    const selectFormEscola = document.getElementById("addEscCidadeSelect");
    if (selectFormEscola) {
        selectFormEscola.innerHTML = '<option value="">Selecione uma cidade...</option>' + 
            cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
    }
}

// ==================== RENDERS DOS FILTROS E INTEGRALIDADE ORIGINAL ====================\
function popularSeletores() {
    const selMuni = document.getElementById("filterMunicipio");
    const selEsco = document.getElementById("filterEscola");
    const selOlim = document.getElementById("filterOlimpiada");

    // Resgata listas do storage seguro
    const cidadesValidas = JSON.parse(localStorage.getItem("app_cidades")) || [];
    const escolasValidas = JSON.parse(localStorage.getItem("app_escolas")) || [];

    // Municípios Filtro
    let htmlMuni = '<option value="TODOS">-- Todos os Municípios --</option>';
    cidadesValidas.forEach(c => { htmlMuni += `<option value="${c.nome} - ${c.uf}">${c.nome} - ${c.uf}</option>`; });
    if(selMuni) selMuni.innerHTML = htmlMuni;

    // Escolas Filtro
    let htmlEsco = '<option value="TODOS">-- Todas as Escolas --</option>';
    escolasValidas.forEach(e => { htmlEsco += `<option value="${e.nome}">${e.nome}</option>`; });
    if(selEsco) selEsco.innerHTML = htmlEsco;

    // Olimpíadas Filtro
    let htmlOlim = '<option value="TODOS">-- Todas as Olimpíadas --</option>';
    DATABASE.olimpiadas.forEach(o => { htmlOlim += `<option value="${o.nome}">${o.nome}</option>`; });
    if(selOlim) selOlim.innerHTML = htmlOlim;
}

function renderizarPlataforma() {
    const mFiltro = document.getElementById("filterMunicipio")?.value || "TODOS";
    const eFiltro = document.getElementById("filterEscola")?.value || "TODOS";
    const oFiltro = document.getElementById("filterOlimpiada")?.value || "TODOS";

    const dadosFiltrados = dadosTrabalho.filter(item => {
        const matchM = (mFiltro === "TODOS" || item.municipio === mFiltro);
        const matchE = (eFiltro === "TODOS" || item.escola === eFiltro);
        const matchO = (oFiltro === "TODOS" || item.olimpiada === oFiltro);
        return matchM && matchE && matchO;
    });

    // Render Tabela de Resultados do Dashboard
    const tbody = document.getElementById("tablePremiadosCorpo");
    if (tbody) {
        if (dadosFiltrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 font-medium">Nenhum registro encontrado para os filtros atuais.</td></tr>`;
        } else {
            tbody.innerHTML = dadosFiltrados.map(d => `
                <tr class="hover:bg-gray-800/60 transition">
                    <td class="p-4 font-semibold text-white flex items-center gap-2"><i class="fa-solid fa-user-gradient text-xs text-blue-400"></i> ${d.aluno}</td>
                    <td class="p-4 text-gray-300 font-medium">${d.escola}</td>
                    <td class="p-4 text-blue-400 font-semibold text-xs"><i class="fa-solid fa-location-dot text-gray-600 mr-1"></i> ${d.municipio}</td>
                    <td class="p-4 text-gray-400 text-xs">${d.olimpiada}</td>
                    <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${getBadgeStyle(d.premio)}">${d.premio}</span></td>
                </tr>
            `).join("");
        }
    }

    // Atualiza contadores dinâmicos nos cards superiores
    const totalCidadesUnicas = [...new Set(JSON.parse(localStorage.getItem("app_cidades")) || [])].length;
    const totalEscolasUnicas = [...new Set(JSON.parse(localStorage.getItem("app_escolas")) || [])].length;
    
    if(document.getElementById("cardTotalMedalhas")) document.getElementById("cardTotalMedalhas").innerText = dadosFiltrados.length;
    if(document.getElementById("cardTotalOuro")) document.getElementById("cardTotalOuro").innerText = dadosFiltrados.filter(x => x.premio.toLowerCase() === "ouro").length;
    if(document.getElementById("cardTotalEscolas")) document.getElementById("cardTotalEscolas").innerText = totalEscolasUnicas;
    if(document.getElementById("cardTotalCidades")) document.getElementById("cardTotalCidades").innerText = totalCidadesUnicas;

    atualizarGraficoPremios(dadosFiltrados);
}

function renderizarCronograma() {
    const tbody = document.getElementById("tableCronogramaCorpo");
    if (!tbody) return;

    tbody.innerHTML = DATABASE.cronograma.map(c => `
        <tr class="hover:bg-gray-800/40 transition">
            <td class="p-4 font-bold text-white">${c.olimpiada}</td>
            <td class="p-4 text-xs font-semibold"><span class="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-gray-300">${c.etapa}</span></td>
            <td class="p-4 text-amber-400 font-mono text-xs"><i class="fa-regular fa-clock mr-1"></i> ${c.data}</td>
            <td class="p-4 text-xs text-gray-400 font-medium">${c.segmento}</td>
            <td class="p-4 text-gray-400 text-xs leading-relaxed">${c.acao}</td>
        </tr>
    `).join("");
}

function getBadgeStyle(premio) {
    const p = premio.toLowerCase();
    if (p === "ouro") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    if (p === "prata") return "bg-slate-400/10 text-slate-300 border border-slate-400/20";
    if (p === "bronze") return "bg-orange-600/10 text-orange-400 border border-orange-600/20";
    return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
}

function atualizarGraficoPremios(dados) {
    const ctx = document.getElementById("chartPremios");
    if (!ctx) return;

    const count = { Ouro: 0, Prata: 0, Bronze: 0, Outros: 0 };
    dados.forEach(d => {
        const p = d.premio.toLowerCase();
        if (p === "ouro") count.Ouro++;
        else if (p === "prata") count.Prata++;
        else if (p === "bronze") count.Bronze++;
        else count.Outros++;
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ouro', 'Prata', 'Bronze', 'Outros'],
            datasets: [{
                data: [count.Ouro, count.Prata, count.Bronze, count.Outros],
                backgroundColor: ['#f59e0b', '#94a3b8', '#ea580c', '#3b82f6'],
                borderWidth: 2,
                borderColor: '#1f2937'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11, weight: 'bold' } } }
            }
        }
    });
}

// ==================== OPERAÇÕES DE DRAG AND DROP E XLS (Originais) ====================\
function initFormularios() {}
function initDragAndDrop() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("border-blue-500"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-blue-500"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-blue-500");
        if (e.dataTransfer.files.length) processarPlanilha(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length) processarPlanilha(e.target.files[0]);
    });
}

function processarPlanilha(arquivo) {
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const primeiraAba = workbook.SheetNames[0];
            const abasPlanilha = workbook.Sheets[primeiraAba];
            const linhas = XLSX.utils.sheet_to_json(abasPlanilha);

            if (linhas.length === 0) {
                alert("Aviso: A planilha está vazia!");
                return;
            }

            linhas.forEach(linha => {
                dadosTrabalho.push({
                    aluno: linha.Aluno || linha.aluno || "Desconhecido",
                    escola: linha.Escola || linha.escola || "Não Informada",
                    municipio: linha.Municipio || linha.municipio || "São Braz - PI",
                    olimpiada: linha.Olimpiada || linha.olimpiada || "Geral",
                    premio: linha.Premio || linha.premio || "Menção Honrosa"
                });
            });

            alert(`${linhas.length} novos registros importados com sucesso para o Painel!`);
            popularSeletores();
            renderizarPlataforma();
        } catch (erro) {
            console.error(erro);
            alert("Erro ao ler o arquivo! Certifique-se de que é uma tabela válida.");
        }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function downloadCSVTemplate() {
    const cabecalho = "Aluno,Escola,Municipio,Olimpiada,Premio\nCarlos Silva,U. E. São Braz,São Braz - PI,OBMEP,Ouro\nMaria Oliveira,C. M. Governador Alberto Silva,São Braz - PI,Canguru de Matemática Brasil,Prata";
    const blob = new Blob([cabecalho], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "modelo_importacao_olimpiadas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}