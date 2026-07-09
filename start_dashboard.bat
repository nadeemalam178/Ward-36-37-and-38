@echo off
title Electoral Intelligence Dashboard - High Speed Server
echo ========================================================
echo Starting High-Speed SQLite API & Web Server...
echo Loading 60,930+ Patna Bankipur Electoral Records...
echo ========================================================
start http://localhost:8000
python server.py
pause
