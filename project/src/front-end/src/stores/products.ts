// src/front-end/src/stores/products.ts
import { derived, writable } from 'svelte/store';
import axios from 'axios';
import { browser } from '$app/environment';

// Côté serveur : URL absolue vers gateway
// Côté client (navigateur) : URL relative /api
const url = browser ? '/api' : 'http://gateway:80';

export const products = createProducts();

function createProducts() {
  const { subscribe, set } = writable({});
  
  // Charger les produits depuis l'API au démarrage
  loadProductsFromAPI();
  
  async function loadProductsFromAPI() {
    try {
      console.log('[Products] Loading from API:', url);
      const response = await axios.get(`${url}/products`);
      
      if (response.data.status === 'success') {
        const productsArray = response.data.products;
        console.log(`[Products] Loaded ${productsArray.length} products`);
        
        // Grouper par catégorie
        const grouped = groupByCategory(productsArray);
        set(grouped);
      } else {
        console.error('[Products] API returned error:', response.data);
      }
    } catch (error) {
      console.error('[Products] Error loading products:', error);
      // Fallback : garder vide
      set({});
    }
  }

  // 🔥 NOUVELLE FONCTION : Upload depuis URL
  async function uploadImageFromUrl(imageUrl: string): Promise<string> {
    try {
      console.log('[Products] Uploading image from URL:', imageUrl);
      
      const response = await axios.post(`${url}/upload-from-url`, {
        imageUrl
      });

      if (response.data.status === 'success') {
        console.log('[Products] URL image uploaded to Azure:', response.data.imageUrl);
        return response.data.imageUrl;
      } else {
        throw new Error(response.data.message || 'Failed to upload image from URL');
      }
    } catch (error) {
      console.error('[Products] Error uploading image from URL:', error);
      throw error;
    }
  }

  function groupByCategory(productsArray) {
    return productsArray.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category
      });
      return acc;
    }, {});
  }
  
  async function addProduct(product: any) {
    try {
      console.log('[Products] Creating product:', product);
      
      let imageUrl = product.image;
      
      // Si c'est une URL externe (pas Azure), l'uploader vers Azure
      if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('.blob.core.windows.net')) {
        console.log('[Products] Uploading external URL to Azure...');
        imageUrl = await uploadImageFromUrl(imageUrl);
        console.log('[Products] External image uploaded:', imageUrl);
      }
  
      const response = await axios.post(`${url}/products`, {
        name: product.name,
        price: parseFloat(product.price),
        category: product.category,
        image: imageUrl,
        description: product.description || ''
      });
  
      if (response.data.status === 'success') {
        console.log('[Products] Product created:', response.data.product);
        await loadProductsFromAPI();
        return response.data.product;
      } else {
        throw new Error(response.data.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('[Products] Error creating product:', error);
      throw error;
    }
  }
  
  async function updateProduct(productId: string, productData: any) {
    try {
      console.log('[Products] Updating product:', productId, productData);
      
      let imageUrl = productData.image;
      
      // 🔥 CORRECTION : Gestion améliorée des images
      
      // Si c'est une URL externe (pas Azure) OU une URL Azure sans extension, la re-uploader
      if (imageUrl && imageUrl.startsWith('http')) {
        const isAzureUrl = imageUrl.includes('.blob.core.windows.net');
        const hasExtension = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        
        // Re-upload si:
        // - URL externe (pas Azure) 
        // - OU URL Azure sans extension (problème précédent)
        if (!isAzureUrl || !hasExtension) {
          console.log('[Products] Re-uploading image to fix extension issue...');
          imageUrl = await uploadImageFromUrl(imageUrl);
          console.log('[Products] Image re-uploaded with extension:', imageUrl);
        } else {
          console.log('[Products] Using existing Azure URL with extension');
        }
      }
      
      const response = await axios.put(`${url}/products/${productId}`, {
        name: productData.name,
        price: parseFloat(productData.price),
        category: productData.category,
        image: imageUrl,
        description: productData.description || ''
      });

      if (response.data.status === 'success') {
        console.log('[Products] Product updated:', response.data.product);
        await loadProductsFromAPI();
        return response.data.product;
      } else {
        throw new Error(response.data.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('[Products] Error updating product:', error);
      throw error;
    }
  }

  async function deleteProduct(productId: string) {
    try {
      console.log('[Products] Deleting product:', productId);
      const response = await axios.delete(`${url}/products/${productId}`);

      if (response.data.status === 'success') {
        console.log('[Products] Product deleted:', productId);
        await loadProductsFromAPI();
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('[Products] Error deleting product:', error);
      throw error;
    }
  } 

  return {
    subscribe,
    reload: loadProductsFromAPI,
    __addProduct: addProduct,
    __deleteProduct: deleteProduct,
    uploadImageFromUrl: uploadImageFromUrl, // 🔥 Renommé pour plus de clarté
    __updateProduct: updateProduct 
  };
}

// Export productsMerged pour compatibilité avec le code existant
export const productsMerged = derived(products, ($products) => {
  return Object.values($products).flat();
});