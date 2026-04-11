const PROXY_URL = 'https://20.199.160.8.nip.io/webhook/3d02a973-f0fe-4042-b089-9f3f72de6026/chat'

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

// ── FILE UPLOAD ──
let attachedFile = null;

document.getElementById('attachBtn').onclick = () => document.getElementById('fileInput').click();

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('File too large. Max size is 5MB.');
    e.target.value = '';
    return;
  }
  attachedFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileBadge').style.display = 'flex';
});

function clearFile() {
  attachedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('fileBadge').style.display = 'none';
  document.getElementById('fileName').textContent = '';
}

// ── INIT ──
window.onload = () => {
  renderHistory();
  if (chats.length > 0) loadChat(chats[0].id);
};

// ── SIDEBAR ──
menuToggle.onclick = () => sidebar.classList.toggle('open');

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

// ── DETECT IMAGE REQUEST ──
function isImageRequest(text) {
  const lower = text.toLowerCase();
  const triggers = ['generate', 'create', 'draw', 'design', 'make', 'sawwer', 'generate image', 'صور', 'رسم', 'صمم', 'génère', 'crée', 'dessine', 'image', 'picture', 'photo', 'logo', 'illustration', 'visual'];
  return triggers.some(t => lower.includes(t));
}

// ── SEND MESSAGE ──
async function handleSendMessage() {
  const text = userInput.value.trim();
  if ((!text && !attachedFile) || isLoading) return;

  if (!activeChatId) {
    activeChatId = Date.now();
    const title = text.length > 36 ? text.slice(0, 36) + '…' : (attachedFile ? attachedFile.name : 'File');
    chats.unshift({ id: activeChatId, title, messages: [] });
    currentTitle.innerText = title;
  }

  const chat = chats.find(c => c.id === activeChatId);
  if (!chat) return;

  userInput.value = '';
  userInput.style.height = 'auto';
  welcomeScreen.style.display = 'none';
  isLoading = true;
  sendBtn.disabled = true;

  const displayText = text + (attachedFile ? `\n📎 ${attachedFile.name}` : '');
  chat.messages.push({ role: 'user', text: displayText });
  saveChats();
  appendMessageEl('user', displayText);
  renderHistory();

  const looksLikeImage = isImageRequest(text);
  showTyping(looksLikeImage ? '🎨 Generating image, this may take ~30s...' : null);

  const timeoutMs = looksLikeImage ? 90000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let body, fetchHeaders = {};

    if (attachedFile) {
      const formData = new FormData();
      formData.append('action', 'sendMessage');
      formData.append('chatInput', text);
      formData.append('sessionId', String(activeChatId));
      formData.append('files', attachedFile);
      clearFile();
      body = formData;
    } else {
      body = JSON.stringify({ action: 'sendMessage', chatInput: text, sessionId: String(activeChatId) });
      fetchHeaders = { 'Content-Type': 'application/json' };
    }

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: fetchHeaders,
      body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();

    // 🔍 DEBUG — open DevTools Console to see the raw response shape
    console.log('[Nami] raw response:', JSON.stringify(data, null, 2));

    const arr = Array.isArray(data) ? data[0] : data;

    const allValues = [
      arr?.output,
      arr?.text,
      arr?.message,
      arr?.response,
      arr?.chatOutput,
      arr?.url,
      arr?.secure_url,
      arr?.imageUrl,
      arr?.image_url,
      arr?.result,
      arr?.data?.url,
      arr?.data?.secure_url,
      // deep search: any string value that looks like a Cloudinary URL
      ...Object.values(arr || {}).filter(v => typeof v === 'string' && v.includes('cloudinary.com')),
    ].filter(Boolean);

    const reply = allValues[0] || `⚠️ Could not parse response. Check console for raw data.\n\`\`\`\n${JSON.stringify(data, null, 2).slice(0, 400)}\n\`\`\``;

    removeTyping();
    chat.messages.push({ role: 'bot', text: reply });
    saveChats();
    appendMessageEl('bot', reply);

  } catch (err) {
    clearTimeout(timeoutId);
    removeTyping();

    let errMsg;
    if (err.name === 'AbortError') {
      errMsg = looksLikeImage
        ? `⏱️ Image generation timed out. Please try again.`
        : `⏱️ Request timed out. Please try again.`;
    } else {
      errMsg = `⚠️ Could not reach Nami AI. Please try again.\n\nError: ${err.message}`;
    }

    chat.messages.push({ role: 'bot', text: errMsg });
    saveChats();
    appendMessageEl('bot', errMsg);
  }

  isLoading = false;
  sendBtn.disabled = false;
  userInput.focus();
}

// ── BLOB TO DATA URL ──
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
function showTyping(label) {
  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="avatar">N</div>
    <div class="bubble">
      ${label ? `<div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">${label}</div>` : ''}
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
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

// ── EXTRACT IMAGE URLS FROM TEXT ──
function extractImageUrls(text) {
  // Matches Cloudinary URLs (with or without file extension) and standard image URLs
  const pattern = /https?:\/\/(?:res\.cloudinary\.com\/[^\s"'<>]+|[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s"'<>]*)?)/gi;
  return [...text.matchAll(pattern)].map(m => ({ url: m[0], index: m.index }));
}

function renderImageTag(url) {
  return `<img
    src="${escapeHtml(url)}"
    alt="Generated image"
    style="width:100%;max-width:360px;height:auto;border-radius:14px;margin-top:10px;display:block;box-shadow:0 4px 24px rgba(0,0,0,0.4);"
    onload="document.getElementById('chatWindow').scrollTop = document.getElementById('chatWindow').scrollHeight"
    onerror="this.style.display='none'"
  />`;
}

// ── FORMAT TEXT ──
function formatText(text) {
  if (typeof text !== 'string') return '';

  // 1. Render base64 data URL images
  if (text.startsWith('data:image/')) {
    return renderImageTag(text);
  }

  // 2. Render raw base64 strings (JPEG / PNG)
  if (text.startsWith('/9j/') || text.startsWith('iVBOR')) {
    const mime = text.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
    return renderImageTag(`data:${mime};base64,${text}`);
  }

  // 3. Check for image URLs (Cloudinary or standard) anywhere in the text
  const imageMatches = extractImageUrls(text);

  if (imageMatches.length > 0) {
    // Replace each image URL in the text with an <img> tag
    let result = '';
    let lastIndex = 0;

    for (const { url, index } of imageMatches) {
      // Add any text before the URL (markdown-rendered)
      const before = text.slice(lastIndex, index);
      if (before) result += renderMarkdown(before);
      // Add the image tag
      result += renderImageTag(url);
      lastIndex = index + url.length;
    }

    // Add any remaining text after the last URL
    const after = text.slice(lastIndex);
    if (after) result += renderMarkdown(after);

    return result;
  }

  // 4. Default: markdown-lite rendering
  return renderMarkdown(text);
}

// ── MARKDOWN-LITE RENDERER ──
function renderMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
