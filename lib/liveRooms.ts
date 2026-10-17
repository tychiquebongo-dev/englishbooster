'use client';

export type LiveRoomCategory = 
  | 'conversation' 
  | 'business' 
  | 'debate' 
  | 'ielts' 
  | 'pronunciation' 
  | 'tech';

export type LiveRoomLevel = 
  | 'All Levels' 
  | 'A1-A2' 
  | 'B1-B2' 
  | 'C1-C2';

export interface LiveRoom {
  id: string;
  title: string;
  topic: string;
  category: LiveRoomCategory;
  level: LiveRoomLevel;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostFlag: string;
  hostLevel: string;
  maxSeats: number | 'unlimited';
  isPublic: boolean;
  passcode?: string;
  createdAt: string;
  activeParticipantsCount: number;
  spectatorCount: number;
  aiCoHostEnabled: boolean;
  tags: string[];
  isLive: boolean;
}

export const INITIAL_LIVE_ROOMS: LiveRoom[] = [];

const STORAGE_KEY = 'eb_custom_live_rooms';
const MOCK_IDS = new Set(['EB-LIVE-LONDON', 'EB-LIVE-DEBATE', 'EB-LIVE-IELTS', 'EB-LIVE-BUSINESS']);

/**
 * Retrieve all live rooms (purely real user-created custom rooms)
 */
export function getStoredLiveRooms(): LiveRoom[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const customRooms: LiveRoom[] = JSON.parse(raw);
    if (!Array.isArray(customRooms)) return [];

    // Purge any legacy mock rooms from old localStorage sessions
    const realOnly = customRooms.filter(r => r && r.id && !MOCK_IDS.has(r.id));
    if (realOnly.length !== customRooms.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
    }
    return realOnly;
  } catch (e) {
    console.warn('Error reading stored live rooms:', e);
    return [];
  }
}

/**
 * Save a new or updated user-created live room
 */
export function saveCustomLiveRoom(room: LiveRoom): LiveRoom[] {
  if (typeof window === 'undefined') return [room];

  try {
    const current = getStoredLiveRooms();
    const filtered = current.filter(r => r.id !== room.id);
    const updated = [room, ...filtered];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Broadcast update across browser tabs
    try {
      const channel = new BroadcastChannel('eb_live_rooms_sync');
      channel.postMessage({ type: 'ROOM_CREATED', room });
      channel.close();
    } catch {}

    return updated;
  } catch (e) {
    console.warn('Error saving live room:', e);
    return [room];
  }
}

/**
 * Delete a custom room
 */
export function deleteCustomLiveRoom(roomId: string): LiveRoom[] {
  if (typeof window === 'undefined') return [];

  try {
    const current = getStoredLiveRooms();
    const updated = current.filter(r => r.id !== roomId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const channel = new BroadcastChannel('eb_live_rooms_sync');
      channel.postMessage({ type: 'ROOM_DELETED', roomId });
      channel.close();
    } catch {}

    return updated;
  } catch (e) {
    console.warn('Error deleting live room:', e);
    return [];
  }
}

/**
 * Find room by ID or return default fallback
 */
export function findLiveRoomById(roomId: string): LiveRoom | undefined {
  const rooms = getStoredLiveRooms();
  return rooms.find(r => r.id.toLowerCase() === roomId.toLowerCase());
}

/**
 * Generate a clean, unique readable Room ID
 */
export function generateLiveRoomId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EB-LIVE-${rand}`;
}
