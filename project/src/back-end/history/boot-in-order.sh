#!/bin/sh

# Attendre que la base de données soit prête
echo "Waiting for database to be ready..."
until curl -s ${DB_URL%/*}/_up > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# Créer la base de données si elle n'existe pas
echo "Creating database if not exists..."
DB_NAME=$(echo $DB_URL | sed 's/.*\///')
curl -X PUT ${DB_URL} -u admin:admin
echo "DB (${DB_NAME}) was created!"

# Démarrer le service en arrière-plan
echo "Start history service in background..."
npm start &

# Attendre que le service soit prêt
echo "Waiting for history service to be ready..."
until curl -s http://localhost:80/health > /dev/null 2>&1; do
  sleep 1
done
echo "History service is running. Keeping container alive..."

# Garder le conteneur actif
tail -f /dev/null
