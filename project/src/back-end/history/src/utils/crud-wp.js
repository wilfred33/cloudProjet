const nano = require('nano');
const log = require('debug')(process.env.DEBUG || 'history-service');

// Connexion à CouchDB
const dbURL = process.env.DB_URL;
log(`Connecting to database: ${dbURL}`);

const historyDB = nano(dbURL);

// ============================================
// Fonction 1 : Récupérer l'historique d'un utilisateur
// ============================================
const getHistory = (userId) => {
  return new Promise((resolve, reject) => {
    const historyId = `history_${userId}`;
    log(`getHistory() - Fetching history for user: ${userId}`);

    historyDB.get(historyId, (err, history) => {
      if (err) {
        if (err.statusCode === 404) {
          // Historique n'existe pas encore → créer un historique vide
          log(`History not found for user ${userId}, returning empty history`);
          resolve({
            _id: historyId,
            userId: userId,
            items: [],
            createdAt: new Date().toISOString()
          });
        } else {
          log(`Error fetching history: ${err.message}`);
          return reject(err);
        }
      } else {
        log(`History found for user ${userId}: ${history.items.length} items`);
        resolve(history);
      }
    });
  });
};

// ============================================
// Fonction 2 : Ajouter un achat à l'historique
// ============================================
const addPurchase = (userId, purchase) => {
  return new Promise((resolve, reject) => {
    log(`addPurchase() - Adding purchase for user ${userId}`);

    // 1. Récupérer l'historique actuel
    getHistory(userId)
      .then((history) => {
        // 2. Pour chaque item dans le purchase, vérifier s'il existe déjà
        purchase.items.forEach((newItem) => {
          const existingItemIndex = history.items.findIndex(
            (item) => item.productId === newItem.productId
          );

          if (existingItemIndex !== -1) {
            // Le produit existe déjà → incrémenter la quantité
            history.items[existingItemIndex].quantity += newItem.quantity;
            log(`Product ${newItem.productId} already exists, incrementing quantity to ${history.items[existingItemIndex].quantity}`);
          } else {
            // Le produit n'existe pas → l'ajouter
            history.items.push({
              productId: newItem.productId,
              name: newItem.name,
              price: newItem.price,
              quantity: newItem.quantity,
              image: newItem.image
            });
            log(`Adding new product ${newItem.productId} to history`);
          }
        });

        history.updatedAt = new Date().toISOString();

        // 3. Sauvegarder l'historique mis à jour
        historyDB.insert(history, (err, result) => {
          if (err) {
            log(`Error saving history: ${err.message}`);
            return reject(err);
          }
          log(`Purchase added successfully`);
          resolve({ ...history, _rev: result.rev });
        });
      })
      .catch(reject);
  });
};

// Exporter les fonctions
module.exports = {
  getHistory,
  addPurchase
};
