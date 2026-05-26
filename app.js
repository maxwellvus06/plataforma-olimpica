// CONTROLADOR DE ACESSOS E LOGIN
let currentUser = null;

function handleLogin(event) {
    // Impede a página de recarregar e quebrar o script
    event.preventDefault(); 

    const userIn = document.getElementById("auth-user").value.trim();
    const passIn = document.getElementById("auth-pass").value.trim();

    // Puxa os dados configurados no database.js
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const found = usuarios.find(u => u.username === userIn && u.password === passIn);

    if (found) {
        currentUser = found;
        
        // Altera a visibilidade das telas
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-panel").classList.remove("hidden");
        document.getElementById("user-display").innerText = `Logado como: ${found.name} (${found.role})`;

        // Se for ADM, exibe os menus secretos de cadastro
        if (found.role === "ADM") {
            document.getElementById("tab-cidades").classList.remove("hidden");
            document.getElementById("tab-escolas").classList.remove("hidden");
        } else {
            document.getElementById("tab-cidades").classList.add("hidden");
            document.getElementById("tab-escolas").classList.add("hidden");
        }
    } else {
        alert("Usuário ou senha inválidos para o cenário de 2026!");
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById("main-panel").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("login-form").reset();
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach(el => {
        el.classList.remove("border-blue-500", "text-blue-400");
        el.classList.add("border-transparent", "text-gray-400");
    });

    document.getElementById(`content-${tabId}`).classList.remove("hidden");
    event.currentTarget.classList.remove("border-transparent", "text-gray-400");
    event.currentTarget.classList.add("border-blue-500", "text-blue-400");
}