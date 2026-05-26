// BANCO DE DADOS INICIAL - PLATAFORMA OLÍMPICA 2026

// Credenciais de Acesso Prévias
const DEFAULT_USERS = [
    { username: "admin", password: "123", role: "ADM", name: "Administrador Master" },
    { username: "coordenador", password: "456", role: "Coordenador Municipal", name: "Coord. São Braz" },
    { username: "escola", password: "789", role: "Escola", name: "Escola Polo" }
];

// Inicialização dos dados persistidos no LocalStorage
if (!localStorage.getItem("usuarios")) {
    localStorage.setItem("usuarios", JSON.stringify(DEFAULT_USERS));
}

// Novas tabelas controladas com dados iniciais de exemplo (São Braz - PI)
const DEFAULT_CIDADES = [
    { id: "1", nome: "São Braz", sigla: "SBZ", uf: "PI" }
];

const DEFAULT_ESCOLAS = [
    { 
        id: "1", 
        nome: "Escola Municipal Polo", 
        razaoSocial: "Escola Mun Polo LTDA", 
        cnpj: "12.345.678/0001-99", 
        inep: "2201923", 
        endereco: "Rua Central, 100", 
        cep: "64.758-000", 
        diretor: "Prof. Antônio Silva", 
        email: "polo@saobraz.pi.gov.br", 
        cidadeId: "1" 
    }
];

if (!localStorage.getItem("cidades")) {
    localStorage.setItem("cidades", JSON.stringify(DEFAULT_CIDADES));
}
if (!localStorage.getItem("escolas")) {
    localStorage.setItem("escolas", JSON.stringify(DEFAULT_ESCOLAS));
}

// Listagem de Olimpíadas Monitoradas (Resumo)
const CALENDAR_DATA = [
    { id: "OBMEP", nome: "OBMEP - Olimpíada Brasileira de Matemática das Escolas Públicas" },
    { id: "CANGURU", nome: "Canguru de Matemática Brasil" },
    { id: "OBA", nome: "OBA - Olimpíada Brasileira de Astronomia e Astronáutica" },
    { id: "ONC", nome: "ONC - Olimpíada Nacional de Ciências" },
    { id: "MANDACARU", nome: "Olimpíada Mandacaru de Matemática" }
];