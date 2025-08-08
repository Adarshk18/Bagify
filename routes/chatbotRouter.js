const axios = require('axios');
const express = require('express');
const router = express.Router();

router.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `
              You are Bagify Assistant, a chatbot for an e-commerce store named Bagify.
              You can only answer questions related to:
              - Order placement
              - Order status & tracking
              - Delivery updates
              - Product details from our site
              If a user asks about anything outside this scope, politely say:
              "I’m here to assist only with Bagify store-related queries."
              Do NOT answer unrelated questions.
            `
          },{ role: 'user', content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'HTTP-Referer': 'https://localhost:3000',
          'X-Title': 'Bagify Assistant'
        },
      }
    );

    const reply = response.data.choices[0]?.message?.content || "sorry, I couldn't process that.";
    console.log("User said:", message);
    console.log("Bot replied:", reply);
    res.json({ reply });
  } catch (error) {
    console.error("OpenRouter Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Sorry, Chatbot service unavailable." });
  }
});

module.exports = router;
