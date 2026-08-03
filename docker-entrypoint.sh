#!/bin/sh
set -e

echo "Corriendo migraciones..."
node_modules/.bin/prisma migrate deploy

echo "Iniciando app..."
exec node server.js
