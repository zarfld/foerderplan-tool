<!-- @ts-nocheck -->
<script lang="ts">
	import DatabaseSettings from '$lib/components/DatabaseSettings.svelte';
</script>

<svelte:head>
	<title>Datenbank-Einstellungen - Förderplan Tool</title>
</svelte:head>

<div class="settings-page">
	<nav class="breadcrumb">
		<a href="/">← Zurück zur Hauptseite</a>
	</nav>
	
	<DatabaseSettings />
</div>

<style>
	.settings-page {
		min-height: 100vh;
		background: #f8fafc;
	}
	
	.breadcrumb {
		padding: 1rem 2rem;
		background: white;
		border-bottom: 1px solid #e5e7eb;
	}
	
	.breadcrumb a {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
	}
	
	.breadcrumb a:hover {
		text-decoration: underline;
	}
</style>
