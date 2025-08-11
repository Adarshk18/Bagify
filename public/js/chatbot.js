console.log("📌 Chatbot script loaded.");

document.addEventListener("DOMContentLoaded", () => {
  const chatToggle = document.getElementById("chat-toggle");
  const chatBox = document.getElementById("chatbox");
  const chatInput = document.getElementById("chatInput");
  const chatMessages = document.getElementById("chat-messages");
  const chatClose = document.getElementById("chat-close");
  const chatSend = document.getElementById("sendButton");

  if (!chatToggle || !chatBox || !chatInput || !chatMessages) {
    console.error("❌ Chatbot HTML elements missing.");
    return;
  }

  const userId = window.BAGIFY_USER_ID || "";

  function loadHistory() {
    try {
      const chats = JSON.parse(localStorage.getItem("chatHistory") || "[]");
      chats.forEach(c => appendMessage(c.sender, c.text));
    } catch (e) {
      console.warn("⚠️ Could not load chat history", e);
    }
  }

  function saveMessage(sender, text) {
    try {
      const chats = JSON.parse(localStorage.getItem("chatHistory") || "[]");
      chats.push({ sender, text, at: new Date().toISOString() });
      localStorage.setItem("chatHistory", JSON.stringify(chats));
    } catch (e) {
      console.warn("⚠️ Could not save chat", e);
    }
  }

  function appendMessage(senderLabel, text) {
    const div = document.createElement("div");
    div.className = "chat-line";
    div.innerHTML = `<strong>${senderLabel}:</strong> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  async function sendMessage(text) {
    if (!text) {
      text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
    }

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
        return;
      }

      typingEl.innerHTML = `<strong>🤖 Bot:</strong> ${json.reply}`;
      saveMessage("Bot", json.reply);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      typingEl.innerHTML = `<strong>🤖 Bot:</strong> ❌ GPT API Error.`;
      saveMessage("Bot", "GPT API Error.");
    }
  }

  // ⬇️ NEW — fetch predefined options from backend
  async function loadQueryOptions() {
    try {
      const res = await fetch("/chatbot/options"); // Your backend endpoint
      const options = await res.json();

      const optionsContainer = document.createElement("div");
      optionsContainer.className = "chat-options";

      options.forEach(opt => {
        const btn = document.createElement("button");
        btn.textContent = opt;
        btn.className = "chat-option-btn";
        btn.addEventListener("click", () => {
          optionsContainer.remove(); // Remove options after selection
          sendMessage(opt);
        });
        optionsContainer.appendChild(btn);
      });

      chatMessages.appendChild(optionsContainer);
    } catch (err) {
      console.error("❌ Failed to load options", err);
    }
  }

  // Toggle chat visibility
  chatToggle.addEventListener("click", () => {
    chatBox.classList.toggle("hidden");
    if (!chatBox.classList.contains("hidden")) {
      chatMessages.innerHTML = ""; // Clear old messages
      loadQueryOptions(); // Show options on open
    }
  });

  chatClose?.addEventListener("click", () => {
    chatBox.classList.add("hidden");
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatSend?.addEventListener("click", () => sendMessage());

  loadHistory();
});
