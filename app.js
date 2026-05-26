// Gerenciador e Inteligência do Sistema Olímpico
let chartInstance = null;
let dadosTrabalho = [];

document.addEventListener("DOMContentLoaded", () => {
    dadosTrabalho = [...DATABASE.premiados];
    
    initLogin();
    initFormularios();
    initDragAndDrop();
    
    // Configura os seletores de filtros superiores
    document.getElementById("filterMunicipio").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterEscola").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterOlimpiada").addEventListener("change", renderizarPlataforma);
    
    // Botão de Logout
    document.getElementById("btnLogout").addEventListener("click", logout);
    
    // Verifica se já existia login salvo
    verificarSessao();
});

// ==================== SISTEMA DE AUTENTICAÇÃO ====================
function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const userInput = document.getElementById("username").value.trim();
        const passInput = document.getElementById("password").value.trim();
        
        // Validação comparando com o arquivo database.js
        const contaEncontrada = DATABASE.usuarios.find(u => u.login === userInput && u.senha === passInput);
        
        if (contaEncontrada) {
            localStorage.setItem("usuarioLogado", JSON.stringify(contaEncontrada));
            aplicarLogin(contaEncontrada);
        } else {
            alert("Acesso Negado! Usuário ou senha incorretos.");
        }
    });
}

function verificarSessao() {
    const sessaoSalva = localStorage.getItem("usuarioLogado");
    if (sessaoSalva) {
        aplicarLogin(JSON.parse(sessaoSalva));
    }
}

function aplicarLogin(user) {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
    
    document.getElementById("userPanelTitle").innerText = `Painel de - ${user.nome}`;
    document.getElementById("userBadge").innerText = `Nível de Acesso: ${user.nivel}`;
    
    // Controlar travas e permissões de telas baseadas no cargo
    restringirAbasPorNivel(user.nivel);
    
    // Desenha as tabelas e dados na tela
    popularSeletores();
    renderizarPlataforma();
}

function logout() {
    localStorage.removeItem("usuarioLogado");
    document.getElementById("mainContent").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}

function restringirAbasPorNivel(nivel) {
    const btnLancamento = document.getElementById("btn-tab-lancamento");
    const btnUsuarios = document.getElementById("btn-tab-usuarios");
    
    if (nivel === "Escola") {
        // O nível escola não gerencia usuários nem faz lançamentos em lote
        if (btnLancamento) btnLancamento.style.display = "none";
        if (btnUsuarios) btnUsuarios.style.display = "none";
        switchTab("dashboard");
    } else if (nivel === "Coordenador Municipal") {
        if (btnLancamento) btnLancamento.style.display = "flex";
        if (btnUsuarios) btnUsuarios.style.display = "none";
        switchTab("dashboard");
    } else {
        // Administrador Master vê tudo
        if (btnLancamento) btnLancamento.style.display = "flex";
        if (btnUsuarios) btnUsuarios.style.display = "flex";
    }
}

// ==================== INTERFACE E NAVEGAÇÃO ====================
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach(el => {
        el.classList.remove("bg-blue-600", "text-white");
        el.classList.add("text-gray-400", "hover:bg-gray-700/50");
    });
    
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");
    document.getElementById(`btn-tab-${tabId}`).classList.add("bg-blue-600", "text-white");
    document.getElementById(`btn-tab-${tabId}`).classList.remove("text-gray-400", "hover:bg-gray-700/50");
}

function popularSeletores() {
    const selectOlimp = document.getElementById("filterOlimpiada");
    const selectAddOlimp = document.getElementById("addAlunoOlimpiada");
    const selectEscola = document.getElementById("filterEscola");
    
    // Limpa opções antigas
    selectOlimp.innerHTML = '<option value="Todas">Todas as Olimpíadas</option>';
    selectAddOlimp.innerHTML = '';
    
    DATABASE.olimpiadas.forEach(o => {
        selectOlimp.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
        selectAddOlimp.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
    });

    // Pega as escolas únicas dos dados atuais de premiação
    const escolasUnicas = [...new Set(dadosTrabalho.map(d => d.escola))];
    selectEscola.innerHTML = '<option value="Todas">Todas as Escolas</option>';
    escolasUnicas.forEach(e => {
        selectEscola.innerHTML += `<option value="${e}">${e}</option>`;
    });
}

