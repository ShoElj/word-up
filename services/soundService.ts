import { requireOptionalNativeModule } from 'expo-modules-core';
import type { AudioPlayer } from 'expo-audio';

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

export async function playWordPronunciation(uri?: string) {
  if (!uri) {
    return false;
  }

  const Audio = await loadExpoAudio();
  if (!Audio) {
    return false;
  }

  try {
    if (!pronunciationPlayer || currentPronunciationUri !== uri) {
      pronunciationPlayer = Audio.createAudioPlayer({ uri }, { downloadFirst: true });
      currentPronunciationUri = uri;
    }
    await pronunciationPlayer.seekTo(0);
    pronunciationPlayer.play();
    return true;
  } catch {
    return false;
  }
}
