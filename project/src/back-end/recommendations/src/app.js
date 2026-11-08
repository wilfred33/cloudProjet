const express = require('express');
const nano = require('nano');

const app = express();
const PORT = process.env.PORT || 80;

// Database connections
const HISTORY_DB_HOST = process.env.HISTORY_DB_HOST || 'history-db';
const CART_DB_HOST = process.env.CART_DB_HOST || 'cart-db';
const PRODUCTS_DB_HOST = process.env.PRODUCTS_DB_HOST || 'products-db';
const DB_ADMIN = process.env.ADMIN_NAME || 'admin';
const DB_PASSWORD = process.env.ADMIN_PASSW || 'admin';

const historyCouch = nano(`http://${DB_ADMIN}:${DB_PASSWORD}@${HISTORY_DB_HOST}:5984`);
const cartCouch = nano(`http://${DB_ADMIN}:${DB_PASSWORD}@${CART_DB_HOST}:5984`);
const productsCouch = nano(`http://${DB_ADMIN}:${DB_PASSWORD}@${PRODUCTS_DB_HOST}:5984`);

const historyDB = historyCouch.use('history-db');
const cartDB = cartCouch.use('cart');
const productsDB = productsCouch.use('products');

app.use(express.json());

// Logging helper
function log(message) {
  console.log(`[Recommendations] ${new Date().toISOString()} - ${message}`);
}

// ============================================
// ENDPOINT 1: Trending Products (Best-sellers)
// ============================================
app.get('/recommendations/trending', async (req, res) => {
  try {
    log('Getting trending products...');

    // Create/update the Map/Reduce view for trending products
    const designDoc = {
      _id: '_design/recommendations',
      views: {
        trending: {
          map: function(doc) {
            if (doc.items && doc.items.length > 0) {
              doc.items.forEach(function(item) {
                emit(item.productId, item.quantity || 1);
              });
            }
          }.toString(),
          reduce: '_sum'
        }
      }
    };

    // Try to update the design document
    try {
      const existing = await historyDB.get('_design/recommendations');
      designDoc._rev = existing._rev;
      await historyDB.insert(designDoc);
    } catch (err) {
      if (err.statusCode === 404) {
        await historyDB.insert(designDoc);
      }
    }

    // Query the view
    const result = await historyDB.view('recommendations', 'trending', {
      group: true,
      reduce: true
    });

    // Sort by value (total sales) descending and get top 5
    const trending = result.rows
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Fetch product details
    const trendingWithDetails = await Promise.all(
      trending.map(async (item) => {
        try {
          const product = await productsDB.get(item.key);
          return {
            productId: item.key,
            totalSold: item.value,
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.image
          };
        } catch (err) {
          log(`Product ${item.key} not found`);
          return null;
        }
      })
    );

    const validTrending = trendingWithDetails.filter(item => item !== null);

    log(`Found ${validTrending.length} trending products`);

    res.json({
      status: 'success',
      trending: validTrending
    });

  } catch (error) {
    log(`Error getting trending products: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// ENDPOINT 2: Cart-based Suggestions
// ============================================
app.get('/recommendations/cart-suggestions/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    log(`Getting cart suggestions for product: ${productId}`);

    // Create/update the Map/Reduce view for cart suggestions
    const designDoc = {
      _id: '_design/cart_recommendations',
      views: {
        product_pairs: {
          map: function(doc) {
            if (doc.items && doc.items.length > 1) {
              for (var i = 0; i < doc.items.length; i++) {
                for (var j = i + 1; j < doc.items.length; j++) {
                  var productA = doc.items[i].productId;
                  var productB = doc.items[j].productId;
                  // Emit both directions
                  emit([productA, productB], 1);
                  emit([productB, productA], 1);
                }
              }
            }
          }.toString(),
          reduce: '_sum'
        }
      }
    };

    // Update design document
    try {
      const existing = await cartDB.get('_design/cart_recommendations');
      designDoc._rev = existing._rev;
      await cartDB.insert(designDoc);
    } catch (err) {
      if (err.statusCode === 404) {
        await cartDB.insert(designDoc);
      }
    }

    // Query the view for products paired with the given productId
    const result = await cartDB.view('cart_recommendations', 'product_pairs', {
      startkey: [productId],
      endkey: [productId, {}],
      group: true,
      reduce: true
    });

    // Sort by frequency and get top 5
    const suggestions = result.rows
      .map(row => ({
        productId: row.key[1],
        frequency: row.value
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // Fetch product details
    const suggestionsWithDetails = await Promise.all(
      suggestions.map(async (item) => {
        try {
          const product = await productsDB.get(item.productId);
          return {
            productId: item.productId,
            frequency: item.frequency,
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.image
          };
        } catch (err) {
          log(`Product ${item.productId} not found`);
          return null;
        }
      })
    );

    const validSuggestions = suggestionsWithDetails.filter(item => item !== null);

    log(`Found ${validSuggestions.length} cart suggestions for ${productId}`);

    res.json({
      status: 'success',
      suggestions: validSuggestions
    });

  } catch (error) {
    log(`Error getting cart suggestions: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'recommendations' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  log(`Recommendations Service listening on port ${PORT}`);
  log(`History DB: ${HISTORY_DB_HOST}`);
  log(`Cart DB: ${CART_DB_HOST}`);
  log(`Products DB: ${PRODUCTS_DB_HOST}`);
});

module.exports = app;
