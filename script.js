const SUPABASE_URL = 'https://tuansquxjvbalzxnfglz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YW5zcXV4anZiYWx6eG5mZ2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTIzNTYsImV4cCI6MjA4ODk2ODM1Nn0.C8FaFGWv0VyOew47NfYXfAl-ksx9TFlI6mkPWcV9diM'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const urlParams = new URLSearchParams(window.location.search);
let ROOM = urlParams.get('sala');
let user = { 
    name: localStorage.getItem('kanban_custom_name') || 'Eduardo', 
    avatar: localStorage.getItem('kanban_custom_avatar') || 'https://github.com/edul0.png' 
};

let state = [];
let logs = [];
let currentTab = 'todo';

async function start() {
    if (!ROOM) return renderLanding();
    renderSkeleton();
    initData();
}

function renderLanding() {
    document.getElementById('app-container').innerHTML = `
        <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:monospace;">
            <img src="marca.png" width="80">
            <h1 style="font-size:3rem; margin:10px 0;">KSpace</h1>
            <input type="text" id="in-sala" placeholder="nome-da-sala" style="font-size:1.5rem; text-align:center; border:none; border-bottom:3px solid #000; outline:none; width:250px;">
        </div>`;
    document.getElementById('in-sala').onkeypress = (e) => { if(e.key==='Enter') window.location.href=`?sala=${e.target.value}`; };
}

function renderSkeleton() {
    document.getElementById('app-container').innerHTML = `
        <header>
            <div class="header-left">
                <img src="marca.png" class="logo" onclick="window.location.href='index.html'">
                <img src="${user.avatar}" style="width:30px; border-radius:50%; border:1px solid #000;">
                <b style="font-size:12px;">${ROOM}</b>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="toggleLogs()" style="background:none; border:none; font-size:20px; cursor:pointer;">📜</button>
                <button onclick="share()" style="background:#000; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🔗</button>
            </div>
        </header>
        <main id="board" class="mural"></main>
        <div class="tabs-nav" id="mobile-nav">
            <div class="tab-btn active" onclick="setTab('todo')">TO-DO</div>
            <div class="tab-btn" onclick="setTab('doing')">DOING</div>
            <div class="tab-btn" onclick="setTab('done')">DONE</div>
        </div>
        <div id="sidebar">
            <div style="padding:10px; background:#333; display:flex; justify-content:space-between; align-items:center;">
                <b>HISTÓRICO</b> <button onclick="toggleLogs()" style="color:#0f0; background:none; border:none; cursor:pointer;">✖</button>
            </div>
            <div id="logs"></div>
        </div>`;
    if(localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
}

async function initData() {
    let { data } = await _supabase.from('kanban_data').select('*').eq('room_name', ROOM).maybeSingle();
    if (!data) {
        const pass = prompt("Senha da sala (opcional):");
        const init = [{id:"todo", title:"Para fazer", cards:[]},{id:"doing", title:"Em curso", cards:[]},{id:"done", title:"Concluído", cards:[]}];
        const { data: nD } = await _supabase.from('kanban_data').insert([{ room_name: ROOM, state: init, logs: [], room_password: pass || null }]).select().single();
        data = nD;
    }
    state = data.state; logs = data.logs || [];
    renderBoard(); renderLogs();
    _supabase.channel(ROOM).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kanban_data', filter: `room_name=eq.${ROOM}` }, 
    p => { state = p.new.state; logs = p.new.logs; renderBoard(); renderLogs(); }).subscribe();
}

function renderBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    const isMobile = window.innerWidth <= 768;
    
    board.innerHTML = state.map(col => `
        <div class="coluna ${isMobile && col.id === currentTab ? 'active' : ''}" style="--color: var(--${col.id})">
            <div class="coluna-header">${col.title} (${col.cards.length})</div>
            <div class="lista-cards">
                ${col.cards.map(c => `
                    <div class="card" id="${c.id}" ondblclick="delCard('${c.id}')">
                        <div class="card-txt">${c.content}</div>
                        ${c.img ? `<img src="${c.img}">` : ''}
                        <div style="font-size:9px; color:#666; margin-top:10px; cursor:pointer; text-align:right;" onclick="addImg('${c.id}')">🖼️ IMAGEM</div>
                    </div>`).join('')}
            </div>
            <button class="add-btn" onclick="addCard('${col.id}')">+ NOVO POST-IT</button>
        </div>`).join('');
}

function setTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.innerText.toLowerCase().includes(tabId));
    });
    renderBoard();
}

async function save(msg) {
    if(msg) logs.unshift({ msg, time: new Date().toLocaleTimeString() });
    await _supabase.from('kanban_data').update({ state, logs: logs.slice(0,15) }).eq('room_name', ROOM);
}

async function addCard(cid) {
    const t = prompt("Tarefa:"); if(!t) return;
    state.find(x => x.id === cid).cards.push({ id: crypto.randomUUID(), content: t });
    renderBoard(); await save(`@${user.name} adicionou: ${t}`);
}

async function addImg(id) {
    const u = prompt("URL da imagem:"); if(!u) return;
    state.forEach(col => { const c = col.cards.find(x => x.id === id); if(c) c.img = u; });
    renderBoard(); await save(`Imagem adicionada`);
}

async function delCard(id) {
    if(confirm("Apagar?")) {
        state.forEach(col => col.cards = col.cards.filter(x => x.id !== id));
        renderBoard(); await save(`Card removido`);
    }
}

function toggleLogs() { document.getElementById('sidebar').classList.toggle('active'); }
function renderLogs() { document.getElementById('logs').innerHTML = logs.map(l => `<div style="margin-bottom:8px;">[${l.time}] ${l.msg}</div>`).join(''); }
function share() { navigator.clipboard.writeText(window.location.href); alert("Copiado!"); }

start();
