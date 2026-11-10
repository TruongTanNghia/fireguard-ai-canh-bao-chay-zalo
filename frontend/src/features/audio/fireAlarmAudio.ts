let audioCtx: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: any = null;
let isPlayingSiren = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playFireSiren(volumePercent: number = 100) {
  if (typeof window === "undefined") return;
  if (isPlayingSiren) return;

  try {
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    const osc = ctx.createOscillator();

    const maxVolume = Math.max(0, Math.min(1, volumePercent / 100)) * 0.4;
    gainNode.gain.setValueAtTime(maxVolume, ctx.currentTime);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, ctx.currentTime);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();

    // Biến thiên tần số âm thanh từ 600Hz đến 1200Hz (Hi-Lo Siren)
    let isHigh = false;
    sirenInterval = setInterval(() => {
      if (!ctx || !osc) return;
      isHigh = !isHigh;
      const targetFreq = isHigh ? 1100 : 650;
      osc.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.35);
    }, 400);

    sirenOscillator = osc;
    sirenGain = gainNode;
    isPlayingSiren = true;
  } catch (e) {
    console.warn("[FireAlarmAudio] Không thể phát còi hú:", e);
  }
}

export function stopFireSiren() {
  if (!isPlayingSiren) return;

  try {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (sirenOscillator) {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
      sirenOscillator = null;
    }
    if (sirenGain) {
      sirenGain.disconnect();
      sirenGain = null;
    }
    isPlayingSiren = false;
  } catch (e) {
    console.warn("[FireAlarmAudio] Lỗi dừng còi hú:", e);
  }
}
