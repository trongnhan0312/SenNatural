const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`\x1b[36m[Setup]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.error(`\x1b[31m[Setup Error]\x1b[0m ${msg}`);
}

try {
  // 1. Copy backend/.env.example to backend/.env if not exists
  const backendEnv = path.join(__dirname, 'backend', '.env');
  const backendEnvEx = path.join(__dirname, 'backend', '.env.example');
  if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvEx)) {
    log('Copying backend/.env.example to backend/.env...');
    fs.copyFileSync(backendEnvEx, backendEnv);
  }

  // 2. Copy root .env.example to root .env if not exists
  const rootEnv = path.join(__dirname, '.env');
  const rootEnvEx = path.join(__dirname, '.env.example');
  if (!fs.existsSync(rootEnv) && fs.existsSync(rootEnvEx)) {
    log('Copying root .env.example to root .env...');
    fs.copyFileSync(rootEnvEx, rootEnv);
  }

  // 3. Install backend dependencies
  log('Installing backend dependencies...');
  execSync('npm install', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });

  // 4. Install frontend dependencies
  log('Installing frontend dependencies...');
  execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

  // 5. Generate Prisma client
  log('Generating Prisma Client...');
  execSync('npx prisma generate', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });

  // 6. Sync Database
  log('Syncing database (prisma db push)...');
  execSync('npx prisma db push', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });

  // 7. Seed Database
  log('Seeding initial data (npm run seed)...');
  execSync('npm run seed', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });

  log('\x1b[32mSetup complete successfully!\x1b[0m');
  log('To start the application:');
  log('  - Backend: cd backend && npm run dev');
  log('  - Frontend: cd frontend && npm run dev');
} catch (error) {
  logError('Setup failed! See details below:');
  console.error(error);
}
