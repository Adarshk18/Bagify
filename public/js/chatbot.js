// public/js/chatbot.js
console.log("📌 Chatbot script loaded.");

document.addEventListener("DOMContentLoaded", () => {
  const chatToggle = document.getElementById("chat-toggle");
  const chatBox = document.getElementById("chatbox");
  const chatInput = document.getElementById("chatInput");
  const chatMessages = document.getElementById("chat-messages");
  const chatClose = document.getElementById("chat-close");
  const chatSend = document.getElementById("sendButton"); // ✅ Send button

  if (!chatToggle) return console.error("chat-toggle not found");
  if (!chatBox) return console.error("chatbox not found");
  if (!chatInput) return console.error("chat-input not found");
  if (!chatMessages) return console.error("chat-messages not found");

  // Toggle widget
  chatToggle.addEventListener("click", () => {
    chatBox.classList.toggle("hidden");
    console.log("Chat toggle clicked, hidden:", chatBox.classList.contains("hidden"));
  });

  chatClose && chatClose.addEventListener("click", () => {
    chatBox.classList.add("hidden");
    console.log("Chat closed");
  });

  function appendMessage(senderLabel, text) {
    const div = document.createElement("div");
    div.className = "chat-line";
    div.innerHTML = `<strong>${senderLabel}:</strong> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  function saveMessage(sender, text) {
    try {
      const chats = JSON.parse(localStorage.getItem("chatHistory") || "[]");
      chats.push({ sender, text, at: new Date().toISOString() });
      localStorage.setItem("chatHistory", JSON.stringify(chats));
    } catch (e) {
      console.warn("Could not save chat", e);
    }
  }

  function loadHistory() {
    const chats = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    chats.forEach(c => appendMessage(c.sender, c.text));
  }

  // Provide user id from window object (injected by EJS)
  const userId = window.BAGIFY_USER_ID || "";

  // ✅ Centralized send function
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    appendMessage("You", text);
    saveMessage("You", text);

    const typingEl = appendMessage("🤖 Bot", "Typing...");
    try {
      const res = await fetch("/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, userId }),
      });

      const json = await res.json();
      if (!res.ok) {
        const errMsg = json?.error || `Server ${res.status}`;
        typingEl.innerHTML = `<strong>🤖 Bot:</strong> ❌ ${errMsg}`;
        saveMessage("Bot", `ERROR: ${errMsg}`);
        console.error("Chatbot server returned error:", json);
        return;
      }

      typingEl.innerHTML = `<strong>🤖 Bot:</strong> ${json.reply}`;
      saveMessage("Bot", json.reply);
    } catch (err) {
      console.error("Fetch error talking to chatbot:", err);
      typingEl.innerHTML = `<strong>🤖 Bot:</strong> ❌ GPT API Error. Please try again later.`;
      saveMessage("Bot", "GPT API Error. Please try again later.");
    }
  }

  // ✅ Enter key listener
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent newline
      sendMessage();
    }
  });

  // ✅ Send button listener
  if (chatSend) {
    chatSend.addEventListener("click", sendMessage);
  } else {
    console.warn("⚠️ Send button (#chat-send) not found in HTML");
  }

  loadHistory();
});
