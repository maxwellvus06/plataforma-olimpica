// BANCO DE DADOS CENTRALIZADO - PLATAFORMA OLÍMPICA 2026

const DEFAULT_USERS = [
    { username: "admin", password: "123", role: "ADM", name: "Administrador Master" },
    { username: "coordenador", password: "456", role: "Coordenador Municipal", name: "Coord. São Braz" },
    { username: "escola", password: "789", role: "Escola", name: "Escola Polo" }
];

const DEFAULT_CIDADES = [
    { id: "1", nome: "São Braz", sigla: "SBZ", uf: "PI" }
];

const DEFAULT_ESCOLAS = [
    { 
        id: "1", 
        nome: "Escola Municipal Polo", 
        razaoSocial: "Escola Municipal Polo LTDA", 
        cnpj: "12.345.678/0001-99", 
        inep: "2201923", 
        endereco: "Rua Central, 100", 
        cep: "64.758-000", 
        diretor: "Prof. Antônio Silva", 
        email: "polo@saobraz.pi.gov.br", 
        cidadeId: "1" 
    }
];

// Inicialização segura no LocalStorage
if (!localStorage.getItem("usuarios")) localStorage.setItem("usuarios", JSON.stringify(DEFAULT_USERS));
if (!localStorage.getItem("cidades")) localStorage.setItem("cidades", JSON.stringify(DEFAULT_CIDADES));
if (!localStorage.getItem("escolas")) localStorage.setItem("escolas", JSON.stringify(DEFAULT_ESCOLAS));

