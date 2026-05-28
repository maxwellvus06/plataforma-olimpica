// ==================== CONFIGURAÇÃO FIREBASE — AVANCE OLÍMPICO ====================
// Este arquivo continua sendo a base local de segurança.
// O app.js usa estes mesmos dados para semear/sincronizar o Realtime Database.
const FIREBASE_CONFIG_AVANCE = {
    apiKey: "AIzaSyDn5eAVOerIiknYMRdvMo_2YmXVXR0NwL0",
    authDomain: "avanceolimpico.firebaseapp.com",
    databaseURL: "https://avanceolimpico-default-rtdb.firebaseio.com",
    projectId: "avanceolimpico",
    storageBucket: "avanceolimpico.firebasestorage.app",
    messagingSenderId: "895771266102",
    appId: "1:895771266102:web:f4e6b32f7c631d3eb81c97",
    measurementId: "G-FPETQTFRZN"
};

// Banco de Dados Centralizado - Plataforma Olímpica 2026
const DATABASE = {
    // Lista de Credenciais Oficiais e Escopo de Permissões Iniciais
    usuarios: [
        { id: "1", login: "admin", senha: "123", nivel: "ADM", nome: "Administrador Master", email: "admin@avance.com", telefone: "(86) 99999-9999", vinculoId: "" },
        { id: "2", login: "gestor", senha: "456", nivel: "Gestor", nome: "Coord. Regional São Braz", email: "gestor@saobraz.pi.gov.br", telefone: "(89) 98888-8888", vinculoId: "1" },
        { id: "3", login: "escola", senha: "789", nivel: "Escola", nome: "Resp. Escola Polo", email: "polo@escola.com", telefone: "(89) 97777-7777", vinculoId: "1" },
        { id: "4", login: "monitor", senha: "mon123", nivel: "Monitor", nome: "Monitor de Matemática", email: "monitor@avance.com", telefone: "(86) 98888-0001", vinculoId: "" }
    ],

    // Mapeamento Base Inicial das Olimpíadas Homologadas
    olimpiadas: [
        { id: "1", nome: "Canguru de Matemática Brasil", categoria: "MAT", series: "3º Ano EF ao 3º Ano EM" },
        { id: "2", nome: "OBMEP (Olimpíada Brasileira de Matemática das Escolas Públicas)", categoria: "MAT", series: "6º Ano EF ao 3º Ano EM" },
        { id: "3", nome: "OBA (Olimpíada Brasileira de Astronomia e Astronáutica)", categoria: "AST", series: "1º Ano EF ao 3º Ano EM" },
        { id: "4", nome: "ONC (Olimpíada Nacional de Ciências)", categoria: "INTEG", series: "6º Ano EF ao 3º Ano EM" }
    ],

    // Cronograma inicial
    // Mantido vazio para não recriar eventos apagados pelo usuário.
    cronograma: [],

    // Resultados iniciais
    // Mantido vazio para não recriar resultados apagados pelo usuário.
    premiados: [],

    // Materiais da Plataforma de Ensino
    plataforma: [],

    // Banco de questões
    questoes: []
};

