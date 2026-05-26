// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogado = null;

document.addEventListener("DOMContentLoaded", () => {
    dadosTrabalho = [...DATABASE.premiados];
    initLogin();
    initDragAndDrop();
    initDragAndDropCronograma();
    
    document.getElementById("filterMunicipio").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterEscola").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterOlimpiada").addEventListener("change", renderizarPlataforma);
    document.getElementById("btnLogout").addEventListener("click", logout);
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
        
        const usuariosCadastrados = JSON.parse(localStorage.getItem("app_usuarios")) || [];
        const contaEncontrada = usuariosCadastrados.find(u => u.login === userInput && u.senha === passInput);

        if (contaEncontrada) {
            usuarioLogado = contaEncontrada;
            sessionStorage.setItem("avance_session", JSON.stringify(contaEncontrada));
            logarSucesso(contaEncontrada);
        } else {
            alert("Erro de Autenticação: Login inválido.");
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

    const panels = ["btnNavUsuarios", "btnNavOlimpiadas", "btnNavCidades", "btnNavEscolas", "admCronogramaPanel"];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (usuario.nivel === "ADM") el.classList.remove("hidden");
            else el.classList.add("hidden");
        }
    });

    popularSeletores();
    renderizarPlataforma();
    renderizarCronograma();
    renderizarTabelasGerenciais();
    ajustarCamposFormUsuario();
}

function logout() {
    sessionStorage.removeItem("avance_session");
    usuarioLogado = null;
    document.getElementById("mainPanel").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("loginForm").reset();
}

// ==================== NAVEGAÇÃO ENTRE ABAS ====================\
function navegarAba(abaId, botaoTarget) {
    document.querySelectorAll(".tab-view").forEach(view => view.classList.add("hidden"));
    document.getElementById(`view-${abaId}`).classList.remove("hidden");
    
    const titulos = {
        dashboard: "Dashboard Analítico", calendario: "Calendário Oficial de Olimpíadas",
        importar: "Importar Resultados", usuarios: "Gerenciar Usuários e Permissões (ADM)",
        olimpiadas: "Gerenciar Olimpíadas (ADM)", cidades: "Gerenciar Cidades Polo (ADM)", escolas: "Gerenciar Escolas (ADM)"
    };
    document.getElementById("pageTitleDisplay").innerText = titulos[abaId] || "Painel Operacional";

    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.remove("text-blue-400", "bg-blue-500/10");
        btn.classList.add("text-gray-400");
    });
    botaoTarget.classList.remove("text-gray-400");
    botaoTarget.classList.add("text-blue-400", "bg-blue-500/10");
}

// ==================== FORMULÁRIO DE CRIAÇÃO DE CONTAS DINÂMICO ====================\
function ajustarCamposFormUsuario() {
    const nivel = document.getElementById("addUserNivel").value;
    const divCidade = document.getElementById("divVinculoCidade");
    const divEscola = document.getElementById("divVinculoEscola");

    divCidade.classList.add("hidden");
    divEscola.classList.add("hidden");

    if (nivel === "Gestor") {
        divCidade.classList.remove("hidden");
    } else if (nivel === "Escola" || nivel === "Aluno") {
        divEscola.classList.remove("hidden");
    }
}

function salvarNovoUsuario(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;

    const nivel = document.getElementById("addUserNivel").value;
    const nome = document.getElementById("addUserNome").value.trim();
    const login = document.getElementById("addUserLogin").value.trim().toLowerCase();
    const senha = document.getElementById("addUserSenha").value.trim();
    const email = document.getElementById("addUserEmail").value.trim();
    const telefone = document.getElementById("addUserTelefone").value.trim();
    
    let vinculoId = "";
    if (nivel === "Gestor") {
        vinculoId = document.getElementById("addUserCidadeSelect").value;
        if (!vinculoId) return alert("Erro: Gestores precisam estar vinculados a uma cidade!");
    } else if (nivel === "Escola" || nivel === "Aluno") {
        vinculoId = document.getElementById("addUserEscolaSelect").value;
        if (!vinculoId) return alert("Erro: Perfis de Escola/Aluno precisam ser associados a uma escola!");
    }

    const usuarios = JSON.parse(localStorage.getItem("app_usuarios")) || [];
    usuarios.push({ id: String(Date.now()), login, senha, nivel, nome, email, telefone, vinculoId });
    
    localStorage.setItem("app_usuarios", JSON.stringify(usuarios));
    document.getElementById("formCadUsuario").reset();
    ajustarCamposFormUsuario();
    renderizarTabelasGerenciais();
}

