# Image de base Node.js
FROM node:20-alpine

# Répertoire de travail
WORKDIR /usr/src/auth-service

# Installer CURL (pour vérifier que CouchDB est prêt)
RUN apk update && apk add curl

# Ajouter node_modules au PATH
ENV PATH /usr/src/auth-service/node_modules/.bin:${PATH}

# Copier et installer les dépendances
ADD package.json .
RUN npm install

# Copier le code source
ADD gulpfile.js .
ADD src src
ADD boot-in-order.sh .

# Variables d'environnement
ENV TOKEN_SECRET changeme
ENV DEBUG users-d
ENV WITH_PERSISTENT_DATA Y

# Configuration CouchDB
ENV DB_HOST users-db
ENV DB_NAME users
ENV ADMIN_NAME admin
ENV ADMIN_PASSW admin
ENV DB_URL http://${ADMIN_NAME}:${ADMIN_PASSW}@${DB_HOST}:5984/${DB_NAME}

# Lancer avec le script boot-in-order.sh
CMD source boot-in-order.sh


