<script>
	// @ts-nocheck
	import './style.scss';
	const { suggestions, socketConnected } = $props();
	let showOverview = $state(true);

	const tips = [
		'Time is valuable → Keep the pitch concise and directly highlight ROI.',
		'Revenue impact matters → Emphasize how the solution boosts sales efficiency, pipeline growth, or deal closures.',
		'Team adoption is critical → Address ease of use and integration with existing sales tools (CRM, automation, etc.).',
		'Metrics-driven mindset → Back up claims with data, case studies, or potential revenue impact.',
		'Competitor awareness → Be prepared to differentiate from similar solutions they may already know.',
		'Decision influence → They may not be the sole decision-maker but hold strong sway over the buying process—position the solution as a strategic win.'
	];
</script>

<div class="callInfo">
	<div class="overview collapsible" class:open={showOverview}>
		<div class="title" onclick={() => (showOverview = !showOverview)}>
			<div class="icon"></div>
			<span>Call overview</span>
			<div class="arrow"></div>
		</div>
		<div class="content">
			<div class="tags">
				<div class="tag">Sales</div>
				<div class="tag">Discovery</div>
			</div>
			<div class="info">
				<label for="profile-info">Profile</label>
				<p>
					A results-driven VP of Sales overseeing revenue growth, sales strategy, and team
					performance. Likely focused on optimizing sales processes, improving conversion rates, and
					scaling the team efficiently.
				</p>
			</div>
			<div class="info">
				<label for="profile-info">Objective</label>
				<p>Set-up a demo call with the company</p>
			</div>
			<div class="tips">
				<label for="tips">Some tips</label>
				<ul>
					{#each tips as tip}
						<li>{tip}</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>

	<div class="suggestion collapsible" class:open={!showOverview}>
		<div class="title" onclick={() => (showOverview = !showOverview)}>
			<div class="icon"></div>
			<span>Live suggestions</span>
			<span
				class="status"
				class:connected={$socketConnected}
				class:disconnected={!$socketConnected}
			>
				{$socketConnected ? 'Connected' : 'Disconnected'}
			</span>
			<div class="arrow"></div>
		</div>
		<div class="content">
			{#if typeof $suggestions === 'array' && $suggestions?.length > 0 && $suggestions?.filter((s) => s !== 'NOT_NEEDED').length}
				{#each typeof $suggestions === 'array' && $suggestions?.length > 0 && $suggestions?.filter((s) => s !== 'NOT_NEEDED') as suggestion}
					<div class="suggestion">{suggestion}</div>
				{/each}
			{:else}
				<div class="fallback">
					<div class="icon"></div>
					<p>Cards with suggestions and alerts will be available for you once the call begins</p>
				</div>
			{/if}
		</div>
	</div>
</div>
