const axios = require('axios');
const express = require('express');
const router = express.Router();

router.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-70b-chat',
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'HTTP-Referer': 'https://localhost:3000',
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices[0]?.message?.content || "No reply";
    console.log("User said:", message);
    console.log("Bot replied:", reply);
    res.json({ reply });
  } catch (error) {
    console.error("OpenRouter Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Sorry, Chatbot service unavailable." });
  }
});

module.exports = router;
