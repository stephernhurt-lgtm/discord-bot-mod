#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  cp ".env.example" ".env"
  echo "Arquivo .env criado. Edite DISCORD_TOKEN e CLIENT_ID antes de iniciar."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependências..."
  npm install
fi

echo "Iniciando o bot..."
npm start
