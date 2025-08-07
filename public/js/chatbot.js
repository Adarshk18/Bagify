// In public/js/chatbot.js (include this file in layout)
const chatToggle = document.getElementById('chat-toggle');
const chatBox = document.getElementById('chatbox');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

chatToggle.onclick = () => chatBox.classList.toggle('hidden');

chatInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    const message = chatInput.value.trim();
    appendMessage('You', message);
    chatInput.value = '';

    // Persist
    saveMessage('You', message);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    appendMessage('Bot', data.reply);
    saveMessage('Bot', data.reply);
  }
});

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveMessage(sender, text) {
  const chats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  chats.push({ sender, text });
  localStorage.setItem('chatHistory', JSON.stringify(chats));
}

function loadHistory() {
  const chats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  chats.forEach(c => appendMessage(c.sender, c.text));
}

loadHistory();
