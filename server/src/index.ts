import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { prisma } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/data', async (req, res) => {
  try {
    const analytics = await prisma.analytics.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();

    const data = {
      users: analytics?.users || userCount,
      posts: analytics?.posts || postCount,
      views: analytics?.views || 0
    };

    res.json({
      message: 'Hello from the backend with database!',
      timestamp: new Date().toISOString(),
      data
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        posts: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = await prisma.user.create({
      data: { email, name }
    });
    res.json(user);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, authorId } = req.body;
    const post = await prisma.post.create({
      data: { title, content, authorId },
      include: { author: true }
    });
    res.json(post);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.post('/api/analytics', async (req, res) => {
  try {
    const { users, posts, views } = req.body;
    const analytics = await prisma.analytics.create({
      data: { users, posts, views }
    });
    res.json(analytics);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create analytics entry' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id }
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.post.delete({
      where: { id }
    });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});