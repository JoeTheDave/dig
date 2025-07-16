import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from the backend!',
    timestamp: new Date().toISOString(),
    data: {
      users: 42,
      posts: 156,
      views: 2847
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});