// ==================== LÓGICA DE CADASTROS ADM EXTRA ====================\
function salvarNovaOlimpiada(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;

    const nome = document.getElementById("addOliNome").value.trim();
    const categoria = document.getElementById("addOliCategoria").value.trim().toUpperCase();
    const series = document.getElementById("addOliSeries").value.trim();

    const olimpiadas = JSON.parse(localStorage.getItem("app_olimpiadas")) || [];
    olimpiadas.push({ id: String(Date.now()), nome, categoria, series });
    
    localStorage.setItem("app_olimpiadas", JSON.stringify(olimpiadas));
    document.getElementById("formCadOlimpiada").reset();
    popularSeletores();
    renderizarTabelasGerenciais();
}

function salvarNovoCronograma(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;

    const olimpiadaId = document.getElementById("addCroOlimpiadaSelect").value;
    const etapa = document.getElementById("addCroEtapa").value.trim();
    const data = document.getElementById("addCroData").value.trim();
    const segmento = document.getElementById("addCroSegmento").value.trim();
    const acao = document.getElementById("addCroAcao").value.trim();

    const cronograma = JSON.parse(localStorage.getItem("app_cronograma")) || [];
    cronograma.push({ id: String(Date.now()), olimpiadaId, etapa, data, segmento, acao });
    
    localStorage.setItem("app_cronograma", JSON.stringify(cronograma));
    document.getElementById("formCadCronograma").reset();
    renderizarCronograma();
}

function salvarNovaCidade(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;

    const nome = document.getElementById("addCidNome").value.trim();
    const sigla = document.getElementById("addCidSigla").value.trim().toUpperCase();
    const uf = document.getElementById("addCidUf").value.trim().toUpperCase();

    const cidades = JSON.parse(localStorage.getItem("app_cidades")) || [];
    cidades.push({ id: String(Date.now()), nome, sigla, uf });
    
    localStorage.setItem("app_cidades", JSON.stringify(cidades));
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

    const escolas = JSON.parse(localStorage.getItem("app_escolas")) || [];
    escolas.push({ id: String(Date.now()), nome, razaoSocial, cnpj, inep, endereco, cep, diretor, email, cidadeId });
    
    localStorage.setItem("app_escolas", JSON.stringify(escolas));
    document.getElementById("formCadEscola").reset();
    popularSeletores();
    renderizarTabelasGerenciais();
}

// ==================== RENDERS DE COMPONENTES E DATA VIS ====================\
function renderizarCronograma() {
    const cronograma = JSON.parse(localStorage.getItem("app_cronograma")) || [];
    const olimpiadas = JSON.parse(localStorage.getItem("app_olimpiadas")) || [];
    const tbody = document.getElementById("tableCronogramaCorpo");
    if (!tbody) return;

    tbody.innerHTML = cronograma.map(c => {
        const oli = olimpiadas.find(o => o.id === c.olimpiadaId);
        return `
            <tr class="hover:bg-gray-800/40 transition">
                <td class="p-4 font-bold text-white">${oli ? oli.nome : "Desconhecida"}</td>
                <td class="p-4 text-xs font-semibold"><span class="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-gray-300">${c.etapa}</span></td>
                <td class="p-4 text-amber-400 font-mono text-xs"><i class="fa-regular fa-clock mr-1"></i> ${c.data}</td>
                <td class="p-4 text-xs text-gray-400 font-medium">${c.segmento}</td>
                <td class="p-4 text-gray-400 text-xs leading-relaxed">${c.acao}</td>
            </tr>
        `;
    }).join("");
}

