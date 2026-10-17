'use client';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

let currentLocalStream: MediaStream | null = null;

/**
 * Generate a dynamic live canvas video track if physical camera is blocked/unavailable,
 * guaranteeing video call negotiation never fails or drops.
 */
function createFallbackVideoTrack(): MediaStreamTrack | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let frame = 0;
    const draw = () => {
      frame++;
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#022c22');
      grad.addColorStop(0.5, '#064e3b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // User avatar silhouette circle
      ctx.beginPath();
      ctx.arc(320, 200, 55, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();

      // Pulsing live indicator
      const pulseSize = 6 + Math.sin(frame * 0.1) * 3;
      ctx.beginPath();
      ctx.arc(320, 290, Math.max(3, pulseSize), 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('English Booster • Live Call', 320, 330);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Live Audio Active • Camera Preview', 320, 360);
    };

    draw();
    const intervalId = setInterval(draw, 1000 / 15);
    const stream = canvas.captureStream(15);
    const track = stream.getVideoTracks()[0];
    if (track) {
      const originalStop = track.stop.bind(track);
      track.stop = () => {
        clearInterval(intervalId);
        originalStop();
      };
      return track;
    }
  } catch (e) {
    console.warn('Fallback canvas video track error:', e);
  }
  return null;
}

/**
 * Acquire camera and microphone media with multiple graceful fallbacks
 */
export async function getLocalUserMedia(video: boolean = false): Promise<MediaStream | null> {
  if (typeof window === 'undefined') return null;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // 1. Try standard mobile-friendly constraints
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
        } : false,
      });
      currentLocalStream = stream;
      return stream;
    } catch (err) {
      console.warn('Initial getUserMedia with preferred constraints failed, trying basic:', err);

      // 2. Try generic audio + video constraints
      try {
        const stream2 = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: video ? true : false,
        });
        currentLocalStream = stream2;
        return stream2;
      } catch (err2) {
        console.warn('Generic getUserMedia failed, trying audio-only with video fallback track:', err2);

        // 3. If physical camera failed, acquire audio and attach canvas video track if video was requested
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (video) {
            const fallbackVideo = createFallbackVideoTrack();
            if (fallbackVideo) {
              audioStream.addTrack(fallbackVideo);
            }
          }
          currentLocalStream = audioStream;
          return audioStream;
        } catch (err3) {
          console.warn('Audio getUserMedia also failed:', err3);
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
      const fallbackStream = dst.stream;

      if (video) {
        const fallbackVideo = createFallbackVideoTrack();
        if (fallbackVideo) {
          fallbackStream.addTrack(fallbackVideo);
        }
      }

      currentLocalStream = fallbackStream;
      return fallbackStream;
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
