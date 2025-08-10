// public/js/chatbot.js

console.log("📌 Chatbot script loaded.");

document.addEventListener('DOMContentLoaded', () => {
  const chatToggle = document.getElementById('chat-toggle');
  const chatBox = document.getElementById('chatbox');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  if (!chatToggle || !chatBox || !chatInput || !chatMessages) {
    console.error("❌ Chatbot elements not found in DOM");
    return;
  }

  // Toggle chat visibility
  chatToggle.addEventListener('click', () => {
    chatBox.classList.toggle('hidden');
  });

  // Handle sending a message
  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) {
      const message = chatInput.value.trim();
      chatInput.value = '';

      appendMessage('🧑', message);
      saveMessage('🧑', message);

      const typing = appendMessage('🤖', 'Typing...');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const data = await res.json();
        const replyText = data.reply || "Sorry, I couldn't process that.";
        typing.innerHTML = `<strong>🤖:</strong> ${replyText}`;
        saveMessage('🤖', replyText);
      } catch (err) {
        console.error("Chatbot fetch error:", err);
        typing.innerHTML = `<strong>🤖:</strong> Sorry, something went wrong.`;
        saveMessage('🤖', 'Sorry, something went wrong.');
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
});
