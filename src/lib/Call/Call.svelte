<script lang="ts">
	import User from './User.svelte';

	// Props
	export let callData;
	export let startConversation;
	export let stopConversation;
	export let toggleMic;

	// Runes (Svelte 5 reactivity for stores)
	const isMute = callData.isMute;
	const isStarted = callData.isStarted;
	const speakerId = callData.speakerId;

	// Static user list
	const users = [
		{
			id: '1',
			name: 'Tristan Désert',
			role: 'Head of Sales, PowerCorps Inc.',
			img: '/img/user1.svg',
			color: '#ffb74d14'
		},
		{
			id: '2',
			name: 'Amarjeet Kumar',
			role: 'BDR, Sales FR',
			img: '/img/user2.svg',
			color: '#81c78414'
		}
	];

	// Check if user is currently speaking
	const isSpeaking = (userId: string) => $speakerId === userId;
</script>

<div class="call">
	{#each users as user}
		<User
			name={user.name}
			role={user.role}
			image={user.img}
			color={user.color}
			isactive={isSpeaking(user.id)}
		/>
	{/each}

	<div class="controls">
		<p>{callData.time}</p>

		{#if $isStarted}
			<div class="buttons">
				<button
					class="mic"
					class:muted={$isMute}
					on:click={toggleMic}
					aria-label={$isMute ? 'Unmute microphone' : 'Mute microphone'}
				></button>
				<button class="end" on:click={stopConversation} aria-label="End conversation"></button>
			</div>
		{:else}
			<div class="buttons">
				<button class="start" on:click={startConversation}> Start conversation </button>
			</div>
		{/if}
	</div>
</div>

<style scoped lang="scss">
	@import './style.scss';
</style>
