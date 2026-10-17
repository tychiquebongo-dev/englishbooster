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

export const INITIAL_LIVE_ROOMS: LiveRoom[] = [
  {
    id: 'EB-LIVE-LONDON',
    title: 'Daily English Fluency & Accent Reduction',
    topic: 'How to express complex thoughts smoothly without translating in your head from your native tongue.',
    category: 'conversation',
    level: 'B1-B2',
    hostId: 'sarah-miller-eb',
    hostName: 'Sarah Miller',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    hostFlag: '🇬🇧',
    hostLevel: 'C2 Native',
    maxSeats: 'unlimited',
    isPublic: true,
    activeParticipantsCount: 4,
    spectatorCount: 18,
    aiCoHostEnabled: true,
    tags: ['Fluency', 'Daily Habits', 'Speaking Confidence'],
    isLive: true,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'EB-LIVE-DEBATE',
    title: 'Global Tech, Startups & AI Revolution',
    topic: 'Will generative AI replace junior software engineers, or create a golden age for multi-disciplinary builders?',
    category: 'debate',
    level: 'B2-C1',
    hostId: 'david-chen-eb',
    hostName: 'David Chen',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    hostFlag: '🇺🇸',
    hostLevel: 'C2',
    maxSeats: 'unlimited',
    isPublic: true,
    activeParticipantsCount: 6,
    spectatorCount: 29,
    aiCoHostEnabled: true,
    tags: ['Technology', 'AI', 'Startup Pitch', 'Debate'],
    isLive: true,
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'EB-LIVE-IELTS',
    title: 'IELTS Speaking Band 8+ Intensive Lab',
    topic: 'Practice Part 2 monologue: Describe a time you had to adapt quickly to a major life change.',
    category: 'ielts',
    level: 'All Levels',
    hostId: 'emma-watson-eb',
    hostName: 'Emma Watson',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    hostFlag: '🇦🇺',
    hostLevel: 'C1-C2',
    maxSeats: 'unlimited',
    isPublic: true,
    activeParticipantsCount: 3,
    spectatorCount: 12,
    aiCoHostEnabled: true,
    tags: ['IELTS', 'Exam Prep', 'Vocabulary', 'Band 8'],
    isLive: true,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'EB-LIVE-BUSINESS',
    title: 'Executive English & Job Interview Mastery',
    topic: 'Structuring high-stakes answers using the STAR method (Situation, Task, Action, Result).',
    category: 'business',
    level: 'B1-B2',
    hostId: 'tychique-founder-eb',
    hostName: 'Tychique Bongo',
    hostAvatar: '/assets/images/tychique-bongo.jpg',
    hostFlag: '🇨🇩',
    hostLevel: 'Founder • C1',
    maxSeats: 'unlimited',
    isPublic: true,
    activeParticipantsCount: 5,
    spectatorCount: 34,
    aiCoHostEnabled: true,
    tags: ['Business', 'Interviews', 'Leadership', 'Salary Negotiation'],
    isLive: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

const STORAGE_KEY = 'eb_custom_live_rooms';

/**
 * Retrieve all live rooms (initial seeded rooms + user-created custom rooms)
 */
export function getStoredLiveRooms(): LiveRoom[] {
  if (typeof window === 'undefined') return INITIAL_LIVE_ROOMS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_LIVE_ROOMS;
    const customRooms: LiveRoom[] = JSON.parse(raw);
    
    // Merge without duplicate IDs; custom rooms appear at the top
    const existingIds = new Set(customRooms.map(r => r.id));
    const defaultFiltered = INITIAL_LIVE_ROOMS.filter(r => !existingIds.has(r.id));
    return [...customRooms, ...defaultFiltered];
  } catch (e) {
    console.warn('Error reading stored live rooms:', e);
    return INITIAL_LIVE_ROOMS;
  }
}

/**
 * Save a new or updated user-created live room
 */
export function saveCustomLiveRoom(room: LiveRoom): LiveRoom[] {
  if (typeof window === 'undefined') return [room, ...INITIAL_LIVE_ROOMS];

  try {
    const current = getStoredLiveRooms();
    const filtered = current.filter(r => r.id !== room.id);
    const updated = [room, ...filtered];

    // Persist only non-default custom rooms to localStorage
    const defaultIds = new Set(INITIAL_LIVE_ROOMS.map(r => r.id));
    const customOnly = updated.filter(r => !defaultIds.has(r.id) || r.id === room.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));

    // Broadcast update across browser tabs
    try {
      const channel = new BroadcastChannel('eb_live_rooms_sync');
      channel.postMessage({ type: 'ROOM_CREATED', room });
      channel.close();
    } catch {}

    return updated;
  } catch (e) {
    console.warn('Error saving live room:', e);
    return [room, ...INITIAL_LIVE_ROOMS];
  }
}

/**
 * Delete a custom room
 */
export function deleteCustomLiveRoom(roomId: string): LiveRoom[] {
  if (typeof window === 'undefined') return INITIAL_LIVE_ROOMS;

  try {
    const current = getStoredLiveRooms();
    const updated = current.filter(r => r.id !== roomId);

    const defaultIds = new Set(INITIAL_LIVE_ROOMS.map(r => r.id));
    const customOnly = updated.filter(r => !defaultIds.has(r.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));

    try {
      const channel = new BroadcastChannel('eb_live_rooms_sync');
      channel.postMessage({ type: 'ROOM_DELETED', roomId });
      channel.close();
    } catch {}

    return updated;
  } catch (e) {
    console.warn('Error deleting live room:', e);
    return INITIAL_LIVE_ROOMS;
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
