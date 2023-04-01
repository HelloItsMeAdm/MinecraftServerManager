@echo off
"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" -new-tab "http://localhost:3000/"
node D:\HTML\ServerManager_SG\server.js
echo Autoclosing in 5 seconds...
timeout 5 >nul