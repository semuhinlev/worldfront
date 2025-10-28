const socket = io();
let myTeam = null;
let selectedRegion = null;
let gameState = null;

socket.on('init', (data) => {
  myTeam = data.team;
  gameState = data.gameState;
  draw();
});

socket.on('update', (data) => {
  gameState = data;
  draw();
});

socket.on('chat', (msg) => {
  const chat = document.getElementById('chat');
  chat.innerHTML += `<div>${msg}</div>`;
  chat.scrollTop = chat.scrollHeight;
});

function draw() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in gameState.regions) {
    const r = gameState.regions[id];
    let color = '#333';
    if (r.owner === 'red') color = '#ff4444';
    else if (r.owner === 'blue') color = '#4444ff';
    else if (r.owner === 'green') color = '#44ff44';
    else if (r.owner === 'yellow') color = '#ffff44';

    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, 50, 35);
    ctx.strokeStyle = selectedRegion === id ? '#fff' : '#888';
    ctx.lineWidth = selectedRegion === id ? 2 : 1;
    ctx.strokeRect(r.x, r.y, 50, 35);

    ctx.fillStyle = '#fff';
    ctx.font = '9px Arial';
    ctx.fillText(r.name, r.x + 2, r.y + 12);
    ctx.fillText(`⚔️${r.troops}`, r.x + 2, r.y + 25);
  }

  const res = gameState.resources[myTeam] || { food: 0, metal: 0, energy: 0 };
  document.getElementById('resources').innerText =
    `Еда: ${Math.floor(res.food)} | Металл: ${Math.floor(res.metal)} | Энергия: ${Math.floor(res.energy)} | Команда: ${myTeam}`;
}

const canvas = document.getElementById('game');
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let clicked = null;
  for (const id in gameState.regions) {
    const r = gameState.regions[id];
    if (x >= r.x && x <= r.x + 50 && y >= r.y && y <= r.y + 35) {
      clicked = id;
      break;
    }
  }

  if (!clicked) return;

  if (selectedRegion && selectedRegion !== clicked) {
    const count = Math.min(5, gameState.regions[selectedRegion].troops);
    if (count > 0) {
      socket.emit('action', { type: 'move', from: selectedRegion, to: clicked, count });
    }
    selectedRegion = null;
  } else {
    if (gameState.regions[clicked].owner === myTeam) {
      selectedRegion = clicked;
    }
  }
  draw();
});

function research(tech) {
  socket.emit('action', { type: 'research', tech });
}

function sendChat() {
  const inp = document.getElementById('chat-input');
  if (inp.value.trim()) {
    socket.emit('chat', inp.value);
    inp.value = '';
  }
}