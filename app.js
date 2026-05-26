// Gerenciador de Escopo da Plataforma Olímpica 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogadoAtualmente = null;

document.addEventListener("DOMContentLoaded", () => {
    dadosTrabalho = [...DATABASE.premiados];
    
    initLogin();
    initFormularios();
    initDragAndDrop();
    initCriadorDeContas(); // Inicializa o novo formulário de criação de contas
    
    // Configura os seletores de filtros superiores da dashboard
    document.getElementById("filterMunicipio").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterEscola").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterOlimpiada").addEventListener("change", renderizarPlataforma);
    
    document.getElementById("btnLogout").addEventListener("click", logout);
    
    verificarSessao();
});

// ==================== SISTEMA DE AUTENTICAÇÃO E SESSÃO ====================
function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const userInput = document.getElementById("auth-user").value.trim().toLowerCase();
        const passInput = document.getElementById("auth-pass").value.trim();
        
        const contaEncontrada = DATABASE.usuarios.find(u => u.login.toLowerCase() === userInput && u.senha === passInput);
        
        if (contaEncontrada) {
            localStorage.setItem("usuarioLogado", JSON.stringify(contaEncontrada));
            aplicarLogin(contaEncontrada);
        } else {
            alert("Acesso Negado! Credenciais incorretas.");
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
    usuarioLogadoAtualmente = user;
    
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
    
    document.getElementById("userPanelTitle").innerText = `Painel - ${user.nome}`;
    document.getElementById("userBadge").innerText = `Nível: ${user.nivel}`;
    
    // Executa as travas de nível solicitadas por você
    configurarAbasPorNivel(user);
    
    popularSeletores();
    renderizarPlataforma();
}

function logout() {
    localStorage.removeItem("usuarioLogado");
    usuarioLogadoAtualmente = null;
    document.getElementById("mainContent").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("auth-user").value = "";
    document.getElementById("auth-pass").value = "";
}

// ==================== TRAVAS DE SEGURANÇA POR NÍVEL ====================
function configurarAbasPorNivel(user) {
    const btnDashboard = document.getElementById("btn-tab-dashboard");
    const btnLancamento = document.getElementById("btn-tab-lancamento");
    const btnUsuarios = document.getElementById("btn-tab-usuarios");
    const metricCardsArea = document.getElementById("metricCardsArea");
    const chartContainerArea = document.getElementById("chartContainerArea");
    const selectNivelForm = document.getElementById("newUserNivel");

    // Reseta exibições padrão
    if (btnLancamento) btnLancamento.style.display = "flex";
    if (btnUsuarios) btnUsuarios.style.display = "flex";
    if (metricCardsArea) metricCardsArea.style.display = "grid";
    if (chartContainerArea) chartContainerArea.style.display = "block";

    // Regra 4: Nível Aluno (Apenas seus dados e calendário)
    if (user.nivel === "Aluno") {
        if (btnLancamento) btnLancamento.style.display = "none";
        if (btnUsuarios) btnUsuarios.style.display = "none";
        if (metricCardsArea) metricCardsArea.style.display = "none"; // Oculta cards macro
        if (chartContainerArea) chartContainerArea.style.display = "none"; // Oculta gráficos
        switchTab("dashboard");
        return;
    }

    // Regra 3: Nível Escola (Pode ver dados da sua escola e criar contas alunos)
    if (user.nivel === "Escola") {
        if (btnLancamento) btnLancamento.style.display = "flex";
        if (btnUsuarios) btnUsuarios.style.display = "flex"; // Abre aba para criar contas alunos
        
        // Configura o formulário de criação para aceitar APENAS novas contas Aluno
        if (selectNivelForm) {
            selectNivelForm.innerHTML = '<option value="Aluno">Aluno</option>';
        }
        switchTab("dashboard");
        return;
    }

    // Regra 2: Nível Gestor (Contas Escolas, Alunos e dados da cidade)
    if (user.nivel === "Gestor") {
        if (btnLancamento) btnLancamento.style.display = "flex";
        if (btnUsuarios) btnUsuarios.style.display = "flex";
        
        // Configura o formulário de criação para aceitar apenas Escola e Aluno
        if (selectNivelForm) {
            selectNivelForm.innerHTML = `
                <option value="Escola">Escola</option>
                <option value="Aluno">Aluno</option>
            `;
        }
        switchTab("dashboard");
        return;
    }

    // Regra 1: Adm (Pode fazer tudo)
    if (user.nivel === "Adm") {
        if (selectNivelForm) {
            selectNivelForm.innerHTML = `
                <option value="Adm">Adm</option>
                <option value="Gestor">Gestor</option>
                <option value="Escola">Escola</option>
                <option value="Aluno">Aluno</option>
            `;
        }
        switchTab("dashboard");
    }
}

