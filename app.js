// Gerenciador e Inteligência do Sistema Olímpico 2026
let chartInstance = null;
let dadosTrabalho = [];
let usuarioLogado = null;

const SERIES_PADRAO = ["1º Ano EF", "2º Ano EF", "3º Ano EF", "4º Ano EF", "5º Ano EF", "6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "1ª Série EM", "2ª Série EM", "3ª Série EM"];
const PREMIOS_PADRAO = ["Ouro", "Prata", "Bronze", "Menção Honrosa"];

document.addEventListener("DOMContentLoaded", () => {
    garantirCadastrosBasicos();
    dadosTrabalho = carregarPremiados();
    initLogin();
    initDragAndDrop();
    initDragAndDropCronograma();
    initResultadoManual();
    
    document.getElementById("filterMunicipio").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterEscola").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterOlimpiada").addEventListener("change", renderizarPlataforma);
    document.getElementById("filterResultadoNome")?.addEventListener("input", renderizarResultadosImportacao);
    document.getElementById("filterResultadoCidade")?.addEventListener("change", renderizarResultadosImportacao);
    document.getElementById("filterResultadoEscola")?.addEventListener("change", renderizarResultadosImportacao);
    document.getElementById("filterResultadoPremio")?.addEventListener("change", renderizarResultadosImportacao);
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
    renderizarResultadosImportacao();
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

function garantirCadastrosBasicos() {
    const sementes = [
        { chave: "app_usuarios", dados: typeof DATABASE !== "undefined" ? DATABASE.usuarios : [] },
        { chave: "app_cidades", dados: typeof CONFIG_CIDADES_INICIAIS !== "undefined" ? CONFIG_CIDADES_INICIAIS : [] },
        { chave: "app_escolas", dados: typeof CONFIG_ESCOLAS_INICIAIS !== "undefined" ? CONFIG_ESCOLAS_INICIAIS : [] },
        { chave: "app_olimpiadas", dados: typeof DATABASE !== "undefined" ? DATABASE.olimpiadas : [] },
        { chave: "app_cronograma", dados: typeof DATABASE !== "undefined" ? DATABASE.cronograma : [] }
    ];

    sementes.forEach(({ chave, dados }) => {
        const atual = getStorage(chave, null);
        if (!Array.isArray(atual) || atual.length === 0) {
            setStorage(chave, Array.isArray(dados) ? [...dados] : []);
        }
    });
}

function carregarPremiados() {
    const salvos = getStorage("app_premiados", null);
    if (Array.isArray(salvos) && salvos.length > 0) return salvos;
    const base = (typeof DATABASE !== "undefined" && Array.isArray(DATABASE.premiados)) ? [...DATABASE.premiados] : [];
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

function escolherEditarOuApagar(titulo) {
    const escolha = prompt(`${titulo}\n\nDigite 1 para EDITAR.\nDigite 2 para APAGAR.\n\nCancelar não altera nada.`);
    if (escolha === null) return null;
    const valor = String(escolha).trim();
    if (valor === "1") return "editar";
    if (valor === "2") return "apagar";
    alert("Opção inválida. Nada foi alterado.");
    return null;
}

function promptValor(rotulo, valorAtual) {
    const resposta = prompt(rotulo, valorAtual ?? "");
    if (resposta === null) return null;
    return resposta.trim();
}

function atualizarSessaoUsuario(usuarioAtualizado) {
    if (usuarioLogado?.id === usuarioAtualizado.id) {
        usuarioLogado = usuarioAtualizado;
        sessionStorage.setItem("avance_session", JSON.stringify(usuarioAtualizado));
        document.getElementById("userLoggedNome").innerText = usuarioAtualizado.nome;
        document.getElementById("userLoggedNivel").innerText = usuarioAtualizado.nivel;
    }
}

function atualizarResultadosCampo(campo, valorAntigo, valorNovo) {
    const antigo = normalizarTexto(valorAntigo);
    dadosTrabalho = dadosTrabalho.map(item => {
        if (normalizarTexto(item[campo]) === antigo) return { ...item, [campo]: valorNovo };
        return item;
    });
    salvarPremiados();
}

function editarUsuario(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar usuários.");
    const acao = escolherEditarOuApagar("Editar usuário");
    if (!acao) return;
    if (acao === "apagar") return excluirUsuario(id);

    const usuarios = getStorage("app_usuarios");
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return alert("Usuário não encontrado.");
    const atual = usuarios[idx];

    const nome = promptValor("Nome completo:", atual.nome);
    if (nome === null) return;
    const login = promptValor("Login:", atual.login)?.toLowerCase();
    if (login === null) return;
    if (!nome || !login) return alert("Nome e login são obrigatórios.");
    if (usuarios.some(u => u.id !== id && normalizarTexto(u.login) === normalizarTexto(login))) return alert("Erro: já existe outro usuário com esse login.");

    const nivel = promptValor("Nível de acesso: ADM, Gestor, Escola ou Aluno", atual.nivel);
    if (nivel === null) return;
    const niveisValidos = ["ADM", "Gestor", "Escola", "Aluno"];
    const nivelCorrigido = niveisValidos.find(n => normalizarTexto(n) === normalizarTexto(nivel));
    if (!nivelCorrigido) return alert("Nível inválido. Use ADM, Gestor, Escola ou Aluno.");

    const email = promptValor("E-mail:", atual.email || "");
    if (email === null) return;
    const telefone = promptValor("Telefone:", atual.telefone || "");
    if (telefone === null) return;

    let vinculoId = "";
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    if (nivelCorrigido === "Gestor") {
        const lista = cidades.map(c => `${c.id} - ${c.nome} (${c.uf})`).join("\n");
        vinculoId = promptValor(`Vínculo da cidade. Digite o ID:\n\n${lista}`, atual.vinculoId || "");
        if (vinculoId === null) return;
        if (!cidades.some(c => c.id === vinculoId)) return alert("Cidade inválida para vínculo.");
    } else if (nivelCorrigido === "Escola" || nivelCorrigido === "Aluno") {
        const lista = escolas.map(e => `${e.id} - ${e.nome}`).join("\n");
        vinculoId = promptValor(`Vínculo da escola. Digite o ID:\n\n${lista}`, atual.vinculoId || "");
        if (vinculoId === null) return;
        if (!escolas.some(e => e.id === vinculoId)) return alert("Escola inválida para vínculo.");
    }

    const novaSenha = prompt("Senha: por segurança, a senha atual não é exibida.\nDigite uma NOVA senha somente se quiser trocar.\nDeixe em branco para manter a senha atual.", "");
    if (novaSenha === null) return;

    const usuarioAtualizado = {
        ...atual,
        nome,
        login,
        nivel: nivelCorrigido,
        email,
        telefone,
        vinculoId,
        senha: novaSenha.trim() ? novaSenha.trim() : atual.senha
    };

    usuarios[idx] = usuarioAtualizado;
    setStorage("app_usuarios", usuarios);
    atualizarSessaoUsuario(usuarioAtualizado);
    renderizarTabelasGerenciais();
    alert("Usuário atualizado com sucesso.");
}

function editarCidade(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar cidades.");
    const acao = escolherEditarOuApagar("Editar cidade");
    if (!acao) return;
    if (acao === "apagar") return excluirCidade(id);

    const cidades = getStorage("app_cidades");
    const idx = cidades.findIndex(c => c.id === id);
    if (idx === -1) return alert("Cidade não encontrada.");
    const atual = cidades[idx];
    const municipioAntigo = `${atual.nome} - ${atual.uf}`;

    const nome = promptValor("Nome da cidade:", atual.nome);
    if (nome === null) return;
    const sigla = promptValor("Sigla:", atual.sigla || "")?.toUpperCase();
    if (sigla === null) return;
    const uf = promptValor("UF:", atual.uf || "")?.toUpperCase();
    if (uf === null) return;
    if (!nome || !sigla || !uf) return alert("Nome, sigla e UF são obrigatórios.");
    if (cidades.some(c => c.id !== id && normalizarTexto(c.nome) === normalizarTexto(nome) && normalizarTexto(c.uf) === normalizarTexto(uf))) return alert("Erro: já existe outra cidade com esse nome e UF.");

    cidades[idx] = { ...atual, nome, sigla, uf };
    setStorage("app_cidades", cidades);
    atualizarResultadosCampo("municipio", municipioAntigo, `${nome} - ${uf}`);
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataforma();
    renderizarResultadosImportacao();
    alert("Cidade atualizada com sucesso.");
}

function editarEscola(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar escolas.");
    const acao = escolherEditarOuApagar("Editar escola");
    if (!acao) return;
    if (acao === "apagar") return excluirEscola(id);

    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const idx = escolas.findIndex(e => e.id === id);
    if (idx === -1) return alert("Escola não encontrada.");
    const atual = escolas[idx];
    const nomeAntigo = atual.nome;

    const nome = promptValor("Nome da escola:", atual.nome);
    if (nome === null) return;
    const razaoSocial = promptValor("Razão social:", atual.razaoSocial || "");
    if (razaoSocial === null) return;
    const cnpj = promptValor("CNPJ:", atual.cnpj || "");
    if (cnpj === null) return;
    const inep = promptValor("INEP:", atual.inep || "");
    if (inep === null) return;
    const endereco = promptValor("Endereço:", atual.endereco || "");
    if (endereco === null) return;
    const cep = promptValor("CEP:", atual.cep || "");
    if (cep === null) return;
    const diretor = promptValor("Diretor:", atual.diretor || "");
    if (diretor === null) return;
    const email = promptValor("E-mail:", atual.email || "");
    if (email === null) return;
    const listaCidades = cidades.map(c => `${c.id} - ${c.nome} (${c.uf})`).join("\n");
    const cidadeId = promptValor(`Cidade vinculada. Digite o ID:\n\n${listaCidades}`, atual.cidadeId || "");
    if (cidadeId === null) return;

    if (!nome || !razaoSocial || !cnpj || !inep || !cidadeId) return alert("Nome, razão social, CNPJ, INEP e cidade são obrigatórios.");
    if (!cidades.some(c => c.id === cidadeId)) return alert("Cidade inválida.");
    if (escolas.some(e => e.id !== id && normalizarTexto(e.inep) === normalizarTexto(inep))) return alert("Erro: já existe outra escola com esse INEP.");
    if (escolas.some(e => e.id !== id && normalizarTexto(e.nome) === normalizarTexto(nome))) return alert("Erro: já existe outra escola com esse nome.");

    escolas[idx] = { ...atual, nome, razaoSocial, cnpj, inep, endereco, cep, diretor, email, cidadeId };
    setStorage("app_escolas", escolas);

    const novaCidade = cidades.find(c => c.id === cidadeId);
    dadosTrabalho = dadosTrabalho.map(r => {
        if (normalizarTexto(r.escola) === normalizarTexto(nomeAntigo)) {
            return { ...r, escola: nome, municipio: novaCidade ? `${novaCidade.nome} - ${novaCidade.uf}` : r.municipio };
        }
        return r;
    });
    salvarPremiados();

    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarPlataforma();
    renderizarResultadosImportacao();
    alert("Escola atualizada com sucesso.");
}

function editarOlimpiada(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar olimpíadas.");
    const acao = escolherEditarOuApagar("Editar olimpíada");
    if (!acao) return;
    if (acao === "apagar") return excluirOlimpiada(id);

    const olimpiadas = getStorage("app_olimpiadas");
    const idx = olimpiadas.findIndex(o => o.id === id);
    if (idx === -1) return alert("Olimpíada não encontrada.");
    const atual = olimpiadas[idx];
    const nomeAntigo = atual.nome;
    const categoriaAntiga = atual.categoria;

    const nome = promptValor("Nome da olimpíada:", atual.nome);
    if (nome === null) return;
    const categoria = promptValor("Frente / sigla:", atual.categoria || "")?.toUpperCase();
    if (categoria === null) return;
    const series = promptValor("Séries atendidas:", atual.series || "");
    if (series === null) return;
    if (!nome || !categoria || !series) return alert("Nome, frente e séries são obrigatórios.");
    if (olimpiadas.some(o => o.id !== id && normalizarTexto(o.nome) === normalizarTexto(nome))) return alert("Erro: já existe outra olimpíada com esse nome.");

    olimpiadas[idx] = { ...atual, nome, categoria, series };
    setStorage("app_olimpiadas", olimpiadas);
    atualizarResultadosCampo("olimpiada", nomeAntigo, nome);
    atualizarResultadosCampo("olimpiada", categoriaAntiga, nome);
    popularSeletores();
    renderizarTabelasGerenciais();
    renderizarCronograma();
    renderizarPlataforma();
    renderizarResultadosImportacao();
    alert("Olimpíada atualizada com sucesso.");
}

function excluirCronograma(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem apagar eventos.");
    const cronograma = getStorage("app_cronograma");
    const evento = cronograma.find(c => c.id === id);
    if (!evento) return alert("Evento não encontrado.");
    if (!confirmarExclusao("o evento do calendário", evento.etapa)) return;
    setStorage("app_cronograma", cronograma.filter(c => c.id !== id));
    renderizarCronograma();
}

function editarCronograma(id) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar eventos.");
    const acao = escolherEditarOuApagar("Editar evento do calendário");
    if (!acao) return;
    if (acao === "apagar") return excluirCronograma(id);

    const cronograma = getStorage("app_cronograma");
    const olimpiadas = getStorage("app_olimpiadas");
    const idx = cronograma.findIndex(c => c.id === id);
    if (idx === -1) return alert("Evento não encontrado.");
    const atual = cronograma[idx];

    const listaOlimpiadas = olimpiadas.map(o => `${o.id} - ${o.nome}`).join("\n");
    const olimpiadaId = promptValor(`Olimpíada vinculada. Digite o ID:\n\n${listaOlimpiadas}`, atual.olimpiadaId || "");
    if (olimpiadaId === null) return;
    if (!olimpiadas.some(o => o.id === olimpiadaId)) return alert("Olimpíada inválida.");
    const etapa = promptValor("Etapa / fase:", atual.etapa || "");
    if (etapa === null) return;
    const data = promptValor("Data / janela crítica:", atual.data || "");
    if (data === null) return;
    const segmento = promptValor("Público-alvo / séries elegíveis:", atual.segmento || "");
    if (segmento === null) return;
    const acaoTexto = promptValor("Diretriz operacional:", atual.acao || "");
    if (acaoTexto === null) return;
    if (!olimpiadaId || !etapa || !data || !segmento || !acaoTexto) return alert("Todos os campos do evento são obrigatórios.");

    cronograma[idx] = { ...atual, olimpiadaId, etapa, data, segmento, acao: acaoTexto };
    setStorage("app_cronograma", cronograma);
    renderizarCronograma();
    alert("Evento atualizado com sucesso.");
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

    if (abaId === "importar") {
        popularSeletores();
        renderizarResultadosImportacao();
    }

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
    if (cidadeSelect) cidadeSelect.addEventListener("change", popularSeletoresResultadosManuais);
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
    dadosTrabalho.push({ id: resultado.id || novoId(), ...resultado });
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
    renderizarResultadosImportacao();
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

function preencherFiltrosResultadosImportacao() {
    const cidadesCadastro = getStorage("app_cidades").map(c => `${c.nome} - ${c.uf}`);
    const escolasCadastro = getStorage("app_escolas").map(e => e.nome);
    const cidadesResultados = dadosTrabalho.map(r => r.municipio).filter(Boolean);
    const escolasResultados = dadosTrabalho.map(r => r.escola).filter(Boolean);

    const cidades = [...new Set([...cidadesCadastro, ...cidadesResultados])].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const escolas = [...new Set([...escolasCadastro, ...escolasResultados])].sort((a, b) => a.localeCompare(b, "pt-BR"));

    const filtroCidade = document.getElementById("filterResultadoCidade");
    const filtroEscola = document.getElementById("filterResultadoEscola");
    const filtroPremio = document.getElementById("filterResultadoPremio");

    if (filtroCidade) {
        const valor = filtroCidade.value;
        filtroCidade.innerHTML = '<option value="TODOS">Todas as cidades</option>' + cidades.map(c => `<option value="${textoSeguro(c)}">${textoSeguro(c)}</option>`).join("");
        if ([...filtroCidade.options].some(opt => opt.value === valor)) filtroCidade.value = valor;
    }
    if (filtroEscola) {
        const valor = filtroEscola.value;
        filtroEscola.innerHTML = '<option value="TODOS">Todas as escolas</option>' + escolas.map(e => `<option value="${textoSeguro(e)}">${textoSeguro(e)}</option>`).join("");
        if ([...filtroEscola.options].some(opt => opt.value === valor)) filtroEscola.value = valor;
    }
    if (filtroPremio) {
        const valor = filtroPremio.value;
        filtroPremio.innerHTML = '<option value="TODOS">Todas as premiações</option>' + PREMIOS_PADRAO.map(p => `<option value="${textoSeguro(p)}">${textoSeguro(p)}</option>`).join("");
        if ([...filtroPremio.options].some(opt => opt.value === valor)) filtroPremio.value = valor;
    }
}

function resultadoPassaNosFiltros(resultado) {
    const nomeFiltro = normalizarTexto(document.getElementById("filterResultadoNome")?.value || "");
    const cidadeFiltro = document.getElementById("filterResultadoCidade")?.value || "TODOS";
    const escolaFiltro = document.getElementById("filterResultadoEscola")?.value || "TODOS";
    const premioFiltro = document.getElementById("filterResultadoPremio")?.value || "TODOS";

    const nomeOk = !nomeFiltro || normalizarTexto(resultado.aluno).includes(nomeFiltro);
    const cidadeOk = cidadeFiltro === "TODOS" || resultado.municipio === cidadeFiltro;
    const escolaOk = escolaFiltro === "TODOS" || resultado.escola === escolaFiltro;
    const premioOk = premioFiltro === "TODOS" || resultado.premio === premioFiltro;

    return nomeOk && cidadeOk && escolaOk && premioOk;
}

function renderizarResultadosImportacao() {
    preencherFiltrosResultadosImportacao();

    const tbody = document.getElementById("tableResultadosImportacaoCorpo");
    const contador = document.getElementById("contadorResultadosImportacao");
    if (!tbody) return;

    const filtrados = dadosTrabalho.filter(resultadoPassaNosFiltros);
    if (contador) contador.innerText = `${filtrados.length} resultado(s) listado(s)`;

    if (!filtrados.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-500 text-sm">Nenhum resultado encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(r => {
        const chave = encodeURIComponent(chaveResultado(r));
        return `
            <tr class="hover:bg-gray-700/30 text-xs">
                <td class="p-4 font-bold text-white">${textoSeguro(r.aluno)}</td>
                <td class="p-4 text-gray-300">${textoSeguro(r.escola)}</td>
                <td class="p-4 text-blue-400 font-semibold">${textoSeguro(r.municipio)}</td>
                <td class="p-4 text-gray-300 font-medium">${textoSeguro(r.serie || "Não informada")}</td>
                <td class="p-4 text-gray-400">${textoSeguro(r.olimpiada)}</td>
                <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">${textoSeguro(r.premio)}</span></td>
                <td class="p-4 text-right">${usuarioLogado?.nivel === "ADM" ? `<button onclick="editarResultado('${chave}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td>
            </tr>
        `;
    }).join("");
}

function excluirResultado(chaveCodificada) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem apagar resultados.");

    const chave = decodeURIComponent(chaveCodificada);
    const resultado = dadosTrabalho.find(r => chaveResultado(r) === chave);
    if (!resultado) return alert("Resultado não encontrado.");

    if (!confirmarExclusao("o resultado", `${resultado.aluno} - ${resultado.olimpiada}`)) return;

    dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chave);
    salvarPremiados();
    popularSeletores();
    renderizarPlataforma();
    renderizarResultadosImportacao();
}

function editarResultado(chaveCodificada) {
    if (usuarioLogado?.nivel !== "ADM") return alert("Apenas administradores podem editar resultados.");
    const chaveOriginal = decodeURIComponent(chaveCodificada);
    const idx = dadosTrabalho.findIndex(r => chaveResultado(r) === chaveOriginal);
    if (idx === -1) return alert("Resultado não encontrado.");

    const acao = escolherEditarOuApagar("Editar resultado olímpico");
    if (!acao) return;
    if (acao === "apagar") return excluirResultado(chaveCodificada);

    const atual = dadosTrabalho[idx];
    const aluno = promptValor("Nome do aluno:", atual.aluno || "");
    if (aluno === null) return;

    const escolas = getStorage("app_escolas");
    const cidades = getStorage("app_cidades");
    const olimpiadas = getStorage("app_olimpiadas");
    const listaCidades = cidades.map(c => `${c.nome} - ${c.uf}`).join("\n");
    const municipio = promptValor(`Cidade / município. Copie exatamente uma opção:\n\n${listaCidades}`, atual.municipio || "");
    if (municipio === null) return;
    const listaEscolas = escolas.map(e => e.nome).join("\n");
    const escola = promptValor(`Escola. Copie exatamente uma opção:\n\n${listaEscolas}`, atual.escola || "");
    if (escola === null) return;
    const listaOlimpiadas = olimpiadas.map(o => o.nome).join("\n");
    const olimpiada = promptValor(`Olimpíada. Copie exatamente uma opção:\n\n${listaOlimpiadas}`, atual.olimpiada || "");
    if (olimpiada === null) return;
    const serie = promptValor(`Série. Copie exatamente uma opção:\n\n${SERIES_PADRAO.join("\n")}`, atual.serie || "");
    if (serie === null) return;
    const premio = promptValor(`Premiação. Copie exatamente uma opção:\n\n${PREMIOS_PADRAO.join("\n")}`, atual.premio || "");
    if (premio === null) return;

    if (!aluno || !municipio || !escola || !olimpiada || !serie || !premio) return alert("Todos os campos do resultado são obrigatórios.");
    if (!cidades.some(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio))) return alert("Cidade inválida.");
    const escolaObj = escolas.find(e => normalizarTexto(e.nome) === normalizarTexto(escola));
    const cidadeObj = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(municipio));
    if (!escolaObj) return alert("Escola inválida.");
    if (escolaObj.cidadeId !== cidadeObj.id) return alert("A escola selecionada não pertence à cidade escolhida.");
    if (!olimpiadas.some(o => normalizarTexto(o.nome) === normalizarTexto(olimpiada))) return alert("Olimpíada inválida.");
    if (!SERIES_PADRAO.some(s => normalizarTexto(s) === normalizarTexto(serie))) return alert("Série inválida.");
    if (!PREMIOS_PADRAO.some(p => normalizarTexto(p) === normalizarTexto(premio))) return alert("Premiação inválida.");

    dadosTrabalho = dadosTrabalho.filter(r => chaveResultado(r) !== chaveOriginal);
    gravarResultadoComSobrescrita({ aluno, escola, municipio, olimpiada, serie, premio });
    popularSeletores();
    renderizarPlataforma();
    renderizarResultadosImportacao();
    alert("Resultado atualizado com sucesso.");
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
                <td class="p-4 font-bold text-white">${oli ? textoSeguro(oli.nome) : "Desconhecida"}</td>
                <td class="p-4 text-xs font-semibold"><span class="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-gray-300">${textoSeguro(c.etapa)}</span></td>
                <td class="p-4 text-amber-400 font-mono text-xs"><i class="fa-regular fa-clock mr-1"></i> ${textoSeguro(c.data)}</td>
                <td class="p-4 text-xs text-gray-400 font-medium">${textoSeguro(c.segmento)}</td>
                <td class="p-4 text-gray-400 text-xs leading-relaxed">${textoSeguro(c.acao)}</td>
                <td class="p-4 text-right">${usuarioLogado?.nivel === "ADM" ? `<button onclick="editarCronograma('${textoSeguro(c.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button>` : ""}</td>
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
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(c.id)}</td><td class="p-4 font-semibold text-white">${textoSeguro(c.nome)}</td><td class="p-4 font-mono text-blue-400">${textoSeguro(c.sigla)}</td><td class="p-4 font-bold text-gray-400">${textoSeguro(c.uf)}</td><td class="p-4 text-right"><button onclick="editarCidade('${textoSeguro(c.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td></tr>
        `).join("");
    }
    // Tabela de Escolas
    if (document.getElementById("tableEscolasCorpo")) {
        document.getElementById("tableEscolasCorpo").innerHTML = escolas.map(e => {
            const cid = cidades.find(c => c.id === e.cidadeId);
            return `
                <tr class="hover:bg-gray-700/30 text-xs"><td class="p-4 font-mono text-purple-400">${textoSeguro(e.inep)}</td><td class="p-4"><div class="font-bold text-white text-sm">${textoSeguro(e.nome)}</div><div class="text-gray-500">${textoSeguro(e.razaoSocial)}</div></td><td class="p-4 font-mono">${textoSeguro(e.cnpj)}</td><td class="p-4"><div>${textoSeguro(e.diretor)}</div><div class="text-blue-400 font-mono">${textoSeguro(e.email)}</div></td><td class="p-4 font-semibold text-emerald-400">${cid ? `${textoSeguro(cid.nome)} - ${textoSeguro(cid.uf)}` : "Desconhecido"}</td><td class="p-4 text-right"><button onclick="editarEscola('${textoSeguro(e.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td></tr>
            `;
        }).join("");
    }
    // Tabela de Olimpíadas Base
    if (document.getElementById("tableOlimpiadasCorpo")) {
        document.getElementById("tableOlimpiadasCorpo").innerHTML = olimpiadas.map(o => `
            <tr class="hover:bg-gray-700/30"><td class="p-4 font-mono text-gray-500 text-xs">${textoSeguro(o.id)}</td><td class="p-4 font-bold text-white">${textoSeguro(o.nome)}</td><td class="p-4 text-blue-400 font-mono font-semibold">${textoSeguro(o.categoria)}</td><td class="p-4 text-gray-400 font-medium">${textoSeguro(o.series)}</td><td class="p-4 text-right"><button onclick="editarOlimpiada('${textoSeguro(o.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td></tr>
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
                    <td class="p-4 text-right"><button onclick="editarUsuario('${textoSeguro(u.id)}')" class="px-2 py-1 rounded-lg border border-blue-900/50 text-blue-400 hover:bg-blue-950/30 text-[11px] font-bold transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Editar</button></td>
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


function montarOptions(placeholder, itens, getValor, getTexto) {
    const linhas = [`<option value="">${placeholder}</option>`];
    itens.forEach(item => {
        const valor = typeof getValor === "function" ? getValor(item) : item;
        const texto = typeof getTexto === "function" ? getTexto(item) : valor;
        linhas.push(`<option value="${textoSeguro(valor)}">${textoSeguro(texto)}</option>`);
    });
    return linhas.join("");
}

function montarOptionsTodos(label, itens) {
    const unicos = [...new Set(itens.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
    return `<option value="TODOS">${label}</option>` + unicos.map(item => `<option value="${textoSeguro(item)}">${textoSeguro(item)}</option>`).join("");
}

function popularSeletoresResultadosManuais() {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");

    const cidadeSelect = document.getElementById("addResCidadeSelect");
    const escolaSelect = document.getElementById("addResEscolaSelect");
    const olimpiadaSelect = document.getElementById("addResOlimpiadaSelect");
    const serieSelect = document.getElementById("addResSerieSelect");
    const premioSelect = document.getElementById("addResPremioSelect");

    if (cidadeSelect) {
        const valorAtual = cidadeSelect.value;
        cidadeSelect.innerHTML = montarOptions("Selecione a cidade...", cidades, c => `${c.nome} - ${c.uf}`, c => `${c.nome} - ${c.uf}`);
        if ([...cidadeSelect.options].some(opt => opt.value === valorAtual)) cidadeSelect.value = valorAtual;
    }

    if (escolaSelect) {
        const valorAtual = escolaSelect.value;
        const cidadeSelecionada = cidadeSelect?.value || "";
        const cidadeObj = cidades.find(c => normalizarTexto(`${c.nome} - ${c.uf}`) === normalizarTexto(cidadeSelecionada));
        const escolasFiltradas = cidadeObj ? escolas.filter(e => e.cidadeId === cidadeObj.id) : escolas;
        escolaSelect.innerHTML = montarOptions("Selecione a escola...", escolasFiltradas, e => e.nome, e => e.nome);
        if ([...escolaSelect.options].some(opt => opt.value === valorAtual)) escolaSelect.value = valorAtual;
    }

    if (olimpiadaSelect) olimpiadaSelect.innerHTML = montarOptions("Selecione a olimpíada...", olimpiadas, o => o.nome, o => o.nome);
    if (serieSelect) serieSelect.innerHTML = montarOptions("Selecione a série...", SERIES_PADRAO);
    if (premioSelect) premioSelect.innerHTML = montarOptions("Selecione a premiação...", PREMIOS_PADRAO);
}

function popularSeletores() {
    const cidades = getStorage("app_cidades");
    const escolas = getStorage("app_escolas");
    const olimpiadas = getStorage("app_olimpiadas");

    const municipiosDashboard = cidades.map(c => `${c.nome} - ${c.uf}`);
    const escolasDashboard = escolas.map(e => e.nome);
    const olimpiadasDashboard = olimpiadas.map(o => o.nome);

    const filterMunicipio = document.getElementById("filterMunicipio");
    const filterEscola = document.getElementById("filterEscola");
    const filterOlimpiada = document.getElementById("filterOlimpiada");

    if (filterMunicipio) filterMunicipio.innerHTML = montarOptionsTodos("-- Todos os Municípios --", municipiosDashboard);
    if (filterEscola) filterEscola.innerHTML = montarOptionsTodos("-- Todas as Escolas --", escolasDashboard);
    if (filterOlimpiada) filterOlimpiada.innerHTML = montarOptionsTodos("-- Todas as Olimpíadas --", olimpiadasDashboard);

    popularSeletoresResultadosManuais();
    preencherFiltrosResultadosImportacao();
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
            renderizarResultadosImportacao();

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