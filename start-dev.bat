@echo off
echo Starting Attendance Management System...

REM ========================================
REM Start Development Servers
REM ========================================
echo ========================================
echo Starting development servers...
echo ========================================
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
echo.
echo Starting both servers using concurrently...
echo Note: Both servers will run in this same window.
echo Press Ctrl+C to stop both servers.
echo.

REM Start servers in background
start /b npm run dev

REM Wait a moment for servers to start
echo Waiting for servers to start...
timeout /t 8 /nobreak >nul

REM Open browser to frontend
echo Opening browser to http://localhost:5173...
start http://localhost:5173

echo.
echo ========================================
echo Development servers are running!
echo ========================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173 (opened in browser)
echo.
echo Press Ctrl+C to stop both servers.
echo.

REM Keep the window open and show the npm output
npm run dev