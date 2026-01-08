#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize status variables
NODE_OK=0
NPM_OK=0
ROOT_DEPS_OK=0
BACKEND_DEPS_OK=0
FRONTEND_DEPS_OK=0
BACKEND_STARTED=0
FRONTEND_STARTED=0

echo -e "${BLUE}Starting Attendance Management System...${NC}"
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to handle errors gracefully
handle_error() {
    local message="$1"
    echo -e "${RED}Error: $message${NC}"
    echo -e "${YELLOW}Continuing with script execution...${NC}"
    echo
}

# Check if Node.js is installed
if ! command_exists node; then
    handle_error "Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo -e "${YELLOW}Press Enter to continue anyway...${NC}"
    read -r
    NODE_OK=0
else
    echo -e "${GREEN}Node.js version: $(node --version)${NC}"
    NODE_OK=1
fi

# Check if npm is available
if ! command_exists npm; then
    handle_error "npm is not available"
    echo "Please reinstall Node.js from https://nodejs.org/"
    echo -e "${YELLOW}Press Enter to continue anyway...${NC}"
    read -r
    NPM_OK=0
else
    echo -e "${GREEN}npm version: $(npm --version)${NC}"
    NPM_OK=1
fi

echo

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing root dependencies...${NC}"
    if npm install; then
        echo -e "${GREEN}Root dependencies installed successfully!${NC}"
        ROOT_DEPS_OK=1
    else
        handle_error "Failed to install root dependencies"
        ROOT_DEPS_OK=0
    fi
else
    echo -e "${GREEN}Root dependencies already installed.${NC}"
    ROOT_DEPS_OK=1
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    if npm install; then
        echo -e "${GREEN}Backend dependencies installed successfully!${NC}"
        BACKEND_DEPS_OK=1
    else
        handle_error "Failed to install backend dependencies"
        BACKEND_DEPS_OK=0
    fi
    cd ..
else
    echo -e "${GREEN}Backend dependencies already installed.${NC}"
    BACKEND_DEPS_OK=1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend
    if npm install; then
        echo -e "${GREEN}Frontend dependencies installed successfully!${NC}"
        FRONTEND_DEPS_OK=1
    else
        handle_error "Failed to install frontend dependencies"
        FRONTEND_DEPS_OK=0
    fi
    cd ..
else
    echo -e "${GREEN}Frontend dependencies already installed.${NC}"
    FRONTEND_DEPS_OK=1
fi

echo
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting development servers...${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Backend will run on: http://localhost:5000${NC}"
echo -e "${GREEN}Frontend will run on: http://localhost:5173${NC}"
echo

# Function to open browser based on OS
open_browser() {
    local url=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$url"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command_exists xdg-open; then
            xdg-open "$url"
        elif command_exists firefox; then
            firefox "$url" &
        elif command_exists google-chrome; then
            google-chrome "$url" &
        elif command_exists chromium-browser; then
            chromium-browser "$url" &
        else
            echo -e "${YELLOW}Could not find a browser to open automatically${NC}"
        fi
    else
        echo -e "${YELLOW}Unknown OS, please open http://localhost:5173 manually${NC}"
    fi
}

# Start backend server in background
echo -e "${YELLOW}Starting backend server...${NC}"
if [ -f "backend/package.json" ]; then
    cd backend && npm run dev &
    BACKEND_PID=$!
    cd ..
    BACKEND_STARTED=1
    echo -e "${GREEN}Backend server started successfully! (PID: $BACKEND_PID)${NC}"
else
    handle_error "Backend package.json not found!"
    BACKEND_STARTED=0
fi

# Wait for backend to start
sleep 3

# Start frontend server in background
echo -e "${YELLOW}Starting frontend server...${NC}"
if [ -f "frontend/package.json" ]; then
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
    FRONTEND_STARTED=1
    echo -e "${GREEN}Frontend server started successfully! (PID: $FRONTEND_PID)${NC}"
else
    handle_error "Frontend package.json not found!"
    FRONTEND_STARTED=0
fi

# Wait for frontend to start
sleep 5

# Open browser
echo -e "${BLUE}Opening browser...${NC}"
open_browser "http://localhost:5173"

echo
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Script Status Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Node.js: $NODE_OK"
echo -e "npm: $NPM_OK"
echo -e "Root Dependencies: $ROOT_DEPS_OK"
echo -e "Backend Dependencies: $BACKEND_DEPS_OK"
echo -e "Frontend Dependencies: $FRONTEND_DEPS_OK"
echo -e "Backend Server: $BACKEND_STARTED"
echo -e "Frontend Server: $FRONTEND_STARTED"
echo -e "${BLUE}========================================${NC}"
echo
echo -e "${GREEN}Backend: http://localhost:5000${NC}"
echo -e "${GREEN}Frontend: http://localhost:5173${NC}"
echo

if [ $BACKEND_STARTED -eq 1 ] && [ $FRONTEND_STARTED -eq 1 ]; then
    echo -e "${GREEN}SUCCESS: Both servers should be running!${NC}"
    echo -e "${BLUE}Backend PID: $BACKEND_PID${NC}"
    echo -e "${BLUE}Frontend PID: $FRONTEND_PID${NC}"
else
    echo -e "${YELLOW}WARNING: Some servers may not have started properly.${NC}"
    echo -e "${YELLOW}Check the error messages above for details.${NC}"
fi

echo
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Function to cleanup on exit
cleanup() {
    echo
    echo -e "${YELLOW}Stopping servers...${NC}"
    if [ $BACKEND_STARTED -eq 1 ]; then
        kill $BACKEND_PID 2>/dev/null && echo -e "${GREEN}Backend server stopped${NC}" || echo -e "${YELLOW}Backend server was not running${NC}"
    fi
    if [ $FRONTEND_STARTED -eq 1 ]; then
        kill $FRONTEND_PID 2>/dev/null && echo -e "${GREEN}Frontend server stopped${NC}" || echo -e "${YELLOW}Frontend server was not running${NC}"
    fi
    echo -e "${GREEN}Cleanup completed.${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
