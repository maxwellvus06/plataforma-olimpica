// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogado = null;

const SERIES_PADRAO = ["1º Ano EF", "2º Ano EF", "3º Ano EF", "4º Ano EF", "5º Ano EF", "6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "1ª Série EM", "2ª Série EM", "3ª Série EM"];
const PREMIOS_PADRAO = ["Ouro", "Prata", "Bronze", "Menção Honrosa"];

document.addEventListener("DOMContentLoaded", () => {
    dadosTrabalho = carregarPremiados();
    initLogin();
    initDragAndDrop();
    initDragAndDropCronograma();
    initResultadoManual();
    
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
        
        const usuariosCadastrados = getStorage("app_usuarios");
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

function getStorage(chave, fallback = []) {
    try {
        const salvo = localStorage.getItem(chave);
        return salvo ? JSON.parse(salvo) : fallback;
    } catch (e) {
        console.warn(`Falha ao ler ${chave}`, e);
        return fallback;
    }
}

function setStorage(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
}

function carregarPremiados() {
    const salvos = getStorage("app_premiados", null);
    if (Array.isArray(salvos)) return salvos;
    const base = Array.isArray(DATABASE?.premiados) ? [...DATABASE.premiados] : [];
    setStorage("app_premiados", base);
    return base;
}

function salvarPremiados() {
    setStorage("app_premiados", dadosTrabalho);
}

function novoId() {
    return String(Date.now() + Math.floor(Math.random() * 10000));
}

function textoSeguro(valor) {
    return String(valor ?? "").replace(/[&<>'"]/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function confirmarExclusao(tipo, nome) {
    return confirm(`Tem certeza que deseja apagar ${tipo}: ${nome}?\n\nEssa ação não pode ser desfeita.`);
}

function existeResultadoParaCampo(campo, valor) {
    const alvo = normalizarTexto(valor);
    return dadosTrabalho.some(item => normalizarTexto(item[campo]) === alvo);
}

function excluirUsuario(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const usuarios = getStorage("app_usuarios");
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return alert("Usuário não encontrado.");
    if (usuarioLogado?.id === id) return alert("Segurança: você não pode apagar o próprio usuário enquanto está logado.");
    const admins = usuarios.filter(u => u.nivel === "ADM");
    if (usuario.nivel === "ADM" && admins.length <= 1) return alert("Segurança: não é permitido apagar o último administrador do sistema.");
    if (!confirmarExclusao("o usuário", usuario.nome)) return;
    setStorage("app_usuarios", usuarios.filter(u => u.id !== id));
    renderizarTabelasGerenciais();
}

function excluirCidade(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const usuarios = getStorage("app_usuarios");
    const cidade = cidades.find(c => c.id === id);
    if (!cidade) return alert("Cidade não encontrada.");
    const nomeMunicipio = `${cidade.nome} - ${cidade.uf}`;
    if (escolas.some(e => e.cidadeId === id)) return alert("Segurança: não é possível apagar esta cidade porque existem escolas cadastradas nela.");
    if (usuarios.some(u => u.nivel === "Gestor" && u.vinculoId === id)) return alert("Segurança: não é possível apagar esta cidade porque existem gestores vinculados a ela.");
    if (existeResultadoParaCampo("municipio", nomeMunicipio)) return alert("Segurança: não é possível apagar esta cidade porque existem resultados vinculados a ela.");
    if (!confirmarExclusao("a cidade", nomeMunicipio)) return;
    setStorage("app_cidades", cidades.filter(c => c.id !== id));
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataforma();
}

function excluirEscola(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const escolas = getStorage("app_escolas");
    const usuarios = getStorage("app_usuarios");
    const escola = escolas.find(e => e.id === id);
    if (!escola) return alert("Escola não encontrada.");
    if (usuarios.some(u => (u.nivel === "Escola" || u.nivel === "Aluno") && u.vinculoId === id)) return alert("Segurança: não é possível apagar esta escola porque existem usuários vinculados a ela.");
    if (existeResultadoParaCampo("escola", escola.nome)) return alert("Segurança: não é possível apagar esta escola porque existem resultados vinculados a ela.");
    if (!confirmarExclusao("a escola", escola.nome)) return;
    setStorage("app_escolas", escolas.filter(e => e.id !== id));
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataforma();
}

function excluirOlimpiada(id) {
    if (usuarioLogado?.nivel !== "ADM") return;
    const olimpiadas = getStorage("app_olimpiadas");
    const cronograma = getStorage("app_cronograma");
    const olimpiada = olimpiadas.find(o => o.id === id);
    if (!olimpiada) return alert("Olimpíada não encontrada.");
    if (existeResultadoParaCampo("olimpiada", olimpiada.nome) || existeResultadoParaCampo("olimpiada", olimpiada.categoria)) return alert("Segurança: não é possível apagar esta olimpíada porque existem resultados cadastrados para ela.");
    if (cronograma.some(c => c.olimpiadaId === id)) return alert("Segurança: não é possível apagar esta olimpíada porque existem etapas de cronograma vinculadas a ela.");
    if (!confirmarExclusao("a olimpíada", olimpiada.nome)) return;
    setStorage("app_olimpiadas", olimpiadas.filter(o => o.id !== id));
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarCronograma();
    renderizarPlataforma();
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

    const usuarios = getStorage("app_usuarios");
    if (usuarios.some(u => normalizarTexto(u.login) === login)) return alert("Erro: já existe um usuário com esse login.");
    usuarios.push({ id: novoId(), login, senha, nivel, nome, email, telefone, vinculoId });
    
    setStorage("app_usuarios", usuarios);
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

    const olimpiadas = getStorage("app_olimpiadas");
    if (olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(nome))) return alert("Erro: esta olimpíada já está cadastrada.");
    olimpiadas.push({ id: novoId(), nome, categoria, series });
    
    setStorage("app_olimpiadas", olimpiadas);
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

    const cronograma = getStorage("app_cronograma");
    cronograma.push({ id: novoId(), olimpiadaId, etapa, data, segmento, acao });
    
    setStorage("app_cronograma", cronograma);
    document.getElementById("formCadCronograma").reset();
    renderizarCronograma();
}

function salvarNovaCidade(event) {
    event.preventDefault();
    if (usuarioLogado?.nivel !== "ADM") return;

    const nome = document.getElementById("addCidNome").value.trim();
    const sigla = document.getElementById("addCidSigla").value.trim().toUpperCase();
    const uf = document.getElementById("addCidUf").value.trim().toUpperCase();

    const cidades = getStorage("app_cidades");
    if (cidades.some(c => normalizarTexto(c.nome) === normalizarTexto(nome) && normalizarTexto(c.uf) === normalizarTexto(uf))) return alert("Erro: esta cidade já está cadastrada.");
    cidades.push({ id: novoId(), nome, sigla, uf });
    
    setStorage("app_cidades", cidades);
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

    const escolas = getStorage("app_escolas");
    if (escolas.some(e => normalizarTexto(e.inep) === normalizarTexto(inep))) return alert("Erro: já existe uma escola com esse INEP.");
    if (escolas.some(e => normalizarTexto(e.nome) === normalizarTexto(nome))) return alert("Erro: já existe uma escola com esse nome.");
    escolas.push({ id: novoId(), nome, razaoSocial, cnpj, inep, endereco, cep, diretor, email, cidadeId });
    
    setStorage("app_escolas", escolas);
    document.getElementById("formCadEscola").reset();
    popularSeletores();
    renderizarTabelasGerenciais();
}


function initResultadoManual() {
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    if (cidadeSelect) cidadeSelect.addEventListener("change", atualizarEscolasResultadoManual);
    if (escolaSelect) escolaSelect.addEventListener("change", preencherCidadePelaEscolaManual);
}

function chaveResultado(resultado) {
    return [resultado.aluno, resultado.escola, resultado.municipio, resultado.olimpiada, resultado.serie]
        .map(normalizarTexto)
        .join("||");
}

function gravarResultadoComSobrescrita(resultado) {
    const chaveNova = chaveResultado(resultado);
    const antes = dadosTrabalho.length;
    dadosTrabalho = dadosTrabalho.filter(item => chaveResultado(item) !== chaveNova);
    dadosTrabalho.push(resultado);
    salvarPremiados();
    return antes !== dadosTrabalho.length;
}

function salvarResultadoManual(event) {
    event.preventDefault();
    if (!usuarioLogado) return;

    const aluno = document.getElementById("addResAluno").value.trim();
    const escola = document.getElementById("addResEscolaSelect").value;
    const municipio = document.getElementById("addResCidadeSelect").value;
    const olimpiada = document.getElementById("addResOlimpiadaSelect").value;
    const serie = document.getElementById("addResSerieSelect").value;
    const premio = document.getElementById("addResPremioSelect").value;

    if (!aluno || !escola || !municipio || !olimpiada || !serie || !premio) {
        return alert("Preencha todos os campos do resultado.");
    }

    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const escolaObj = escolas.find(e => normalizarTexto(e.nome) === normalizarTexto(escola));
    const cidadeObj = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio));

    if (!escolaObj) return alert("Escola não encontrada no cadastro.");
    if (!cidadeObj) return alert("Cidade não encontrada no cadastro.");
    if (escolaObj.cidadeId !== cidadeObj.id) return alert("A escola selecionada não pertence à cidade escolhida.");

    const sobrescreveu = gravarResultadoComSobrescrita({ aluno, escola, municipio, olimpiada, serie, premio });
    document.getElementById("formCadResultadoManual").reset();
    popularSeletores();
    renderizarPlataforma();
    renderizarTabelasGerenciais();
    alert(sobrescreveu ? "Resultado atualizado: a entrada antiga foi substituída." : "Resultado cadastrado com sucesso!");
}

function preencherCidadePelaEscolaManual() {
    const escolaSelecionada = document.getElementById("addResEscolaSelect")?.value;
    const cidadeSelect = document.getElementById("addResCidadeSelect");
    if (!escolaSelecionada || !cidadeSelect) return;

    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const escola = escolas.find(e => normalizarTexto(e.nome) === normalizarTexto(escolaSelecionada));
    const cidade = escola ? cidades.find(c => c.id === escola.cidadeId) : null;
    if (cidade) cidadeSelect.value = `${cidade.nome} - ${cidade.uf}`;
}

function atualizarEscolasResultadoManual() {
    const cidadeSelecionada = document.getElementById("addResCidadeSelect")?.value || "";
    const escolaSelect = document.getElementById("addResEscolaSelect");
    if (!escolaSelect) return;

    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const cidade = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(cidadeSelecionada));
    const escolasFiltradas = cidade ? escolas.filter(e => e.cidadeId === cidade.id) : escolas;

    escolaSelect.innerHTML = '<option value="">Selecione a escola...</option>' + escolasFiltradas.map(e => `<option value="${textoSeguro(e.nome)}">${textoSeguro(e.nome)}</option>`).join("");
}

// ==================== RENDERS DE COMPONENTES E DATA VIS ====================\
function renderizarCronograma() {
    const cronograma = getStorage("app_cronograma");
    const olimpiadas = getStorage("app_olimpiadas");
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
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");
    const usuarios = getStorage("app_usuarios");

    // Tabela de Cidades
    if (document.getElementById("tableCidadesCorpo")) {
        document.getElementById("tableCidadesCorpo").innerHTML = cidades.map(c => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(c.id)}</td><td class="p-4 font-semibold text-white">${textoSeguro(c.nome)}</td><td class="p-4 font-mono text-blue-400">${textoSeguro(c.sigla)}</td><td class="p-4 font-bold text-gray-400">${textoSeguro(c.uf)}</td><td class="p-4 text-right"><button onclick="excluirCidade('${textoSeguro(c.id)}')" class="px-2 py-1 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-trash-can mr-1"></i> Apagar</button></td></tr>
        `).join("");
    }
    // Tabela de Escolas
    if (document.getElementById("tableEscolasCorpo")) {
        document.getElementById("tableEscolasCorpo").innerHTML = escolas.map(e => {
            const cid = cidades.find(c => c.id === e.cidadeId);
            return `
                <tr class="hover:bg-gray-700/30 text-xs"><td class="p-4 font-mono text-purple-400">${textoSeguro(e.inep)}</td><td class="p-4"><div class="font-bold text-white text-sm">${textoSeguro(e.nome)}</div><div class="text-gray-500">${textoSeguro(e.razaoSocial)}</div></td><td class="p-4 font-mono">${textoSeguro(e.cnpj)}</td><td class="p-4"><div>${textoSeguro(e.diretor)}</div><div class="text-blue-400 font-mono">${textoSeguro(e.email)}</div></td><td class="p-4 font-semibold text-emerald-400">${cid ? `${textoSeguro(cid.nome)} - ${textoSeguro(cid.uf)}` : "Desconhecido"}</td><td class="p-4 text-right"><button onclick="excluirEscola('${textoSeguro(e.id)}')" class="px-2 py-1 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-trash-can mr-1"></i> Apagar</button></td></tr>
            `;
        }).join("");
    }
    // Tabela de Olimpíadas Base
    if (document.getElementById("tableOlimpiadasCorpo")) {
        document.getElementById("tableOlimpiadasCorpo").innerHTML = olimpiadas.map(o => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(o.id)}</td><td class="p-4 font-bold text-white">${textoSeguro(o.nome)}</td><td class="p-4 text-blue-400 font-mono font-semibold">${textoSeguro(o.categoria)}</td><td class="p-4 text-gray-400 font-medium">${textoSeguro(o.series)}</td><td class="p-4 text-right"><button onclick="excluirOlimpiada('${textoSeguro(o.id)}')" class="px-2 py-1 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-trash-can mr-1"></i> Apagar</button></td></tr>
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
                    <td class="p-4 font-bold text-white">${textoSeguro(u.nome)}</td>
                    <td class="p-4">
                        <div class="font-mono text-blue-400 font-bold">${textoSeguro(u.login)}</div>
                        <div class="text-gray-500 font-medium text-[10px] uppercase">${textoSeguro(u.nivel)}</div>
                    </td>
                    <td class="p-4">
                        <div>${textoSeguro(u.email)}</div>
                        <div class="text-gray-500 font-mono">${textoSeguro(u.telefone)}</div>
                    </td>
                    <td class="p-4 font-semibold ${u.nivel === 'ADM' ? 'text-blue-400' : 'text-amber-400'}">${textoSeguro(descVinculo)}</td>
                    <td class="p-4 text-right"><button onclick="excluirUsuario('${textoSeguro(u.id)}')" class="px-2 py-1 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-trash-can mr-1"></i> Apagar</button></td>
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
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");

    if (document.getElementById("filterMunicipio")) {
        document.getElementById("filterMunicipio").innerHTML = '<option value="TODOS">-- Todos os Municípios --</option>' + cidades.map(c => `<option value="${textoSeguro(c.nome)} - ${textoSeguro(c.uf)}">${textoSeguro(c.nome)} - ${textoSeguro(c.uf)}</option>`).join("");
    }
    if (document.getElementById("filterEscola")) {
        document.getElementById("filterEscola").innerHTML = '<option value="TODOS">-- Todas as Escolas --</option>' + escolas.map(e => `<option value="${textoSeguro(e.nome)}">${textoSeguro(e.nome)}</option>`).join("");
    }
    if (document.getElementById("filterOlimpiada")) {
        document.getElementById("filterOlimpiada").innerHTML = '<option value="TODOS">-- Todas as Olimpíadas --</option>' + olimpiadas.map(o => `<option value="${textoSeguro(o.nome)}">${textoSeguro(o.nome)}</option>`).join("");
    }
    if (document.getElementById("addResCidadeSelect")) {
        document.getElementById("addResCidadeSelect").innerHTML = '<option value="">Selecione a cidade...</option>' + cidades.map(c => `<option value="${textoSeguro(c.nome)} - ${textoSeguro(c.uf)}">${textoSeguro(c.nome)} - ${textoSeguro(c.uf)}</option>`).join("");
    }
    atualizarEscolasResultadoManual();
    if (document.getElementById("addResOlimpiadaSelect")) {
        document.getElementById("addResOlimpiadaSelect").innerHTML = '<option value="">Selecione a olimpíada...</option>' + olimpiadas.map(o => `<option value="${textoSeguro(o.nome)}">${textoSeguro(o.nome)}</option>`).join("");
    }
    if (document.getElementById("addResSerieSelect")) {
        document.getElementById("addResSerieSelect").innerHTML = '<option value="">Selecione a série...</option>' + SERIES_PADRAO.map(serie => `<option value="${textoSeguro(serie)}">${textoSeguro(serie)}</option>`).join("");
    }
    if (document.getElementById("addResPremioSelect")) {
        document.getElementById("addResPremioSelect").innerHTML = '<option value="">Selecione a premiação...</option>' + PREMIOS_PADRAO.map(premio => `<option value="${textoSeguro(premio)}">${textoSeguro(premio)}</option>`).join("");
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
            <tr class="hover:bg-gray-800/60 transition"><td class="p-4 font-semibold text-white"><i class="fa-solid fa-user text-blue-400 mr-2"></i>${textoSeguro(d.aluno)}</td><td class="p-4 text-gray-300">${textoSeguro(d.escola)}</td><td class="p-4 text-blue-400 font-semibold text-xs">${textoSeguro(d.municipio)}</td><td class="p-4 text-gray-300 text-xs font-semibold">${textoSeguro(d.serie || "Não informada")}</td><td class="p-4 text-gray-400 text-xs">${textoSeguro(d.olimpiada)}</td><td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">${textoSeguro(d.premio)}</span></td></tr>
        `).join("");
    }

    const tCidades = getStorage("app_cidades").length;
    const tEscolas = getStorage("app_escolas").length;

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

            const olimpiadas = getStorage("app_olimpiadas");
            const cronograma = getStorage("app_cronograma");

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

            setStorage("app_cronograma", cronograma);
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
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            const escolas = getStorage("app_escolas");
            const cidades = getStorage("app_cidades");
            const olimpiadas = getStorage("app_olimpiadas");
            const premiosPermitidos = PREMIOS_PADRAO;
            const erros = [];
            let inseridos = 0;

            linhas.forEach((linha, idx) => {
                const aluno = String(linha.Aluno || "").trim();
                const escola = String(linha.Escola || "").trim();
                const municipio = String(linha.Municipio || linha.Município || "").trim();
                const olimpiada = String(linha.Olimpiada || linha.Olimpíada || "").trim();
                const premio = String(linha.Premio || linha.Prêmio || "").trim();
                const serie = String(linha.Serie || linha["Série"] || "").trim();
                const numeroLinha = idx + 2;

                if (!aluno || !escola || !municipio || !olimpiada || !serie || !premio) {
                    erros.push(`Linha ${numeroLinha}: há campo obrigatório vazio.`);
                    return;
                }
                if (!escolas.some(e => normalizarTexto(e.nome) === normalizarTexto(escola))) {
                    erros.push(`Linha ${numeroLinha}: escola não cadastrada (${escola}).`);
                    return;
                }
                if (!cidades.some(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio))) {
                    erros.push(`Linha ${numeroLinha}: município não cadastrado (${municipio}).`);
                    return;
                }
                if (!olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(olimpiada))) {
                    erros.push(`Linha ${numeroLinha}: olimpíada não cadastrada (${olimpiada}).`);
                    return;
                }
                if (!SERIES_PADRAO.some(s => normalizarTexto(s) === normalizarTexto(serie))) {
                    erros.push(`Linha ${numeroLinha}: série inválida (${serie}).`);
                    return;
                }
                if (!premiosPermitidos.some(p => normalizarTexto(p) === normalizarTexto(premio))) {
                    erros.push(`Linha ${numeroLinha}: prêmio inválido (${premio}).`);
                    return;
                }

                gravarResultadoComSobrescrita({ aluno, escola, municipio, olimpiada, serie, premio });
                inseridos++;
            });

            salvarPremiados();
            popularSeletores();
            renderizarPlataforma();

            if (erros.length) {
                alert(`${inseridos} registros importados.\n\nAtenção: ${erros.length} linha(s) não foram importadas:\n${erros.slice(0, 8).join("\n")}${erros.length > 8 ? "\n..." : ""}`);
            } else {
                alert(`${inseridos} registros de premiados importados com sucesso!`);
            }
        } catch (erro) {
            console.error(erro);
            alert("Erro ao ler planilha. Verifique se o arquivo segue o modelo .XLSX baixado pelo sistema.");
        }
    };
    leitor.readAsArrayBuffer(arquivo);
}

