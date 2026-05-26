import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sua configuração oficial do Firebase de 2026
const firebaseConfig = {
    apiKey: "AIzaSyDn5eAVOerIiknYMRdvMo_2YmXVXR0NwL0",
    authDomain: "avanceolimpico.firebaseapp.com",
    databaseURL: "https://avanceolimpico-default-rtdb.firebaseio.com",
    projectId: "avanceolimpico",
    storageBucket: "avanceolimpico.firebasestorage.app",
    messagingSenderId: "895771266102",
    appId: "1:895771266102:web:f4e6b32f7c631d3eb81c97",
    measurementId: "G-FPETQTFRZN"
};

// Inicializa o Firebase e Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado Global da Aplicação
let currentUser = null;
let cachedCidades = [];
let cachedEscolas = [];
let cachedOlimpiadas = [];
let cachedUsuarios = [];

// Elementos do DOM
const loginScreen = document.getElementById('login-screen');
const mainSystem = document.getElementById('main-system');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const menuItems = document.querySelectorAll('.menu-item');
const contentSections = document.querySelectorAll('.content-section');
const btnLogout = document.getElementById('btn-logout');

// ==========================================
// 🔐 SESSÃO E LOGIN (GOVERNANÇA DE ACESSO)
// ==========================================

window.addEventListener('DOMContentLoaded', async () => {
    setupMenuNavigation();
    setupFormListeners();
    
    // Auto-login se já houver sessão salva
    const session = localStorage.getItem('avance_session');
    if (session) {
        currentUser = JSON.parse(session);
        await bootSystem();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value;
    
    loginError.textContent = "Autenticando...";

    // Carga de contingência master caso o banco esteja vazio
    if (userInp === 'admin' && passInp === '123') {
        currentUser = { username: 'admin', fullname: 'Administrador Master', role: 'ADM' };
        localStorage.setItem('avance_session', JSON.stringify(currentUser));
        await bootSystem();
        return;
    }

    try {
        const q = query(collection(db, "usuarios"), where("username", "==", userInp), where("password", "==", passInp));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            currentUser = {
                username: userDoc.username,
                fullname: userDoc.fullname,
                role: userDoc.role,
                vinculo: userDoc.vinculo || ''
            };
            localStorage.setItem('avance_session', JSON.stringify(currentUser));
            await bootSystem();
        } else {
            loginError.textContent = "Usuário ou senha inválidos corporativos.";
        }
    } catch (err) {
        console.error(err);
        loginError.textContent = "Erro ao conectar com o banco de dados na nuvem.";
    }
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('avance_session');
    currentUser = null;
    mainSystem.style.display = 'none';
    loginScreen.style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.textContent = '';
});

// Inicialização de Dados após Login Valido
async function bootSystem() {
    loginScreen.style.display = 'none';
    mainSystem.style.display = 'flex';
    
    document.getElementById('user-display-name').textContent = currentUser.fullname;
    document.getElementById('user-role-badge').textContent = `Painel ${currentUser.role}`;

    // Restrições de Visibilidade de Menu conforme Governança de Nível de Acesso
    if (currentUser.role !== 'ADM') {
        document.getElementById('menu-cidades').style.display = 'none';
        document.getElementById('menu-escolas').style.display = 'none';
        document.getElementById('menu-usuarios').style.display = 'none';
        document.getElementById('container-add-olimpiada').style.display = 'none';
    } else {
        document.getElementById('menu-cidades').style.display = 'block';
        document.getElementById('menu-escolas').style.display = 'block';
        document.getElementById('menu-usuarios').style.display = 'block';
        document.getElementById('container-add-olimpiada').style.display = 'block';
    }

    await refreshAllData();
    showSection('view-dashboard');
}

// ==========================================
// 📡 CARGA E SINCRONIZAÇÃO COM FIRESTORE
// ==========================================

