<script lang="ts">
	import { onMount } from 'svelte';

	interface TrendingProduct {
		productId: string;
		totalSold: number;
		name: string;
		price: number;
		category: string;
		image: string;
	}

	let trendingProducts: TrendingProduct[] = [];
	let loading = true;
	let error = '';

	// Calcule le nombre d'étoiles en fonction du rang (5 étoiles pour le 1er, 4 pour le 2e, etc.)
	function getStars(index: number): string {
		const rating = 5 - index; // 5 étoiles pour index 0, 4 pour index 1, etc.
		const fullStars = '★'.repeat(rating);
		const emptyStars = '☆'.repeat(5 - rating);
		return fullStars + emptyStars;
	}

	onMount(async () => {
		try {
			const response = await fetch('/api/recommendations/trending');
			const data = await response.json();

			if (data.status === 'success') {
				trendingProducts = data.trending;
			} else {
				error = 'Failed to load recommendations';
			}
		} catch (err) {
			error = 'Failed to load recommendations';
			console.error(err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="recommendations-sidebar">
	<h2 class="text-2xl font-bold mb-4">Top Selling Products</h2>

	{#if loading}
		<div class="text-center py-4">Loading...</div>
	{:else if error}
		<div class="text-red-500 py-4">{error}</div>
	{:else if trendingProducts.length === 0}
		<div class="text-gray-500 py-4">No recommendations available</div>
	{:else}
		<div class="space-y-4">
			{#each trendingProducts as product, index}
				<div class="recommendation-item bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
					<div class="flex items-center gap-3">
						<img
							src={product.image}
							alt={product.name}
							class="w-16 h-16 object-cover rounded"
						/>
						<div class="flex-1">
							<h3 class="font-semibold text-sm">{product.name}</h3>
							<div class="flex items-center justify-between mt-1">
								<span class="text-lg font-bold text-pink-600">${product.price}</span>
								<div class="flex items-center text-yellow-500 text-xs">
									<span>{getStars(index)}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.recommendations-sidebar {
		position: sticky;
		top: 1rem;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
	}

	.recommendation-item {
		cursor: pointer;
	}

	.recommendation-item:hover {
		transform: translateY(-2px);
	}
</style>
