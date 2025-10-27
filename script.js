// Socket.IO initialization
const socket = io();
let account, currentRoom, typingTimeout;
const messages = new Map();
const $ = id => document.getElementById(id);

// Particle animation
function initParticles() {
  const canvas = $('particles');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  for(let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2
    });
  }
  
  function animate() {
    ctx.fillStyle = 'rgba(0, 255, 65, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ff41';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      p.x += p.vx;
      p.y += p.vy;
      
      if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    
    requestAnimationFrame(animate);
  }
  animate();
}

window.addEventListener('load', () => {
  initParticles();
  typeEffect($('hackText'), 'INITIALIZE SYSTEM...', 50);
  
  if(localStorage.wallet) {
    account = localStorage.wallet;
    updateConnectBtn();
  }
});

function typeEffect(element, text, speed) {
  let i = 0;
  element.textContent = '';
  const timer = setInterval(() => {
    if(i < text.length) {
      element.textContent += text.charAt(i);
      i++;
    } else {
      clearInterval(timer);
    }
  }, speed);
}

// Connect Wallet
$("connectBtn").onclick = async () => {
  if(!window.ethereum) {
    showNotif("❌ MetaMask not detected!", "error");
    return;
  }
  
  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];
    localStorage.wallet = account;
    updateConnectBtn();
    showNotif("✅ Wallet connected!", "success");
    playSound('connect');
  } catch(e) {
    showNotif("❌ Connection failed", "error");
  }
};

function updateConnectBtn() {
  $("connectBtn").innerHTML = '<i class="bi bi-shield-check"></i> CONNECTED';
  $("connectBtn").classList.add('connected');
  $("joinBtn").disabled = false;
}

// Join Room
$("joinBtn").onclick = () => {
  const room = $("roomInput").value.trim() || "global";
  if(room.length < 3) {
    showNotif("⚠️ Room name min 3 chars", "warning");
    return;
  }
  
  currentRoom = room;
  localStorage.currentRoom = room;
  startChat(room);
  playSound('join');
};

function startChat(room) {
  $("roomName").innerHTML = `<span class="matrix-text"># ${room.toUpperCase()}</span>`;
  $("userAddr").textContent = `${account.slice(0, 8)}...${account.slice(-6)}`;
  
  $("loginBox").classList.add('fade-out');
  setTimeout(() => {
    $("loginBox").style.display = "none";
    $("chatBox").style.display = "flex";
    $("chatBox").classList.add('fade-in');
  }, 300);
  
  // Clear old messages
  $("messages").innerHTML = '';
  messages.clear();
  
  // Join room via Socket.IO
  socket.emit('join-room', {
    room: room,
    account: account,
    userName: account.slice(0, 8)
  });
  
  // Socket.IO Event Listeners
  socket.on('new-message', (message) => {
    if (messages.has(message.id)) return;
    
    messages.set(message.id, message);
    renderMessage(message);
    playSound('message');
  });
  
  socket.on('room-users', (users) => {
    updateUserList(users);
  });
  
  socket.on('user-joined', (user) => {
    showNotif(`👤 ${user.name} joined the room`, 'info');
  });
  
  socket.on('user-left', (user) => {
    showNotif(`👤 ${user.name} left the room`, 'info');
  });
  
  socket.on('user-typing', (data) => {
    showTyping(data.account, data.typing);
  });
  
  socket.on('message-deleted', (msgId) => {
    const el = $(`msg-${msgId}`);
    if(el) {
      el.classList.add('deleting');
      setTimeout(() => el.remove(), 300);
    }
    messages.delete(msgId);
  });
  
  // Typing indicator
  $("msgInput").addEventListener("input", () => {
    clearTimeout(typingTimeout);
    
    socket.emit('typing-start', { room: currentRoom });
    
    typingTimeout = setTimeout(() => {
      socket.emit('typing-stop', { room: currentRoom });
    }, 1000);
  });
}

