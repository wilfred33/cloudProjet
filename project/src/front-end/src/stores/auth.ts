import { writable } from 'svelte/store';

// ============================================
// ÉTAPE 1 : Charger les données au démarrage
// ============================================
// Vérifier si on est dans le navigateur (pas côté serveur)
const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

// Si des données existent dans localStorage, les parser
// Sinon, utiliser les valeurs par défaut (non connecté)
const initialUser = storedUser ? JSON.parse(storedUser) : { isLogged: false, isAdmin: false, username: null };

// ============================================
// ÉTAPE 2 : Créer le store avec les données restaurées
// ============================================
export const user = writable(initialUser);

// ============================================
// ÉTAPE 3 : Sauvegarder automatiquement à chaque changement
// ============================================
// S'abonner au store pour détecter tous les changements
if (typeof window !== 'undefined') {
  user.subscribe((value: { isLogged: boolean; isAdmin: boolean; username: string | null }) => {
    // À chaque changement, sauvegarder dans localStorage
    localStorage.setItem('user', JSON.stringify(value));
  });
}
