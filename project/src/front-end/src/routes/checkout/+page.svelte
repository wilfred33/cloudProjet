<script lang="ts">
	import { totalPrice, totalQuantity } from '@stores/cart';
	import { cart } from '@stores/cart';
	import { user } from '@stores/auth';
	import { onMount } from 'svelte';
	import { addToast } from '@stores/toasts';
	import axios from 'axios';
	import { browser } from '$app/environment';

	// Côté serveur : URL absolue vers gateway
	// Côté client (navigateur) : URL relative /api
	const gatewayUrl = browser ? '/api' : 'http://gateway-container:80';
	let prevCheckout: any[] = [];

	onMount(async () => {
		// Charger l'historique depuis le backend
		if ($user.isLogged && $user.username) {
			try {
				const response = await axios.get(`${gatewayUrl}/history/${$user.username}`);
				if (response.data.status === 'success') {
					const items = response.data.history.items || [];
					// Transformer les items en format checkout
					if (items.length > 0) {
						const totalPrice = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
						prevCheckout = [{
							items: items,
							extras: { totalPrice }
						}];
					} else {
						prevCheckout = [];
					}
				}
			} catch (error) {
				console.error('Error loading history:', error);
			}
		}
	});

	async function handleCheckout() {
		if (!$user.isLogged || !$user.username) {
			addToast({
				message: 'Please login to checkout',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
			return;
		}

		try {
			// Préparer l'achat
			const purchase = {
				items: $cart.items,
				totalQuantity: $totalQuantity,
				totalPrice: $totalPrice,
				date: new Date().toISOString()
			};

			// POST vers le Gateway → redirigé vers History service
			const response = await axios.post(
				`${gatewayUrl}/history/${$user.username}`,
				purchase
			);

			if (response.data.status === 'success') {
				// Mettre à jour l'historique local
				const items = response.data.history.items || [];
				if (items.length > 0) {
					const totalPrice = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
					prevCheckout = [{
						items: items,
						extras: { totalPrice }
					}];
				} else {
					prevCheckout = [];
				}

				// Vider le panier (appel DELETE vers cart service)
				await cart.clearCart();

				addToast({
					message: 'Purchase completed successfully!',
					type: 'success',
					dismissible: true,
					timeout: 3000
				});
			}
		} catch (error: any) {
			console.error('Checkout error:', error);
			addToast({
				message: error.response?.data?.message || 'Checkout failed',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		}
	}
</script>

<!-- Header-->
<header class="py-5 bg-gradient-to-r from-pink-500 to-yellow-500">
	<div class="container px-4 px-lg-5 my-3">
		<div class="text-center text-white">
			<h1 class="display-4 fw-bolder">Checkout</h1>
		</div>
	</div>
</header>
<div class="container p-3 max-w-4xl">
	<main>
		<div class="py-5 row g-5">
			<!-- Current cart -->
			<div class="col-md-6 col-lg-5 order-md-last">
				<h4 class="d-flex justify-content-end align-items-center mb-3">
					<span class="text-primary text-2xl pr-3">Your cart</span>
					<span class="badge bg-primary rounded-pill">{$totalQuantity}</span>
				</h4>
				<ul class="list-group mb-3">
					{#if $cart.items && $cart.items.length > 0}
						{#each $cart.items as item}
							<li class="list-group-item grid grid-flow-row-dense grid-cols-4 lh-sm">
								<img class="object-contain h-10 w-10" src={item.image} alt={item.name} />
								<div class="m-auto">{item.name}</div>
								<span class="text-body-secondary text-gray-500 m-auto">{item.quantity}</span>
								<span class="text-body-secondary text-gray-500 m-auto"
									>${item.price * item.quantity}</span
								>
							</li>
						{/each}
						<form method="POST" on:submit|preventDefault={handleCheckout}>
							<button
								class="w-100 btn btn-primary bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 border-none my-3"
								type="submit">Checkout</button
							>
						</form>
					{:else}
						<li class="list-group-item grid grid-flow-row-dense lh-sm">Your cart is empty</li>
					{/if}
				</ul>
			</div>
			<!-- Previous purchases -->
			<div class="col-md-6 col-lg-7">
				<h1 class="text-2xl mb-3 text-center">Purchase history</h1>
				<ul class="list-group mb-3">
					{#if prevCheckout}
						{#each prevCheckout as checkout}
							<li class="list-group-item grid grid-flow-row-dense grid-cols-2 lh-sm">
								{#each checkout.items as item}
									<div class="m-auto flex justify-end w-full">
										<img class="object-contain h-10 w-10" src={item.image} alt={item.name} />
										<span class="my-auto">
											{item.quantity} x
											{item.name}</span
										>
									</div>
									<span class="text-body-secondary text-gray-500 m-auto"
										>${item.price * item.quantity}</span
									>
								{/each}
								<div class="m-auto w-full pt-2 col-auto">Total: ${checkout.extras.totalPrice}</div>
							</li>
						{/each}
					{:else}
						<li class="list-group-item grid grid-flow-row-dense lh-sm">Your cart is empty</li>
					{/if}
				</ul>
			</div>
		</div>
	</main>
</div>
