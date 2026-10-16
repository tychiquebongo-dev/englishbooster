'use client';

import type Peer from 'peerjs';

export interface RemoteCallState {
  callActive: boolean;
  isConnecting: boolean;
  incomingCall: boolean;
  callerName: string;
  callerId: string;
  callerAvatar: string;
  isVideo: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  durationSeconds: number;
}

const GOOGLE_STUN_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  },
};

export function getCleanPeerId(userId: string): string {
  const sanitized = userId.replace(/[^a-zA-Z0-9]/g, '');
  return `eb_${sanitized}`;
}

let activePeerInstance: Peer | null = null;
let currentLocalStream: MediaStream | null = null;
let currentMediaCall: any = null;

export async function initPeerInstance(userId: string): Promise<Peer | null> {
  if (typeof window === 'undefined') return null;

  if (activePeerInstance && !activePeerInstance.destroyed) {
    return activePeerInstance;
  }

  const { default: PeerClass } = await import('peerjs');
  const peerId = getCleanPeerId(userId);

  return new Promise((resolve) => {
    try {
      const peer = new PeerClass(peerId, GOOGLE_STUN_CONFIG);

      peer.on('open', (id) => {
        activePeerInstance = peer;
        resolve(peer);
      });

      peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          resolve(activePeerInstance);
        } else {
          console.warn('PeerJS connection notice:', err);
          resolve(null);
        }
      });
    } catch (e) {
      console.warn('Failed to initialize PeerJS:', e);
      resolve(null);
    }
  });
}

export async function getLocalUserMedia(video: boolean = false): Promise<MediaStream | null> {
  if (typeof window === 'undefined') return null;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
      });
      currentLocalStream = stream;
      return stream;
    } catch (err) {
      console.warn('Initial getUserMedia with ideal constraints failed, trying basic:', err);
      try {
        const stream2 = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: video ? true : false,
        });
        currentLocalStream = stream2;
        return stream2;
      } catch (err2) {
        if (video) {
          try {
            const streamAudioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentLocalStream = streamAudioOnly;
            return streamAudioOnly;
          } catch {}
        }
      }
    }
  }

  // Graceful Web Audio fallback if system mic is blocked or unavailable
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      currentLocalStream = dst.stream;
      return dst.stream;
    }
  } catch {}

  return null;
}

export function stopLocalMediaStream() {
  if (currentLocalStream) {
    try {
      currentLocalStream.getTracks().forEach((track) => track.stop());
    } catch {}
    currentLocalStream = null;
  }
  if (currentMediaCall) {
    try {
      currentMediaCall.close();
    } catch {}
    currentMediaCall = null;
  }
}

export function toggleAudioMute(muted: boolean): boolean {
  if (currentLocalStream) {
    const audioTrack = currentLocalStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !muted;
      return audioTrack.enabled;
    }
  }
  return false;
}

export function toggleCamera(cameraOff: boolean): boolean {
  if (currentLocalStream) {
    const videoTrack = currentLocalStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !cameraOff;
      return videoTrack.enabled;
    }
  }
  return false;
}
