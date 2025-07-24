<script lang="ts">
	import './page.scss';
	import { elevenlabsCall } from '$lib/utils/elevenlabs-call';
	import Call from '$lib/Call/Call.svelte';
	import CallInfo from '$lib/CallInfo/CallInfo.svelte';
	import { get } from 'svelte/store';
	import { liveAssist } from '$lib/utils/live-assist';

	const { callData, suggestions, socketConnected, startConversation, stopConversation, toggleMic } =
		elevenlabsCall();

	function inputToken(): void {
		const updatedToken = prompt('Enter ElevenLabs API token:');
		if (updatedToken) {
			localStorage.setItem('token', updatedToken);
			alert('Token updated! Please restart the call if already active.');
		}
	}

	$effect(() => {
		// 'get(socketConnected)' reads the current value of the store
		if (get(socketConnected) === false) {
			// Only attempt to stop the conversation if it was actually started
			// This prevents unnecessary calls if the socket just failed to connect initially
			if (get(callData.isStarted) === true) {
				stopConversation();
			}
		}
	});

	// $effect(() => {
	// 	const currentTranscript = get(transcript); // Use get() to access store value
	// 	const isCallStarted = get(callData.isStarted); // Use get() to access store value

	// 	if (isCallStarted && currentTranscript && (agentSocket || customerSocket)) {
	// 		const transcriptionData = {
	// 			type: 'transcription',
	// 			payload: currentTranscript
	// 		};

	// 		// Send to both sockets if they exist and are open
	// 		if (agentSocket?.readyState === WebSocket.OPEN) {
	// 			agentSocket.send(JSON.stringify(transcriptionData));
	// 		}
	// 		if (customerSocket?.readyState === WebSocket.OPEN) {
	// 			customerSocket.send(JSON.stringify(transcriptionData));
	// 		}
	// 	}
	// });
</script>

<div class="page">
	<header class="header">
		<h1>Practice Call</h1>
		<button onclick={inputToken}>Update API Token</button>
	</header>

	<main class="main">
		<Call {callData} {startConversation} {stopConversation} {toggleMic} />
		<CallInfo {suggestions} {socketConnected} />
	</main>
</div>
