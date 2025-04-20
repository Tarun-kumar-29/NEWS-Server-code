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

const defaultResponse = {
  "articles": [
    {
      "id": 1,
      "title": "Irish Grand National 2025 tips: Gordon Elliott and Gigginstown Will Do in Fairyhouse feature",
      "imageUrl": "https://i2-prod.irishmirror.ie/incoming/article34833145.ece/ALTERNATES/s1200/0_elliott.jpg",
      "summary": "Gordon Elliott and Gigginstown could have a winning chance in the Irish Grand National 2025 with Will Do.",
      "articleUrl": "https://www.irishmirror.ie/sport/horse-racing/irish-grand-national-2025-tips-35087746",
      "sentimentAnalysis": "Neutral"
    },
    {
      "id": 2,
      "title": "Hold a general election today and Reform UK would win, new poll suggests",
      "imageUrl": "https://i2-prod.manchestereveningnews.co.uk/article31476590.ece/ALTERNATES/s1200/0_IBP_NEC_150425farage_03JPG.jpg",
      "summary": "A new poll suggests that Reform UK could win a general election if it were held today.",
      "articleUrl": "https://www.manchestereveningnews.co.uk/news/uk-news/hold-general-election-today-reform-31476583",
      "sentimentAnalysis": "Positive"
    },
    {
      "id": 3,
      "title": "Nigel Farage defends allowing US chlorinated chicken into UK as part of trade deal",
      "imageUrl": "https://i.guim.co.uk/img/media/97b8dfdeeeefedf6f96beea625caf70f1c935059/0_227_7415_4449/master/7415.jpg?width=1200&height=630&quality=85&auto=format&fit=crop",
      "summary": "Nigel Farage has defended allowing chlorinated chicken from the US into the UK as part of a trade deal.",
      "articleUrl": "https://www.theguardian.com/politics/2025/apr/20/nigel-farage-defends-allowing-us-chlorinated-chicken-into-uk-as-part-of-trade-deal",
      "sentimentAnalysis": "Neutral"
    },
    {
      "id": 4,
      "title": "AG is wrongly targeted by Trump",
      "imageUrl": "https://www.nydailynews.com/wp-content/uploads/2025/01/TNY-Fraud-Williams-5709.jpg?w=1024&h=682",
      "summary": "Donald Trump has launched an attack against New York Attorney General Tish James on flimsy claims of fraud.",
      "articleUrl": "https://www.nydailynews.com/2025/04/20/tish-james-rights-and-wrongs/",
      "sentimentAnalysis": "Negative"
    },
    {
      "id": 5,
      "title": "The Lazy Sunday Quiz: Test your general knowledge with these 10 questions",
      "imageUrl": "https://i2-prod.manchestereveningnews.co.uk/article31351072.ece/ALTERNATES/s1200/1_JS364904886.jpg",
      "summary": "Take the Lazy Sunday Quiz to test your general knowledge with 10 questions.",
      "articleUrl": "https://www.manchestereveningnews.co.uk/news/greater-manchester-news/men-lazy-sunday-quiz-april20-31473960",
      "sentimentAnalysis": "Neutral"
    }
  ]
};

app.post('/fetch-news', async (req, res) => {
  try {
    const preferences = req.body.input?.preferences;
    const topics = preferences?.topics || ['general'];
    const query = topics.map(k => `"${k}"`).join(' OR ');

    const gnewsResponse = await axios.get('https://gnews.io/api/v4/search', {
      params: {
        q: query,
        lang: 'en',
        apikey: GNEWS_API_KEY
      },
      headers: { Accept: 'application/json' }
    });

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
        timeout: 180000
      }
    );

    const rawOutput = aiResponse.data.choices[0]?.message?.content || '';
    const match = rawOutput.match(/```json\n([\s\S]*?)\n```/);
    const parsedJson = match ? JSON.parse(match[1]) : null;

    if (!parsedJson) {
      console.warn("Failed to parse AI response. Sending default response.");
      return res.status(200).json(defaultResponse);
    }

    res.json(parsedJson);

  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(200).json(defaultResponse); // return fallback
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