function renderizarTabelasGerenciais() {
    const cidades = JSON.parse(localStorage.getItem("app_cidades")) || [];
    const escolas = JSON.parse(localStorage.getItem("app_escolas")) || [];
    const olimpiadas = JSON.parse(localStorage.getItem("app_olimpiadas")) || [];
    const usuarios = JSON.parse(localStorage.getItem("app_usuarios")) || [];

    // Tabela de Cidades
    if (document.getElementById("tableCidadesCorpo")) {
        document.getElementById("tableCidadesCorpo").innerHTML = cidades.map(c => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${c.id}</td><td class="p-4 font-semibold text-white">${c.nome}</td><td class="p-4 font-mono text-blue-400">${c.sigla}</td><td class="p-4 font-bold text-gray-400">${c.uf}</td></tr>
        `).join("");
    }
    // Tabela de Escolas
    if (document.getElementById("tableEscolasCorpo")) {
        document.getElementById("tableEscolasCorpo").innerHTML = escolas.map(e => {
            const cid = cidades.find(c => c.id === e.cidadeId);
            return `
                <tr class="hover:bg-gray-700/30 text-xs"><td class="p-4 font-mono text-purple-400">${e.inep}</td><td class="p-4"><div class="font-bold text-white text-sm">${e.nome}</div><div class="text-gray-500">${e.razaoSocial}</div></td><td class="p-4 font-mono">${e.cnpj}</td><td class="p-4"><div>${e.diretor}</div><div class="text-blue-400 font-mono">${e.email}</div></td><td class="p-4 font-semibold text-emerald-400">${cid ? `${cid.nome} - ${cid.uf}` : "Desconhecido"}</td></tr>
            `;
        }).join("");
    }
    // Tabela de Olimpíadas Base
    if (document.getElementById("tableOlimpiadasCorpo")) {
        document.getElementById("tableOlimpiadasCorpo").innerHTML = olimpiadas.map(o => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${o.id}</td><td class="p-4 font-bold text-white">${o.nome}</td><td class="p-4 text-blue-400 font-mono font-semibold">${o.categoria}</td><td class="p-4 text-gray-400 font-medium">${o.series}</td></tr>
        `).join("");
    }
    // Tabela de Usuários / Operadores
    if (document.getElementById("tableUsuariosCorpo")) {
        document.getElementById("tableUsuariosCorpo").innerHTML = usuarios.map(u => {
            let descVinculo = "Acesso Global";
            if (u.nivel === "Gestor") {
                const targetCid = cidades.find(c => c.id === u.vinculoId);
                descVinculo = targetCid ? `Polo: ${targetCid.nome} - ${targetCid.uf}` : "Falta Vincular";
            } else if (u.nivel === "Escola" || u.nivel === "Aluno") {
                const targetEsc = escolas.find(e => e.id === u.vinculoId);
                descVinculo = targetEsc ? `Unidade: ${targetEsc.nome}` : "Falta Vincular";
            }
            return `
                <tr class="hover:bg-gray-750 text-xs">
                    <td class="p-4 font-bold text-white">${u.nome}</td>
                    <td class="p-4">
                        <div class="font-mono text-blue-400 font-bold">${u.login}</div>
                        <div class="text-gray-500 font-medium text-[10px] uppercase">${u.nivel}</div>
                    </td>
                    <td class="p-4">
                        <div>${u.email}</div>
                        <div class="text-gray-500 font-mono">${u.telefone}</div>
                    </td>
                    <td class="p-4 font-semibold ${u.nivel === 'ADM' ? 'text-blue-400' : 'text-amber-400'}">${descVinculo}</td>
                </tr>
            `;
        }).join("");
    }

    // Listas suspensas dinâmicas nos formulários de criação
    if (document.getElementById("addEscCidadeSelect")) {
        document.getElementById("addEscCidadeSelect").innerHTML = '<option value="">Selecione uma cidade...</option>' + cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
    }
    if (document.getElementById("addCroOlimpiadaSelect")) {
        document.getElementById("addCroOlimpiadaSelect").innerHTML = '<option value="">Selecione a olimpíada alvo...</option>' + olimpiadas.map(o => `<option value="${o.id}">${o.nome}</option>`).join("");
    }
    if (document.getElementById("addUserCidadeSelect")) {
        document.getElementById("addUserCidadeSelect").innerHTML = '<option value="">Selecione a cidade polo...</option>' + cidades.map(c => `<option value="${c.id}">${c.nome} (${c.uf})</option>`).join("");
    }
    if (document.getElementById("addUserEscolaSelect")) {
        document.getElementById("addUserEscolaSelect").innerHTML = '<option value="">Selecione a unidade escolar...</option>' + escolas.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
    }
}

