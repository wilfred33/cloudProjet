
const express = require('express');
const app = express();
const bodyParser = require('body-parser'); 
const { BlobServiceClient } = require('@azure/storage-blob'); 
const fs = require('fs'); 
const path = require('path');
const axios = require('axios'); 
const nano = require('nano');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp'); 

// Middleware pour parser JSON et URL-encoded
app.use(bodyParser.json());  
app.use(bodyParser.urlencoded({ extended: true }));

// Import du CRUD CouchDB
const db = require('./utils/crud-wp');

// Variable pour les logs
const log = require('debug')('products-service');

// Processus de connection pour Azure
const connectionString = process.env.CONNECTIONSTRING
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

function getFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'image';
  } catch (error) {
    return 'image';
  }
}

async function deleteFromAzure(imageUrl) {
  try {
    // Vérifier si c'est une URL Azure de notre container
    if (!imageUrl || !imageUrl.includes('projectcloudlinfo.blob.core.windows.net/product-images/')) {
      log('URL Azure non valide ou ne correspond pas au container product-images');
      return false;
    }
    const containerClient = blobServiceClient.getContainerClient('product-images');

    // Extraire le nom du blob de l'URL complète
    const blobName = imageUrl.split('/product-images/').pop();
    
    if (!blobName) {
      log('Impossible d\'extraire le nom du blob de l\'URL:', imageUrl);
      return false;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Vérifier si le blob existe avant de le supprimer
    const exists = await blockBlobClient.exists();
    if (!exists) {
      log('Blob non trouvé dans Azure:', blobName);
      return false;
    }

    // Supprimer le blob
    await blockBlobClient.delete();
    log('Blob supprimé d\'Azure:', blobName);
    return true;

  } catch (error) {
    log('Erreur lors de la suppression du blob Azure:', error.message);
    return false;
  }
}


//process image with sharp.
async function processImage(buffer, originalName) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    log(`Original: ${metadata.width}x${metadata.height}`);
    
    // Cibler exactement 166x166
    const TARGET_WIDTH = 166;
    const TARGET_HEIGHT = 166;
    
    resizedImage = await image
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover',      // Couvre toute la zone, crop l'excédent
        position: 'center' // Centre pour le crop
      })
      .webp({ quality: 85 })
      .toBuffer();
    
    log(`Resized to exact ${TARGET_WIDTH}x${TARGET_HEIGHT} (cropped if needed)`);
    
    return {
      buffer: resizedImage,
      contentType: 'image/webp',
      optimized: true
    };
    
  } catch (error) {
    log(`Image processing error: ${error.message}`);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

async function downloadAndUploadToAzure(imageUrl, originalName) {
  try {
    // Télécharger l'image
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    // Vérifier que c'est bien une image
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL ne pointe pas vers une image valide');
    }
    
    console.log('Image téléchargée:', response.data.length, 'bytes');
    
    // NEW: Process image with sharp
    log('Processing image with sharp...');
    const processed = await processImage(response.data, originalName);
    
    // Configuration Azure
    const containerClient = blobServiceClient.getContainerClient('product-images');
  
    await containerClient.createIfNotExists({ access: 'blob' });
  
    const fileName = getFileNameFromUrl(imageUrl);
    const blobName = `product-${Date.now()}-${fileName.replace(/\.[^/.]+$/, "")}.webp`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload processed image vers Azure
    await blockBlobClient.upload(processed.buffer, processed.buffer.length, {
      blobHTTPHeaders: { blobContentType: processed.contentType }
    });
    
    const azureUrl = blockBlobClient.url;
    
    console.log('Image optimisée uploadée vers Azure:', azureUrl);
    return azureUrl;
    
  } catch (error) {
    console.error('Erreur téléchargement URL:', error.message);
    throw new Error(`Impossible de télécharger l'image: ${error.message}`);
  }
}

// ============================================
// ROUTE 1 : GET /products - Lister tous les produits
// ============================================
app.get('/products', (req, res) => {
  log('GET /products - Listing all products');
  
  return db.getAllProducts()
    .then((products) => {
      log(`Found ${products.length} products`);
      res.status(200).json({ status: 'success', products });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(500).json({ status: 'error', message: String(err) });
    });
});

