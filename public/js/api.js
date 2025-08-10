async function sendMessageToBot(message, userId) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId }),
    });

    const data = await res.json();
    return data.reply || "Sorry, I couldn't process that.";
  } catch (err) {
    console.error("Error talking to chatbot:", err);
    return "Sorry, chatbot service is unavailable.";
  }
}
