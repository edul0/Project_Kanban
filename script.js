const SUPABASE_URL = 'https://tuansquxjvbalzxnfglz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YW5zcXV4anZiYWx6eG5mZ2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTIzNTYsImV4cCI6MjA4ODk2ODM1Nn0.C8FaFGWv0VyOew47NfYXfAl-ksx9TFlI6mkPWcV9diM'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
let ROOM_NAME = urlParams.get('sala') || 'geral';
let GITHUB_USER = localStorage.getItem('kanban_user') || 'edul0';
let currentUser = { login: GITHUB_USER, avatar: `https://github.com/${GITHUB_USER}.png` };

async function startApp() {
    // 1. PRIMEIRO CARREGA O PERFIL (Essencial para não dar undefined)
    await fetchUserProfile(GITHUB_USER);
    
    // 2. DEPOIS INICIALIZA A SALA
    initRoom();
}

async function fetchUserProfile(username) {
    try {
        const res = await fetch(`https://api.github.com/users/${username}`);
        const data = await res.json();
        if (data.login) {
            currentUser = { login: data.login, avatar: data.avatar_url };
            localStorage.setItem('kanban_user', data.login);
        }
    } catch (e) { console.error("Erro ao buscar perfil"); }
    
    const profileDiv = document.getElementById('user-profile');
    if (profileDiv) {
        profileDiv.innerHTML = `<img src="${currentUser.avatar}"> <span>${currentUser.login}</span>`;
    }
}

async function initRoom() {
    let { data } = await _supabase.from('kanban_data').select('*').eq('room_name', ROOM_NAME).maybeSingle();

    if (!data) {
        const initialState = [{id:"todo", title:"Para fazer", cards:[]},{id:"doing", title:"Em curso", cards:[]},{id:"done", title:"Concluído", cards:[]}];
        const { data: newData } = await _supabase.from('kanban_data').insert([{ room_name: ROOM_NAME, state: initialState, logs: [] }]).select().single();
        data = newData;
    }

    boardState = data.state;
    renderBoard();

    _supabase.channel(`room-${ROOM_NAME}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kanban_data', filter: `room_name=eq.${ROOM_NAME}` }, 
    payload => { boardState = payload.new.state; renderBoard(); }).subscribe();
}

function renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    board.innerHTML = boardState.map(col => `
        <div class="column">
            <div class="column-header">${col.title} (${col.cards.length})</div>
            <div class="card-list" ondragover="event.preventDefault()" ondrop="drop(event, '${col.id}')">
                ${col.cards.map(card => `
                    <div class="card ${card.priorityClass || 'prio-media'}" id="${card.id}" draggable="true" ondragstart="drag(event)" ondblclick="deleteCard('${card.id}')">
                        <div class="card-content">${card.content}</div>
                        <div class="card-footer">
                            <div class="owner-info" onclick="assignTask('${card.id}')">
                                <img src="${card.ownerAvatar || 'https://github.com/identicons/ghost.png'}">
                                <span>@${card.owner || 'sem-nome'}</span>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ Novo Post-it</button>
        </div>
    `).join('');
}

async function addCard(colId) {
    const txt = prompt("Tarefa:");
    if (!txt) return;

    const p = prompt("Prioridade: 1-Alta, 2-Média, 3-Baixa", "2");
    const prio = p === "1" ? "prio-alta" : (p === "3" ? "prio-baixa" : "prio-media");

    boardState.find(c => c.id === colId).cards.push({
        id: crypto.randomUUID(),
        content: txt,
        owner: currentUser.login, // Puxa do perfil carregado no startApp
        ownerAvatar: currentUser.avatar,
        priorityClass: prio
    });

    renderBoard();
    await save();
}

async function assignTask(cardId) {
    const target = prompt("Delegar para (@nick ou 'eu'):", "eu");
    if (!target) return;
    const nick = target.toLowerCase() === 'eu' ? currentUser.login : target.replace('@', '');
    
    boardState.forEach(col => {
        const card = col.cards.find(c => c.id === cardId);
        if (card) {
            card.owner = nick;
            card.ownerAvatar = `https://github.com/${nick}.png`;
        }
    });
    renderBoard();
    await save();
}

async function save() {
    await _supabase.from('kanban_data').update({ state: boardState }).eq('room_name', ROOM_NAME);
}

// DRAG AND DROP
function drag(e) { e.dataTransfer.setData("text", e.target.id); }
async function drop(e, colId) {
    const id = e.dataTransfer.getData("text");
    let card;
    boardState.forEach(c => {
        const i = c.cards.findIndex(x => x.id === id);
        if(i > -1) card = c.cards.splice(i, 1)[0];
    });
    if(card) {
        boardState.find(c => c.id === colId).cards.push(card);
        renderBoard();
        await save();
    }
}

async function deleteCard(id) {
    if (confirm("Deletar?")) {
        boardState.forEach(col => col.cards = col.cards.filter(c => c.id !== id));
        renderBoard();
        await save();
    }
}

document.addEventListener('DOMContentLoaded', startApp);
