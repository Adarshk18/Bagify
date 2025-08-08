// In public/js/chatbot.js (include this file in layout)
const chatToggle = document.getElementById('chat-toggle');
const chatBox = document.getElementById('chatbox');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

chatToggle.onclick = () => chatBox.classList.toggle('hidden');

chatInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    const message = chatInput.value.trim();
    appendMessage('🧑', message);
    chatInput.value = '';

    // Persist
    const typing = appendMessage('🤖', 'Typing...');
    saveMessage('🧑', message);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      typing.innerHTML = `<strong>🤖:</strong> ${data.reply}`;
      saveMessage('Bot', data.reply);
    } catch {
      typing.innerHTML = `<strong>🤖:</strong> Sorry, something went wrong.`;
    }
  }
});

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
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