// ==================== TABELA DE PERMISSÕES POR NÍVEL ====================
// Define exatamente o que cada nível pode ver e fazer
const PERMISSOES = {
    ADM: {
        abas: ["dashboard", "calendario", "importar", "relatorios", "reuniao", "plataforma", "simulados", "aulas", "questoes", "monitoria", "alunos", "usuarios", "olimpiadas", "cidades", "escolas", "layout"],
        dashboard: { filtroTravado: false },
        calendario: { podeEditar: true },
        resultados: { podeEditar: true },
        usuarios: { podeGerenciar: true, niveisPermitidos: ["ADM", "Gestor", "Escola", "Aluno", "Monitor", "Professor/Orientador", "Visualizador"] },
        plataforma: { podeGerenciar: true }
    },
    Gestor: {
        abas: ["dashboard", "calendario", "importar", "relatorios", "plataforma", "simulados", "aulas", "monitoria", "alunos", "usuarios", "olimpiadas"],
        dashboard: { filtroTravado: true },
        calendario: { podeEditar: false },
        resultados: { podeEditar: false },
        usuarios: { podeGerenciar: true, niveisPermitidos: ["Escola", "Aluno"] },
        plataforma: { podeGerenciar: false }
    },
    Escola: {
        abas: ["dashboard", "calendario", "importar", "relatorios", "plataforma", "simulados", "aulas", "monitoria", "alunos", "usuarios", "olimpiadas"],
        dashboard: { filtroTravado: true },
        calendario: { podeEditar: false },
        resultados: { podeEditar: false },
        usuarios: { podeGerenciar: true, niveisPermitidos: ["Aluno"] },
        plataforma: { podeGerenciar: false }
    },
    Aluno: {
        abas: ["meusresultados", "plataforma", "simulados", "aulas", "monitoria"],
        dashboard: { filtroTravado: true },
        calendario: { podeEditar: false },
        resultados: { podeEditar: false },
        usuarios: { podeGerenciar: false, niveisPermitidos: [] },
        plataforma: { podeGerenciar: false }
    },
    Monitor: {
        abas: ["plataforma", "simulados", "aulas", "questoes", "monitoria"],
        dashboard: { filtroTravado: true },
        calendario: { podeEditar: false },
        resultados: { podeEditar: false },
        usuarios: { podeGerenciar: false, niveisPermitidos: [] },
        plataforma: { podeGerenciar: true }
    },
    "Professor/Orientador": {
        abas: ["importar", "plataforma", "simulados", "aulas", "questoes", "monitoria"],
        dashboard: { filtroTravado: true },
        calendario: { podeEditar: false },
        resultados: { podeEditar: false },
        usuarios: { podeGerenciar: false, niveisPermitidos: [] },
        plataforma: { podeGerenciar: true }
    },
    Visualizador: {
        abas: ["dashboard", "calendario", "importar", "relatorios", "alunos", "olimpiadas", "simulados", "aulas"],
        dashboard: { filtroTravado: true },
        calendario: { podeEditar: false },
        resultados: { podeEditar: false },
        usuarios: { podeGerenciar: false, niveisPermitidos: [] },
        plataforma: { podeGerenciar: false }
    }
};

// Salas fixas de Monitoria
const SALAS_MONITORIA = [
    { id: "mat-1", nome: "Matemática — Sala 1", area: "matematica", icone: "fa-square-root-variable", cor: "blue" },
    { id: "mat-2", nome: "Matemática — Sala 2", area: "matematica", icone: "fa-square-root-variable", cor: "blue" },
    { id: "fis-1", nome: "Física — Sala 1", area: "fisica", icone: "fa-atom", cor: "purple" },
    { id: "fis-2", nome: "Física — Sala 2", area: "fisica", icone: "fa-atom", cor: "purple" },
    { id: "qui-1", nome: "Química — Sala 1", area: "quimica", icone: "fa-flask", cor: "emerald" },
    { id: "qui-2", nome: "Química — Sala 2", area: "quimica", icone: "fa-flask", cor: "emerald" },
    { id: "lin-1", nome: "Linguagem — Sala 1", area: "linguagem", icone: "fa-book-open", cor: "amber" },
    { id: "lin-2", nome: "Linguagem — Sala 2", area: "linguagem", icone: "fa-book-open", cor: "amber" },
    { id: "hum-1", nome: "Humanas — Sala 1", area: "humanas", icone: "fa-landmark", cor: "rose" },
    { id: "hum-2", nome: "Humanas — Sala 2", area: "humanas", icone: "fa-landmark", cor: "rose" },
    { id: "ori-1", nome: "Sala do Orientador — 1", area: "orientador", icone: "fa-user-tie", cor: "cyan", restritoOrientador: true },
    { id: "ori-2", nome: "Sala do Orientador — 2", area: "orientador", icone: "fa-user-tie", cor: "cyan", restritoOrientador: true }
];

// Configurações e Valores iniciais de persistência segura
const CONFIG_CIDADES_INICIAIS = [{ id: "1", nome: "São Braz", sigla: "SBZ", uf: "PI" }];
const CONFIG_ESCOLAS_INICIAIS = [{ id: "1", nome: "U. E. São Braz", razaoSocial: "Unidade Escolar São Braz LTDA", cnpj: "12.345.678/0001-99", inep: "2201923", endereco: "Rua Central, 100", cep: "64.758-000", diretor: "Prof. Antônio Silva", email: "polo@saobraz.pi.gov.br", cidadeId: "1" }];

