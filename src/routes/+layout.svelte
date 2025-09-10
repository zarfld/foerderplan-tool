<script lang="ts">
	// Accept any props to avoid warnings - mark as unused
	export const data: any = undefined;
	export const params: any = undefined;

	// Mark as used to prevent warnings
	void (data && params);
</script>

<!-- This is the root layout that wraps all pages -->
<main>
	<slot />
</main>

<style>
	main {
		width: 100%;
		min-height: 100vh;
	}
</style>
