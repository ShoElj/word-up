import { requireOptionalNativeModule } from 'expo-modules-core';
import type { AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

const successSound = require('../assets/sounds/success.wav');

let successPlayer: AudioPlayer | null = null;
let pronunciationPlayer: AudioPlayer | null = null;
let currentPronunciationUri: string | null = null;

async function loadExpoAudio() {
  if (!requireOptionalNativeModule('ExpoAudio')) {
    return null;
  }

  try {
    return await import('expo-audio');
  } catch {
    return null;
  }
}

export async function playWordUpSuccessSound() {
  const Audio = await loadExpoAudio();
  if (!Audio) {
    return;
  }

  try {
    successPlayer ??= Audio.createAudioPlayer(successSound);
    await successPlayer.seekTo(0);
    successPlayer.play();
  } catch {
    return;
  }
}

function speakWordAsFallback(word: string) {
  try {
    Speech.stop();
    Speech.speak(word, { language: 'en-US' });
    return true;
  } catch {
    return false;
  }
}

export async function playWordPronunciation(word: string, uri?: string) {
  if (uri) {
    const Audio = await loadExpoAudio();
    if (Audio) {
      try {
        if (!pronunciationPlayer || currentPronunciationUri !== uri) {
          pronunciationPlayer = Audio.createAudioPlayer({ uri }, { downloadFirst: true });
          currentPronunciationUri = uri;
        }
        await pronunciationPlayer.seekTo(0);
        pronunciationPlayer.play();
        return true;
      } catch {
        // Fall through to the on-device speech fallback below.
      }
    }
  }

  return speakWordAsFallback(word);
}
