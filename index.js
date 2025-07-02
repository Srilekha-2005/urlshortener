'use strict';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// MongoDB
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// POST: Shorten URL
app.post('/api/shorturl', async (req, res) => {
  const inputUrl = req.body.url;

  let urlObj;
  try {
    urlObj = new URL(inputUrl);
  } catch {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(urlObj.hostname, async (err) => {
    if (err) return res.json({ error: 'invalid url' });

    let existing = await Url.findOne({ original_url: inputUrl });
    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.short_url
      });
    }

    let count = await Url.countDocuments({});
    const newUrl = new Url({
      original_url: inputUrl,
      short_url: count + 1
    });

    await newUrl.save();

    res.json({
      original_url: newUrl.original_url,
      short_url: newUrl.short_url
    });
  });
});

// GET: Redirect short URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);

  const found = await Url.findOne({ short_url: shortUrl });
  if (!found) return res.json({ error: 'No short URL found' });

  res.redirect(found.original_url);
});

// Start server
app.listen(port, () => {
  console.log(`Node.js listening ...${port}`);
});
