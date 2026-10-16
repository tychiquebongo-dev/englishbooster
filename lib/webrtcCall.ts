'use client';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

let currentLocalStream: MediaStream | null = null;

/**
 * Acquire camera and microphone media with multiple graceful fallbacks
 */
export async function getLocalUserMedia(video: boolean = false): Promise<MediaStream | null> {
  if (typeof window === 'undefined') return null;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // 1. Try with preferred constraints
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: 'user' } : false,
      });
      currentLocalStream = stream;
      return stream;
    } catch (err) {
      console.warn('Initial getUserMedia with preferred constraints failed, trying basic:', err);
      // 2. Try basic constraints
      try {
        const stream2 = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: video ? true : false,
        });
        currentLocalStream = stream2;
        return stream2;
      } catch (err2) {
        console.warn('Basic getUserMedia failed, attempting audio-only fallback:', err2);
        // 3. If video failed, try audio only
        if (video) {
          try {
            const streamAudioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentLocalStream = streamAudioOnly;
            return streamAudioOnly;
          } catch (err3) {
            console.warn('Audio-only getUserMedia also failed:', err3);
          }
        }
      }
    }
  }

  // 4. Web Audio API silent audio track fallback if physical microphone is unavailable or blocked
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime); // silent
      osc.connect(gain);
      const dst = ctx.createMediaStreamDestination();
      gain.connect(dst);
      osc.start();
      currentLocalStream = dst.stream;
      return dst.stream;
    }
  } catch {}

  return null;
}

/**
 * Stop all tracks on a media stream
 */
export function stopLocalMediaStream(stream?: MediaStream | null) {
  const target = stream || currentLocalStream;
  if (target) {
    try {
      target.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    } catch {}
  }
  if (!stream && currentLocalStream) {
    currentLocalStream = null;
  }
}

/**
 * Toggle track mute
 */
export function toggleAudioTrack(stream: MediaStream | null, enabled?: boolean): boolean {
  if (!stream) return false;
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
    return audioTrack.enabled;
  }
  return false;
}

/**
 * Toggle camera video track
 */
export function toggleVideoTrack(stream: MediaStream | null, enabled?: boolean): boolean {
  if (!stream) return false;
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled;
    return videoTrack.enabled;
  }
  return false;
}

// Backward compatibility helpers
export function getCleanPeerId(userId: string): string {
  const sanitized = userId.replace(/[^a-zA-Z0-9]/g, '');
  return `eb_${sanitized}`;
}

export function toggleAudioMute(muted: boolean): boolean {
  return toggleAudioTrack(currentLocalStream, !muted);
}

export function toggleCamera(cameraOff: boolean): boolean {
  return toggleVideoTrack(currentLocalStream, !cameraOff);
}

export const initPeerInstance = async (_userId: string) => null;
