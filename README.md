# Dig App

A full-stack TypeScript application with React frontend, Express backend, PostgreSQL database, and Fly.io deployment.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Deployment**: Fly.io

## Quick Start

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Setup database**
   ```bash
   npm run db:setup
   ```
   
   > **Note**: Development uses SQLite (no Docker required). Production uses PostgreSQL on Fly.io.

3. **Start development servers**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

## Available Scripts

### Development
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server:dev` - Start only the backend server
- `npm run client:dev` - Start only the frontend server

### Database
- `npm run db:setup` - Push schema and generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio to view/edit data

### Production
- `npm run build` - Build both frontend and backend
- `npm run start` - Start production server

## Database Schema

The application includes three main models:

- **User**: User accounts with email and name
- **Post**: Blog posts linked to users
- **Analytics**: Application statistics

### Database Configuration

- **Development**: Uses SQLite (`server/dev.db`) for simplicity
- **Production**: Uses PostgreSQL on Fly.io for scalability and reliability

The deployment process automatically switches to PostgreSQL schema during build.

## API Endpoints

- `GET /api/data` - Get dashboard statistics
- `GET /api/users` - Get all users
- `GET /api/posts` - Get all posts
- `POST /api/users` - Create a new user
- `POST /api/posts` - Create a new post

## Deployment to Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly.io**
   ```bash
   flyctl auth login
   ```

3. **Create PostgreSQL database**
   ```bash
   flyctl postgres create
   ```

4. **Deploy the application**
   ```bash
   flyctl launch
   ```

## Environment Variables

Create a `.env` file in the `server` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dig_dev?schema=public"
PORT=3001
NODE_ENV=development
```

## Cost Estimation

- **Fly.io App**: ~$3-5/month (often waived for small apps)
- **PostgreSQL**: ~$2-5/month for small instances
- **Total**: ~$0-10/month for development and small production workloads

## Project Structure

```
dig/
├── client/          # React frontend
├── server/          # Express backend
├── docker-compose.yml
├── Dockerfile
├── fly.toml
└── README.md
```