import { writable, get, type Writable } from 'svelte/store';// For $effect equivalent in standalone JS/TS files

// Define the interface for the callData object that this module expects
interface CallData {
  isMute: Writable<boolean>;
  isStarted: Writable<boolean>;
  speakerId: Writable<string>;
  time: Writable<string>;
}

// Define the return type of this reusable logic module
interface LiveAssistModule {
  transcript: Writable<string>;
  agentSocket: WebSocket | null;
  customerSocket: WebSocket | null;
  suggestions: Writable<string[]>;
  socketConnected: Writable<boolean>;
  createSocket: (stream: MediaStream) => void;
  sendMessage: (message: { source: string; message: string }) => void;
  sendAudio: (base64Audio: string) => void;
  stopSocket: () => void;
}

/**
 * Encapsulates the live assist WebSocket and audio processing logic for Svelte applications.
 * This module provides reactive stores and functions to manage transcription, suggestions,
 * and socket connectivity.
 * @param {CallData} callData - Reactive data related to the ongoing call.
 * @returns {LiveAssistModule} An object containing reactive stores and control functions.
 */
export function liveAssist(callData: CallData): LiveAssistModule {
  // Svelte Stores (reactive state exposed to UI or other stores)
  const transcript = writable<string>("");
  const socketConnected = writable<boolean>(false);
  const suggestions = writable<string[]>([]); // Reactive array

  // Plain JavaScript variables (internal references to non-reactive objects/APIs)
  let customerSocket: WebSocket | null = null;
  let agentSocket: WebSocket | null = null;
  let mediaStream: MediaStream | null = null;
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  let audioProcessor: ScriptProcessorNode | null = null;
  let audioContext: AudioContext | null = null;

  // Helper function to convert Float32Array to Int16Array
  const convertFloat32ToInt16 = (buffer: Float32Array): ArrayBuffer => {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16.buffer;
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createSocketConnection = (role: "AGENT" | "CUSTOMER"): WebSocket | null => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn(`No token found for ${role} socket connection.`);
      return null;
    }

    const socket = new WebSocket(
      `wss://api-eu.dev137.scw.ringover.net/v4/gateway/empower-live-assist?role=${role}&token=${token}`
    );

    socket.onopen = () => {
      console.log(`${role} WebSocket connected`);
      socketConnected.set(true); // Update writable store
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data, `${role} WebSocket message`);
      if (data.type === "final") {
        transcript.update(prev => { // Use .update() for writable store
          const newText = `${prev.length > 0 ? "\n" : ""}${role === "AGENT" ? "AGENT" : "CUSTOMER"
            }: ${data.text}`;
          return prev + newText;
        });
      }
      if (data.type === "battlecard") {
        console.log(data.text, "battlecard");
        suggestions.update(s => [...s, data.text]); // Use .update() for writable store
      }
    };

    socket.onerror = (error) => {
      console.error(`${role} WebSocket error:`, error);
      socketConnected.set(false); // Update writable store
    };

    socket.onclose = () => {
      console.log(`${role} WebSocket disconnected`);
      socketConnected.set(false); // Update writable store
    };

    return socket;
  };

  // Function to set up audio capture and send to agent socket
  const setupAudioCapture = (stream: MediaStream) => {
    try {
      // Create audio context
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)(); // Type assertion for webkitAudioContext

      // Create source from media stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for audio processing
      // Note: ScriptProcessorNode is deprecated. AudioWorklet is preferred for new code.
      audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      // Create destination for audio output (optional, for monitoring)
      audioDestination = audioContext.createMediaStreamDestination();

      // Connect the audio nodes
      source.connect(audioProcessor);
      audioProcessor.connect(audioDestination);

      // Process audio data
      audioProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Get mono audio data

        // Convert Float32Array to Int16Array
        const int16Buffer = convertFloat32ToInt16(inputData);

        // Convert to base64
        const base64Audio = arrayBufferToBase64(int16Buffer);

        // Send to agent socket if it's open
        if (agentSocket?.readyState === WebSocket.OPEN) {
          agentSocket.send(
            JSON.stringify({
              type: "audio",
              data: base64Audio
            })
          );
        }
      };
    } catch (error) {
      console.error("Error setting up audio capture:", error);
    }
  };

  function createSocket(stream: MediaStream) {
    mediaStream = stream; // Assign to plain variable

    // Create WebSocket connections
    agentSocket = createSocketConnection("AGENT");
    customerSocket = createSocketConnection("CUSTOMER");

    // Set up audio processing to capture user audio
    setupAudioCapture(stream);
  }

  function sendMessage(message: { source: string; message: string }) {
    transcript.update(prev => { // Use .update() for writable store
      const newText = `${prev.length > 0 ? "\n" : ""}${message.source === "user" ? "AGENT" : "CUSTOMER"
        }: ${message.message}`;
      return prev + newText;
    });
  }

  function sendAudio(base64Audio: string) {
    if (customerSocket && customerSocket.readyState === WebSocket.OPEN) {
      customerSocket.send(
        JSON.stringify({
          type: "audio",
          data: base64Audio
        })
      );
    }
  }

  function stopSocket() {
    // Close WebSocket connections
    if (agentSocket) {
      agentSocket.close();
      agentSocket = null;
    }
    if (customerSocket) {
      customerSocket.close();
      customerSocket = null;
    }

    // Clean up audio capture
    if (audioProcessor) {
      audioProcessor.disconnect();
      audioProcessor = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (audioDestination) {
      audioDestination.disconnect();
      audioDestination = null;
    }

    // Stop microphone recording
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStream = null;
    }
  }

  return {
    transcript,
    agentSocket,
    customerSocket,
    suggestions,
    socketConnected,
    createSocket,
    sendMessage,
    sendAudio,
    stopSocket
  };
}