// ==================== MOTOR DE FILTROS E RENDERIZAÇÃO ====================
function renderizarPlataforma() {
    const fMuni = document.getElementById("filterMunicipio").value;
    const fEsco = document.getElementById("filterEscola").value;
    const fOlim = document.getElementById("filterOlimpiada").value;
    
    // Filtragem Lógica
    const dadosFiltrados = dadosTrabalho.filter(d => {
        const matchMuni = (fMuni === "Todos" || d.municipio === fMuni);
        const matchEsco = (fEsco === "Todas" || d.escola === fEsco);
        const matchOlim = (fOlim === "Todas" || d.olimpiada === fOlim);
        return matchMuni && matchEsco && matchOlim;
    });

    // Atualização dos Cards
    let ouro = 0, prata = 0, bronze = 0, mencao = 0;
    dadosFiltrados.forEach(d => {
        if (d.premio === "Ouro") ouro++;
        else if (d.premio === "Prata") prata++;
        else if (d.premio === "Bronze") bronze++;
        else if (d.premio === "Menção Honrosa") mencao++;
    });
    
    document.getElementById("cardOuro").innerText = ouro;
    document.getElementById("cardPrata").innerText = prata;
    document.getElementById("cardBronze").innerText = bronze;
    document.getElementById("cardMencao").innerText = mencao;
    document.getElementById("lblTotalPremiados").innerText = `Total: ${dadosFiltrados.length}`;

    // Atualização da Tabela de Alunos
    const tCorpo = document.getElementById("tableAlunosCorpo");
    tCorpo.innerHTML = "";
    if (dadosFiltrados.length === 0) {
        tCorpo.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum medalhista encontrado para estes filtros.</td></tr>`;
    } else {
        dadosFiltrados.forEach(d => {
            let badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30";
            if (d.premio === "Ouro") badgeColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            if (d.premio === "Prata") badgeColor = "bg-slate-400/20 text-slate-300 border-slate-400/30";
            if (d.premio === "Bronze") badgeColor = "bg-amber-600/20 text-amber-500 border-amber-600/30";

            tCorpo.innerHTML += `
                <tr class="hover:bg-gray-800/30 transition">
                    <td class="p-4 font-semibold text-gray-200">${d.aluno}</td>
                    <td class="p-4 text-gray-400">${d.escola}</td>
                    <td class="p-4 text-gray-500">${d.municipio}</td>
                    <td class="p-4 text-gray-400">${d.olimpiada}</td>
                    <td class="p-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}">${d.premio}</span>
                    </td>
                </tr>`;
        });
    }

    // Atualização da Aba do Calendário
    renderizarCalendario();
    
    // Atualização da Aba de Gestão de Usuários
    renderizarUsuarios();

    // Atualização do Gráfico
    renderizarGrafico(dadosFiltrados);
}

function renderizarCalendario() {
    const tCal = document.getElementById("tableCalendarioCorpo");
    tCal.innerHTML = "";
    DATABASE.calendario.forEach(c => {
        tCal.innerHTML += `
            <tr class="hover:bg-gray-800/30 transition">
                <td class="p-4 font-bold text-blue-400">${c.olimpiada}</td>
                <td class="p-4 text-gray-200">${c.etapa}</td>
                <td class="p-4 font-medium text-yellow-500">${c.data}</td>
                <td class="p-4 text-gray-400 text-xs">${c.segmento}</td>
                <td class="p-4 text-xs italic text-gray-400 border-l-2 border-red-500/40 pl-3 bg-red-500/5">${c.acao}</td>
            </tr>`;
    });
}

function renderizarUsuarios() {
    const tUser = document.getElementById("tableUsersCorpo");
    tUser.innerHTML = "";
    DATABASE.usuarios.forEach(u => {
        tUser.innerHTML += `
            <tr class="hover:bg-gray-800/30 transition">
                <td class="p-4 font-semibold text-gray-200">${u.nome}</td>
                <td class="p-4 text-gray-400">${u.login}</td>
                <td class="p-4"><span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs">${u.nivel}</span></td>
                <td class="p-4"><span class="text-green-400 flex items-center gap-1.5 text-xs"><span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Ativo</span></td>
                <td class="p-4 text-gray-500 text-xs"><i class="fa-solid fa-lock mr-1"></i> Protegido</td>
            </tr>`;
    });
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById("chartMedalhas");
    if (!ctx) return;

    // Agrupa dados por Escola
    const escolas = [...new Set(dados.map(d => d.escola))];
    const dataOuro = [], dataPrata = [], dataBronze = [], dataMencao = [];

    escolas.forEach(esc => {
        const sub = dados.filter(d => d.escola === esc);
        dataOuro.push(sub.filter(d => d.premio === "Ouro").length);
        dataPrata.push(sub.filter(d => d.premio === "Prata").length);
        dataBronze.push(sub.filter(d => d.premio === "Bronze").length);
        dataMencao.push(sub.filter(d => d.premio === "Menção Honrosa").length);
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: escolas.length ? escolas : ["Nenhuma Escola"],
            datasets: [
                { label: 'Ouro', data: dataOuro, backgroundColor: '#eab308' },
                { label: 'Prata', data: dataPrata, backgroundColor: '#94a3b8' },
                { label: 'Bronze', data: dataBronze, backgroundColor: '#ea580c' },
                { label: 'Menção Honrosa', data: dataMencao, backgroundColor: '#c084fc' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#9ca3af' } },
                y: { stacked: true, ticks: { color: '#9ca3af', stepSize: 1 } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f3f4f6', boxWidth: 12 } }
            }
        }
    });
}

// ==================== ENVIO MANUAL E IMPORTAÇÃO COMPLETA ====================
function initFormularios() {
    const form = document.getElementById("formManualResult");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const novoResult = {
            aluno: document.getElementById("addAlunoNome").value.trim(),
            município: document.getElementById("addAlunoMunicipio").value,
            escola: document.getElementById("addAlunoEscola").value.trim(),
            olimpiada: document.getElementById("addAlunoOlimpiada").value,
            premio: document.getElementById("addAlunoPremio").value
        };

        dadosTrabalho.push(novoResult);
        alert("Resultado individual computado com sucesso!");
        form.reset();
        popularSeletores();
        renderizarPlataforma();
    });
}

function initDragAndDrop() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileUploadInput");

    if (!dropZone) return;

    dropZone.addEventListener("click", () => fileInput.click());
    
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("border-blue-500", "bg-blue-500/5");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("border-blue-500", "bg-blue-500/5");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-blue-500", "bg-blue-500/5");
        const arquivos = e.dataTransfer.files;
        if (arquivos.length) processarArquivoPlanilha(arquivos[0]);
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length) processarArquivoPlanilha(e.target.files[0]);
    });
}

function processarArquivoPlanilha(arquivo) {
    const leitor = new FileReader();
    leitor.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const livro = XLSX.read(data, { type: 'array' });
            const primeiraAba = livro.SheetNames[0];
            const linhas = XLSX.utils.sheet_to_json(livro.Sheets[primeiraAba]);

            if (linhas.length === 0) {
                alert("A planilha está vazia!");
                return;
            }

            // Mapeamento e Ingestão de Dados
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
    const cabecalho = "Aluno,Escola,Municipio,Olimpiada,Premio\nCarlos Silva,Unidade Escolar Sao Braz,Sao Braz - PI,OBMEP,Ouro\nMaria Oliveira,Colegio Alberto Silva,Sao Braz - PI,Canguru de Matematica Brasil,Prata";
    const blob = new Blob([cabecalho], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "modelo_importacao_olimpiadas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}