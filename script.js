const SUPABASE_URL = 'https://tuansquxjvbalzxnfglz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YW5zcXV4anZiYWx6eG5mZ2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTIzNTYsImV4cCI6MjA4ODk2ODM1Nn0.C8FaFGWv0VyOew47NfYXfAl-ksx9TFlI6mkPWcV9diM'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
let ROOM_NAME = urlParams.get('sala');
let GITHUB_USER = localStorage.getItem('kanban_user') || 'edul0';
let currentUser = { login: GITHUB_USER, avatar: `https://github.com/${GITHUB_USER}.png`, name: GITHUB_USER };
let boardState = [];
let activityLogs = [];
let filterOnlyMe = false;

async function startApp() {
    if (!ROOM_NAME) {
        renderLandingPage();
    } else {
        await fetchUserProfile(GITHUB_USER);
        initRoom();
    }
}

function renderLandingPage() {
    const app = document.getElementById('app-content');
    if(app) {
        app.innerHTML = `
            <div class="landing-container">
                <h1 style="font-size: 3rem; margin-bottom: 0;">KanbanSpace /</h1>
                <input type="text" id="room-input" placeholder="nome-da-sala" autofocus>
                <p style="color: #888; margin-top: 20px;">Crie ou acesse um mural instantâneo.</p>
            </div>
        `;
        const input = document.getElementById('room-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value) window.location.href = `?sala=${input.value.trim()}`;
        });
    }
}

async function initRoom() {
    const display = document.getElementById('room-display');
    if(display) display.innerText = ROOM_NAME;

    // Busca a sala - usando .select().eq() para evitar erro de single vazio
    let { data, error } = await _supabase.from('kanban_data').select('*').eq('room_name', ROOM_NAME);

    // Se a sala não existe (array vazio), cria
    if (!data || data.length === 0) {
        const pass = prompt(`Mural "${ROOM_NAME}" é novo. Senha? (Vazio = Público)`);
        const initialState = [{"id":"todo","title":"Para fazer","cards":[]},{"id":"doing","title":"Em curso","cards":[]},{"id":"done","title":"Concluído","cards":[]}];
        
        const { data: newData, error: insertError } = await _supabase
            .from('kanban_data')
            .insert([{ room_name: ROOM_NAME, state: initialState, logs: [], room_password: pass || null }])
            .select();
        
        if (insertError) {
            console.error("Erro Supabase:", insertError);
            alert("Erro ao criar sala. Verifique o console.");
            return;
        }
        data = newData;
    }

    const roomData = data[0];

    // Validação de Senha
    if (roomData && roomData.room_password) {
        if (sessionStorage.getItem(`auth_${ROOM_NAME}`) !== roomData.room_password) {
            const p = prompt("Senha da sala:");
            if (p === roomData.room_password) {
                sessionStorage.setItem(`auth_${ROOM_NAME}`, p);
            } else {
                alert("Errada!"); window.location.href = "index.html"; return;
            }
        }
        const lock = document.getElementById('lock-status');
        if(lock) lock.innerText = "🔒";
    }

    if (roomData) {
        boardState = roomData.state;
        activityLogs = roomData.logs || [];
        renderBoard(); renderLogs(); updateStats();

        _supabase.channel(`room-${ROOM_NAME}`).on('postgres_changes', { 
            event: 'UPDATE', schema: 'public', table: 'kanban_data', filter: `room_name=eq.${ROOM_NAME}` 
        }, payload => {
            if(payload.new) {
                boardState = payload.new.state;
                activityLogs = payload.new.logs || [];
                renderBoard(); renderLogs(); updateStats();
            }
        }).subscribe();
    }
}

// Funções de Render e Ações (Add, Drag, Save...) permanecem as mesmas
async function save(logMsg) {
    if (logMsg) activityLogs.unshift({ msg: logMsg, time: new Date().toLocaleTimeString() });
    if (activityLogs.length > 20) activityLogs.pop();
    await _supabase.from('kanban_data').update({ state: boardState, logs: activityLogs }).eq('room_name', ROOM_NAME);
}

