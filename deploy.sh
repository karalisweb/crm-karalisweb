#!/bin/bash
# ==========================================
# Script di Deploy - Sales Support CRM
# ==========================================
# Eseguire sul server Contabo dopo il clone/pull del repo

set -e

echo "🚀 Iniziando deploy Sales Support CRM..."

# Verifica che esista il file .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ Errore: .env.production non trovato!"
    echo "   Copia .env.production.example in .env.production e configura i valori"
    exit 1
fi

# Carica variabili ambiente
export $(cat .env.production | grep -v '^#' | xargs)

echo "📦 Building Docker images..."
docker-compose -f docker-compose.yml --env-file .env.production build

echo "🗄️ Avviando database..."
docker-compose -f docker-compose.yml --env-file .env.production up -d db

echo "⏳ Attendendo che il database sia pronto..."
sleep 10

echo "🔧 Eseguendo migrazioni database..."
docker-compose -f docker-compose.yml --env-file .env.production run --rm app npx prisma migrate deploy

echo "🌱 Seeding dati iniziali (se necessario)..."
docker-compose -f docker-compose.yml --env-file .env.production run --rm app npx tsx prisma/seed.ts || echo "Seed già eseguito o errore (ignorato)"

echo "🚀 Avviando applicazione..."
docker-compose -f docker-compose.yml --env-file .env.production up -d app

echo ""
echo "✅ Deploy completato!"
echo ""
echo "📊 Status containers:"
docker-compose ps

echo ""
echo "📝 Per vedere i log:"
echo "   docker-compose logs -f app"
echo ""
echo "🌐 L'app dovrebbe essere disponibile su:"
echo "   http://$(hostname -I | awk '{print $1}'):3000"
echo ""
