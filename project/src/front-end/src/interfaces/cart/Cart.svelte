<script>
	import { cart, totalPrice, totalQuantity } from '@stores/cart';

	import Modal from '@interfaces/misc/Modal.svelte';
	import CartSuggestions from './CartSuggestions.svelte';
	import { goto } from '$app/navigation';

	let showModal = false;

	function goToCheckout() {
		goto('/checkout');
	}
</script>

<form class="d-flex">
	<button class="btn btn-outline-dark" on:click={() => (showModal = true)}>
		<i class="bi-cart-fill me-1" />
		Cart
		<span class="badge bg-dark text-white ms-1 rounded-pill">{$totalQuantity}</span>
	</button>
</form>
<Modal bind:showModal cssClass="text-center m-2" isCart={true}>
	<h2 slot="header" class="text-xl mb-2">My cart</h2>
	{#if $cart.items && $cart.items.length > 0}
		<div class="max-h-40 overflow-y-auto mb-4">
			<table class="table-auto text-center w-full">
				<thead class="sticky top-0 bg-white">
					<tr>
						<th />
						<th>Item</th>
						<th>Quantity</th>
						<th>Total price</th>
					</tr>
				</thead>
				<tbody>
					{#each $cart.items as item}
						<tr>
							<td><img class="h-14 w-14" src={item.image} alt={item.name} /></td>
							<td>{item.name}</td>
							<td>{item.quantity}</td>
							<td>{item.price * item.quantity}$</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="w-full inline-grid justify-end">
			<p>Total: <span class="font-semibold">{$totalPrice}$</span></p>
		</div>

		<!-- Cart Suggestions Section -->
		<CartSuggestions cartItems={$cart.items} />

		<div class="w-full inline-grid justify-center mt-4">
			<form method="dialog">
				<button
					on:click={goToCheckout}
					class="border-none btn bg-gradient-to-r from-pink-500 to-yellow-500 text-white"
				>
					Checkout
				</button>
			</form>
		</div>
	{:else}
		<p>Your cart is empty</p>
	{/if}
</Modal>
