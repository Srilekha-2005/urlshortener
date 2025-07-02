const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(`${process.cwd()}/public`));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});
const Url = mongoose.model('Url', urlSchema);

let counter = 1;

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// POST route
app.post('/api/shorturl', (req, res) => {
  const inputUrl = req.body.url;

  try {
    const urlObject = new URL(inputUrl);

    dns.lookup(urlObject.hostname, async (err) => {
      if (err) return res.json({ error: 'invalid url' });

      const existing = await Url.findOne({ original_url: inputUrl });
      if (existing) {
        return res.json({
          original_url: existing.original_url,
          short_url: existing.short_url,
        });
      }

      const newUrl = new Url({
        original_url: inputUrl,
        short_url: counter++,
      });
      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    });
  } catch {
    res.json({ error: 'invalid url' });
  }
});

// GET route
app.get('/api/shorturl/:short_url', async (req, res) => {
  const short = parseInt(req.params.short_url);
  const found = await Url.findOne({ short_url: short });

  if (found) {
    res.redirect(found.original_url);
  } else {
    res.json({ error: 'No short URL found for the given input' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