function renderBoard() {
    const board = document.getElementById('kanban-board');
    if (!board || !boardState) return;
    const search = document.getElementById('board-search').value.toLowerCase();
    board.innerHTML = boardState.map(col => {
        let cards = col.cards.filter(c => c.content.toLowerCase().includes(search) || c.owner.toLowerCase().includes(search));
        if (filterOnlyMe) cards = cards.filter(c => c.owner === currentUser.login);
        return `
        <div class="column">
            <div class="column-header">${col.title}</div>
            <div class="card-list" ondragover="event.preventDefault()" ondrop="drop(event, '${col.id}')">
                ${cards.map(card => `
                    <div class="card ${card.owner === currentUser.login ? 'is-mine' : ''}" id="${card.id}" draggable="true" ondragstart="drag(event)" ondblclick="deleteCard('${card.id}')" style="border-top: 5px solid ${card.priorityClass === 'prio-alta' ? '#d13438' : (card.priorityClass === 'prio-media' ? '#ffa500' : '#107c10')}">
                        <div class="card-info-row">${card.createdAt || ''}</div>
                        <div class="card-content">${card.content}</div>
                        <div class="card-footer">
                            <span>📅 ${card.deadline || ''}</span>
                            <div class="owner-info" onclick="assignTask('${card.id}')" style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                                <img src="${card.ownerAvatar || ''}" style="width:16px; height:16px; border-radius:50%;"> @${card.owner}
                            </div>
                        </div>
                    </div>`).join('')}
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ Novo Post-it</button>
        </div>`;
    }).join('');
}

async function addCard(colId) {
    const txt = prompt("Texto:"); if (!txt) return;
    const p = prompt("Prazo (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
    boardState.find(c => c.id === colId).cards.push({
        id: crypto.randomUUID(), content: txt, deadline: p, createdAt: new Date().toLocaleDateString(),
        owner: currentUser.login, ownerAvatar: currentUser.avatar
    });
    renderBoard(); await save(`@${currentUser.login} criou card`);
}

async function fetchUserProfile(u) {
    try {
        const r = await fetch(`https://api.github.com/users/${u}`);
        const d = await r.json();
        currentUser = { login: d.login, avatar: d.avatar_url, name: d.name || d.login };
    } catch(e) {}
    const prof = document.getElementById('user-profile');
    if(prof) prof.innerHTML = `<img src="${currentUser.avatar}"> <span>${currentUser.name}</span>`;
}

function drag(e) { e.dataTransfer.setData("text", e.target.id); }
async function drop(e, colId) {
    const id = e.dataTransfer.getData("text"); let card;
    boardState.forEach(c => { const i = c.cards.findIndex(x => x.id === id); if(i > -1) card = c.cards.splice(i, 1)[0]; });
    if(card) { boardState.find(c => c.id === colId).cards.push(card); renderBoard(); await save(`Movido`); }
}
function renderLogs() { const lc = document.getElementById('log-content'); if(lc) lc.innerHTML = activityLogs.map(l => `<div class="log-entry"><strong>[${l.time}]</strong> ${l.msg}</div>`).join(''); }
function updateStats() {
    const tot = boardState.reduce((a, c) => a + c.cards.length, 0);
    const ok = boardState.find(c => c.id === 'done')?.cards.length || 0;
    const st = document.getElementById('stats-content');
    if(st) st.innerText = `${tot > 0 ? Math.round((ok/tot)*100) : 0}% concluído`;
}
async function assignTask(cardId) {
    const target = prompt("Delegar para:"); if(!target) return;
    const nick = target === 'eu' ? currentUser.login : target;
    boardState.forEach(col => { const c = col.cards.find(x => x.id === cardId); if(c) { c.owner = nick; c.ownerAvatar = `https://github.com/${nick}.png`; } });
    renderBoard(); await save(`Delegado para @${nick}`);
}
async function deleteCard(id) { if(confirm("Deletar?")) { boardState.forEach(c => c.cards = c.cards.filter(x => x.id !== id)); renderBoard(); await save(`Removido`); } }
function changeRoom() { window.location.href = "index.html"; }
function toggleMyTasks() { filterOnlyMe = !filterOnlyMe; document.querySelector('.btn-filter-me').classList.toggle('active'); renderBoard(); }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }
function changeUser() { const u = prompt("User:"); if(u) { localStorage.setItem('kanban_user', u); location.reload(); } }
function shareBoard() { navigator.clipboard.writeText(window.location.href); alert("Copiado!"); }
function clearLogs() { if(confirm("Limpar?")) { activityLogs = []; renderLogs(); save(); } }

document.addEventListener('DOMContentLoaded', startApp);
