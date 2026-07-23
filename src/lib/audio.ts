export let audioCtx: AudioContext | null = null;
export let masterGain: GainNode | null = null;

export function initAudio() {
  if (audioCtx) return;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioCtx = new AudioContextClass();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5; // Base volume
  masterGain.connect(audioCtx.destination);

  // Browsers create the context in a "suspended" state until a user gesture.
  // initAudio() is always called from a click/tap, so resume() here is trusted.
  audioCtx.resume().catch(() => {});
}

/**
 * Safely bring the AudioContext back to life after the tab lost focus
 * (Alt-Tab away, minimized, screen lock, etc.) or after any user gesture.
 * No-ops when there is no context or it is already running.
 */
export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

// 88 Piano key frequencies starting from C3 to keep a good range
export const PIANO_NOTES = [
  130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94, // C3-B3
  261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, // C4-B4
  523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77, // C5-B5
  1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53 // C6-B6
];

export function playExactFrequency(freq: number) {
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;

  const osc1 = audioCtx.createOscillator(); 
  const osc2 = audioCtx.createOscillator(); 
  const noteGain = audioCtx.createGain();
  
  osc1.type = 'triangle';
  osc2.type = 'sine';
  
  osc1.frequency.value = freq;
  // Overtones
  osc2.frequency.value = freq * 2; 

  const mix1 = audioCtx.createGain();
  const mix2 = audioCtx.createGain();
  mix1.gain.value = 0.8;
  mix2.gain.value = 0.2;

  osc1.connect(mix1);
  osc2.connect(mix2);
  mix1.connect(noteGain);
  mix2.connect(noteGain);

  noteGain.gain.setValueAtTime(0, now);
  noteGain.gain.linearRampToValueAtTime(1, now + 0.015);
  noteGain.gain.exponentialRampToValueAtTime(0.2, now + 0.2); 
  noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); 
  
  noteGain.connect(masterGain);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 2.5);
  osc2.stop(now + 2.5);
}

export function playPianoNote(charCode: number) {
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;

  const osc1 = audioCtx.createOscillator(); 
  const osc2 = audioCtx.createOscillator(); 
  const noteGain = audioCtx.createGain();
  
  const index = Math.abs(charCode) % PIANO_NOTES.length;
  const freq = PIANO_NOTES[index];

  osc1.type = 'triangle';
  osc2.type = 'sine';
  
  osc1.frequency.value = freq;
  // Overtones
  osc2.frequency.value = freq * 2; 

  const mix1 = audioCtx.createGain();
  const mix2 = audioCtx.createGain();
  mix1.gain.value = 0.8;
  mix2.gain.value = 0.2;

  osc1.connect(mix1);
  osc2.connect(mix2);
  mix1.connect(noteGain);
  mix2.connect(noteGain);

  noteGain.gain.setValueAtTime(0, now);
  noteGain.gain.linearRampToValueAtTime(1, now + 0.015);
  noteGain.gain.exponentialRampToValueAtTime(0.2, now + 0.2); 
  noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); 
  
  noteGain.connect(masterGain);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 2.5);
  osc2.stop(now + 2.5);
}

export function playDJNote(charCode: number) {
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;
  const index = Math.abs(charCode) % 8;

  if (index === 0) {
    // Kick drum
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
    
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (index === 1) {
    // Snare drum
    const bufferSize = audioCtx.sampleRate * 0.2; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    noise.connect(filter);
    
    const noiseGain = audioCtx.createGain();
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.frequency.setValueAtTime(250, now);
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);

    noise.start(now);
    noise.stop(now + 0.2);
  } else if (index === 2) {
    // Hi-hat
    const bufferSize = audioCtx.sampleRate * 0.1; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    noise.connect(filter);
    
    const gain = audioCtx.createGain();
    filter.connect(gain);
    gain.connect(masterGain);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    noise.start(now);
    noise.stop(now + 0.1);
  } else if (index === 3) {
    // Sub bass
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(masterGain);
    
    const freq = [32.7, 41.2, 49.0, 55.0][charCode % 4]; // low C, E, G, A
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (index === 4) {
    // Laser Zap
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (index === 5) {
    // Cowbell / plink
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc1.type = 'square';
    osc2.type = 'square';
    
    osc1.frequency.value = 800;
    osc2.frequency.value = 540;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.1);
    osc2.stop(now + 0.1);
  } else if (index === 6) {
    // Scratch
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.05);
    osc.frequency.linearRampToValueAtTime(200, now + 0.1);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } else {
    // Synth blip
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    const noteIndex = Math.abs(charCode * 3) % PIANO_NOTES.length;
    osc.frequency.value = PIANO_NOTES[noteIndex];
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export function stopAudio() {
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}
