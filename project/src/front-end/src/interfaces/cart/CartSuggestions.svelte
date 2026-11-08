<script lang="ts">
	import { onMount } from 'svelte';
	import { cart } from '@stores/cart';
	import { success } from '@stores/toasts';

	export let cartItems: any[] = [];

	interface SuggestedProduct {
		productId: string;
		frequency: number;
		name: string;
		price: number;
		category: string;
		image: string;
	}

	let suggestions: SuggestedProduct[] = [];
	let loading = true;
	let error = '';
	let quantities: { [key: string]: number } = {};

	// Fonction pour charger les suggestions pour tous les produits du panier
	async function loadSuggestions() {
		if (!cartItems || cartItems.length === 0) {
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			// Récupérer les suggestions pour chaque produit du panier
			const suggestionPromises = cartItems.map(async (item) => {
				try {
					const response = await fetch(`/api/recommendations/cart-suggestions/${item.productId}`);
					const data = await response.json();
					return data.status === 'success' ? data.suggestions : [];
				} catch (err) {
					console.error(`Error fetching suggestions for ${item.productId}:`, err);
					return [];
				}
			});

			const allSuggestions = await Promise.all(suggestionPromises);

			// Aplatir et agréger les suggestions
			const suggestionMap = new Map<string, SuggestedProduct>();

			allSuggestions.flat().forEach((suggestion: SuggestedProduct) => {
				// Exclure les produits déjà dans le panier
				const alreadyInCart = cartItems.some((item) => item.productId === suggestion.productId);
				if (alreadyInCart) return;

				if (suggestionMap.has(suggestion.productId)) {
					// Si le produit existe déjà, additionner les fréquences
					const existing = suggestionMap.get(suggestion.productId)!;
					existing.frequency += suggestion.frequency;
				} else {
					// Sinon, ajouter le nouveau produit
					suggestionMap.set(suggestion.productId, { ...suggestion });
				}
			});

			// Convertir en array, trier par fréquence et limiter à 5
			suggestions = Array.from(suggestionMap.values())
				.sort((a, b) => b.frequency - a.frequency)
				.slice(0, 5);

			// Initialiser les quantités à 1 pour chaque suggestion
			suggestions.forEach((suggestion) => {
				quantities[suggestion.productId] = 1;
			});
		} catch (err) {
			error = 'Failed to load suggestions';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// Fonction pour incrémenter la quantité
	function incrementQuantity(productId: string) {
		quantities[productId] = (quantities[productId] || 1) + 1;
	}

	// Fonction pour décrémenter la quantité
	function decrementQuantity(productId: string) {
		if (quantities[productId] > 1) {
			quantities[productId] -= 1;
		}
	}

	// Fonction pour ajouter un produit suggéré au panier
	function addToCart(product: SuggestedProduct) {
		const quantity = quantities[product.productId] || 1;

		// Utiliser la même approche que Product.svelte
		cart.addToCart({
			id: product.productId,
			name: product.name,
			price: product.price,
			quantity: quantity,
			image: product.image
		});

		// Réinitialiser la quantité
		quantities[product.productId] = 1;

		success('Added item to cart');
		window.localStorage.setItem('cart', JSON.stringify($cart));

		// Recharger les suggestions pour exclure le produit ajouté
		loadSuggestions();
	}

	// Charger les suggestions au montage et quand le panier change
	$: if (cartItems) {
		loadSuggestions();
	}
</script>

<div class="suggestions-section mt-6 border-t pt-4">
	<h3 class="text-lg font-bold mb-4">Frequently bought together</h3>

	{#if loading}
		<div class="text-center py-4 text-gray-500">Loading suggestions...</div>
	{:else if error}
		<div class="text-center py-4 text-red-500">{error}</div>
	{:else if suggestions.length === 0}
		<div class="text-center py-4 text-gray-500">No suggestions available</div>
	{:else}
		<div class="suggestions-scroll max-h-72 overflow-y-auto pr-2">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each suggestions as product}
					<div class="suggestion-card bg-gray-50 rounded-lg p-3 border hover:shadow-md transition-all">
						<div class="flex flex-col items-center">
							<img
								src={product.image}
								alt={product.name}
								class="w-20 h-20 object-cover rounded mb-2"
							/>
							<h4 class="font-semibold text-sm text-center mb-1">{product.name}</h4>
							<p class="text-pink-600 font-bold text-lg mb-2">${product.price}</p>

							<!-- Quantity selector -->
							<div class="flex items-center gap-2 mb-2">
								<button
									on:click={() => decrementQuantity(product.productId)}
									class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
									type="button"
								>
									-
								</button>
								<span class="w-8 text-center font-semibold">{quantities[product.productId] || 1}</span>
								<button
									on:click={() => incrementQuantity(product.productId)}
									class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
									type="button"
								>
									+
								</button>
							</div>

							<!-- Add to cart button -->
							<button
								on:click={() => addToCart(product)}
								class="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-yellow-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
								type="button"
							>
								Add to cart
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.suggestion-card {
		transition: transform 0.2s;
	}

	.suggestion-card:hover {
		transform: translateY(-2px);
	}
</style>
