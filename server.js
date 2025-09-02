const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

const TOP_HEADLINES_URL = "https://newsapi.org/v2/top-headlines";
const EVERYTHING_URL = "https://newsapi.org/v2/everything";

// Helper function to fetch category news
async function fetchNews(country, category) {
  const params = {
    apiKey: NEWS_API_KEY,
    category,
  };
  if (country) params.country = country;

  const response = await axios.get(TOP_HEADLINES_URL, { params });
  return response.data;
}

// Category route — India → US → Global fallback
app.get("/category/:category", async (req, res) => {
  const { category } = req.params;

  try {
    let data = await fetchNews("in", category);
    if (!data.articles || data.articles.length === 0) {
      console.log(`No India news for ${category}, trying US...`);
      data = await fetchNews("us", category);
    }
    if (!data.articles || data.articles.length === 0) {
      console.log(`No US news for ${category}, trying global...`);
      data = await fetchNews(null, category);
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching news:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});


// Search route with fallback
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Missing search query" });
  }

  try {
    const newsApiRes = await axios.get(EVERYTHING_URL, {
      params: {
        apiKey: NEWS_API_KEY,
        q: query,
        language: "en",
        sortBy: "publishedAt",
        pageSize: 20
      }
    });

    let articles = newsApiRes.data.articles || [];

    if (articles.length === 0) {
      console.log(`No results from NewsAPI for "${query}", trying GNews...`);
      const gnewsRes = await axios.get("https://gnews.io/api/v4/search", {
        params: {
          q: query,
          lang: "en",
          max: 20,
          apikey: GNEWS_API_KEY
        }
      });
      articles = gnewsRes.data.articles || [];
    }

    res.json({ articles });
  } catch (error) {
    console.error("Error searching news:", error.message);
    res.status(500).json({ error: "Failed to search news" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
