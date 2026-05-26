// BANCO DE DADOS OFICIAL - PLATAFORMA OLÍMPICA 2026

// Credenciais fixas de contingência para evitar travas de cache
const CREDENCIAIS_PADRAO = [
    { username: "admin", password: "123", role: "ADM", name: "Administrador Master" },
    { username: "coordenador", password: "456", role: "Coordenador Municipal", name: "Coord. São Braz" },
    { username: "escola", password: "789", role: "Escola", name: "Escola Polo" }
];

// Tabelas de controle de entidades
const CIDADES_PADRAO = [
    { id: "1", nome: "São Braz", sigla: "SBZ", uf: "PI" }
];

const ESCOLAS_PADRAO = [
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

// Listagem de Olimpíadas Monitoradas 2026
const CALENDAR_DATA = [
    { id: "OBMEP", nome: "OBMEP - Olimpíada Brasileira de Matemática das Escolas Públicas" },
    { id: "CANGURU", nome: "Canguru de Matemática Brasil" },
    { id: "OBA", nome: "OBA - Olimpíada Brasileira de Astronomia e Astronáutica" },
    { id: "ONC", nome: "ONC - Olimpíada Nacional de Ciências" },
    { id: "MANDACARU", nome: "Olimpíada Mandacaru de Matemática" }
];