function renderMessage(msg) {
  if ($(`msg-${msg.id}`)) return;

  const self = msg.from === account;
  const div = document.createElement("div");
  div.id = `msg-${msg.id}`;
  div.className = `message ${self ? 'message-self' : 'message-other'} glitch-effect`;

  const avatar = `<div class="avatar" style="background:${hashColor(msg.from)}">
    ${msg.from.slice(2, 4).toUpperCase()}
  </div>`;

  const time = new Date(msg.time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let content = '';
  if (msg.replyTo) {
    const original = messages.get(msg.replyTo);
    content += `<div class="reply-preview">
      <i class="bi bi-reply"></i>
      ${original ? escape(original.text.slice(0, 40)) : 'Message deleted'}
    </div>`;
  }

  if (msg.file) {
    content += renderFile(msg.file);
  } else {
    content += `<div class="msg-text">${linkify(escape(msg.text))}</div>`;
  }

  const reactions = msg.reactions ? renderReactions(msg.reactions, msg.id) : '';

  div.innerHTML = `
    ${!self ? avatar : ''}
    <div class="msg-content">
      <div class="msg-header">
        <span class="msg-from">${msg.from.slice(0, 10)}</span>
        <span class="msg-time">${time}</span>
      </div>
      ${content}
      ${reactions}
      <div class="msg-actions">
        <button onclick="replyMsg('${msg.id}')" class="action-btn">
          <i class="bi bi-reply"></i>
        </button>
        <button onclick="showReactPicker('${msg.id}')" class="action-btn">
          <i class="bi bi-emoji-smile"></i>
        </button>
        ${self ? `<button onclick="deleteMsg('${msg.id}')" class="action-btn delete">
          <i class="bi bi-trash"></i>
        </button>` : ''}
      </div>
    </div>
    ${self ? avatar : ''}
  `;

  $("messages").appendChild(div);
  scrollToBottom();
}

function renderFile(file) {
  if(file.type.startsWith('image/')) {
    return `<img src="${file.data}" class="msg-image" onclick="openImageModal('${file.data}')" alt="${file.name}">`;
  }
  return `<a href="${file.data}" download="${file.name}" class="file-link">
    <i class="bi bi-file-earmark-arrow-down"></i>
    <span>${file.name}</span>
    <small>${formatBytes(file.size)}</small>
  </a>`;
}

function renderReactions(reactions, msgId) {
  if(!reactions || Object.keys(reactions).length === 0) return '';
  
  const counts = {};
  Object.values(reactions).forEach(emoji => {
    counts[emoji] = (counts[emoji] || 0) + 1;
  });
  
  return `<div class="reactions">
    ${Object.entries(counts).map(([emoji, count]) => `
      <span class="reaction" onclick="reactMsg('${msgId}', '${emoji}')">
        ${emoji} ${count}
      </span>
    `).join('')}
  </div>`;
}

function updateMessageReactions(msgId, reactions) {
  const msgEl = $(`msg-${msgId}`);
  if(!msgEl) return;
  
  const reactionsEl = msgEl.querySelector('.reactions');
  const newReactions = renderReactions(reactions, msgId);
  
  if(reactionsEl) {
    reactionsEl.outerHTML = newReactions;
  } else if(newReactions) {
    const content = msgEl.querySelector('.msg-content');
    const actions = content.querySelector('.msg-actions');
    actions.insertAdjacentHTML('beforebegin', newReactions);
  }
}

// Send Message
function sendMsg() {
  const text = $("msgInput").value.trim();
  if (!text) return;

  const msg = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from: account,
    text: text,
    time: Date.now(),
    replyTo: $("replyTo").value || null,
    reactions: {}
  };

  socket.emit('send-message', {
    room: currentRoom,
    message: msg
  });

  // Optimistically add message to UI
  messages.set(msg.id, msg);
  renderMessage(msg);

  $("msgInput").value = "";
  $("replyTo").value = "";
  $("replyIndicator").style.display = "none";

  // Stop typing
  socket.emit('typing-stop', { room: currentRoom });
  playSound('send');
}

// File Upload
$("fileBtn").onclick = () => $("fileInput").click();

$("fileInput").onchange = async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  
  if(file.size > 5 * 1024 * 1024) {
    showNotif("⚠️ File max 5MB", "warning");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = () => {
    const msg = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: account,
      text: file.name,
      time: Date.now(),
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result
      },
      reactions: {}
    };
    
    socket.emit('send-message', {
      room: currentRoom,
      message: msg
    });
    
    // Optimistically add message to UI
    messages.set(msg.id, msg);
    renderMessage(msg);
    
    showNotif("📎 File sent!", "success");
    playSound('send');
  };
  
  reader.readAsDataURL(file);
  e.target.value = '';
};

// Reply
window.replyMsg = (msgId) => {
  const msg = messages.get(msgId);
  if(!msg) return;
  
  $("replyTo").value = msgId;
  $("replyText").textContent = msg.text.slice(0, 50);
  $("replyIndicator").style.display = "flex";
  $("msgInput").focus();
};

$("cancelReply").onclick = () => {
  $("replyTo").value = "";
  $("replyIndicator").style.display = "none";
};

