@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Arquivo .env criado.
  echo Abra o arquivo e preencha DISCORD_TOKEN e CLIENT_ID.
  echo.
  notepad ".env"
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando o bot...
call npm start
pause
