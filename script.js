const SUPABASE_URL = 'https://tuansquxjvbalzxnfglz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YW5zcXV4anZiYWx6eG5mZ2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTIzNTYsImV4cCI6MjA4ODk2ODM1Nn0.C8FaFGWv0VyOew47NfYXfAl-ksx9TFlI6mkPWcV9diM'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
let ROOM_NAME = urlParams.get('sala') || 'geral';
let GITHUB_USER = localStorage.getItem('kanban_user') || 'edul0';
let currentUser = { login: GITHUB_USER, avatar: 'https://github.com/identicons/edul0.png', name: GITHUB_USER };
let boardState = [];
let activityLogs = [];
let filterOnlyMe = false;

async function initRealtime() {
    document.getElementById('room-display').innerText = ROOM_NAME;
    
    // 1. Tenta buscar a sala
    let { data, error } = await _supabase.from('kanban_data').select('*').eq('room_name', ROOM_NAME).single();

    // 2. Se a sala não existe, cria com senha opcional
    if (error && error.code === 'PGRST116') {
        const pass = prompt(`A sala "${ROOM_NAME}" é nova. Deseja definir uma senha? (Deixe em branco para sala pública)`);
        const initialState = [{"id":"todo","title":"Para fazer","cards":[]},{"id":"doing","title":"Em curso","cards":[]},{"id":"done","title":"Concluído","cards":[]}];
        const { data: newData } = await _supabase.from('kanban_data').insert([{ 
            room_name: ROOM_NAME, 
            state: initialState, 
            logs: [],
            room_password: pass || null 
        }]).select().single();
        data = newData;
    }

    // 3. Se a sala tem senha, pede para validar
    if (data && data.room_password) {
        let accessGranted = false;
        let attempt = sessionStorage.getItem(`auth_${ROOM_NAME}`);
        
        if (attempt === data.room_password) {
            accessGranted = true;
        } else {
            const passInput = prompt("Esta sala é privada. Digite a senha:");
            if (passInput === data.room_password) {
                sessionStorage.setItem(`auth_${ROOM_NAME}`, passInput);
                accessGranted = true;
            } else {
                alert("Senha incorreta! Redirecionando para sala pública.");
                window.location.href = "?sala=geral";
                return;
            }
        }
        if (accessGranted) document.getElementById('lock-status').innerText = "🔒";
    }

    // 4. Carrega os dados se passou na segurança
    if (data) {
        boardState = data.state;
        activityLogs = data.logs || [];
        renderBoard(); renderLogs(); updateStats();
    }

    // 5. Realtime filtrado por sala
    _supabase.channel(`room-${ROOM_NAME}`).on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'kanban_data', filter: `room_name=eq.${ROOM_NAME}` 
    }, payload => {
        boardState = payload.new.state;
        activityLogs = payload.new.logs || [];
        renderBoard(); renderLogs(); updateStats();
    }).subscribe();
}

async function save(logMsg) {
    if (logMsg) activityLogs.unshift({ msg: logMsg, time: new Date().toLocaleTimeString() });
    if (activityLogs.length > 25) activityLogs.pop();
    await _supabase.from('kanban_data').update({ state: boardState, logs: activityLogs }).eq('room_name', ROOM_NAME);
}

// FUNÇÕES DE UI (Filtros, Drag, Render)
function renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board || boardState.length === 0) return;
    const search = document.getElementById('board-search').value.toLowerCase();
    board.innerHTML = boardState.map(col => {
        let filtered = col.cards.filter(c => c.content.toLowerCase().includes(search) || c.owner.toLowerCase().includes(search));
        if (filterOnlyMe) filtered = filtered.filter(c => c.owner === currentUser.login);
        return `
        <div class="column">
            <div class="column-header">${col.title}</div>
            <div class="card-list" ondragover="event.preventDefault()" ondrop="drop(event, '${col.id}')">
                ${filtered.map(card => `
                    <div class="card ${card.owner === currentUser.login ? 'is-mine' : ''}" id="${card.id}" draggable="true" ondragstart="drag(event)" ondblclick="deleteCard('${card.id}')" style="border-top: 5px solid ${card.priorityClass === 'prio-alta' ? '#d13438' : (card.priorityClass === 'prio-media' ? '#ffa500' : '#107c10')}">
                        <div class="card-info-row"><span>${card.createdAt}</span></div>
                        <div class="card-content">${card.content}</div>
                        <div class="card-footer">
                            <span>⏰ ${card.deadline}</span>
                            <div class="owner-info" onclick="assignTask('${card.id}')"><img src="${card.ownerAvatar}"> <span>@${card.owner}</span></div>
                        </div>
                    </div>`).join('')}
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ Novo Post-it</button>
        </div>`;
    }).join('');
}

