@echo off
setlocal
cd /d "%~dp0"
title RUPTURE - Multiplayer com amigos
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 22 ou superior pelo site https://nodejs.org
  echo Depois abra este arquivo novamente. Consulte MULTIPLAYER.md.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Atualize o Node.js para a versao 22 ou superior.
  pause
  exit /b 1
)
echo Abra http://localhost:8787 e clique em JOGAR COM AMIGOS.
echo Mantenha esta janela aberta. Ctrl+C encerra o servidor.
start "" "http://localhost:8787"
node --experimental-vm-modules server/server.mjs
pause
endlocal
