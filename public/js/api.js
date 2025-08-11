// public/js/api.js
export async function sendMessageToBot(message, userId) {
  try {
    const res = await fetch("/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Chatbot error");
    return data.reply;
  } catch (err) {
    console.error("Error talking to chatbot:", err);
    return "Sorry, chatbot service is unavailable.";
  }
}
