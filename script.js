const PROXY_URL = 'https://nami-proxy.anaslachmi.workers.dev';

// ── DOM REFS ──
const sidebar         = document.getElementById('sidebar');
const menuToggle      = document.getElementById('menuToggle');
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const messageList     = document.getElementById('messageList');
const chatWindow      = document.getElementById('chatWindow');
const welcomeScreen   = document.getElementById('welcomeScreen');
const historyList     = document.getElementById('chatHistory');
const currentTitle    = document.getElementById('currentTitle');

let chats        = JSON.parse(localStorage.getItem('nami_chats') || '[]');
let activeChatId = null;
let isLoading    = false;

// ── INIT ──
window.onload = () => {
  renderHistory();
  if (chats.length > 0) loadChat(chats[0].id);
};

// ── SIDEBAR ──
menuToggle.onclick = () => sidebar.classList.toggle('open');

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== menuToggle) {
    sidebar.classList.remove('open');
  }
});

// ── INPUT ──
userInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
});

sendBtn.onclick = handleSendMessage;
document.getElementById('newChatBtn').onclick = newChat;

// ── NEW CHAT ──
function newChat() {
  activeChatId = null;
  messageList.innerHTML = '';
  welcomeScreen.style.display = 'block';
  currentTitle.innerText = 'New Chat';
  sidebar.classList.remove('open');
  renderHistory();
}

// ── LOAD CHAT ──
function loadChat(id) {
  activeChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;

  messageList.innerHTML = '';
  welcomeScreen.style.display = 'none';
  currentTitle.innerText = chat.title;

  chat.messages.forEach(msg => appendMessageEl(msg.role, msg.text));
  chatWindow.scrollTop = chatWindow.scrollHeight;
  sidebar.classList.remove('open');
  renderHistory();
}

// ── DELETE CHAT ──
function deleteChat(e, id) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (activeChatId === id) newChat();
  renderHistory();
}

// ── RENDER HISTORY ──
function renderHistory() {
  if (chats.length === 0) {
    historyList.innerHTML = `<div style="padding:12px;font-size:11px;color:var(--text-dim);text-align:center">No chats yet</div>`;
    return;
  }
  historyList.innerHTML = chats.map(chat => `
    <div class="history-item ${chat.id === activeChatId ? 'active' : ''}" onclick="loadChat(${chat.id})">
      <div class="title-text">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${escapeHtml(chat.title)}
      </div>
      <button class="delete-btn" onclick="deleteChat(event, ${chat.id})" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  `).join('');
}

// ── SAVE ──
function saveChats() {
  localStorage.setItem('nami_chats', JSON.stringify(chats));
}

// ── SEND MESSAGE ──
async function handleSendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  // Create chat if none active
  if (!activeChatId) {
    activeChatId = Date.now();
    const title = text.length > 36 ? text.slice(0, 36) + '…' : text;
    chats.unshift({ id: activeChatId, title, messages: [] });
    currentTitle.innerText = title;
  }

  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';
  welcomeScreen.style.display = 'none';
  isLoading = true;
  sendBtn.disabled = true;

  // Save & show user message
  chat.messages.push({ role: 'user', text });
  saveChats();
  appendMessageEl('user', text);
  renderHistory();
  showTyping();

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_value: text,
        output_type: 'chat',
        input_type: 'chat',
        session_id: String(activeChatId)
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
  sendBtn.disabled = false;
  userInput.focus();
}

// ── APPEND MESSAGE ──
function appendMessageEl(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `
    <div class="avatar">${role === 'bot' ? 'N' : 'You'}</div>
    <div class="bubble">${formatText(text)}</div>
  `;
  messageList.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ── TYPING INDICATOR ──
function showTyping() {
  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="avatar">N</div>
    <div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>
  `;
  messageList.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ── CHIP CLICK ──
function handleChipClick(chip) {
  userInput.value = chip.querySelector('div').innerText;
  handleSendMessage();
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
