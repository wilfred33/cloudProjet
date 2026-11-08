const express = require('express');
const log = require('debug')('history-service');

const app = express.Router();
const db = require('./utils/crud-wp.js');

// ============================================
// ROUTE 1 : GET /history/:userId
// ============================================
// Récupérer l'historique des achats d'un utilisateur
app.get('/history/:userId', (req, res) => {
  const userId = req.params.userId;
  log(`GET /history/${userId} - Fetching purchase history`);

  return db.getHistory(userId)
    .then((history) => {
      log(`History retrieved: ${history.items.length} items`);
      res.status(200).json({
        status: 'success',
        history: history
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
// ROUTE 2 : POST /history/:userId
// ============================================
// Ajouter un achat à l'historique
// Body attendu : { items: [...], totalQuantity, totalPrice, date }
app.post('/history/:userId', (req, res) => {
  const userId = req.params.userId;
  const purchase = req.body;

  log(`POST /history/${userId} - Adding purchase to history`);

  // Validation basique
  if (!purchase.items || !Array.isArray(purchase.items)) {
    log('Validation failed: items array required');
    return res.status(400).json({
      status: 'error',
      message: 'items array is required'
    });
  }

  return db.addPurchase(userId, purchase)
    .then((history) => {
      log(`Purchase added successfully`);
      res.status(200).json({
        status: 'success',
        history: history
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
