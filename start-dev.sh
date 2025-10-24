#!/bin/bash

# ShopVerse Development Server Starter
# This script starts both backend and frontend servers

echo "🚀 Starting ShopVerse Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Backend directory exists
if [ ! -d "Backend" ]; then
    echo -e "${RED}❌ Backend directory not found!${NC}"
    exit 1
fi

# Check if Frontend directory exists
if [ ! -d "Frontend" ]; then
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    exit 1
fi

# Check if node_modules exist in Backend
if [ ! -d "Backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Backend dependencies...${NC}"
    cd Backend
    npm install
    cd ..
fi

# Check if node_modules exist in Frontend
if [ ! -d "Frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Frontend dependencies...${NC}"
    cd Frontend
    npm install
    cd ..
fi

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""
echo -e "${YELLOW}Starting servers...${NC}"
echo ""

# Start Backend in background
echo -e "${GREEN}🔧 Starting Backend Server on http://localhost:5000${NC}"
cd Backend
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend Server on http://localhost:5173${NC}"
cd Frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Both servers are starting!${NC}"
echo ""
echo -e "${YELLOW}📍 Frontend: http://localhost:5173${NC}"
echo -e "${YELLOW}📍 Backend: http://localhost:5000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
