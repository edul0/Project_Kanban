const generateId = () => crypto.randomUUID();

// 1. Carregamento de Dados (Individual por Usuário)
let boardState = JSON.parse(localStorage.getItem('myPlannerData')) || [
    { id: "todo", title: "Para fazer", cards: [] },
    { id: "doing", title: "Em curso", cards: [] },
    { id: "done", title: "Concluído", cards: [] }
];

function save() {
    localStorage.setItem('myPlannerData', JSON.stringify(boardState));
}

// 2. Sistema de Compartilhamento (O "Efeito Planner")
function shareBoard() {
    const dataString = btoa(JSON.stringify(boardState)); // Transforma em código Base64
    const url = new URL(window.location.href);
    url.searchParams.set('share', dataString);
    
    navigator.clipboard.writeText(url.href);
    alert("Link de compartilhamento copiado! Envie para seu colega.");
}

// Verifica se recebeu um board via URL
function checkSharedBoard() {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('share');
    if (sharedData) {
        if (confirm("Você recebeu um board compartilhado. Deseja substituir o seu atual por este?")) {
            boardState = JSON.parse(atob(sharedData));
            save();
            window.history.replaceState({}, document.title, window.location.pathname); // Limpa a URL
        }
    }
}

// 3. Drag and Drop e CRUD (Otimizados)
function handleDragStart(e) { e.dataTransfer.setData("text", e.target.id); }
function handleDragOver(e) { e.preventDefault(); }

function handleDrop(e) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text");
    const targetCol = e.target.closest('.card-list');
    if (targetCol) {
        moveCard(cardId, targetCol.id);
    }
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
        render();
    }
}

function addCard(colId) {
    const val = prompt("O que precisa ser feito?");
    if (!val) return;
    boardState.find(c => c.id === colId).cards.push({id: generateId(), content: val});
    save();
    render();
}

// 4. Renderização (Design Planner)
function render() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = boardState.map(col => `
        <div class="column">
            <div class="column-header">
                <h3>${col.title}</h3>
                <span>${col.cards.length}</span>
            </div>
            <div class="card-list" id="${col.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event)">
                ${col.cards.map(card => `
                    <div class="card" id="${card.id}" draggable="true" ondragstart="handleDragStart(event)">
                        ${card.content}
                    </div>
                `).join('')}
            </div>
            <button class="btn-share" style="background:none; color:#2b88d8; text-align:left;" onclick="addCard('${col.id}')">+ Adicionar tarefa</button>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    checkSharedBoard();
    render();
});
