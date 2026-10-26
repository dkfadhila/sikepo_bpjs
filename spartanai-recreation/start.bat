@echo off
cd /d "%~dp0"
echo Spartan AI local preview: http://127.0.0.1:7730
python -m http.server 7730 --bind 127.0.0.1 --directory dist
pause
