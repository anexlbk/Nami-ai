const LANGFLOW_URL = 'https://brayn0009-nami.hf.space';
const FLOW_ID = '535dd9a4-43bd-4f9b-84b9-242c2f2b73fb';

let isLoading = false;
let chats = JSON.parse(localStorage.getItem('nami_chats') || '[]');
let activeChatId = null;

// ── INIT ──
window.onload = () => {
  renderHistory();
  if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    newChat();
  }
};

// ── CHAT MANAGEMENT ──
function newChat() {
  const id = 'chat_' + Date.now();
  const chat = { id, title: 'New Chat', messages: [], createdAt: Date.now() };
  chats.unshift(chat);
  saveChats();
  activeChatId = id;
  renderHistory();
  renderMessages();
  updateTopbarTitle('New Chat');
  closeSidebar();
}

function loadChat(id) {
  activeChatId = id;
  renderHistory();
  renderMessages();
  const chat = getActiveChat();
  updateTopbarTitle(chat?.title || 'New Chat');
  closeSidebar();
}

function deleteChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (activeChatId === id) {
    activeChatId = chats.length > 0 ? chats[0].id : null;
    if (!activeChatId) newChat();
    else loadChat(activeChatId);
  }
  renderHistory();
}

function getActiveChat() {
  return chats.find(c => c.id === activeChatId);
}

function saveChats() {
  localStorage.setItem('nami_chats', JSON.stringify(chats));
}

function updateTopbarTitle(title) {
  const el = document.getElementById('topbar-title');
  if (el) el.innerHTML = `<span>Nami AI</span> · ${escapeHtml(title)}`;
}

// ── RENDER HISTORY ──
function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (chats.length === 0) {
    list.innerHTML = `<div style="padding:16px;text-align:center;font-size:11px;color:var(--text-muted)">No chats yet</div>`;
    return;
  }

  list.innerHTML = chats.map(chat => `
    <div class="history-item ${chat.id === activeChatId ? 'active' : ''}" onclick="loadChat('${chat.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="history-item-text">${escapeHtml(chat.title)}</span>
      <button class="history-item-del" onclick="deleteChat('${chat.id}', event)" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
      </button>
    </div>
  `).join('');
}

// ── RENDER MESSAGES ──
function renderMessages() {
  const chatWindow = document.getElementById('chat-window');
  chatWindow.innerHTML = '';

  const chat = getActiveChat();
  if (!chat || chat.messages.length === 0) {
    chatWindow.innerHTML = `
      <div class="welcome" id="welcome-screen">
        <div class="welcome-icon">🇩🇿</div>
        <h1>Welcome to <span>Nami AI</span></h1>
        <p>Your specialized marketing assistant for the Algerian market. I know Algerian commerce law, marketing regulations, and startup ecosystems.</p>
        <div class="chips">
          <div class="chip" onclick="sendChip(this)">Rules for advertising in Algeria?</div>
          <div class="chip" onclick="sendChip(this)">How to register a startup?</div>
          <div class="chip" onclick="sendChip(this)">Digital marketing for Algerian audience</div>
          <div class="chip" onclick="sendChip(this)">Algerian e-commerce regulations</div>
          <div class="chip" onclick="sendChip(this)">How to price for Algerian market?</div>
        </div>
      </div>`;
    return;
  }

  chat.messages.forEach(msg => {
    appendMessageEl(msg.role, msg.text);
  });

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ── APPEND MESSAGE ELEMENT ──
function appendMessageEl(role, text) {
  const chatWindow = document.getElementById('chat-window');
  const welcome = document.getElementById('welcome-screen');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = `avatar ${role === 'bot' ? 'bot-avatar' : 'user-avatar'}`;
  avatar.textContent = role === 'bot' ? 'N' : 'You';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = formatText(text);

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

// ── TYPING INDICATOR ──
function showTyping() {
  const chatWindow = document.getElementById('chat-window');
  const welcome = document.getElementById('welcome-screen');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = 'typing-msg';

  const avatar = document.createElement('div');
  avatar.className = 'avatar bot-avatar';
  avatar.textContent = 'N';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `<div class="typing-indicator">
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  </div>`;

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing-msg');
  if (t) t.remove();
}

// ── SEND MESSAGE ──
async function sendMessage() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text || isLoading) return;

  input.value = '';
  input.style.height = 'auto';
  isLoading = true;
  document.getElementById('send-btn').disabled = true;

  const chat = getActiveChat();
  if (!chat) return;

  chat.messages.push({ role: 'user', text });
  if (chat.title === 'New Chat' && chat.messages.length === 1) {
    chat.title = text.length > 36 ? text.slice(0, 36) + '…' : text;
    updateTopbarTitle(chat.title);
  }
  saveChats();

  appendMessageEl('user', text);
  renderHistory();
  showTyping();

  try {
    const response = await fetch(`${LANGFLOW_URL}/api/v1/run/${FLOW_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_value: text,
        output_type: 'chat',
        input_type: 'chat',
        session_id: activeChatId
      })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    let reply = '';
    try {
      const outputs = data?.outputs?.[0]?.outputs?.[0];
      reply =
        outputs?.results?.message?.text ||
        outputs?.artifacts?.message ||
        outputs?.outputs?.message?.message?.text ||
        data?.result ||
        'I received your message but could not parse the response.';
    } catch {
      reply = 'Received a response but could not read it.';
    }

    removeTyping();
    chat.messages.push({ role: 'bot', text: reply });
    saveChats();
    appendMessageEl('bot', reply);

  } catch (err) {
    removeTyping();
    const errMsg = `⚠️ Could not reach Nami AI. Please try again.\n\nError: ${err.message}`;
    chat.messages.push({ role: 'bot', text: errMsg });
    saveChats();
    appendMessageEl('bot', errMsg);
  }

  isLoading = false;
  document.getElementById('send-btn').disabled = false;
  input.focus();
}

function sendChip(el) {
  document.getElementById('user-input').value = el.textContent;
  sendMessage();
}

// ── UTILS ──
function formatText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── SIDEBAR MOBILE ──
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}
