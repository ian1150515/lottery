import fs from 'fs';
import path from 'path';

// Output directory
const outputDir = path.resolve('public', 'sounds');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const SAMPLE_RATE = 44100;

function createWavBuffer(leftChannel, rightChannel) {
  const numSamples = leftChannel.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples with soft clipping limit
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Soft clip left
    let l = Math.max(-0.95, Math.min(0.95, leftChannel[i]));
    let r = Math.max(-0.95, Math.min(0.95, rightChannel[i]));

    // 16-bit PCM conversion
    const sampleL = Math.floor(l < 0 ? l * 32768 : l * 32767);
    const sampleR = Math.floor(r < 0 ? r * 32768 : r * 32767);

    buffer.writeInt16LE(sampleL, offset);
    buffer.writeInt16LE(sampleR, offset + 2);
    offset += 4;
  }

  return buffer;
}

// ----------------------------------------------------
// GENERATOR 1: 抽獎進行中 (drawing_rolling.wav, ~6.2s)
// ----------------------------------------------------
function generateDrawingRolling() {
  const duration = 6.2;
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Helper synth functions
  const addTone = (startSec, toneDur, freq, amp, pan = 0, type = 'sine', decayExp = 3) => {
    const startIdx = Math.floor(startSec * SAMPLE_RATE);
    const count = Math.floor(toneDur * SAMPLE_RATE);
    const panL = Math.cos((pan + 1) * Math.PI / 4);
    const panR = Math.sin((pan + 1) * Math.PI / 4);

    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      if (idx >= totalSamples) break;
      const t = i / SAMPLE_RATE;
      const env = Math.pow(Math.max(0, 1 - (t / toneDur)), decayExp) * (t < 0.005 ? t / 0.005 : 1);
      let val = 0;
      if (type === 'sine') {
        val = Math.sin(2 * Math.PI * freq * t);
      } else if (type === 'triangle') {
        val = 2 * Math.abs(2 * (t * freq - Math.floor(t * freq + 0.5))) - 1;
      } else if (type === 'bell') {
        // Metallic FM bell
        const mod = Math.sin(2 * Math.PI * (freq * 2.76) * t) * 0.5 * Math.exp(-t * 8);
        val = Math.sin(2 * Math.PI * freq * t + mod);
      }
      left[idx] += val * env * amp * panL;
      right[idx] += val * env * amp * panR;
    }
  };

  const addClick = (startSec, amp = 0.25, pan = 0) => {
    const startIdx = Math.floor(startSec * SAMPLE_RATE);
    const count = Math.floor(0.02 * SAMPLE_RATE);
    const panL = Math.cos((pan + 1) * Math.PI / 4);
    const panR = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      if (idx >= totalSamples) break;
      const t = i / SAMPLE_RATE;
      const f = 1200 * Math.exp(-t * 220) + 300;
      const env = Math.exp(-t * 180);
      const val = (Math.sin(2 * Math.PI * f * t) + (Math.random() - 0.5) * 0.4) * env;
      left[idx] += val * amp * panL;
      right[idx] += val * amp * panR;
    }
  };

  const addKick = (startSec, amp = 0.35) => {
    const startIdx = Math.floor(startSec * SAMPLE_RATE);
    const count = Math.floor(0.12 * SAMPLE_RATE);
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      if (idx >= totalSamples) break;
      const t = i / SAMPLE_RATE;
      const f = 140 * Math.exp(-t * 35) + 45;
      const env = Math.exp(-t * 22);
      const val = Math.sin(2 * Math.PI * f * t) * env;
      left[idx] += val * amp * 0.7;
      right[idx] += val * amp * 0.7;
    }
  };

  // 1. Slot Ticking clicks with accelerating frequency: 8Hz -> 30Hz up to 5.5s
  let clickTime = 0;
  let clickCount = 0;
  while (clickTime < 5.5) {
    const progress = clickTime / 5.5; // 0 to 1
    // Frequency ramps up from 7 Hz to 28 Hz
    const currentRate = 7 + Math.pow(progress, 1.8) * 22;
    const interval = 1 / currentRate;
    const pan = (Math.sin(clickCount * 1.7) * 0.4);
    const clickAmp = 0.18 + progress * 0.15;
    addClick(clickTime, clickAmp, pan);

    // Complementary marimba / slot pip note
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const note = pentatonic[clickCount % pentatonic.length] * (progress > 0.6 ? 1.5 : 1);
    addTone(clickTime, 0.05, note, 0.09 + progress * 0.08, -pan, 'triangle', 4);

    clickTime += interval;
    clickCount++;
  }

  // 2. Rhythmic kick & bass pulse (accelerating excitement)
  const beatTimes = [
    0.0, 0.45, 0.9, 1.35, 1.75, 2.15, 2.5, 2.85, 3.15, 3.45, 
    3.72, 3.98, 4.22, 4.45, 4.67, 4.88, 5.08, 5.26, 5.42
  ];
  beatTimes.forEach((bt, idx) => {
    if (bt < 5.5) {
      addKick(bt, 0.28 + (idx / beatTimes.length) * 0.15);
      // Cheerful synth bass note (F2 -> G2 -> C3)
      const bassFreq = idx % 2 === 0 ? 110 : 130.81;
      addTone(bt, 0.12, bassFreq, 0.18, 0, 'triangle', 2);
    }
  });

  // 3. Cute sparkling glockenspiel arpeggios that blossom as tension rises
  const sparkleChimes = [
    { t: 0.2, f: 1046.5 }, { t: 0.5, f: 1318.5 }, { t: 0.8, f: 1567.98 },
    { t: 1.2, f: 1760.0 }, { t: 1.6, f: 2093.0 }, { t: 2.0, f: 2349.3 },
    { t: 2.5, f: 2637.0 }, { t: 3.0, f: 3135.96 }, { t: 3.5, f: 3520.0 },
    { t: 4.0, f: 3951.0 }, { t: 4.4, f: 4186.0 }, { t: 4.8, f: 4698.6 },
    { t: 5.1, f: 5274.0 }, { t: 5.3, f: 5873.3 }
  ];
  sparkleChimes.forEach((sc, i) => {
    const pan = (i % 2 === 0 ? -0.5 : 0.5);
    addTone(sc.t, 0.35, sc.f, 0.13, pan, 'bell', 5);
  });

  // 4. Climax Swell (4.0s - 5.5s): Warm riser sweep
  const riserStart = Math.floor(4.0 * SAMPLE_RATE);
  const riserEnd = Math.floor(5.5 * SAMPLE_RATE);
  for (let idx = riserStart; idx < riserEnd; idx++) {
    const p = (idx - riserStart) / (riserEnd - riserStart);
    const t = (idx - riserStart) / SAMPLE_RATE;
    const sweepFreq = 300 + Math.pow(p, 2.5) * 1200;
    const amp = p * 0.14 * Math.sin(2 * Math.PI * sweepFreq * t);
    left[idx] += amp * 0.8;
    right[idx] += amp * 0.8;
  }

  // 5. Distinct brake ratchet (5.5s ~ 5.75s)
  const brakeTimes = [5.52, 5.58, 5.66, 5.76];
  brakeTimes.forEach((bt, idx) => {
    addClick(bt, 0.4 - idx * 0.06, 0);
    addTone(bt, 0.04, 1800 - idx * 250, 0.12, 0, 'triangle', 4);
  });

  // 6. Suspense Pause (5.8s ~ 6.2s) - Pure dramatic breath, subtle tiny bell tail fading out
  addTone(5.78, 0.32, 2637.02, 0.08, 0.2, 'bell', 6);

  return createWavBuffer(left, right);
}