// O CORAÇÃO DO SISTEMA: Injeção nativa de todas as 45 Olimpíadas de 2026
const OLIMPIADAS_DATA = [
    // MATEMÁTICA
    { id: "obmep", nome: "OBMEP (Olimpíada Brasileira de Matemática das Escolas Públicas)", categoria: "Matemática", edital: "Disponível", status: "Fase 1" },
    { id: "canguru", nome: "Canguru de Matemática Brasil", categoria: "Matemática", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "cjp", nome: "CJP (Competição Jacob Palis Júnior de Matemática)", categoria: "Matemática", edital: "Disponível", status: "Planejado" },
    { id: "mandacaru", nome: "Olimpíada Mandacaru de Matemática", categoria: "Matemática", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "obm", nome: "OBM (Olimpíada Brasileira de Matemática)", categoria: "Matemática", edital: "Visualizar", status: "Fase 1" },
    { id: "omg", nome: "OMG (Olimpíada de Matemática do Grande Canal)", categoria: "Matemática", edital: "Análise", status: "Planejado" },
    { id: "rpm", nome: "RPM (Rally de Redes de Prova Matemática)", categoria: "Matemática", edital: "Análise", status: "Planejado" },
    { id: "torneio_mat", nome: "Torneio Meninas na Matemática", categoria: "Matemática", edital: "Disponível", status: "Fase 1" },
    { id: "banco_obmep", nome: "Desafio Banco da Amazônia de Matemática", categoria: "Matemática", edital: "Análise", status: "Planejado" },

    // RACIOCÍNIO LÓGICO
    { id: "obrl", nome: "OBRL (Olimpíada Brasileira de Raciocínio Lógico)", categoria: "Raciocínio Lógico", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "onrl", nome: "ONRL (Olimpíada Nacional de Raciocínio Lógico)", categoria: "Raciocínio Lógico", edital: "Análise", status: "Planejado" },
    { id: "trl", nome: "Torneio Regional de Lógica Aplicada", categoria: "Raciocínio Lógico", edital: "Análise", status: "Planejado" },
    { id: "cyber_log", nome: "Desafio CyberLógica 2026", categoria: "Raciocínio Lógico", edital: "Visualizar", status: "Fase Única" },
    { id: "jogos_log", nome: "Olimpíada Brasileira de Jogos de Lógica", categoria: "Raciocínio Lógico", edital: "Análise", status: "Planejado" },

    // CIÊNCIAS INTEGRADAS
    { id: "onc", nome: "ONC (Olimpíada Nacional de Ciências)", categoria: "Ciências Integradas", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "tbc", nome: "TBC (Torneio Brasileiro de Ciências)", categoria: "Ciências Integradas", edital: "Disponível", status: "Fase Única" },
    { id: "obc", nome: "OBC (Olimpíada Brasileira de Ciências - Seletiva IJSO)", categoria: "Ciências Integradas", edital: "Disponível", status: "Fase 1" },
    { id: "ijso_fase1", nome: "IJSO Brasil - Fase Eliminatória", categoria: "Ciências Integradas", edital: "Visualizar", status: "Fase 1" },
    { id: "ciencias_junior", nome: "Olimpíada Nacional de Ciências Júnior", categoria: "Ciências Integradas", edital: "Análise", status: "Planejado" },
    { id: "eco_ciencias", nome: "Olimpíada de Eco-Ciências e Sustentabilidade", categoria: "Ciências Integradas", edital: "Análise", status: "Planejado" },

    // BIOLOGIA
    { id: "tnbio", nome: "TNBio (Torneio Nacional de Biologia)", categoria: "Biologia", edital: "Disponível", status: "Fase Única" },
    { id: "obbiotec", nome: "OBBiotec (Olimpíada Brasileira de Biotecnologia)", categoria: "Biologia", edital: "Disponível", status: "Fase 1" },
    { id: "obbs", nome: "OBBS (Olimpíada de Biologia Sintética)", categoria: "Biologia", edital: "Visualizar", status: "Fase 1" },
    { id: "torneio_bio", nome: "Torneio de Biologia Celular Aplicada", categoria: "Biologia", edital: "Análise", status: "Planejado" },
    { id: "desafio_eco", nome: "Desafio de Botânica e Ecologia Regional", categoria: "Biologia", edital: "Análise", status: "Planejado" },

    // FÍSICA
    { id: "obf_jr", nome: "OBF Nível Júnior (Olimpíada Brasileira de Física)", categoria: "Física", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "obf_1", nome: "OBF Nível I (Ensino Fundamental)", categoria: "Física", edital: "Disponível", status: "Fase 1" },
    { id: "obfep", nome: "OBFEP Nível A (Escolas Públicas)", categoria: "Física", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "tbf", nome: "TBF (Torneio Brasileiro de Física)", categoria: "Física", edital: "Visualizar", status: "Fase 1" },
    { id: "fisica_exp", nome: "Olimpíada Brasileira de Física Experimental", categoria: "Física", edital: "Análise", status: "Planejado" },
    { id: "mecanica_torneio", nome: "Torneio de Mecânica Clássica Júnior", categoria: "Física", edital: "Análise", status: "Planejado" },

    // QUÍMICA
    { id: "obqjr_a", nome: "OBQJr Modalidade A (6º e 7º ano)", categoria: "Química", edital: "Disponível", status: "Fase 1" },
    { id: "obqjr_b", nome: "OBQJr Modalidade B (8º e 9º ano)", categoria: "Química", edital: "Disponível", status: "Fase 1" },
    { id: "opq", nome: "OPQ (Olimpíada Piauiense de Química - 9º ano)", categoria: "Química", edital: "Disponível", status: "Fase 1" },
    { id: "camaleao_quim", nome: "Olimpíada Camaleão de Química", categoria: "Química", edital: "Visualizar", status: "Fase 1" },
    { id: "torneio_elementos", nome: "Torneio Tabela Periódica e Elementos", categoria: "Química", edital: "Análise", status: "Planejado" },
    { id: "quimica_verde", nome: "Olimpíada de Química Verde e Soluções", categoria: "Química", edital: "Análise", status: "Planejado" },

    // ASTRONOMIA
    { id: "oba", nome: "OBA (Olimpíada Brasileira de Astronomia e Astronáutica)", categoria: "Astronomia", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "mobfog", nome: "MOBFOG (Mostra Brasileira de Foguetes)", categoria: "Astronomia", edital: "Disponível", status: "Inscrições Abertas" },
    { id: "onad", nome: "ONAD (Olimpíada Nacional de Astronomia Digital)", categoria: "Astronomia", edital: "Disponível", status: "Fase 1" },
    { id: "ioaa_seletiva", nome: "Seletiva Internacional IOAA Brasil", categoria: "Astronomia", edital: "Visualizar", status: "Fase 1" },
    { id: "torneio_cosmos", nome: "Torneio Cosmos de Astrofísica", categoria: "Astronomia", edital: "Análise", status: "Planejado" },
    { id: "foguetes_avancado", nome: "Desafio Avançado de Engenharia Aeroespacial", categoria: "Astronomia", edital: "Análise", status: "Planejado" }
];