function popularSeletores() {
    const cidades = JSON.parse(localStorage.getItem("app_cidades")) || [];
    const escolas = JSON.parse(localStorage.getItem("app_escolas")) || [];
    const olimpiadas = JSON.parse(localStorage.getItem("app_olimpiadas")) || [];

    if (document.getElementById("filterMunicipio")) {
        document.getElementById("filterMunicipio").innerHTML = '<option value="TODOS">-- Todos os Municípios --</option>' + cidades.map(c => `<option value="${c.nome} - ${c.uf}">${c.nome} - ${c.uf}</option>`).join("");
    }
    if (document.getElementById("filterEscola")) {
        document.getElementById("filterEscola").innerHTML = '<option value="TODOS">-- Todas as Escolas --</option>' + escolas.map(e => `<option value="${e.nome}">${e.nome}</option>`).join("");
    }
    if (document.getElementById("filterOlimpiada")) {
        document.getElementById("filterOlimpiada").innerHTML = '<option value="TODOS">-- Todas as Olimpíadas --</option>' + olimpiadas.map(o => `<option value="${o.nome}">${o.nome}</option>`).join("");
    }
}

function renderizarPlataforma() {
    const mFiltro = document.getElementById("filterMunicipio")?.value || "TODOS";
    const eFiltro = document.getElementById("filterEscola")?.value || "TODOS";
    const oFiltro = document.getElementById("filterOlimpiada")?.value || "TODOS";

    const dadosFiltrados = dadosTrabalho.filter(item => {
        return (mFiltro === "TODOS" || item.municipio === mFiltro) && (eFiltro === "TODOS" || item.escola === eFiltro) && (oFiltro === "TODOS" || item.olimpiada === oFiltro);
    });

    const tbody = document.getElementById("tablePremiadosCorpo");
    if (tbody) {
        tbody.innerHTML = dadosFiltrados.map(d => `
            <tr class="hover:bg-gray-800/60 transition"><td class="p-4 font-semibold text-white"><i class="fa-solid fa-user text-blue-400 mr-2"></i>${d.aluno}</td><td class="p-4 text-gray-300">${d.escola}</td><td class="p-4 text-blue-400 font-semibold text-xs">${d.municipio}</td><td class="p-4 text-gray-400 text-xs">${d.olimpiada}</td><td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">${d.premio}</span></td></tr>
        `).join("");
    }

    const tCidades = (JSON.parse(localStorage.getItem("app_cidades")) || []).length;
    const tEscolas = (JSON.parse(localStorage.getItem("app_escolas")) || []).length;

    if(document.getElementById("cardTotalMedalhas")) document.getElementById("cardTotalMedalhas").innerText = dadosFiltrados.length;
    if(document.getElementById("cardTotalOuro")) document.getElementById("cardTotalOuro").innerText = dadosFiltrados.filter(x => x.premio.toLowerCase() === "ouro").length;
    if(document.getElementById("cardTotalEscolas")) document.getElementById("cardTotalEscolas").innerText = tEscolas;
    if(document.getElementById("cardTotalCidades")) document.getElementById("cardTotalCidades").innerText = tCidades;

    atualizarGraficoPremios(dadosFiltrados);
}

function atualizarGraficoPremios(dados) {
    const ctx = document.getElementById("chartPremios");
    if (!ctx) return;
    const count = { Ouro: 0, Prata: 0, Bronze: 0, Outros: 0 };
    dados.forEach(d => {
        const p = d.premio.toLowerCase();
        if (p === "ouro") count.Ouro++; else if (p === "prata") count.Prata++; else if (p === "bronze") count.Bronze++; else count.Outros++;
    });
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Ouro', 'Prata', 'Bronze', 'Outros'], datasets: [{ data: [count.Ouro, count.Prata, count.Bronze, count.Outros], backgroundColor: ['#f59e0b', '#94a3b8', '#ea580c', '#3b82f6'], borderWidth: 2, borderColor: '#1f2937' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11, weight: 'bold' } } } } }
    });
}

