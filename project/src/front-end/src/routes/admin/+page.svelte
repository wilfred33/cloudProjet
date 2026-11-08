<script>
	import {
		Button,
		ButtonGroup,
		GradientButton,
		Input,
		Label,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Checkbox,
		TableSearch
	} from 'flowbite-svelte';

	import { products, productsMerged } from '@stores/products';
	import Modal from '@interfaces/misc/Modal.svelte';
	import { addToast } from '@stores/toasts';
	let modalProduct = null;
	let searchTerm = '';
	let isUploading = false;
	
	$: filteredItems = $productsMerged.filter(
		(product) => product.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1
	);
	$: showUpdateModal = false;
	$: showCreateModal = false;

	function displayUpdateModal(product) {
		modalProduct = { ...product };
		showUpdateModal = true;
	}

	function displayCreateModal() {
		modalProduct = { name: '', price: 0, category: '', image: '', description: '' };
		showCreateModal = true;
	}

	async function updateModalProduct() {
		isUploading = true;
		try {
			console.log('✏️  Début mise à jour produit:', modalProduct.id);
			
			await products.__updateProduct(modalProduct.id, modalProduct);
			
			addToast({
				message: `Product "${modalProduct.name}" updated successfully!`,
				type: 'success',
				dismissible: true,
				timeout: 3000
			});
			
			// Recharger les produits
			await products.reload();
			
			modalProduct = null;
			showUpdateModal = false;
			
		} catch (error) {
			console.error('Failed to update product:', error);
			addToast({
				message: `Failed to update product: ${error.message}`,
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		} finally {
			isUploading = false;
		}
	}

	async function createProduct() {
		isUploading = true;
		
		try {
			console.log('Création produit avec upload Azure depuis URL');
			
			await products.__addProduct(modalProduct);
			
			addToast({
				message: `Product "${modalProduct.name}" created successfully!`,
				type: 'success',
				dismissible: true,
				timeout: 3000
			});
			
			// Reset
			modalProduct = { name: '', price: 0, category: '', image: '', description: '' };
			showCreateModal = false;
			
		} catch (error) {
			console.error('Failed to create product:', error);
			addToast({
				message: `Failed to create product: ${error.message}`,
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		} finally {
			isUploading = false;
		}
	}

	async function deleteModalProduct() {
		await deleteProduct(modalProduct);
	}

	async function deleteProduct(product) {
		try {
			await products.__deleteProduct(product.id);
			addToast({
				message: `Product "${product.name}" deleted successfully!`,
				type: 'success',
				dismissible: true,
				timeout: 3000
			});
			modalProduct = null;
			showUpdateModal = false;
		} catch (error) {
			addToast({
				message: `Failed to delete product: ${error.message}`,
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
			<h1 class="display-4 fw-bolder">Admin</h1>
		</div>
	</div>
</header>
<div class="sm:p-5 md:p-10">
	<GradientButton color="pinkToOrange" on:click={displayCreateModal}>Add product</GradientButton>
	<TableSearch placeholder="Search by maker name" hoverable={true} bind:inputValue={searchTerm}>
		<TableHead>
			<TableHeadCell>Product name</TableHeadCell>
			<TableHeadCell>Category</TableHeadCell>
			<TableHeadCell>Price</TableHeadCell>
			<TableHeadCell>
				<span class="sr-only"> Edit </span>
			</TableHeadCell>
		</TableHead>
		<TableBody tableBodyClass="divide-y">
			{#each filteredItems as item, index}
				<TableBodyRow>
					<TableBodyCell>{item.name}</TableBodyCell>
					<TableBodyCell>{item.category}</TableBodyCell>
					<TableBodyCell>${item.price}</TableBodyCell>
					<TableBodyCell>
						<ButtonGroup>
							<Button color="yellow" on:click={() => displayUpdateModal(item)}>Edit</Button>
							<Button color="red" on:click={() => deleteProduct(item)}>Delete</Button>
						</ButtonGroup>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</TableSearch>
</div>

<!-- Update Product Modal -->
<Modal bind:showModal={showUpdateModal} cssClass="text-center">
	<h2 slot="header" class="text-xl mb-2">Update product</h2>
	{#if modalProduct}
		<div class="container m-2 space-y-4">
			<Label class="space-y-2">
				<span>Product name</span>
				<Input type="text" class="text-xl" bind:value={modalProduct.name} />
			</Label>
			
			<Label class="space-y-2">
				<span>Product price</span>
				<Input type="number" step=".01" class="text-xl" bind:value={modalProduct.price} />
			</Label>
			
			<Label class="space-y-2">
				<span>Product category</span>
				<Input type="text" class="text-xl" bind:value={modalProduct.category} />
			</Label>
			
			<Label class="space-y-2">
				<span>Product image URL *</span>
				<Input 
					type="text" 
					class="text-xl" 
					bind:value={modalProduct.image} 
					placeholder="https://example.com/image.jpg" 
					required
				/>
				<p class="text-sm text-gray-500">L'image sera automatiquement uploadée vers Azure Blob Storage</p>
			</Label>
			
			{#if modalProduct.image}
				<div class="image-preview-container relative inline-block">
					<img 
						class="card-img-top w-40 h-40 m-auto object-cover rounded-lg border" 
						src={modalProduct.image} 
						alt={modalProduct.name} 
					/>
				</div>
			{/if}
		</div>
		
		<ButtonGroup class="space-x-px mt-4">
			<GradientButton 
				color="purpleToBlue" 
				on:click={updateModalProduct}
				disabled={isUploading || !modalProduct.image}
			>
				{isUploading ? 'Uploading...' : 'Update'}
			</GradientButton>
			<GradientButton color="cyanToBlue" on:click={deleteModalProduct}>Delete</GradientButton>
		</ButtonGroup>
	{/if}
</Modal>

<!-- Create Product Modal -->
<Modal bind:showModal={showCreateModal} cssClass="text-center">
	<h2 slot="header" class="text-xl mb-2">Create product</h2>
	{#if modalProduct}
		<div class="container m-2 space-y-4">
			<Label class="space-y-2">
				<span>Product name *</span>
				<Input type="text" class="text-xl" bind:value={modalProduct.name} required />
			</Label>
			
			<Label class="space-y-2">
				<span>Product category *</span>
				<Input type="text" class="text-xl" bind:value={modalProduct.category} required />
			</Label>
			
			<Label class="space-y-2">
				<span>Product price *</span>
				<Input type="number" step=".01" class="text-xl" bind:value={modalProduct.price} required />
			</Label>
			
			<Label class="space-y-2">
				<span>Product image URL *</span>
				<Input 
					type="text" 
					class="text-xl" 
					bind:value={modalProduct.image} 
					placeholder="https://example.com/image.jpg" 
					required
				/>
				<p class="text-sm text-gray-500">L'image sera automatiquement uploadée vers Azure Blob Storage</p>
			</Label>
			
			{#if modalProduct.image}
				<div class="image-preview-container relative inline-block">
					<img 
						class="card-img-top w-40 h-40 m-auto object-cover rounded-lg border" 
						src={modalProduct.image} 
						alt="Preview" 
					/>
				</div>
			{/if}
		</div>
		
		<ButtonGroup class="space-x-px mt-4">
			<GradientButton 
				color="purpleToBlue" 
				on:click={createProduct}
				disabled={isUploading || !modalProduct.name || !modalProduct.price || !modalProduct.category || !modalProduct.image}
			>
				{isUploading ? 'Creating...' : 'Create Product'}
			</GradientButton>
		</ButtonGroup>
	{/if}
</Modal>

<style>
	.image-preview-container {
		transition: all 0.3s ease;
	}
	
	.image-preview-container:hover {
		transform: scale(1.05);
	}
</style>