// ==================== NOVO SISTEMA DE CRIAÇÃO DE CONTAS ====================
function initCriadorDeContas() {
    const formUser = document.getElementById("formCreateUser");
    if (!formUser) return;

    formUser.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const loginName = document.getElementById("newUserLogin").value.trim().toLowerCase();
        const nameVal = document.getElementById("newUserName").value.trim();
        const passVal = document.getElementById("newUserPassword").value.trim();
        const nivelVal = document.getElementById("newUserNivel").value;

        // Verifica se o login já existe no sistema
        const loginExiste = DATABASE.usuarios.some(u => u.login.toLowerCase() === loginName);
        if (loginExiste) {
            alert("Este nome de login já está em uso! Escolha outro.");
            return;
        }

        // Adiciona a nova conta diretamente no banco em memória
        DATABASE.usuarios.push({
            login: loginName,
            senha: passVal,
            nivel: nivelVal,
            nome: nameVal,
            cidade: usuarioLogadoAtualmente.nivel === "Adm" ? "Todas" : usuarioLogadoAtualmente.cidade,
            escola: nivelVal === "Aluno" ? usuarioLogadoAtualmente.escola : "Todas"
        });

        alert(`Sucesso! Conta do tipo [${nivelVal}] criada com o login: ${loginName}`);
        formUser.reset();
        renderizarUsuarios();
    });
}

// ==================== INTERFACE E FILTRAGEM ====================
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
    
    selectOlimp.innerHTML = '<option value="Todas">Todas as Olimpíadas</option>';
    selectAddOlimp.innerHTML = '';
    
    DATABASE.olimpiadas.forEach(o => {
        selectOlimp.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
        selectAddOlimp.innerHTML += `<option value="${o.nome}">${o.nome}</option>`;
    });

    const escolasUnicas = [...new Set(dadosTrabalho.map(d => d.escola))];
    selectEscola.innerHTML = '<option value="Todas">Todas as Escolas</option>';
    escolasUnicas.forEach(e => {
        selectEscola.innerHTML += `<option value="${e}">${e}</option>`;
    });
}

