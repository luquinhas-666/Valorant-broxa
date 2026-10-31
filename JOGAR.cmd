@echo off
setlocal
cd /d "%~dp0"
title RUPTURE - Servidor local
where py >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8765"
  py -3 -m http.server 8765 --bind 127.0.0.1
  goto end
)
for /d %%P in ("%LOCALAPPDATA%\Python\pythoncore-*") do (
  if exist "%%P\python.exe" (
    start "" "http://127.0.0.1:8765"
    "%%P\python.exe" -m http.server 8765 --bind 127.0.0.1
    goto end
  )
)
where node >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8765"
  node serve.mjs
  goto end
)
echo Instale Python 3 pelo site python.org ou publique os arquivos no GitHub Pages.
echo Consulte README.md para as instrucoes.
pause
:end
endlocal
