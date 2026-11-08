const nano = require('nano');
const { v4: uuidv4 } = require('uuid');

// Variable pour les logs
const log = require('debug')(process.env.DEBUG || 'products-crud');

// Connexion à CouchDB via la variable d'environnement DB_URL
const dbURL = process.env.DB_URL;
log(`Connecting to database: ${dbURL}`);

const nanoInstance = nano(dbURL.replace(/\/[^\/]*$/, ''));  // URL sans le nom de la base
const productsDB = nanoInstance.use(process.env.DB_NAME);   // Utiliser la base "products"

// ============================================
// Fonction 1 : Récupérer TOUS les produits
// ============================================
const getAllProducts = () => {
  return new Promise((resolve, reject) => {
    log('getAllProducts() called');

    // list() récupère tous les documents de la base
    productsDB.list({ include_docs: true }, (err, result) => {
      if (err) {
        log(`Error in getAllProducts: ${err.message}`);
        return reject(err);
      }

      // Extraire seulement les documents (pas les métadonnées _design, etc.)
      const products = result.rows
        .filter(row => !row.id.startsWith('_design'))  // Ignorer les documents système
        .map(row => row.doc);

      log(`Retrieved ${products.length} products`);
      resolve(products);
    });
  });
};

// ============================================
// Fonction 2 : Récupérer UN produit par ID
// ============================================
const getProductById = (productId) => {
  return new Promise((resolve, reject) => {
    log(`getProductById(${productId}) called`);

    // get() récupère un document par son _id
    productsDB.get(productId, (err, product) => {
      if (err) {
        if (err.statusCode === 404) {
          log(`Product ${productId} not found`);
          return reject(new Error('Product not found'));
        } else {
          log(`Error: ${err.message}`);
          return reject(err);
        }
      }

      log(`Product found: ${product.name}`);
      resolve(product);
    });
  });
};

// ============================================
// Fonction 3 : Créer un nouveau produit
// ============================================
const createProduct = (productData) => {
  return new Promise((resolve, reject) => {
    // Générer un ID unique avec uuid
    const productId = `product_${uuidv4()}`;
    log(`createProduct() - ID: ${productId}, Name: ${productData.name}`);

    // Construire le document à insérer
    const productDoc = {
      _id: productId,
      name: productData.name,
      price: parseFloat(productData.price),  // S'assurer que c'est un nombre
      category: productData.category || 'uncategorized',
      image: productData.image || 'default.jpg',
      description: productData.description || '',
      createdAt: new Date().toISOString()
    };

    log(`Inserting product: ${JSON.stringify(productDoc)}`);

    // insert() ajoute le document dans CouchDB
    productsDB.insert(productDoc, (err, result) => {
      if (err) {
        log(`Error creating product: ${err.message}`);
        return reject(err);
      }

      log(`Product created successfully: ${result.id}`);
      resolve({
        id: result.id,
        rev: result.rev,  // CouchDB renvoie aussi le numéro de révision
        ...productDoc
      });
    });
  });
};

// ============================================
// Fonction 4 : Supprimer un produit
// ============================================
const deleteProduct = (productId) => {
  return new Promise((resolve, reject) => {
    log(`deleteProduct(${productId}) called`);

    // D'abord récupérer le produit pour obtenir son _rev
    productsDB.get(productId, (err, product) => {
      if (err) {
        if (err.statusCode === 404) {
          log(`Product ${productId} not found`);
          return reject(new Error('Product not found'));
        } else {
          log(`Error: ${err.message}`);
          return reject(err);
        }
      }

      // Supprimer le produit avec destroy()
      productsDB.destroy(productId, product._rev, (err) => {
        if (err) {
          log(`Error deleting product: ${err.message}`);
          return reject(err);
        }
        log(`Product deleted successfully: ${productId}`);
        resolve();
      });
    });
  });
};

// ============================================
// Fonction 5 : Modifier un produit
// ============================================
const updateProduct = (productId, productData) => {
  return new Promise((resolve, reject) => {
    log(`updateProduct(${productId}) called`);

    // D'abord récupérer le produit existant pour obtenir _rev
    productsDB.get(productId, (err, existingProduct) => {
      if (err) {
        if (err.statusCode === 404) {
          log(`Product ${productId} not found`);
          return reject(new Error('Product not found'));
        } else {
          log(`Error: ${err.message}`);
          return reject(err);
        }
      }

      // Fusionner les données avec l'existant
      const updatedProduct = {
        _id: productId,
        _rev: existingProduct._rev,  //
        name: productData.name || existingProduct.name,
        price: parseFloat(productData.price) || existingProduct.price,
        category: productData.category || existingProduct.category,
        image: productData.image || existingProduct.image,
        description: productData.description || existingProduct.description,
        createdAt: existingProduct.createdAt,  // Garder la date de création originale
        updatedAt: new Date().toISOString()    // Ajouter date de modification
      };

      log(`Updating product: ${JSON.stringify(updatedProduct)}`);
      productsDB.insert(updatedProduct, (err, result) => {
        if (err) {
          log(`Error updating product: ${err.message}`);
          return reject(err);
        }

        log(`Product updated successfully: ${result.id}`);
        resolve({
          id: result.id,
          rev: result.rev,
          ...updatedProduct
        });
      });
    });
  });
};

// Exporter les fonctions pour app.js
module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  deleteProduct,
  updateProduct
};