function renderizarPlataforma() {
    let fMuni = document.getElementById("filterMunicipio").value;
    let fEsco = document.getElementById("filterEscola").value;
    const fOlim = document.getElementById("filterOlimpiada").value;
    
    // Força amarração de escopo nos filtros superiores se o usuário não for Administrador
    if (usuarioLogadoAtualmente) {
        if (usuarioLogadoAtualmente.nivel === "Gestor") {
            document.getElementById("filterMunicipio").value = usuarioLogadoAtualmente.cidade;
            fMuni = usuarioLogadoAtualmente.cidade;
        } else if (usuarioLogadoAtualmente.nivel === "Escola" || usuarioLogadoAtualmente.nivel === "Aluno") {
            document.getElementById("filterMunicipio").value = usuarioLogadoAtualmente.cidade;
            document.getElementById("filterEscola").value = usuarioLogadoAtualmente.escola;
            fMuni = usuarioLogadoAtualmente.cidade;
            fEsco = usuarioLogadoAtualmente.escola;
        }
    }

    // Regra de Filtragem Lógica por Visibilidade
    const dadosFiltrados = dadosTrabalho.filter(d => {
        const matchMuni = (fMuni === "Todos" || d.municipio === fMuni);
        const matchEsco = (fEsco === "Todas" || d.escola === fEsco);
        const matchOlim = (fOlim === "Todas" || d.olimpiada === fOlim);
        
        // Se for o Aluno logado, ele só vê a sua linha específica de nota
        if (usuarioLogadoAtualmente && usuarioLogadoAtualmente.nivel === "Aluno") {
            return d.aluno === usuarioLogadoAtualmente.nome;
        }
        return matchMuni && matchEsco && matchOlim;
    });

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

    const tCorpo = document.getElementById("tableAlunosCorpo");
    tCorpo.innerHTML = "";
    if (dadosFiltrados.length === 0) {
        tCorpo.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum registo encontrado para os filtros atuais.</td></tr>`;
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

    renderizarCalendario();
    renderizarUsuarios();
    renderizarGrafico(dadosFiltrados);
}

function renderizarCalendario() {
    const tCal = document.getElementById("tableCalendarioCorpo");
    if (!tCal) return;
    tCal.innerHTML = "";
    DATABASE.calendario.forEach(c => {
        tCal.innerHTML += `
            <tr class="hover:bg-gray-800/30 transition">
                <td class="p-4 font-bold text-blue-400">${c.olimpiada}</td>
                <td class="p-4 text-gray-200">${c.etapa}</td>
                <td class="p-4 font-medium text-yellow-500">${c.data}</td>
                <td class="p-4 text-gray-400 text-xs">${c.segmento}</td>
                <td class="p-4 text-xs italic text-gray-400 border-l-2 border-blue-500/40 pl-3 bg-blue-500/5">${c.acao}</td>
            </tr>`;
    });
}

function renderizarUsuarios() {
    const tUser = document.getElementById("tableUsersCorpo");
    if (!tUser) return;
    tUser.innerHTML = "";
    
    DATABASE.usuarios.forEach(u => {
        // Regra de privacidade de listagem
        if (usuarioLogadoAtualmente) {
            if (usuarioLogadoAtualmente.nivel === "Gestor" && u.nivel === "Adm") return; 
            if (usuarioLogadoAtualmente.nivel === "Escola" && (u.nivel === "Adm" || u.nivel === "Gestor")) return;
        }

        tUser.innerHTML += `
            <tr class="hover:bg-gray-800/30 transition">
                <td class="p-4 font-semibold text-gray-200">${u.nome}</td>
                <td class="p-4 text-gray-400 font-mono">${u.login}</td>
                <td class="p-4">
                    <span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded text-xs font-bold">${u.nivel}</span>
                </td>
                <td class="p-4">
                    <span class="text-green-400 flex items-center gap-1.5 text-xs"><span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Ativo</span>
                </td>
            </tr>`;
    });
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById("chartMedalhas");
    if (!ctx || (usuarioLogadoAtualmente && usuarioLogadoAtualmente.nivel === "Aluno")) return;

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
            labels: escolas.length ? escolas : ["Nenhum Registro"],
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
                x: { stacked: true, ticks: { color: '#9ca3af' }, grid: { display: false } },
                y: { stacked: true, ticks: { color: '#9ca3af', stepSize: 1 } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f3f4f6', boxWidth: 10 } }
            }
        }
    });
}

// ==================== PROCESSAMENTO DE ARQUIVOS ====================
function initFormularios() {
    const form = document.getElementById("formManualResult");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const novoResult = {
            aluno: document.getElementById("addAlunoNome").value.trim(),
            municipio: document.getElementById("addAlunoMunicipio").value,
            escola: document.getElementById("addAlunoEscola").value.trim(),
            olimpiada: document.getElementById("addAlunoOlimpiada").value,
            premio: document.getElementById("addAlunoPremio").value
        };

        dadosTrabalho.push(novoResult);
        alert("Resultado adicionado ao painel!");
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

            linhas.forEach(linha => {
                dadosTrabalho.push({
                    aluno: linha.Aluno || linha.aluno || "Desconhecido",
                    escola: linha.Escola || linha.escola || "Não Informada",
                    municipio: linha.Municipio || linha.municipio || "São Braz - PI",
                    olimpiada: linha.Olimpiada || linha.olimpiada || "Geral",
                    premio: linha.Premio || linha.premio || "Menção Honrosa"
                });
            });

            alert(`${linhas.length} registros importados via Excel!`);
            popularSeletores();
            renderizarPlataforma();
        } catch (erro) {
            alert("Erro ao decodificar a planilha. Verifique a formatação do arquivo.");
        }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function downloadCSVTemplate() {
    const cabecalho = "Aluno,Escola,Municipio,Olimpiada,Premio\nCarlos Silva,U. E. Sao Braz,Sao Braz - PI,OBMEP,Ouro";
    const blob = new Blob([cabecalho], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "modelo_olimpiadas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}