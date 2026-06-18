# Sen Natural - Inventory Management (Scaffold)

This workspace contains a full-stack scaffold for the Sen Natural inventory management system.

Folders:

- `backend` — Express + Prisma API (default uses SQLite for local convenience; can switch to MySQL by setting `DATABASE_URL`).
- `frontend` — Vite + React + Tailwind frontend.

Quick start (two terminals):

Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run seed
npm run dev
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

Notes:

- Default admin user: `admin` / `admin123` (created by seed).
- To use MySQL, set `DATABASE_URL` in `backend/.env` to your MySQL connection and run `npm run prisma:migrate`.
"# SenNatural" 
