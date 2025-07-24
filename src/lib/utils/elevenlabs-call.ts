import { Conversation } from "@elevenlabs/client";
import { writable, get, type Writable } from 'svelte/store'; // Import Svelte stores   // Import 'effect' for side effects in JS/TS files
import { liveAssist } from "./live-assist"; // Import the Svelte-converted liveAssist module

// Define the structure of the reactive call data
interface CallData {
  isMute: Writable<boolean>;
  isStarted: Writable<boolean>;
  speakerId: Writable<string>;
  time: Writable<string>;
}

// Define the return type of this reusable logic module
interface ElevenlabsCallModule {
  callData: CallData; // The original callData object containing writable stores
  suggestions: Writable<string[]>;
  socketConnected: Writable<boolean>;
  startConversation: () => Promise<void | null>;
  stopConversation: () => Promise<void>;
  toggleMic: () => void;
}

/**
 * Encapsulates the ElevenLabs conversational AI call logic for Svelte applications.
 * This module manages call state, microphone control, and integrates with the liveAssist module.
 * @returns {ElevenlabsCallModule} An object containing reactive stores and control functions.
 */
export function elevenlabsCall(): ElevenlabsCallModule {
  // This 'conversation' object is an instance of ElevenLabs Conversation,
  // not directly reactive state for the UI, so it remains a plain variable.
  let conversation: Conversation | null = null;

  // Reactive call data, exposed as writable stores
  const callData: CallData = {
    isMute: writable(false),
    isStarted: writable(false),
    speakerId: writable(""),
    time: writable("00:00")
  };

  // Destructure reactive stores and functions from the Svelte-converted liveAssist module
  const {
    suggestions,
    socketConnected, // This is a Svelte store
    createSocket,
    sendMessage,
    sendAudio,
    stopSocket
  } = liveAssist(callData); // Pass callData stores to liveAssist

  // Internal timer variables (not directly reactive to the UI)
  let timer: ReturnType<typeof setInterval> | null = null;
  let elapsedSeconds = 0;

  function startTimer(): void {
    stopTimer(); // Ensure any existing timer is cleared
    elapsedSeconds = 0;
    timer = setInterval(() => {
      elapsedSeconds++;
      callData.time.set(formatTime(elapsedSeconds)); // Update the 'time' writable store
    }, 1000);
  }

  function stopTimer(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    elapsedSeconds = 0;
    callData.time.set("00:00"); // Reset 'time' writable store
  }

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  async function startConversation(): Promise<void | null> {
    try {
      let token = localStorage.getItem("token");
      if (!token) {
        // Prompt for token if not found (browser API)
        const updatedToken = prompt("Enter Empower token:");
        if (updatedToken) {
          localStorage.setItem("token", updatedToken);
          token = updatedToken; // Use the newly provided token
        } else {
          console.warn("Empower token not provided. Cannot start conversation.");
          return null; // Exit if no token
        }
      }

      await stopConversation(); // Ensure any previous session is cleanly stopped

      // Request microphone access (browser API)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      createSocket(stream); // Pass stream to liveAssist to set up audio capture

      // Start the ElevenLabs conversation session
      // @ts-expect-error
      conversation = await Conversation.startSession({
        // conversationToken: token,
        agentId: import.meta.env.VITE_AGENT_ID, // Access Vite environment variable
        onConnect: () => {
          callData.isStarted.set(true);  // Update reactive state
          callData.isMute.set(false);    // Update reactive state
          callData.time.set("00:00");    // Update reactive state
          startTimer();
        },
        onDisconnect: () => {
          callData.isStarted.set(false); // Update reactive state
          callData.speakerId.set("");    // Update reactive state
          stopTimer();
        },
        onError: (message: string) => {
          console.error("ElevenLabs Conversation Error:", message);
          // Implement more robust error handling/UI feedback as needed
        },
        onModeChange: (mode: { mode: string }) => {
          // Update speaker ID based on conversation mode
          callData.speakerId.set(mode.mode === "speaking" ? "1" : "2");
        },
        onMessage: sendMessage, // Pass liveAssist's sendMessage function
        onAudio: sendAudio      // Pass liveAssist's sendAudio function
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      // Handle errors like microphone access denied
    }
  }

  async function stopConversation(): Promise<void> {
    if (conversation) {
      await conversation.endSession(); // End the ElevenLabs session
      conversation = null;
    }
    stopSocket(); // Stop the liveAssist WebSocket and clean up audio
  }

  function toggleMic(): void {
    // Read the current mute state using get()
    const state = !get(callData.isMute);
    if (conversation) {
      conversation.setMicMuted(state); // Control ElevenLabs mic mute
    }
    callData.isMute.set(state); // Update reactive state
  }

  // Return reactive stores and functions for use in Svelte components
  return {
    callData,          // Contains isMute, isStarted, speakerId, time (all writable stores)
    suggestions,       // A writable store from liveAssist
    socketConnected,   // A writable store from liveAssist
    startConversation,
    stopConversation,
    toggleMic
  };
}