// RESTANTE DO SCRIPT MANTIDO...
async function addCard(colId) {
    const content = prompt("Conteúdo:"); if (!content) return;
    const p = prompt("Prioridade: 1-Alta, 2-Média, 3-Baixa");
    const date = prompt("Prazo:", new Date().toISOString().split('T')[0]);
    boardState.find(c => c.id === colId).cards.push({
        id: crypto.randomUUID(), content: content, priorityClass: p === "1" ? "prio-alta" : (p === "2" ? "prio-media" : "prio-baixa"),
        deadline: date, createdAt: new Date().toLocaleDateString(), owner: currentUser.login, ownerAvatar: currentUser.avatar, checklist: []
    });
    playSound('audio-paper'); renderBoard(); await save(`@${currentUser.login} colou um post-it`);
}
function changeRoom() { const newRoom = prompt("Nome da nova sala:"); if(newRoom) window.location.href = `?sala=${newRoom}`; }
async function assignTask(cardId) {
    const target = prompt("Delegar para (@nick ou 'eu'):"); if(!target) return;
    const finalTarget = target === 'eu' ? currentUser.login : target;
    boardState.forEach(col => { const c = col.cards.find(x => x.id === cardId); if(c) { c.owner = finalTarget; c.ownerAvatar = `https://github.com/${finalTarget}.png`; } });
    playSound('audio-click'); renderBoard(); await save(`Atribuído para @${finalTarget}`);
}
async function deleteCard(id) { if(confirm("Remover?")) { boardState.forEach(col => col.cards = col.cards.filter(c => c.id !== id)); renderBoard(); await save(`Removido`); } }
function drag(e) { e.dataTransfer.setData("text", e.target.id); }
async function drop(e, colId) {
    const id = e.dataTransfer.getData("text"); let card;
    boardState.forEach(c => { const i = c.cards.findIndex(x => x.id === id); if(i > -1) card = c.cards.splice(i, 1)[0]; });
    if(card) { boardState.find(c => c.id === colId).cards.push(card); playSound('audio-paper'); renderBoard(); await save(`Movido`); }
}
function toggleMyTasks() { filterOnlyMe = !filterOnlyMe; document.querySelector('.btn-filter-me').classList.toggle('active'); renderBoard(); }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }
function changeUser() { const u = prompt("User:"); if(u) { localStorage.setItem('kanban_user', u); location.reload(); } }
function shareBoard() { navigator.clipboard.writeText(window.location.href); alert("Link da sala copiado!"); }
function clearLogs() { if(confirm("Limpar?")) { activityLogs = []; renderLogs(); save(); } }
function renderLogs() { document.getElementById('log-content').innerHTML = activityLogs.map(l => `<div class="log-entry"><strong>[${l.time}]</strong> ${l.msg}</div>`).join(''); }
function updateStats() {
    const total = boardState.reduce((acc, col) => acc + col.cards.length, 0);
    const done = boardState.find(c => c.id === 'done')?.cards.length || 0;
    const perc = total > 0 ? Math.round((done/total)*100) : 0;
    document.getElementById('stats-content').innerHTML = `${perc}% concluído`;
}
async function fetchUserProfile(username) {
    try {
        const res = await fetch(`https://api.github.com/users/${username}`);
        const data = await res.json();
        if(data.login) currentUser = { login: data.login, avatar: data.avatar_url, name: data.name || data.login };
    } catch(e) {}
    document.getElementById('user-profile').innerHTML = `<img src="${currentUser.avatar}"> <span>${currentUser.name}</span>`;
}

document.addEventListener('DOMContentLoaded', () => { fetchUserProfile(GITHUB_USER); initRealtime(); });
