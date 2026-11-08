// src/front-end/src/stores/cart.ts
import { derived, writable, get } from 'svelte/store';
import axios from 'axios';
import { user } from './auth';
import { addToast } from './toasts';
import { browser } from '$app/environment';

// Côté serveur : URL absolue vers gateway
// Côté client (navigateur) : URL relative /api
const gatewayUrl = browser ? '/api' : 'http://gateway-container:80';

// ============================================
// Store Svelte pour le panier
// ============================================
export const cart = createCart();

function createCart() {
  const { subscribe, set } = writable({
    items: [],
    loading: false,
    error: null
  });

  // S'abonner au store user et charger le panier quand l'utilisateur se connecte
  if (typeof window !== 'undefined') {
    let previousUsername: string | null = null;
    user.subscribe((currentUser: { isLogged: boolean; isAdmin: boolean; username: string | null }) => {
      // Vérifier si l'utilisateur a changé
      if (previousUsername !== null && previousUsername !== currentUser.username) {
        // L'utilisateur a changé, nettoyer le localStorage
        window.localStorage.removeItem('cart');
      }
      previousUsername = currentUser.username;

      if (currentUser.isLogged && currentUser.username) {
        loadCart();
      } else {
        set({ items: [], loading: false, error: null });
        window.localStorage.removeItem('cart');
      }
    });
  }

  // ============================================
  // Fonction : Charger le panier depuis le backend
  // ============================================
  async function loadCart() {
    try {
      // Récupérer l'utilisateur connecté
      const currentUser = get(user);

      // Vérifier qu'il est bien connecté
      if (!currentUser.isLogged || !currentUser.username) {
        console.error('[Cart] User not logged in');
        set({ items: [], loading: false, error: 'User not logged in' });
        return;
      }

      const userId = currentUser.username;
      console.log(`[Cart] Loading cart for user: ${userId}`);
      set({ items: [], loading: true, error: null });

      const response = await axios.get(`${gatewayUrl}/cart/${userId}`);

      if (response.data.status === 'success') {
        console.log(`[Cart] Loaded ${response.data.cart.items.length} items`);
        set({
          items: response.data.cart.items,
          loading: false,
          error: null
        });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('[Cart] Error loading cart:', error);
      set({ items: [], loading: false, error: error.message });
    }
  }

  // ============================================
  // Fonction : Ajouter un produit au panier
  // ============================================
  async function addToCart(product) {
    try {
      // Récupérer l'utilisateur connecté
      const currentUser = get(user);

      // Vérifier qu'il est bien connecté
      if (!currentUser.isLogged || !currentUser.username) {
        console.error('[Cart] User not logged in');
        set({ items: [], loading: false, error: 'User not logged in' });
        return false;
      }

      const userId = currentUser.username;
      console.log(`[Cart] Adding product: ${product.name}`);
      set({ items: [], loading: true, error: null });

      const item = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity || 1,
        image: product.image
      };

   
      const response = await axios.post(
        `${gatewayUrl}/cart/${userId}/items`,
        item
      );

      if (response.data.status === 'success') {
        console.log('[Cart] Product added successfully');
        set({
          items: response.data.cart.items,
          loading: false,
          error: null
        });
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error:any) {
      console.error('[Cart] Error adding to cart:', error);
      set({ items: [], loading: false, error: error.message });
      return false;
    }
  }

  // ============================================
  // Fonction : Vider complètement le panier
  // ============================================
  async function clearCart() {
    try {
      // Récupérer l'utilisateur connecté
      const currentUser = get(user);

      // Vérifier qu'il est bien connecté
      if (!currentUser.isLogged || !currentUser.username) {
        console.error('[Cart] User not logged in');
        set({ items: [], loading: false, error: 'User not logged in' });
        return false;
      }

      const userId = currentUser.username;
      console.log('[Cart] Clearing cart');
      set({ items: [], loading: true, error: null });

      const response = await axios.delete(`${gatewayUrl}/cart/${userId}`);

      if (response.data.status === 'success') {
        console.log('[Cart] Cart cleared');
        set({
          items: [],
          loading: false,
          error: null
        });
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('[Cart] Error clearing cart:', error);
      set({ items: [], loading: false, error: error.message });
      return false;
    }
  }

  return {
    subscribe,
    addToCart,

    clearCart,
    reload: loadCart
  };
}

// ============================================
// Stores dérivés pour les calculs
// ============================================
export const totalQuantity = derived(cart, ($cart) =>
  ($cart.items || []).reduce((acc: number, item: any) => acc + item.quantity, 0)
);

export const totalPrice = derived(cart, ($cart) =>
  ($cart.items || []).reduce((acc: number, item: any) => acc + item.quantity * item.price, 0)
);
