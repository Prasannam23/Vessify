@echo off
REM Vessify - Complete Setup Script for Windows
REM This script sets up both backend and frontend for development

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         Vessify Transaction Extractor Setup               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo → Checking prerequisites...

where node >nul 2>nul
if errorlevel 1 (
  echo ✗ Node.js not found. Please install Node.js 18+
  exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo ✓ Node.js found (%%i)

where npm >nul 2>nul
if errorlevel 1 (
  echo ✗ npm not found
  exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo ✓ npm found (%%i)

echo.
echo → Setting up Backend...

cd backend

if not exist "node_modules" (
  echo → Installing backend dependencies...
  call npm install
  echo ✓ Backend dependencies installed
) else (
  echo ℹ Backend dependencies already installed
)

if not exist ".env" (
  echo → Creating .env file...
  copy .env.example .env >nul
  echo ℹ Please edit .env with your PostgreSQL credentials
  echo ℹ You can generate secrets with: openssl rand -base64 32
) else (
  echo ℹ .env already exists
)

echo → Setting up database...
call npx prisma db push --skip-generate
if errorlevel 1 (
  echo ✗ Database setup failed. Check .env DATABASE_URL
)

echo ✓ Backend setup complete

echo.
cd ..\frontend

echo → Setting up Frontend...

if not exist "node_modules" (
  echo → Installing frontend dependencies...
  call npm install
  echo ✓ Frontend dependencies installed
) else (
  echo ℹ Frontend dependencies already installed
)

if not exist ".env.local" (
  echo → Creating .env.local file...
  (
    echo NEXT_PUBLIC_API_URL=http://localhost:3001
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000
  ) > .env.local
  echo ✓ .env.local created
) else (
  echo ℹ .env.local already exists
)

echo ✓ Frontend setup complete

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              Setup Complete! 🎉                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo → To start development, run in separate terminals:
echo.
echo   Terminal 1 (Backend):
echo   cd backend ^&^& npm run dev
echo.
echo   Terminal 2 (Frontend):
echo   cd frontend ^&^& npm run dev
echo.

echo → Then visit:
echo   * Frontend: http://localhost:3000
echo   * Backend API: http://localhost:3001
echo.

echo → Test credentials:
echo   * Email: testuser1@example.com
echo   * Email: testuser2@example.com
echo.

echo → Happy coding! 🚀

endlocal
