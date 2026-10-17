import fs from 'fs';
import path from 'path';
import os from 'os';

export interface PushSubscriptionRecord {
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    expirationTime?: number | null;
  };
  deviceType?: 'mobile' | 'desktop' | 'unknown';
  updatedAt: string;
}

// In-memory cache for fast lookups across the current process
let inMemorySubscriptions: Record<string, PushSubscriptionRecord[]> = {};
let isLoaded = false;

// Resolve writable data file path (supports Vercel serverless /tmp and local dev data/)
function getDataFilePath(): string {
  // Try local project data folder first
  try {
    const localDataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    const localFile = path.join(localDataDir, 'push_subscriptions.json');
    fs.accessSync(localDataDir, fs.constants.W_OK);
    return localFile;
  } catch {
    // Fallback to OS temp directory (always writable in AWS Lambda / Vercel / Linux / Windows)
    const tmpFile = path.join(os.tmpdir(), 'eb_push_subscriptions.json');
    return tmpFile;
  }
}

function loadSubscriptions(): Record<string, PushSubscriptionRecord[]> {
  if (isLoaded && Object.keys(inMemorySubscriptions).length > 0) {
    return inMemorySubscriptions;
  }

  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content || '{}');
      
      // Normalize single records into arrays if previously stored as single object
      const normalized: Record<string, PushSubscriptionRecord[]> = {};
      for (const [uid, val] of Object.entries(parsed)) {
        if (Array.isArray(val)) {
          normalized[uid] = val as PushSubscriptionRecord[];
        } else if (val && typeof val === 'object' && (val as any).subscription) {
          normalized[uid] = [val as PushSubscriptionRecord];
        }
      }
      inMemorySubscriptions = normalized;
      isLoaded = true;
    }
  } catch (err) {
    console.warn('Error reading push subscriptions store:', err);
  }

  return inMemorySubscriptions;
}

function saveSubscriptions() {
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(inMemorySubscriptions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving push subscriptions to disk (in-memory preserved):', err);
  }
}

/**
 * Save or update a user's push subscription.
 * Supports multiple active devices (Mobile phone + Desktop PC) so both ring!
 */
export function savePushSubscription(userId: string, subscription: any, deviceType?: 'mobile' | 'desktop') {
  if (!userId || !subscription || !subscription.endpoint) return;

  loadSubscriptions();

  const userSubs = inMemorySubscriptions[userId] || [];
  const endpoint = subscription.endpoint;

  // Filter out any older entry with the exact same endpoint
  const filtered = userSubs.filter(s => s.subscription?.endpoint !== endpoint);

  // Add the newly updated subscription
  filtered.push({
    userId,
    subscription,
    deviceType: deviceType || 'unknown',
    updatedAt: new Date().toISOString(),
  });

  inMemorySubscriptions[userId] = filtered;
  saveSubscriptions();
}

/**
 * Get all push subscriptions for a user (mobile + desktop)
 */
export function getPushSubscriptions(userId: string): PushSubscriptionRecord[] {
  const all = loadSubscriptions();
  const subs = all[userId] || [];
  return Array.isArray(subs) ? subs : (subs ? [subs] : []);
}

/**
 * Backwards compatible single subscription getter (returns most recent)
 */
export function getPushSubscription(userId: string): PushSubscriptionRecord | null {
  const list = getPushSubscriptions(userId);
  return list.length > 0 ? list[list.length - 1] : null;
}

/**
 * Remove a specific endpoint or all subscriptions for a user
 */
export function removePushSubscription(userId: string, endpoint?: string) {
  loadSubscriptions();
  if (!inMemorySubscriptions[userId]) return;

  if (endpoint) {
    inMemorySubscriptions[userId] = inMemorySubscriptions[userId].filter(
      s => s.subscription?.endpoint !== endpoint
    );
    if (inMemorySubscriptions[userId].length === 0) {
      delete inMemorySubscriptions[userId];
    }
  } else {
    delete inMemorySubscriptions[userId];
  }

  saveSubscriptions();
}

export function getAllPushSubscriptions(): Record<string, PushSubscriptionRecord[]> {
  return loadSubscriptions();
}
