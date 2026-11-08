# Image de base Node.js
FROM node:20-alpine

# Répertoire de travail
WORKDIR /usr/src/products-service

# Installer CURL (pour vérifier que CouchDB est prêt via boot-in-order.sh)
RUN apk update && apk add curl

# Ajouter node_modules au PATH
ENV PATH=/usr/src/products-service/node_modules/.bin:${PATH}

# Copier et installer les dépendances
ADD package.json .
RUN npm install

# Copier le code source
ADD gulpfile.js .
ADD src src
ADD boot-in-order.sh .
ADD initscript.sh .

# Rendre les scripts exécutables
RUN chmod +x boot-in-order.sh initscript.sh

# Variables d'environnement
ENV TOKEN_SECRET=changeme
ENV DEBUG=products-service
ENV WITH_PERSISTENT_DATA=Y
ENV CONNECTIONSTRING="DefaultEndpointsProtocol=https;AccountName=projectcloudlinfo;AccountKey=<YOUR_AZURE_KEY>;EndpointSuffix=core.windows.net"

# Configuration CouchDB
ENV DB_HOST=products-db
ENV DB_NAME=products
ENV ADMIN_NAME=admin
ENV ADMIN_PASSW=admin
ENV DB_URL=http://${ADMIN_NAME}:${ADMIN_PASSW}@${DB_HOST}:5984/${DB_NAME}

# Lancer avec le script boot-in-order.sh (qui appellera initscript.sh)
CMD source boot-in-order.sh