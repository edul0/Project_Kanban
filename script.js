// === IDENTIDADE DINÂMICA ===
let currentUser = localStorage.getItem('kanban_user') || 'github';
let currentUserAvatar = '';

async function fetchUserProfile(username) {
    try {
        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();
        
        if (data.message === "Not Found") throw new Error();
        
        currentUserAvatar = data.avatar_url;
        localStorage.setItem('kanban_user', username);
        
        document.getElementById('user-profile').innerHTML = `
            <img src="${currentUserAvatar}" alt="Avatar">
            <div style="display:flex; flex-direction:column">
                <span style="font-size:12px">Logado como:</span>
                <span>${data.name || data.login}</span>
            </div>
        `;
        renderBoard();
    } catch (e) {
        const novo = prompt("Usuário GitHub inválido. Digite seu @ novamente:");
        if (novo) fetchUserProfile(novo);
    }
}

function changeUser() {
    const user = prompt("Digite seu @ do GitHub:");
    if (user) fetchUserProfile(user);
}

// === DADOS E PERSISTÊNCIA ===
let boardState = JSON.parse(localStorage.getItem('kanban_pro_data')) || [
    { id: "todo", title: "Para fazer", cards: [] },
    { id: "doing", title: "Em curso", cards: [] },
    { id: "done", title: "Concluído", cards: [] }
];

const save = () => localStorage.setItem('kanban_pro_data', JSON.stringify(boardState));

// === DRAG AND DROP ===
function handleDragStart(e) { e.dataTransfer.setData("text", e.target.id); }
function handleDragOver(e) { e.preventDefault(); }

function handleDrop(e) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text");
    const targetCol = e.target.closest('.card-list');
    if (targetCol) moveCard(cardId, targetCol.id);
}

function moveCard(cardId, targetColId) {
    let card;
    boardState.forEach(col => {
        const idx = col.cards.findIndex(c => c.id === cardId);
        if (idx !== -1) card = col.cards.splice(idx, 1)[0];
    });
    const dest = boardState.find(c => c.id === targetColId);
    if (dest && card) {
        dest.cards.push(card);
        save();
        renderBoard();
    }
}

// === CRUD ===
function addCard(colId) {
    const val = prompt("O que precisa ser feito?");
    if (!val) return;
    
    boardState.find(c => c.id === colId).cards.push({
        id: crypto.randomUUID(),
        content: val,
        authorAvatar: currentUserAvatar // Carimba a foto do autor no card
    });
    
    save();
    renderBoard();
}

function deleteCard(cardId) {
    if (confirm("Deseja excluir esta tarefa?")) {
        boardState.forEach(col => col.cards = col.cards.filter(c => c.id !== cardId));
        save();
        renderBoard();
    }
}

function shareBoard() {
    const data = btoa(JSON.stringify(boardState));
    const url = new URL(window.location.href);
    url.searchParams.set('share', data);
    navigator.clipboard.writeText(url.href);
    alert("Link de colaboração copiado! Quem abrir este link verá seus cards.");
}

// === RENDERIZAÇÃO ===
function renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;
    
    board.innerHTML = boardState.map(col => `
        <div class="column">
            <div class="column-header">
                <div style="font-size: 11px; opacity: 0.6; margin-bottom:5px">${col.title.toUpperCase()}</div>
                <div style="font-size: 22px;">${col.cards.length}</div>
            </div>
            <div class="card-list" id="${col.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event)">
                ${col.cards.map(card => `
                    <div class="card" id="${card.id}" draggable="true" ondragstart="handleDragStart(event)" ondblclick="deleteCard('${card.id}')">
                        <div style="font-size: 14px; line-height: 1.5;">${card.content}</div>
                        <div class="card-footer">
                            <img src="${card.authorAvatar || 'https://via.placeholder.com/20'}" class="card-avatar" title="Atribuído a este autor">
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ Adicionar tarefa</button>
        </div>
    `).join('');
}

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile(currentUser);
    
    const params = new URLSearchParams(window.location.search);
    if (params.has('share')) {
        try {
            boardState = JSON.parse(atob(params.get('share')));
            save();
            window.history.replaceState({}, '', window.location.pathname);
        } catch(e) { console.error("Erro ao importar board compartilhado"); }
    }
    
    renderBoard();
});
