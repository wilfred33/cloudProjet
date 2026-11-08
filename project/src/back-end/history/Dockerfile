FROM node:20-alpine

# Créer le répertoire de travail
WORKDIR /usr/src/history-service

# Installer curl pour le health check
RUN apk update && apk add curl

# Copier package.json et installer les dépendances
ADD package.json .
RUN npm install

# Copier les fichiers de l'application
ADD gulpfile.js .
ADD src src
ADD boot-in-order.sh .

# Rendre le script executable
RUN chmod +x boot-in-order.sh

# Variables d'environnement pour la connexion à la base de données
ENV DB_HOST=history-db
ENV DB_NAME=history-db
ENV ADMIN_NAME=admin
ENV ADMIN_PASSW=admin
ENV DB_URL=http://${ADMIN_NAME}:${ADMIN_PASSW}@${DB_HOST}:5984/${DB_NAME}

# Exposer le port 80
EXPOSE 80

# Démarrer le service via le script de boot
CMD ["sh", "./boot-in-order.sh"]
