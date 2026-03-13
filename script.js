// Garanta que o estado inicial está lá em cima (boardState...)

function handleDragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
    // Adiciona uma leve transparência ao arrastar
    setTimeout(() => event.target.style.display = "none", 0);
}

// Essa função é CRUCIAL: sem o preventDefault, o "drop" não funciona
function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(event) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    const targetColumn = event.target.closest('.card-list');
    
    if (targetColumn) {
        moveCard(cardId, targetColumn.id);
    }
}

function moveCard(cardId, targetColumnId) {
    let movedCard = null;

    // Acha e remove o card
    boardState.forEach(col => {
        const index = col.cards.findIndex(c => c.id === cardId);
        if (index !== -1) {
            movedCard = col.cards.splice(index, 1)[0];
        }
    });

    // Adiciona na nova coluna
    const colDestino = boardState.find(col => col.id === targetColumnId);
    if (colDestino && movedCard) {
        colDestino.cards.push(movedCard);
    }

    renderBoard();
}

function renderBoard() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = boardState.map(col => `
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
        </div>
    `).join('');
}

window.onload = renderBoard;