// ----------------------------------------------------
// GENERATOR 2: 中獎音效 (winner_fanfare.wav, ~4.0s)
// ----------------------------------------------------
function generateWinnerFanfare() {
  const duration = 4.0;
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const addTone = (startSec, toneDur, freq, amp, pan = 0, type = 'synth', decayExp = 2.5) => {
    const startIdx = Math.floor(startSec * SAMPLE_RATE);
    const count = Math.floor(toneDur * SAMPLE_RATE);
    const panL = Math.cos((pan + 1) * Math.PI / 4);
    const panR = Math.sin((pan + 1) * Math.PI / 4);

    for (let i = 0; i < count; i++) {
      const idx = startIdx + i;
      if (idx >= totalSamples) break;
      const t = i / SAMPLE_RATE;
      const attack = t < 0.015 ? t / 0.015 : 1;
      const decay = Math.pow(Math.max(0, 1 - (t / toneDur)), decayExp);
      const env = attack * decay;

      let val = 0;
      if (type === 'synth') {
        // Brass / Warm festive synth horn: fundamental + harmonics
        val = Math.sin(2 * Math.PI * freq * t) * 0.6 +
              Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 +
              Math.sin(2 * Math.PI * freq * 3 * t) * 0.15;
      } else if (type === 'bell') {
        // Metallic tubular chime
        const mod = Math.sin(2 * Math.PI * freq * 2.756 * t) * 0.4 * Math.exp(-t * 4);
        val = Math.sin(2 * Math.PI * freq * t + mod) * 0.7 + Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.3;
      } else if (type === 'sparkle') {
        val = Math.sin(2 * Math.PI * freq * t);
      }
      left[idx] += val * env * amp * panL;
      right[idx] += val * env * amp * panR;
    }
  };

  // 1. Immediate reveal impact (0.0s): Festive bass boom + golden shimmer blast
  const impactCount = Math.floor(0.4 * SAMPLE_RATE);
  for (let i = 0; i < impactCount; i++) {
    const t = i / SAMPLE_RATE;
    const boomF = 180 * Math.exp(-t * 20) + 40;
    const boomEnv = Math.exp(-t * 12);
    const boomVal = Math.sin(2 * Math.PI * boomF * t) * boomEnv * 0.45;
    // Golden sizzle / glitter burst
    const noiseEnv = Math.exp(-t * 16);
    const noiseVal = (Math.random() - 0.5) * noiseEnv * 0.25;
    left[i] += boomVal * 0.8 + noiseVal * 0.7;
    right[i] += boomVal * 0.8 + noiseVal * 0.7;
  }

  // 2. Triumphant Festive Horn Fanfare Melodic Motif:
  // Step 1: C5 (523.25) & E5 (659.25) & G5 (783.99) at 0.02s
  addTone(0.02, 0.32, 523.25, 0.25, -0.2, 'synth');
  addTone(0.02, 0.32, 659.25, 0.22, 0.2, 'synth');
  addTone(0.02, 0.32, 783.99, 0.20, 0.0, 'synth');

  // Step 2: G5 (783.99) & B5 (987.77) & D6 (1174.66) at 0.32s
  addTone(0.32, 0.35, 783.99, 0.25, -0.3, 'synth');
  addTone(0.32, 0.35, 987.77, 0.22, 0.1, 'synth');
  addTone(0.32, 0.35, 1174.66, 0.22, 0.3, 'synth');

  // Step 3: A5 (880.0) & C6 (1046.5) & E6 (1318.5) at 0.62s
  addTone(0.62, 0.42, 880.0, 0.26, -0.2, 'synth');
  addTone(0.62, 0.42, 1046.5, 0.26, 0.2, 'synth');
  addTone(0.62, 0.42, 1318.5, 0.24, 0.0, 'synth');

  // Step 4 (GRAND VICTORY PEAK): High C6 (1046.5), E6 (1318.5), G6 (1567.98), C7 (2093.0) at 0.95s sustained!
  addTone(0.95, 2.3, 523.25, 0.28, 0.0, 'synth', 1.8);
  addTone(0.95, 2.3, 1046.5, 0.30, -0.25, 'synth', 1.8);
  addTone(0.95, 2.3, 1318.5, 0.28, 0.25, 'synth', 1.8);
  addTone(0.95, 2.3, 1567.98, 0.26, -0.1, 'synth', 1.8);
  addTone(0.95, 2.3, 2093.0, 0.24, 0.1, 'bell', 2.0);

  // 3. Gold Coin Cascades (Coins dropping & jingling on reveal)
  const coinTimes = [
    0.15, 0.28, 0.42, 0.58, 0.72, 0.85, 1.02, 1.15, 1.28, 1.42, 
    1.56, 1.72, 1.88, 2.05, 2.22, 2.42, 2.65, 2.88
  ];
  coinTimes.forEach((ct, i) => {
    const f = 2400 + ((i * 350) % 2100);
    const pan = ((i % 3) - 1) * 0.6;
    addTone(ct, 0.15, f, 0.14, pan, 'bell', 4);
    // Double ping
    addTone(ct + 0.025, 0.12, f * 1.35, 0.10, -pan, 'sparkle', 5);
  });

  // 4. Shimmering Windchime / Celesta Finale Sparkle (1.2s ~ 3.6s)
  const celestialNotes = [
    { t: 1.1, f: 2093.0 }, { t: 1.3, f: 2637.0 }, { t: 1.5, f: 3135.96 },
    { t: 1.7, f: 3520.0 }, { t: 1.9, f: 4186.0 }, { t: 2.2, f: 3520.0 },
    { t: 2.5, f: 2637.0 }, { t: 2.8, f: 2093.0 }, { t: 3.1, f: 1567.98 }
  ];
  celestialNotes.forEach((cn, i) => {
    const pan = (Math.sin(i * 1.3) * 0.7);
    addTone(cn.t, 0.7, cn.f, 0.12, pan, 'sparkle', 3.5);
  });

  return createWavBuffer(left, right);
}

// Write files
const rollingWav = generateDrawingRolling();
fs.writeFileSync(path.join(outputDir, 'drawing_rolling.wav'), rollingWav);
console.log(`Generated: ${path.join(outputDir, 'drawing_rolling.wav')} (${rollingWav.length} bytes)`);

const fanfareWav = generateWinnerFanfare();
fs.writeFileSync(path.join(outputDir, 'winner_fanfare.wav'), fanfareWav);
console.log(`Generated: ${path.join(outputDir, 'winner_fanfare.wav')} (${fanfareWav.length} bytes)`);
