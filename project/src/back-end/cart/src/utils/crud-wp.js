const nano = require('nano');
const log = require('debug')(process.env.DEBUG || 'cart-service');

// Connexion à CouchDB
const dbURL = process.env.DB_URL;
log(`Connecting to database: ${dbURL}`);

const cartDB = nano(dbURL);

// ============================================
// Fonction 1 : Récupérer le panier d'un utilisateur
// ============================================
// Si le panier n'existe pas, on renvoie un panier vide
const getCart = (userId) => {
  return new Promise((resolve, reject) => {
    const cartId = `cart_${userId}`;
    log(`getCart() - Fetching cart for user: ${userId}`);

    cartDB.get(cartId, (err, cart) => {
      if (err) {
        if (err.statusCode === 404) {
          // Panier n'existe pas encore → créer un panier vide
          log(`Cart not found for user ${userId}, returning empty cart`);
          resolve({
            _id: cartId,
            userId: userId,
            items: [],
            updatedAt: new Date().toISOString()
          });
        } else {
          log(`Error fetching cart: ${err.message}`);
          return reject(err);
        }
      } else {
        log(`Cart found for user ${userId}: ${cart.items.length} items`);
        resolve(cart);
      }
    });
  });
};

// ============================================
// Fonction 2 : Ajouter un produit au panier
// ============================================
// Si le produit existe déjà, on incrémente la quantité
const addItemToCart = (userId, item) => {
  return new Promise((resolve, reject) => {
    const cartId = `cart_${userId}`;
    log(`addItemToCart() - Adding item ${item.productId} to cart ${userId}`);

    // 1. Récupérer le panier actuel
    getCart(userId)
      .then((cart) => {
        // 2. Chercher si le produit existe déjà
        const existingItemIndex = cart.items.findIndex(
          (i) => i.productId === item.productId
        );

        if (existingItemIndex !== -1) {
          // Produit existe → incrémenter la quantité
          const newQuantity = cart.items[existingItemIndex].quantity + (item.quantity || 1);

          if (newQuantity <= 0) {
            // Si la nouvelle quantité est 0 ou négative → supprimer l'item
            log(`New quantity is ${newQuantity}, removing item from cart`);
            cart.items.splice(existingItemIndex, 1);
          } else {
            // Sinon → mettre à jour la quantité
            cart.items[existingItemIndex].quantity = newQuantity;
            log(`Item already in cart, new quantity: ${newQuantity}`);
          }
        } else {
          // Nouveau produit
          const quantity = item.quantity || 1;

          if (quantity <= 0) {
            // Si on essaie d'ajouter un nouveau produit avec quantité négative ou 0
            log(`Cannot add new item with quantity ${quantity}`);
            return reject(new Error(`Cannot add item with quantity ${quantity}`));
          }

          // Ajouter à la liste
          cart.items.push({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: quantity,
            image: item.image
          });
          log(`New item added to cart`);
        }

        cart.updatedAt = new Date().toISOString();

        // 3. Sauvegarder le panier mis à jour
        cartDB.insert(cart, (err, result) => {
          if (err) {
            log(`Error saving cart: ${err.message}`);
            return reject(err);
          }
          log(`Cart updated successfully`);
          resolve({ ...cart, _rev: result.rev });
        });
      })
      .catch(reject);
  });
};

// ============================================
// Fonction 3 : Vider complètement le panier
// ============================================
const clearCart = (userId) => {
  return new Promise((resolve, reject) => {
    const cartId = `cart_${userId}`;
    log(`clearCart() - User: ${userId}`);

    getCart(userId)
      .then((cart) => {
        cart.items = [];
        cart.updatedAt = new Date().toISOString();

        cartDB.insert(cart, (err, result) => {
          if (err) {
            log(`Error clearing cart: ${err.message}`);
            return reject(err);
          }
          log(`Cart cleared`);
          resolve({ ...cart, _rev: result.rev });
        });
      })
      .catch(reject);
  });
};

// Exporter les fonctions
module.exports = {
  getCart,
  addItemToCart,
  clearCart
};
