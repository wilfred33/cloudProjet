<script>
	import Products from '../interfaces/products/Products.svelte';
	import Recommendations from '../interfaces/recommendations/Recommendations.svelte';
</script>

<!-- Header-->
<header class="py-5 bg-gradient-to-r from-pink-500 to-yellow-500">
	<div class="container px-4 px-lg-5 my-3">
		<div class="text-center text-white">
			<h1 class="display-4 fw-bolder">Shop in style</h1>
		</div>
	</div>
</header>

<div class="container px-4 px-lg-5">
	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Products Section (3/4 width on large screens) -->
		<div class="lg:col-span-3">
			<Products />
		</div>

		<!-- Recommendations Section (1/4 width on large screens) -->
		<div class="lg:col-span-1">
			<Recommendations />
		</div>
	</div>
</div>
