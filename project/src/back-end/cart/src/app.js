const express = require('express');
const log = require('debug')('cart-service');

const app = express.Router();
const db = require('./utils/crud-wp.js');

// ============================================
// ROUTE 1 : GET /cart/:userId
// ============================================
// Récupérer le panier d'un utilisateur
app.get('/cart/:userId', (req, res) => {
  const userId = req.params.userId;
  log(`GET /cart/${userId} - Fetching cart`);

  return db.getCart(userId)
    .then((cart) => {
      log(`Cart retrieved: ${cart.items.length} items`);
      res.status(200).json({
        status: 'success',
        cart: cart
      });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(500).json({
        status: 'error',
        message: String(err)
      });
    });
});

// ============================================
// ROUTE 2 : POST /cart/:userId/items
// ============================================
// Ajouter un produit au panier
// Body attendu : { productId, name, price, quantity }
app.post('/cart/:userId/items', (req, res) => {
  const userId = req.params.userId;
  const item = req.body;

  log(`POST /cart/${userId}/items - Adding item: ${item.productId}`);

  // Validation basique
  if (!item.productId || !item.name || !item.price) {
    log('Validation failed: productId, name, and price required');
    return res.status(400).json({
      status: 'error',
      message: 'productId, name, and price are required'
    });
  }

  return db.addItemToCart(userId, item)
    .then((cart) => {
      log(`Item added successfully`);
      res.status(200).json({
        status: 'success',
        cart: cart
      });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(500).json({
        status: 'error',
        message: String(err)
      });
    });
});

// ============================================
// ROUTE 3 : PUT /cart/:userId/items/:productId
// ============================================
// Modifier la quantité d'un produit
// Body attendu : { quantity }
app.put('/cart/:userId/items/:productId', (req, res) => {
  const userId = req.params.userId;
  const productId = req.params.productId;
  const { quantity } = req.body;

  log(`PUT /cart/${userId}/items/${productId} - Update quantity to ${quantity}`);

  if (!quantity || quantity < 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid quantity is required'
    });
  }

  return db.updateItemQuantity(userId, productId, quantity)
    .then((cart) => {
      log(`Quantity updated successfully`);
      res.status(200).json({
        status: 'success',
        cart: cart
      });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(404).json({
        status: 'error',
        message: String(err)
      });
    });
});

// ============================================
// ROUTE 4 : DELETE /cart/:userId/items/:productId
// ============================================
// Supprimer un produit du panier
app.delete('/cart/:userId/items/:productId', (req, res) => {
  const userId = req.params.userId;
  const productId = req.params.productId;

  log(`DELETE /cart/${userId}/items/${productId} - Removing item`);

  return db.removeItemFromCart(userId, productId)
    .then((cart) => {
      log(`Item removed successfully`);
      res.status(200).json({
        status: 'success',
        cart: cart
      });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(404).json({
        status: 'error',
        message: String(err)
      });
    });
});

// ============================================
// ROUTE 5 : DELETE /cart/:userId
// ============================================
// Vider complètement le panier
app.delete('/cart/:userId', (req, res) => {
  const userId = req.params.userId;

  log(`DELETE /cart/${userId} - Clearing cart`);

  return db.clearCart(userId)
    .then((cart) => {
      log(`Cart cleared successfully`);
      res.status(200).json({
        status: 'success',
        cart: cart
      });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(500).json({
        status: 'error',
        message: String(err)
      });
    });
});

module.exports = app;