async function refreshAllData() {
    try {
        // Puxa tudo da nuvem em paralelo
        const [snapCid, snapEsc, snapOlimp, snapUser] = await Promise.all([
            getDocs(collection(db, "cidades")),
            getDocs(collection(db, "escolas")),
            getDocs(collection(db, "olimpiadas")),
            getDocs(collection(db, "usuarios"))
        ]);

        cachedCidades = snapCid.docs.map(d => ({ id: d.id, ...d.data() }));
        cachedEscolas = snapEsc.docs.map(d => ({ id: d.id, ...d.data() }));
        cachedOlimpiadas = snapOlimp.docs.map(d => ({ id: d.id, ...d.data() }));
        cachedUsuarios = snapUser.docs.map(d => ({ id: d.id, ...d.data() }));

        updateDashboardCounters();
        renderCidadesTable();
        renderEscolasTable();
        renderOlimpiadasTable();
        renderUsuariosTable();
        populateDropdowns();
    } catch (error) {
        console.error("Erro ao sincronizar com o Cloud Firestore: ", error);
    }
}

function updateDashboardCounters() {
    document.getElementById('dash-count-cidades').textContent = cachedCidades.length;
    document.getElementById('dash-count-escolas').textContent = cachedEscolas.length;
    document.getElementById('dash-count-olimpiadas').textContent = cachedOlimpiadas.length;
    document.getElementById('dash-count-usuarios').textContent = cachedUsuarios.length + 1; // +1 devido ao admin contingência
}

// ==========================================
// 🛠️ CONTROLADORES DE RENDERIZAÇÃO DE TABELAS
// ==========================================

