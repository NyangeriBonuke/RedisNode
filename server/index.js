const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Redis = require('redis');

const redisClient = Redis.createClient();
const DefaultExpiration = 3600;

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Place Redis client event listeners here
redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (error) => {
  console.error('Redis client error:', error);
});

app.get('/photos', async (req, res) => {
  const albumId = req.query.albumId;

  redisClient.get('photos', async (error, photos) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (photos !== null) {
      return res.json(JSON.parse(photos));
    } else {
      try {
        const { data } = await axios.get(
          'https://jsonplaceholder.typicode.com/photos',
          { params: { albumId } }
        );
        redisClient.setex('photos', DefaultExpiration, JSON.stringify(data));
        return res.json(data);
      } catch (axiosError) {
        console.error(axiosError);
        return res.status(500).json({ error: 'Failed to fetch photos' });
      }
    }
  });
});

app.get('/photos/:id', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );
    return res.json(data);
  } catch (axiosError) {
    console.error(axiosError);
    return res.status(500).json({ error: 'Failed to fetch photo by ID' });
  }
});

const PORT = 8000;
const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Gracefully handle process termination to close Redis client
process.on('SIGINT', () => {
  console.log('Closing Redis client...');
  redisClient.quit(() => {
    console.log('Redis client closed.');
    server.close(() => {
      console.log('Server stopped.');
      process.exit();
    });
  });
});
