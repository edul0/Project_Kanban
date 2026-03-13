const GITHUB_USER = 'edul0';
let userAvatar = '';

// === DADOS E PERSISTÊNCIA ===
let boardState = JSON.parse(localStorage.getItem('kanban_pro_data')) || [
    { id: "todo", title: "Para fazer", cards: [] },
    { id: "doing", title: "Em curso", cards: [] },
    { id: "done", title: "Concluído", cards: [] }
];

function save() {
    localStorage.setItem('kanban_pro_data', JSON.stringify(boardState));
}

// === API GITHUB ===
async function fetchGitHubProfile() {
    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USER}`);
        const data = await response.json();
        userAvatar = data.avatar_url;
        document.getElementById('user-profile').innerHTML = `
            <img src="${userAvatar}" alt="Avatar">
            <span>${data.name || data.login} | Workspace</span>
        `;
        renderBoard();
    } catch (e) {
        console.error("Erro GitHub:", e);
    }
}

// === LÓGICA CORE ===
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

function addCard(colId) {
    const val = prompt("O que precisa ser feito?");
    if (!val) return;
    boardState.find(c => c.id === colId).cards.push({ id: crypto.randomUUID(), content: val });
    save();
    renderBoard();
}

function shareBoard() {
    const data = btoa(JSON.stringify(boardState));
    const url = new URL(window.location.href);
    url.searchParams.set('share', data);
    navigator.clipboard.writeText(url.href);
    alert("Link copiado! Seu colega verá exatamente seu board atual.");
}

function deleteCard(cardId) {
    if (confirm("Excluir esta tarefa?")) {
        boardState.forEach(col => {
            col.cards = col.cards.filter(c => c.id !== cardId);
        });
        save();
        renderBoard();
    }
}

// === RENDERIZAÇÃO ===
function renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;
    board.innerHTML = boardState.map(col => `
        <div class="column">
            <div class="column-header">
                <div style="font-size: 12px; opacity: 0.8;">${col.title.toUpperCase()}</div>
                <div style="font-size: 20px;">${col.cards.length}</div>
            </div>
            <div class="card-list" id="${col.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event)">
                ${col.cards.map(card => `
                    <div class="card" id="${card.id}" draggable="true" ondragstart="handleDragStart(event)" ondblclick="deleteCard('${card.id}')">
                        ${card.content}
                        <div class="card-footer">
                            ${userAvatar ? `<img src="${userAvatar}" class="card-avatar">` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ Adicionar tarefa</button>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubProfile();
    const params = new URLSearchParams(window.location.search);
    if (params.has('share')) {
        boardState = JSON.parse(atob(params.get('share')));
        save();
        window.history.replaceState({}, '', window.location.pathname);
    }
    renderBoard();
});
