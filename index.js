const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(process.cwd() + '/public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

// Counter (for simplicity)
let counter = 1;

// Serve the frontend
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// ✅ POST: Create short URL
app.post('/api/shorturl', async (req, res) => {
  const input = req.body.url;

  let urlObject;
  try {
    urlObject = new URL(input);
  } catch {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(urlObject.hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {
      const existing = await Url.findOne({ original_url: input });
      if (existing) {
        return res.json({
          original_url: existing.original_url,
          short_url: existing.short_url
        });
      }

      const newUrl = new Url({
        original_url: input,
        short_url: counter++
      });

      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// ✅ GET: Redirect short URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const short = parseInt(req.params.short_url);

  if (isNaN(short)) {
    return res.json({ error: 'Invalid short URL' });
  }

  try {
    const entry = await Url.findOne({ short_url: short });
    if (!entry) {
      return res.json({ error: 'No short URL found' });
    }

    res.redirect(entry.original_url);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
