// === CONFIGURAÇÕES INICIAIS ===
const generateId = () => crypto.randomUUID();

// Tenta carregar dados do LocalStorage ou usa o padrão se estiver vazio
let boardState = JSON.parse(localStorage.getItem('kanbanData')) || [
    { id: "todo", title: "A Fazer", cards: [] },
    { id: "doing", title: "Em Andamento", cards: [] },
    { id: "done", title: "Concluído", cards: [] }
];

// === FUNÇÕES DE PERSISTÊNCIA ===
function saveToLocalStorage() {
    localStorage.setItem('kanbanData', JSON.stringify(boardState));
}

// === LÓGICA DE DRAG AND DROP ===
function handleDragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
}

function handleDragOver(event) {
    event.preventDefault(); // Necessário para permitir o drop
}

function handleDrop(event) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    const targetColumnList = event.target.closest('.card-list');
    
    if (targetColumnList) {
        const targetColumnId = targetColumnList.id;
        moveCard(cardId, targetColumnId);
    }
}

function moveCard(cardId, targetColumnId) {
    let movedCard = null;

    // Localiza e remove o card de onde ele estava
    boardState.forEach(col => {
        const cardIndex = col.cards.findIndex(c => c.id === cardId);
        if (cardIndex !== -1) {
            movedCard = col.cards.splice(cardIndex, 1)[0];
        }
    });

    // Adiciona na nova coluna
    const destinationCol = boardState.find(col => col.id === targetColumnId);
    if (destinationCol && movedCard) {
        destinationCol.cards.push(movedCard);
        saveToLocalStorage(); // Salva a nova posição
        renderBoard();
    }
}

// === CRIAÇÃO DE CARDS ===
function addCard(columnId) {
    const content = prompt("O que precisa ser feito?");
    if (!content || content.trim() === "") return;

    const column = boardState.find(col => col.id === columnId);
    if (column) {
        column.cards.push({ id: generateId(), content: content });
        saveToLocalStorage(); // Salva o novo card
        renderBoard();
    }
}

// === RENDERIZAÇÃO ===
function renderBoard() {
    const boardElement = document.getElementById('kanban-board');
    if (!boardElement) return;

    boardElement.innerHTML = boardState.map(col => `
        <div class="column">
            <h3>${col.title}</h3>
            <div class="card-list" id="${col.id}" 
                 ondragover="handleDragOver(event)" 
                 ondrop="handleDrop(event)">
                
                ${col.cards.map(card => `
                    <div class="card" id="${card.id}" draggable="true" 
                         ondragstart="handleDragStart(event)">
                        ${card.content}
                    </div>
                `).join('')}
                
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ Adicionar cartão</button>
        </div>
    `).join('');
}

// Inicialização oficial
document.addEventListener('DOMContentLoaded', renderBoard);