function criarDownloadBlob(blob, nomeArquivo) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function downloadResultadosTemplate() {
    const escolas = getStorage("app_escolas").map(e => e.nome).filter(Boolean);
    const cidades = getStorage("app_cidades").map(c => `${c.nome} - ${c.uf}`).filter(Boolean);
    const olimpiadas = getStorage("app_olimpiadas").map(o => o.nome).filter(Boolean);
    const premios = PREMIOS_PADRAO;
    const series = SERIES_PADRAO;

    if (window.ExcelJS) {
        const wb = new ExcelJS.Workbook();
        wb.creator = "Plataforma Olímpica";
        wb.created = new Date();

        const ws = wb.addWorksheet("Resultados");
        ws.columns = [
            { header: "Aluno", key: "aluno", width: 32 },
            { header: "Escola", key: "escola", width: 34 },
            { header: "Municipio", key: "municipio", width: 26 },
            { header: "Olimpiada", key: "olimpiada", width: 46 },
            { header: "Serie", key: "serie", width: 18 },
            { header: "Premio", key: "premio", width: 20 }
        ];
        ws.addRow({ aluno: "Carlos Silva", escola: escolas[0] || "Cadastre uma escola", municipio: cidades[0] || "Cadastre uma cidade", olimpiada: olimpiadas[0] || "Cadastre uma olimpíada", serie: "6º Ano EF", premio: "Ouro" });
        ws.getRow(1).font = { bold: true };
        ws.views = [{ state: "frozen", ySplit: 1 }];

        const listas = wb.addWorksheet("Listas");
        listas.state = "hidden";
        const maxLinhas = Math.max(escolas.length, cidades.length, olimpiadas.length, series.length, premios.length, 1);
        listas.getCell("A1").value = "Escolas";
        listas.getCell("B1").value = "Municipios";
        listas.getCell("C1").value = "Olimpiadas";
        listas.getCell("D1").value = "Series";
        listas.getCell("E1").value = "Premios";
        for (let i = 0; i < maxLinhas; i++) {
            listas.getCell(`A${i + 2}`).value = escolas[i] || null;
            listas.getCell(`B${i + 2}`).value = cidades[i] || null;
            listas.getCell(`C${i + 2}`).value = olimpiadas[i] || null;
            listas.getCell(`D${i + 2}`).value = series[i] || null;
            listas.getCell(`E${i + 2}`).value = premios[i] || null;
        }

        const refEscolas = `Listas!$A$2:$A$${Math.max(escolas.length + 1, 2)}`;
        const refCidades = `Listas!$B$2:$B$${Math.max(cidades.length + 1, 2)}`;
        const refOlimpiadas = `Listas!$C$2:$C$${Math.max(olimpiadas.length + 1, 2)}`;
        const refSeries = `Listas!$D$2:$D$${series.length + 1}`;
        const refPremios = `Listas!$E$2:$E$${premios.length + 1}`;

        for (let linha = 2; linha <= 501; linha++) {
            ws.getCell(`B${linha}`).dataValidation = { type: "list", allowBlank: false, formulae: [refEscolas], showErrorMessage: true, errorTitle: "Escola inválida", error: "Escolha uma escola da lista." };
            ws.getCell(`C${linha}`).dataValidation = { type: "list", allowBlank: false, formulae: [refCidades], showErrorMessage: true, errorTitle: "Município inválido", error: "Escolha um município da lista." };
            ws.getCell(`D${linha}`).dataValidation = { type: "list", allowBlank: false, formulae: [refOlimpiadas], showErrorMessage: true, errorTitle: "Olimpíada inválida", error: "Escolha uma olimpíada da lista." };
            ws.getCell(`E${linha}`).dataValidation = { type: "list", allowBlank: false, formulae: [refSeries], showErrorMessage: true, errorTitle: "Série inválida", error: "Escolha uma série da lista." };
            ws.getCell(`F${linha}`).dataValidation = { type: "list", allowBlank: false, formulae: [refPremios], showErrorMessage: true, errorTitle: "Prêmio inválido", error: "Escolha um prêmio da lista." };
        }

        const buffer = await wb.xlsx.writeBuffer();
        criarDownloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "modelo_importacao_resultados.xlsx");
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ Aluno: "Carlos Silva", Escola: escolas[0] || "", Municipio: cidades[0] || "", Olimpiada: olimpiadas[0] || "", Serie: "6º Ano EF", Premio: "Ouro" }]);
    const wsListas = XLSX.utils.aoa_to_sheet([["Escolas", "Municipios", "Olimpiadas", "Series", "Premios"], ...Array.from({ length: Math.max(escolas.length, cidades.length, olimpiadas.length, series.length, premios.length) }, (_, i) => [escolas[i] || "", cidades[i] || "", olimpiadas[i] || "", series[i] || "", premios[i] || ""])]);
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.utils.book_append_sheet(wb, wsListas, "Listas");
    XLSX.writeFile(wb, "modelo_importacao_resultados.xlsx");
}

function downloadCSVTemplate() {
    downloadResultadosTemplate();
}