# Image de base Node.js
FROM node:20-alpine

# Répertoire de travail
WORKDIR /usr/src/cart-service

# Installer CURL (pour vérifier que CouchDB est prêt)
RUN apk update && apk add curl

# Ajouter node_modules au PATH
ENV PATH=/usr/src/cart-service/node_modules/.bin:${PATH}

# Copier et installer les dépendances
ADD package.json .
RUN npm install

# Copier le code source
ADD gulpfile.js .
ADD src src
ADD boot-in-order.sh .

# Variables d'environnement
ENV DEBUG=cart-service
ENV WITH_PERSISTENT_DATA=Y

# Configuration CouchDB
ENV DB_HOST=cart-db
ENV DB_NAME=cart
ENV ADMIN_NAME=admin
ENV ADMIN_PASSW=admin
ENV DB_URL=http://admin:admin@cart-db:5984/cart

# Port du service
ENV CART_PORT=80

# Lancer avec le script boot-in-order.sh
CMD source boot-in-order.sh
