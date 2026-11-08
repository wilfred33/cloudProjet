const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const log = require('debug')('gateway');

const app = express.Router();

// ============================================
// CONFIGURATION DES SERVICES
// ============================================
// Utilise des variables d'environnement pour supporter
// à la fois Docker Compose (container_name) et Docker Swarm (service names)
const AUTH_SERVICE = process.env.AUTH_SERVICE || 'auth-container';
const PRODUCTS_SERVICE = process.env.PRODUCTS_SERVICE || 'products-container';
const CART_SERVICE = process.env.CART_SERVICE || 'cart-container';
const HISTORY_SERVICE = process.env.HISTORY_SERVICE || 'history-container';
const RECOMMENDATIONS_SERVICE = process.env.RECOMMENDATIONS_SERVICE || 'recommendations-container';

log(`Service configuration:`);
log(`  AUTH_SERVICE = ${AUTH_SERVICE}`);
log(`  PRODUCTS_SERVICE = ${PRODUCTS_SERVICE}`);
log(`  CART_SERVICE = ${CART_SERVICE}`);
log(`  RECOMMENDATIONS_SERVICE = ${RECOMMENDATIONS_SERVICE}`);
log(`  HISTORY_SERVICE = ${HISTORY_SERVICE}`);

// ============================================
// POURQUOI CE CODE ?
// ============================================
// Ce Gateway agit comme un PROXY SIMPLE :
// - Il reçoit TOUTES les requêtes du frontend
// - Il analyse l'URL (le préfixe /user ou /products)
// - Il redirige vers le bon microservice
// - Il renvoie la réponse au client SANS modification
//
// Avantage : Point d'entrée unique pour le frontend (localhost:8082)

// ============================================
// ROUTE 1 : /user/* → Service Auth
// ============================================
// Exemple : GET /user/john/pass123 → redirige vers http://{AUTH_SERVICE}:80/user/john/pass123

