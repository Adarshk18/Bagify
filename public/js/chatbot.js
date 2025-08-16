document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  // Add message bubble
  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Add quick reply buttons
  function addQuickReplies(quickReplies) {
    const container = document.createElement("div");
    container.classList.add("quick-replies");

    quickReplies.forEach(reply => {
      const btn = document.createElement("button");
      btn.classList.add("quick-reply-btn");
      btn.innerText = reply.label;
      btn.onclick = () => handleQuickReply(reply.action);
      container.appendChild(btn);
    });

    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Handle quick reply button click
  async function handleQuickReply(action) {
    addMessage(`You: ${action}`, "user");

    try {
      const res = await fetch("/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action })
      });

      const data = await res.json();
      addMessage(data.message, "bot");

      if (data.quickReplies) {
        addQuickReplies(data.quickReplies);
      }
    } catch (err) {
      console.error(err);
      addMessage("⚠️ Error talking to server.", "bot");
    }
  }

  // Handle normal chat form submission
  chatForm.addEventListener("submit", async e => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(`You: ${message}`, "user");
    chatInput.value = "";

    try {
      const res = await fetch("/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await res.json();
      addMessage(data.message, "bot");

      if (data.quickReplies) {
        addQuickReplies(data.quickReplies);
      }
    } catch (err) {
      console.error(err);
      addMessage("⚠️ Error talking to server.", "bot");
    }
  });
});
