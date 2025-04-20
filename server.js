// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = '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';
const GNEWS_API_KEY = '0129b35214bbbb58318db0f8e0a82299';

app.use(cors());
app.use(bodyParser.json());

app.post('/fetch-news', async (req, res) => {
  try {
    console.log('Request Recieved:');
    const preferences = req.body.input?.preferences;
    const topics = preferences?.topics || ['general'];
    const query = topics.map(k => `"${k}"`).join(' OR ');
    console.log('sending to news API:');
    const gnewsResponse = await axios.get('https://gnews.io/api/v4/search', {
      params: {
        q: query,
        lang: 'en',
        apikey: GNEWS_API_KEY
      },
      headers: { Accept: 'application/json' }
    });
    console.log('GNews Response:', gnewsResponse.data);
    const articles = gnewsResponse.data.articles;

    const prompt = `
Generate a JSON response containing summarized news articles with the following fields:
- id: A unique identifier for each article.
- title: The title of the article.
- imageUrl: The URL of the article’s featured image.
- summary: A brief summary of the article.
- articleUrl: The original URL of the article.
- sentimentAnalysis: Sentiment classification (Positive, Neutral, Negative).

Here are the articles:
${JSON.stringify(articles, null, 2)}
`;
console.log('Sending to AI model...');
const aiResponse = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a helpful news summarizer." },
        { role: "user", content: prompt }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 180000 // ⏱️ 3 minutes
    }
  );
  
    console.log('AI Response:', aiResponse.data);
    const rawOutput = aiResponse.data.choices[0]?.message?.content || '';

    const match = rawOutput.match(/```json\n([\s\S]*?)\n```/);
    const parsedJson = match ? JSON.parse(match[1]) : null;

    if (!parsedJson) return res.status(500).json({ error: 'Failed to parse AI response.' });

    res.json(parsedJson);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