app.use('/user', createProxyMiddleware({
  // target = nom du service (configurable via variable d'environnement)
  target: `http://${AUTH_SERVICE}:80`,

  // changeOrigin = change le header "Host" pour que le service cible l'accepte
  changeOrigin: true,

  // pathRewrite = on GARDE "/user" dans ce cas
  pathRewrite: {
    '^/user': '/user', // Garde "/user"
  },

  // onProxyReq = fonction appelée AVANT d'envoyer la requête
  onProxyReq: (proxyReq, req, res) => {
    log(`[AUTH] Proxying: ${req.method} ${req.originalUrl} → http://${AUTH_SERVICE}:80${req.path}`);
  },

  // onProxyRes = fonction appelée APRÈS avoir reçu la réponse
  onProxyRes: (proxyRes, req, res) => {
    log(`[AUTH] Response: ${proxyRes.statusCode}`);
  },

  // onError = gestion des erreurs
  onError: (err, req, res) => {
    log(`[AUTH] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Authentication service unavailable'
    });
  }
}));

// ============================================
// ROUTE 2 : /products/* → Service Products
// ============================================
// Exemple : GET /products → redirige vers http://{PRODUCTS_SERVICE}:80/products

app.use('/products', createProxyMiddleware({
  // target = nom du service (configurable via variable d'environnement)
  target: `http://${PRODUCTS_SERVICE}:80`,
  changeOrigin: true,
  pathRewrite: {
    '^/products': '/products', // On garde "/products"
  },
  onProxyReq: (proxyReq, req, res) => {
    log(`[PRODUCTS] Proxying: ${req.method} ${req.originalUrl} → http://${PRODUCTS_SERVICE}:80${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`[PRODUCTS] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    log(`[PRODUCTS] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Products service unavailable'
    });
  }
}));

// ============================================
// ROUTE 3 : /cart/* → Service Cart
// ============================================
// Exemple : GET /cart/user123 → redirige vers http://{CART_SERVICE}:80/cart/user123
app.use('/cart', createProxyMiddleware({
  // target = nom du service (configurable via variable d'environnement)
  target: `http://${CART_SERVICE}:80`,
  changeOrigin: true,
  pathRewrite: {
    '^/cart': '/cart', // On garde "/cart"
  },
  onProxyReq: (proxyReq, req, res) => {
    log(`[CART] Proxying: ${req.method} ${req.originalUrl} → http://${CART_SERVICE}:80${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`[CART] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    log(`[CART] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Cart service unavailable'
    });
  }
}));

// ============================================
// ROUTE 4 : /history/* → Service History
// ============================================
// Exemple : GET /history/user123 → redirige vers http://{HISTORY_SERVICE}:80/history/user123
app.use('/history', createProxyMiddleware({
  target: `http://${HISTORY_SERVICE}:80`,
  changeOrigin: true,
  pathRewrite: {
    '^/history': '/history', // On garde "/history"
  },
  onProxyReq: (proxyReq, req, res) => {
    log(`[HISTORY] Proxying: ${req.method} ${req.originalUrl} → http://${HISTORY_SERVICE}:80${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`[HISTORY] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    log(`[HISTORY] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'History service unavailable'
    });
  }
}));

// ============================================
// ROUTE 5 : /upload-image → Service Products
// ============================================
app.use('/upload-image', createProxyMiddleware({
  target: `http://${PRODUCTS_SERVICE}:80`,
  changeOrigin: true,
  pathRewrite: {
    '^/upload-image': '/upload-image',
  },
  onProxyReq: (proxyReq, req, res) => {
    log(`[UPLOAD] Proxying: ${req.method} ${req.originalUrl} → http://${PRODUCTS_SERVICE}:80${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`[UPLOAD] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    log(`[UPLOAD] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Upload service unavailable'
    });
  }
}));

// ============================================
// ROUTE 6 : /upload-from-url → Service Products
// ============================================
app.use('/upload-from-url', createProxyMiddleware({
  target: `http://${PRODUCTS_SERVICE}:80`,
  changeOrigin: true,
  pathRewrite: {
    '^/upload-from-url': '/upload-from-url',
  },
  onProxyReq: (proxyReq, req, res) => {
    log(`[UPLOAD-URL] Proxying: ${req.method} ${req.originalUrl} → http://${PRODUCTS_SERVICE}:80${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`[UPLOAD-URL] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    log(`[UPLOAD-URL] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Upload from URL service unavailable'
    });
  }
}));

// ============================================
// ROUTE 7 : /recommendations/* → Service Recommendations
// ============================================
app.use('/recommendations', createProxyMiddleware({
  target: `http://${RECOMMENDATIONS_SERVICE}:80`,
  changeOrigin: true,
  pathRewrite: {
    '^/recommendations': '/recommendations',
  },
  onProxyReq: (proxyReq, req, res) => {
    log(`[RECOMMENDATIONS] Proxying: ${req.method} ${req.originalUrl} → http://${RECOMMENDATIONS_SERVICE}:80${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    log(`[RECOMMENDATIONS] Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    log(`[RECOMMENDATIONS] Proxy error: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Recommendations service unavailable'
    });
  }
}));

// ============================================
// ROUTE par défaut : Santé du Gateway
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Gateway is running',
    network: 'scapp-network',
    routes: {
      proxy_auth: `ALL /user/* → http://${AUTH_SERVICE}:80/user/*`,
      proxy_products: `ALL /products/* → http://${PRODUCTS_SERVICE}:80/products/*`,
      proxy_cart: `ALL /cart/* → http://${CART_SERVICE}:80/cart/*`,
      proxy_history: `ALL /history/* → http://${HISTORY_SERVICE}:80/history/*`,
      proxy_recommendations: `ALL /recommendations/* → http://${RECOMMENDATIONS_SERVICE}:80/recommendations/*`
    },
    services: {
      auth: `http://${AUTH_SERVICE}:80`,
      products: `http://${PRODUCTS_SERVICE}:80`,
      cart: `http://${CART_SERVICE}:80`,
      history: `http://${HISTORY_SERVICE}:80`,
      recommendations: `http://${RECOMMENDATIONS_SERVICE}:80`
    }
  });
});

module.exports = app;
