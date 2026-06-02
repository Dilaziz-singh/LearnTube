@echo off
cd /d C:\MYPROJECT-FINAL\LearnTube
echo Starting LearnTube web server...
echo %DATE% %TIME% > vite-web-launch.log
"C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js --config vite.config.ts --host 0.0.0.0 --port 5173 >> vite-web-launch.log 2>&1
echo exited with %ERRORLEVEL% >> vite-web-launch.log