// ============================================
// ROUTE 2 : GET /products/:id - Un produit spécifique
// ============================================
app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  log(`GET /products/${productId}`);
  
  return db.getProductById(productId)
    .then((product) => {
      log(`Product found: ${product.name}`);
      res.status(200).json({ status: 'success', product });
    })
    .catch((err) => {
      log(`Error: ${err.message}`);
      res.status(404).json({ status: 'error', message: 'Product not found' });
    });
});

// ============================================
// ROUTE 3 : POST /products - Créer un produit
// ============================================
app.post('/products', async (req, res) => {
  const { name, price, category, image, description } = req.body;
  log(`POST /products - Creating: ${name}`);
  
  // Validation basique
  if (!name || !price) {
    log('Validation failed: name and price required');
    return res.status(400).json({ 
      status: 'error', 
      message: 'Name and price are required' 
    });
  }
  
  //Validation d'image
  if (image && image.startsWith('http')) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const hasValidExtension = validExtensions.some(ext => 
      image.toLowerCase().includes(ext)
    );
    
    if (!hasValidExtension) {
      return res.status(400).json({
        status: 'error',
        message: 'Format d\'image non supporté. Utilisez JPG, JPEG, PNG, GIF ou WebP.'
      });
    }
  }
  
  try {
    let finalImageUrl = image;

    finalImageUrl = await downloadAndUploadToAzure(image, name);
    
    // Créer le produit avec l'URL Azure
    const result = await db.createProduct({ 
      name, 
      price, 
      category, 
      image: finalImageUrl, //url azure
      description 
    });
    
    log(`Product created with id: ${result.id}`);
    res.status(201).json({ 
      status: 'success', 
      product: result,
      message: 'Product created with optimized image' 
    });
    
  } catch (error) {
    log(`Error: ${error.message}`);
    res.status(500).json({ status: 'error', message: String(error) });
  }
});

// ============================================
// ROUTE 3.5 : PUT /products/:id - Mettre à jour un produit
// ============================================
app.put('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const { name, price, category, image, description } = req.body;
  
  log(`PUT /products/${productId} - Updating product`);
  
  try {
    let finalImageUrl = image;
    
    // Si une nouvelle URL est fournie ET ce n'est pas déjà une URL Azure, la télécharger vers Azure
    if (image && image.startsWith('http') && !image.includes('projectcloudlinfo.blob.core.windows.net')) {
      log(`Downloading new external image for update: ${image}`);
      finalImageUrl = await downloadAndUploadToAzure(image, name);
    } else if (image && image.includes('projectcloudlinfo.blob.core.windows.net')) {
      log(`Image is already from Azure, using directly: ${image}`);
      // Utiliser directement l'URL Azure existante
    }
    
    const result = await db.updateProduct(productId, { 
      name, 
      price, 
      category, 
      image: finalImageUrl,
      description 
    });
    
    log(`Product updated: ${productId}`);
    res.status(200).json({ status: 'success', product: result });
    
  } catch (error) {
    log(`Error updating product: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// ROUTE 4 : DELETE /products/:id - Supprimer un produit
// ============================================
app.delete('/products/:id', async (req, res) => {
  const productId = req.params.id;
  log(`DELETE /products/${productId}`);

  try {
    // Récupérer le produit pour obtenir l'URL de l'image avant suppression
    const product = await db.getProductById(productId);
    
    // Supprimer le produit de la base de données
    await db.deleteProduct(productId);
    
    // Supprimer l'image d'Azure si elle existe
    if (product && product.image) {
      log(`Attempting to delete image from Azure: ${product.image}`);
      await deleteFromAzure(product.image);
    }
    
    log(`Product deleted: ${productId}`);
    res.status(200).json({ status: 'success', message: 'Product deleted' });
    
  } catch (err) {
    log(`Error: ${err.message}`);
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ============================================
// ROUTE 5 : POST /upload-from-url - Uploader depuis une URL externe
// ============================================
app.post('/upload-from-url', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'URL d\'image requise'
      });
    }

    log(`Uploading image from URL: ${imageUrl}`);

    const azureUrl = await downloadAndUploadToAzure(imageUrl, 'external-image');
    
    res.json({
      status: 'success',
      imageUrl: azureUrl,
      message: 'Image optimized and uploaded successfully'
    });

  } catch (error) {
    log(`Upload from URL error: ${error.message}`);
    
    res.status(500).json({
      status: 'error',
      message: 'Error uploading image from URL: ' + error.message
    });
  }
});

// Export pour daemon.js
module.exports = app;