document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const fileInput = document.getElementById("chat-file");
  const clearChatBtn = document.getElementById("clear-chat-btn");
  const userId = "<%= user ? user._id : 'guest' %>"; // from server (fallback guest)
    const storageKey = `chatHistory_${userId}`;

  // 🔹 Inject minimal CSS for product cards + quick replies
  const style = document.createElement("style");
  style.innerHTML = `
    .product-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 10px 0;
    }
    .product-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px;
      background: #fff;
      text-align: center;
      font-size: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .product-card img {
      max-width: 100%;
      height: 100px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .product-card h4 {
      font-size: 14px;
      margin: 4px 0;
    }
    .product-card p {
      margin: 2px 0;
    }
    .old-price {
      text-decoration: line-through;
      color: gray;
      margin-left: 4px;
      font-size: 12px;
    }
    .discount {
      color: green;
      font-size: 12px;
    }
    .quick-replies {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .quick-reply-btn {
      background: #f3f4f6;
      border: 1px solid #ddd;
      border-radius: 16px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }
    .quick-reply-btn:hover {
      background: #e5e7eb;
    }
    .message.bot p {
      background: #f0f9ff;
      display: inline-block;
      padding: 6px 10px;
      border-radius: 8px;
      margin: 4px 0;
    }
    .message.user p {
      background: #e0f7e9;
      display: inline-block;
      padding: 6px 10px;
      border-radius: 8px;
      margin: 4px 0;
      text-align: right;
    }
  `;
  document.head.appendChild(style);

  // -----------------------------
  // 🔹 Chat History Handling
  // -----------------------------
  let chatHistory = JSON.parse(localStorage.getItem(storageKey)) || [];

  function saveHistory() {
    localStorage.setItem(storageKey, JSON.stringify(chatHistory));
  }

  // Add text message bubble
  function addMessage(text, sender = "bot") {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Save to local history
    chatHistory.push({ role: sender, content: text });
    saveHistory();
  }

  // Add product cards
  function addProductCards(products) {
    const container = document.createElement("div");
    container.classList.add("product-cards");

    products.forEach((p) => {
      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}" />
        <h4>${p.name}</h4>
        <p><strong>₹${p.price}</strong> 
          ${p.originalPrice > p.price
          ? `<span class="old-price">₹${p.originalPrice}</span>`
          : ""
        }
        </p>
        ${p.discount > 0
          ? `<p class="discount">-${p.discount}₹ OFF</p>`
          : ""
        }
      `;

      container.appendChild(card);
    });

    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Save products to history
    chatHistory.push({ role: "bot", products });
    saveHistory();
  }

  // Add quick reply buttons
  function addQuickReplies(quickReplies) {
    const container = document.createElement("div");
    container.classList.add("quick-replies");

    quickReplies.forEach((reply) => {
      const btn = document.createElement("button");
      btn.classList.add("quick-reply-btn");
      btn.innerText = reply.label;
      btn.onclick = () => handleQuickReply(reply.action);
      container.appendChild(btn);
    });

    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    chatHistory.push({ role: "bot", quickReplies });
    saveHistory();
  }

  // Handle bot/server responses
  function handleResponse(data) {
    if (data.message) addMessage(data.message, "bot");
    if (data.products && data.products.length > 0)
      addProductCards(data.products);
    if (data.quickReplies) addQuickReplies(data.quickReplies);
  }

  // Restore chat history on page load
  function restoreChat() {
    chatMessages.innerHTML = "";
    chatHistory.forEach((msg) => {
      if (msg.role === "bot" && msg.products) addProductCards(msg.products);
      else if (msg.role === "bot" && msg.quickReplies) addQuickReplies(msg.quickReplies);
      else addMessage(msg.content, msg.role);
    });
  }
  restoreChat();

  // 🧹 Clear chat
  function clearChat() {
    chatMessages.innerHTML = "";
    chatHistory = [];
    localStorage.removeItem(storageKey);
    addMessage("🧹 Chat cleared. How can I help you now?", "bot");
  }

  // Handle quick reply button click
  async function handleQuickReply(action) {
    addMessage(action, "user");

    try {
      const res = await fetch("/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action, userId }),
      });

      const data = await res.json();
      handleResponse(data);
    } catch (err) {
      console.error(err);
      addMessage("⚠️ Error talking to server.", "bot");
    }
  }

  // Handle normal text messages
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    chatInput.value = "";

    try {
      const res = await fetch("/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, userId }),
      });

      const data = await res.json();
      handleResponse(data);
    } catch (err) {
      console.error(err);
      addMessage("⚠️ Error talking to server.", "bot");
    }
  });

  // Handle image upload
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    addMessage(`📷 You uploaded: ${file.name}`, "user");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    try {
      const res = await fetch("/chatbot/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        addMessage("❌ File upload failed (server error).", "bot");
        return;
      }

      const data = await res.json();
      handleResponse(data);
    } catch (err) {
      console.error(err);
      addMessage("⚠️ Error uploading image.", "bot");
    }

    fileInput.value = ""; // reset
  });

  // Optional: expose a button to trigger file picker
  document.getElementById("upload-btn")?.addEventListener("click", () => {
    fileInput.click();
  });

  // Clear chat button
  clearChatBtn?.addEventListener("click", clearChat);
});