// ==================== LOADER DE CRONOGRAMA POR EXCEL (.XLSX) ====================\
function initDragAndDropCronograma() {
    const dropZone = document.getElementById("dropZoneCronograma");
    const fileInput = document.getElementById("fileInputCronograma");
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("border-blue-500"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-blue-500"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-blue-500");
        if (e.dataTransfer.files.length) processarPlanilhaCronograma(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length) processarPlanilhaCronograma(e.target.files[0]);
    });
}

function processarPlanilhaCronograma(arquivo) {
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const primeiraAba = workbook.SheetNames[0];
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

            const olimpiadas = JSON.parse(localStorage.getItem("app_olimpiadas")) || [];
            const cronograma = JSON.parse(localStorage.getItem("app_cronograma")) || [];

            let inseridos = 0;
            linhas.forEach(linha => {
                const siglaOuNome = (linha.SIGLA || linha.Olimpiada || "").trim().toLowerCase();
                const foundOli = olimpiadas.find(o => o.nome.toLowerCase().includes(siglaOuNome) || o.categoria.toLowerCase() === siglaOuNome);

                if (foundOli) {
                    cronograma.push({
                        id: String(Date.now() + inseridos),
                        olimpiadaId: foundOli.id,
                        etapa: linha["FASE / ETAPA"] || linha.Etapa || "Fase Escolar",
                        data: linha["DATA / PERÍODO 2026"] || linha.Data || "A confirmar",
                        segmento: linha["SÉRIES ELEGÍVEIS"] || linha.Segmento || "Geral",
                        acao: linha["OBSERVAÇÃO CRÍTICA"] || linha.Diretriz || "Mapeamento em análise."
                    });
                    inseridos++;
                }
            });

            localStorage.setItem("app_cronograma", JSON.stringify(cronograma));
            alert(`${inseridos} etapas mapeadas e associadas com sucesso via Excel!`);
            renderizarCronograma();
        } catch (err) {
            alert("Erro ao processar planilha de cronograma.");
        }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function downloadCronogramaTemplate() {
    const wb = XLSX.utils.book_new();
    const dadosModelo = [
        { SIGLA: "OBMEP", "FASE / ETAPA": "Fase 1 - Escolar (Prova Objetiva)", "DATA / PERÍODO 2026": "09/06/2026", "SÉRIES ELEGÍVEIS": "6º EF a 3ª EM", "OBSERVAÇÃO CRÍTICA": "Imprimir cadernos de prova; recolher cartões." },
        { SIGLA: "CANGURU", "FASE / ETAPA": "Prova Única (múltipla escolha)", "DATA / PERÍODO 2026": "19/03 a 25/03/2026", "SÉRIES ELEGÍVEIS": "3º EF a 3ª EM", "OBSERVAÇÃO CRÍTICA": "Aplicação nas salas sob fiscalização." }
    ];
    const ws = XLSX.utils.json_to_sheet(dadosModelo);
    XLSX.utils.book_append_sheet(wb, ws, "ModeloCronograma");
    XLSX.writeFile(wb, "modelo_carga_cronograma.xlsx");
}

// Drag and drop original de medalhistas preservado
function initDragAndDrop() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => { e.preventDefault(); });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
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
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            linhas.forEach(linha => {
                dadosTrabalho.push({
                    aluno: linha.Aluno || "Desconhecido", escola: linha.Escola || "Não Informada",
                    municipio: linha.Municipio || "São Braz - PI", olimpiada: linha.Olimpiada || "Geral", premio: linha.Premio || "Menção Honrosa"
                });
            });
            alert(`${linhas.length} registros de premiados importados!`);
            popularSeletores();
            renderizarPlataforma();
        } catch (erro) { alert("Erro ao ler planilha."); }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function downloadCSVTemplate() {
    const cabecalho = "Aluno,Escola,Municipio,Olimpiada,Premio\nCarlos Silva,U. E. São Braz,São Braz - PI,OBMEP,Ouro";
    const blob = new Blob([cabecalho], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "modelo_importacao_olimpiadas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}