# Sen Natural - Inventory Management (Scaffold)

This workspace contains a full-stack scaffold for the Sen Natural inventory management system.

## Folders
- `backend` — Express + Prisma API (default uses SQLite for local convenience; can switch to MySQL by setting `DATABASE_URL`).
- `frontend` — Vite + React + Tailwind frontend.

## Quick Start (Automated Setup)

If you just cloned the repository, run the following command in the root folder to set up the environment, database, and dependencies automatically:

```bash
node setup.js
```

Or:
```bash
npm run setup
```

This script will automatically:
1. Copy `.env.example` configurations to `.env` in the backend.
2. Install all dependencies for both `backend` and `frontend`.
3. Generate the Prisma client.
4. Set up the SQLite database (`dev.db`).
5. Seed initial data.

### To Run the Application

**Run the backend** (Port 4000):
```bash
cd backend
npm run dev
```

**Run the frontend** (Port 5173):
```bash
cd frontend
npm run dev
```

## Configuration
- **AI Feature Support**: Add your Gemini API key in `backend/.env` (`GEMINI_API_KEY=YOUR_KEY`) for AI chat features to work properly.
- **Default Admin Login**: `admin` / `admin123` (created by database seeding).
- **MySQL Database**: To switch to MySQL, edit the `DATABASE_URL` in `backend/.env` to your MySQL connection and run `npm run prisma:migrate`.
