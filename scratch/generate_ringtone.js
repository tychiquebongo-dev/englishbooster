const fs = require('fs');
const path = require('path');

// Ensure public/assets/sounds directory exists
const targetDir = path.join(__dirname, '..', 'public', 'assets', 'sounds');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sampleRate = 44100;
const durationSeconds = 3.8;
const totalSamples = Math.floor(sampleRate * durationSeconds);
const numChannels = 1;
const bytesPerSample = 2; // 16-bit PCM

const dataSize = totalSamples * numChannels * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

// Write WAV header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size
buffer.writeUInt16LE(1, 20);  // PCM format
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Two ring bursts: 0.0s - 0.8s, pause 0.8 - 1.1s, 1.1s - 1.9s, pause 1.9 - 3.8s
for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  let envelope = 0;

  // Burst 1: 0.0 to 0.8s
  if (t >= 0.05 && t < 0.85) {
    const burstT = t - 0.05;
    const attack = Math.min(1, burstT / 0.03);
    const decay = Math.min(1, (0.8 - burstT) / 0.03);
    envelope = attack * decay * 0.75;
  }
  // Burst 2: 1.15s to 1.95s
  else if (t >= 1.15 && t < 1.95) {
    const burstT = t - 1.15;
    const attack = Math.min(1, burstT / 0.03);
    const decay = Math.min(1, (0.8 - burstT) / 0.03);
    envelope = attack * decay * 0.75;
  }

  // Dual tone 440Hz + 480Hz telephone ringer
  const tone1 = Math.sin(2 * Math.PI * 440 * t);
  const tone2 = Math.sin(2 * Math.PI * 480 * t);
  const sampleValue = Math.floor(envelope * 0.5 * (tone1 + tone2) * 32767);

  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sampleValue)), 44 + i * 2);
}

const targetPath = path.join(targetDir, 'phone-ring.wav');
fs.writeFileSync(targetPath, buffer);
console.log('Phone ringtone successfully created at:', targetPath, 'Size:', buffer.length);