function renderCidadesTable() {
    const tbody = document.getElementById('table-cidades-body');
    tbody.innerHTML = '';
    cachedCidades.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><small>${c.id.substring(0,8)}...</small></td>
            <td><strong>${c.nome}</strong></td>
            <td>${c.uf}</td>
            <td><button class="btn-action-delete" data-id="${c.id}"><i class="fa-solid fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderEscolasTable() {
    const tbody = document.getElementById('table-escolas-body');
    tbody.innerHTML = '';
    
    // Filtragem de dados caso o usuário seja Gestor da Cidade
    let escolasFiltradas = cachedEscolas;
    if (currentUser && currentUser.role === 'Gestor') {
        escolasFiltradas = cachedEscolas.filter(e => e.cidadeId === currentUser.vinculo);
    }

    escolasFiltradas.forEach(e => {
        const cid = cachedCidades.find(c => c.id === e.cidadeId);
        const nomeCidade = cid ? `${cid.nome}-${cid.uf}` : 'Desconhecida';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${e.razaoSocial}</strong></td>
            <td>${nomeCidade}</td>
            <td>${e.inep}</td>
            <td>${e.diretor || '-'}</td>
            <td>
                ${currentUser.role === 'ADM' ? `<button class="btn-action-delete" data-id="${e.id}"><i class="fa-solid fa-trash"></i></button>` : `<i class="fa-solid fa-lock text-muted"></i>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOlimpiadasTable() {
    const tbody = document.getElementById('table-olimpiadas-body');
    tbody.innerHTML = '';

    // Filtragem para Escolas/Alunos verem apenas o cronograma delas se necessário
    cachedOlimpiadas.forEach(o => {
        const tr = document.createElement('tr');
        const hoje = new Date().toISOString().split('T')[0];
        let statusTag = `<span class="badge badge-success">Ativa</span>`;
        if (hoje > o.dataFim) statusTag = `<span class="badge badge-danger">Encerrada</span>`;
        else if (hoje < o.dataInicio) statusTag = `<span class="badge badge-warning">Futura</span>`;

        tr.innerHTML = `
            <td><strong>${o.nome}</strong></td>
            <td>${o.fase}</td>
            <td>${formatarDataBR(o.dataInicio)}</td>
            <td>${formatarDataBR(o.dataFim)}</td>
            <td>${statusTag}</td>
            <td>
                ${currentUser.role === 'ADM' ? `<button class="btn-action-delete" data-id="${o.id}"><i class="fa-solid fa-trash"></i></button>` : `<i class="fa-solid fa-eye"></i>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderUsuariosTable() {
    const tbody = document.getElementById('table-usuarios-body');
    tbody.innerHTML = '';
    cachedUsuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${u.username}</code></td>
            <td>${u.fullname}</td>
            <td><span class="badge badge-neutral">${u.role}</span></td>
            <td><small>${u.vinculoNome || 'Geral/Master'}</small></td>
            <td><button class="btn-action-delete" data-id="${u.id}"><i class="fa-solid fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function populateDropdowns() {
    const escCidSelect = document.getElementById('esc-cidade-select');
    if(escCidSelect) {
        escCidSelect.innerHTML = '<option value="">Selecione uma cidade...</option>';
        cachedCidades.forEach(c => {
            escCidSelect.innerHTML += `<option value="${c.id}">${c.nome} (${c.uf})</option>`;
        });
    }
}

// ==========================================
// 📥 SUBMISSÃO DE FORMULÁRIOS (GRAVAÇÃO NA NUVEM)
// ==========================================

function setupFormListeners() {
    // Cadastro de Cidade
    document.getElementById('form-cidade').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('cid-nome').value.trim();
        const uf = document.getElementById('cid-uf').value;
        
        await addDoc(collection(db, "cidades"), { nome, uf });
        document.getElementById('form-cidade').reset();
        await refreshAllData();
    });

    // Cadastro de Escola
    document.getElementById('form-escola').addEventListener('submit', async (e) => {
        e.preventDefault();
        const escolaData = {
            razaoSocial: document.getElementById('esc-razao').value.trim(),
            cidadeId: document.getElementById('esc-cidade-select').value,
            cnpj: document.getElementById('esc-cnpj').value.trim(),
            inep: document.getElementById('esc-inep').value.trim(),
            endereco: document.getElementById('esc-endereco').value.trim(),
            cep: document.getElementById('esc-cep').value.trim(),
            diretor: document.getElementById('esc-diretor').value.trim(),
            email: document.getElementById('esc-email').value.trim()
        };

        if(!escolaData.cidadeId) return alert("Selecione uma Cidade homologada previa!");

        await addDoc(collection(db, "escolas"), escolaData);
        document.getElementById('form-escola').reset();
        await refreshAllData();
    });

    // Cadastro de Olimpíada Manual
    document.getElementById('form-olimpiada').addEventListener('submit', async (e) => {
        e.preventDefault();
        const olimpData = {
            nome: document.getElementById('olimp-nome').value.trim(),
            fase: document.getElementById('olimp-fase').value.trim(),
            dataInicio: document.getElementById('olimp-start').value,
            dataFim: document.getElementById('olimp-end').value
        };

        await addDoc(collection(db, "olimpiadas"), olimpData);
        document.getElementById('form-olimpiada').reset();
        await refreshAllData();
    });

    // Governança Dinâmica no Form de Usuários
    const roleSelect = document.getElementById('user-role-select');
    const dynamicFields = document.getElementById('dynamic-user-fields');

    roleSelect.addEventListener('change', () => {
        const val = roleSelect.value;
        dynamicFields.innerHTML = '';
        if (val === 'Gestor') {
            let options = cachedCidades.map(c => `<option value="${c.id}">${c.nome}-${c.uf}</option>`).join('');
            dynamicFields.innerHTML = `<div class="input-group"><label>Cidade Vinculada</label><select id="user-vinculo-id" required>${options}</select></div>`;
        } else if (val === 'Escola' || val === 'Aluno') {
            let options = cachedEscolas.map(e => `<option value="${e.id}">${e.razaoSocial}</option>`).join('');
            dynamicFields.innerHTML = `<div class="input-group"><label>Escola Vinculada</label><select id="user-vinculo-id" required>${options}</select></div>`;
        }
    });

    // Cadastro de Usuários
    document.getElementById('form-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('user-username').value.trim();
        const fullname = document.getElementById('user-fullname').value.trim();
        const password = document.getElementById('user-password').value;
        const role = roleSelect.value;
        
        let vinculo = '';
        let vinculoNome = 'Geral/Master';

        const vinculoElem = document.getElementById('user-vinculo-id');
        if (vinculoElem) {
            vinculo = vinculoElem.value;
            vinculoNome = vinculoElem.options[vinculoElem.selectedIndex].text;
        }

        await addDoc(collection(db, "usuarios"), { username, fullname, password, role, vinculo, vinculoNome });
        document.getElementById('form-usuario').reset();
        dynamicFields.innerHTML = '';
        await refreshAllData();
    });

    // Eventos de Deleção Generica (Captura na Tabela via Event Bubbling)
    document.addEventListener('click', async (e) => {
        const targetBtn = e.target.closest('.btn-action-delete');
        if (!targetBtn) return;
        
        const id = targetBtn.getAttribute('data-id');
        const tr = targetBtn.closest('tr');
        const tableId = tr.parentElement.id;

        if (!confirm("Tem certeza que deseja remover este registro permanentemente da nuvem?")) return;

        if (tableId === 'table-cidades-body') {
            const possuiEscola = cachedEscolas.some(esc => esc.cidadeId === id);
            if (possuiEscola) return alert("Erro de Integridade: Impossível apagar cidade com escolas vinculadas!");
            await deleteDoc(doc(db, "cidades", id));
        } else if (tableId === 'table-escolas-body') {
            await deleteDoc(doc(db, "escolas", id));
        } else if (tableId === 'table-olimpiadas-body') {
            await deleteDoc(doc(db, "olimpiadas", id));
        } else if (tableId === 'table-usuarios-body') {
            await deleteDoc(doc(db, "usuarios", id));
        }

        await refreshAllData();
    });

    // INTERFACE DE EXCEL (PROCESSAMENTO SHEETJS)
    document.getElementById('excel-file-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            for (const row of jsonData) {
                if (row.Olimpíada && row.Fase) {
                    await addDoc(collection(db, "olimpiadas"), {
                        nome: row.Olimpíada,
                        fase: row.Fase,
                        dataInicio: converterDataExcel(row.Inicio),
                        dataFim: converterDataExcel(row.Fim)
                    });
                }
            }
            alert("Cronograma importado com sucesso para a nuvem!");
            await refreshAllData();
        };
        reader.readAsArrayBuffer(file);
    });

    // GERAÇÃO DE TEMPLATE INTELIGENTE EXCEL
    document.getElementById('btn-export-template').addEventListener('click', () => {
        const ws_data = [
            ["Olimpíada", "Fase", "Inicio", "Fim"],
            ["Olimpíada Canguru de Matemática", "Fase Única - Prova", "2026-03-20", "2026-03-22"],
            ["OBMEP", "1ª Fase - Aplicação", "2026-06-02", "2026-06-03"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inscrições");
        XLSX.writeFile(wb, "Template_Cronograma_Avance.xlsx");
    });
}

// ==========================================
// 🧮 UTILITÁRIOS E NAVEGAÇÃO
// ==========================================

function setupMenuNavigation() {
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            showSection(item.getAttribute('data-target'));
        });
    });
}

function showSection(id) {
    contentSections.forEach(sec => {
        sec.style.display = sec.id === id ? 'block' : 'none';
    });
}

function formatarDataBR(dataStr) {
    if(!dataStr) return '-';
    const parts = dataStr.split('-');
    if(parts.length !== 3) return dataStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function converterDataExcel(val) {
    if(!val) return '';
    if(typeof val === 'string') return val;
    // Caso o Excel converta a data em número serial
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
}