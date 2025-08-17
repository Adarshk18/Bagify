document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const fileInput = document.getElementById("chat-file"); // 👈 Add a hidden file input in your HTML

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

  // Handle normal text messages
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

  // Handle image upload
  fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    addMessage(`📷 You uploaded: ${file.name}`, "user");

    const formData = new FormData();
    formData.append("file", file); // 👈 Must match backend "file"

    try {
      const res = await fetch("/chatbot/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
      addMessage("❌ File upload failed (server error).", "bot");
      return;
    }

      const data = await res.json();
      addMessage(data.message, "bot");

      if (data.quickReplies) {
        addQuickReplies(data.quickReplies);
      }
    } catch (err) {
      console.error(err);
      addMessage("⚠️ Error uploading image.", "bot");
    }

    fileInput.value = ""; // reset
  });

  // Optional: expose a button to trigger file picker
  document.getElementById("upload-btn").addEventListener("click", () => {
    fileInput.click();
  });
});