// React Picker
window.showReactPicker = (msgId) => {
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  picker.innerHTML = `
    <div class="emoji-grid">
      ${['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💯', '⚡', '🚀'].map(emoji => `
        <span class="emoji-item" onclick="reactMsg('${msgId}', '${emoji}')">${emoji}</span>
      `).join('')}
    </div>
  `;
  
  document.body.appendChild(picker);
  
  setTimeout(() => picker.classList.add('show'), 10);
  
  setTimeout(() => {
    picker.classList.remove('show');
    setTimeout(() => picker.remove(), 300);
  }, 3000);
};

window.reactMsg = (msgId, emoji) => {
  const msg = messages.get(msgId);
  if(!msg) return;
  
  msg.reactions = msg.reactions || {};
  msg.reactions[account] = emoji;
  
  socket.emit('react-message', {
    room: currentRoom,
    messageId: msgId,
    reactions: msg.reactions
  });
  
  // Close picker
  const picker = document.querySelector('.emoji-picker');
  if(picker) {
    picker.classList.remove('show');
    setTimeout(() => picker.remove(), 300);
  }
};

// Delete
window.deleteMsg = (msgId) => {
  if(!confirm("🗑️ Delete this message?")) return;
  
  socket.emit('delete-message', {
    room: currentRoom,
    messageId: msgId
  });
  
  messages.delete(msgId);
  
  const el = $(`msg-${msgId}`);
  if(el) {
    el.classList.add('deleting');
    setTimeout(() => el.remove(), 300);
  }
  
  playSound('delete');
};

// Online Users
function updateUserList(users) {
  $("onlineUsers").innerHTML = '';
  
  users.forEach(user => {
    const el = document.createElement("div");
    el.id = `user-${user.account}`;
    el.className = "online-user";
    el.innerHTML = `
      <div class="status-dot" style="background: ${hashColor(user.account)}"></div>
      <span>${user.name}</span>
    `;
    $("onlineUsers").appendChild(el);
  });
  
  updateOnlineCount();
}

function updateOnlineCount() {
  const count = $("onlineUsers").children.length;
  $("onlineCount").textContent = count;
}

// Typing Indicator
function showTyping(addr, isTyping) {
  let el = $(`typing-${addr}`);
  
  if(isTyping && !el) {
    el = document.createElement("div");
    el.id = `typing-${addr}`;
    el.className = "typing-indicator";
    el.innerHTML = `<span class="typing-text">${addr.slice(0, 8)} is typing</span><span class="dots">...</span>`;
    $("typingArea").appendChild(el);
  } else if(!isTyping && el) {
    el.remove();
  }
}

// Utilities
function escape(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function linkify(text) {
  return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function hashColor(str) {
  let hash = 0;
  for(let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 70%, 50%)`;
}

function formatBytes(bytes) {
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function scrollToBottom() {
  const messages = $("messages");
  messages.scrollTop = messages.scrollHeight;
}

function showNotif(msg, type = 'info') {
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.innerHTML = `
    <i class="bi bi-${type === 'error' ? 'x-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    <span>${msg}</span>
  `;
  
  document.body.appendChild(notif);
  
  setTimeout(() => notif.classList.add('show'), 10);
  setTimeout(() => {
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

window.openImageModal = (src) => {
  $("modalImage").src = src;
  const modal = new bootstrap.Modal($("imageModal"));
  modal.show();
};

function playSound(type) {
  const audio = new Audio(`https://assets.mixkit.co/sfx/preview/mixkit-${
    type === 'send' ? 'message-pop-alert-2354' :
    type === 'message' ? 'notification-pop-962' :
    type === 'connect' ? 'positive-notification-951' :
    type === 'join' ? 'software-interface-start-2574' :
    'click-error-1110'
  }.mp3`);
  audio.volume = 0.3;
  audio.play().catch(err => {
    console.error("Audio playback failed:", err.message);
  });
}

// Event Listeners
$("sendBtn").onclick = sendMsg;
$("msgInput").addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});

$("emojiBtn").onclick = () => {
  const emojis = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '💯', '⚡', '🚀', '🌟'];
  const emoji = prompt(`Choose: ${emojis.join(' ')}\n\nOr paste any emoji:`);
  if(emoji) $("msgInput").value += emoji;
};

// Auto-join if room exists
if(localStorage.currentRoom && localStorage.wallet) {
  setTimeout(() => {
    $("roomInput").value = localStorage.currentRoom;
  }, 100);
}

// Socket.IO connection handling
socket.on('connect', () => {
  console.log('Connected to server');
  showNotif('🟢 Connected to chat server', 'success');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  showNotif('🔴 Disconnected from server', 'error');
});

socket.on('reaction-updated', (data) => {
  const msg = messages.get(data.messageId);
  if (msg) {
    msg.reactions = data.reactions;
    updateMessageReactions(data.messageId, data.reactions);
  }
});

// Cleanup
window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.disconnect();
  }
});