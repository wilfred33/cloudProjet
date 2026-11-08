# ============================================
# Dockerfile pour API Gateway
# ============================================
# POURQUOI CE FICHIER ?
# Le Gateway est un proxy simple qui ne fait que router les requêtes.
# Contrairement aux autres microservices, il n'a PAS besoin de :
# - Base de données
# - Script boot-in-order.sh complexe
# - Configuration de persistance
#
# Il a juste besoin de :
# - Node.js + Express
# - http-proxy-middleware
# - Démarrer et écouter sur un port
# ============================================

# Image de base Node.js (version alpine = légère)
FROM node:20-alpine

# Répertoire de travail dans le conteneur
WORKDIR /usr/src/gateway

# Ajouter node_modules au PATH pour pouvoir exécuter les binaires npm
ENV PATH=/usr/src/gateway/node_modules/.bin:${PATH}

# Copier le fichier package.json et installer les dépendances
# On fait ça en premier pour profiter du cache Docker
ADD package.json .
RUN npm install

# Copier le code source du Gateway
ADD gulpfile.js .
ADD src src

# Variables d'environnement pour le Gateway
# DEBUG = active les logs de debugging
ENV DEBUG=gateway

# GATEWAY_PORT = port sur lequel le Gateway écoute (80 par défaut)
ENV GATEWAY_PORT=80

# Lancer le Gateway avec npm start (qui lance gulp + nodemon)
CMD ["npm", "start"]


