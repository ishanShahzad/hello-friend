@echo off
REM ShopVerse Development Server Starter for Windows
REM This script starts both backend and frontend servers

echo.
echo 🚀 Starting ShopVerse Development Environment...
echo.

REM Check if Backend directory exists
if not exist "Backend" (
    echo ❌ Backend directory not found!
    pause
    exit /b 1
)

REM Check if Frontend directory exists
if not exist "Frontend" (
    echo ❌ Frontend directory not found!
    pause
    exit /b 1
)

REM Check if node_modules exist in Backend
if not exist "Backend\node_modules" (
    echo 📦 Installing Backend dependencies...
    cd Backend
    call npm install
    cd ..
)

REM Check if node_modules exist in Frontend
if not exist "Frontend\node_modules" (
    echo 📦 Installing Frontend dependencies...
    cd Frontend
    call npm install
    cd ..
)

echo ✅ All dependencies installed
echo.
echo Starting servers...
echo.

REM Start Backend in new window
echo 🔧 Starting Backend Server on http://localhost:5000
start "ShopVerse Backend" cmd /k "cd Backend && npm start"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start Frontend in new window
echo 🎨 Starting Frontend Server on http://localhost:5173
start "ShopVerse Frontend" cmd /k "cd Frontend && npm run dev"

echo.
echo ✅ Both servers are starting!
echo.
echo 📍 Frontend: http://localhost:5173
echo 📍 Backend: http://localhost:5000
echo.
echo Close the command windows to stop the servers
echo.
pause
