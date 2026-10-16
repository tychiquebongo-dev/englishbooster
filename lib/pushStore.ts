import fs from 'fs';
import path from 'path';

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
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

// In-memory cache for fast lookups
let inMemorySubscriptions: Record<string, PushSubscriptionRecord> = {};
let isLoaded = false;

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

function loadSubscriptions(): Record<string, PushSubscriptionRecord> {
  if (isLoaded && Object.keys(inMemorySubscriptions).length > 0) {
    return inMemorySubscriptions;
  }
  ensureDataFile();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemorySubscriptions = JSON.parse(content || '{}');
      isLoaded = true;
    }
  } catch (err) {
    console.warn('Error reading push subscriptions:', err);
  }
  return inMemorySubscriptions;
}

function saveSubscriptions() {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(inMemorySubscriptions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving push subscriptions to file:', err);
  }
}

export function savePushSubscription(userId: string, subscription: any) {
  loadSubscriptions();
  inMemorySubscriptions[userId] = {
    userId,
    subscription,
    updatedAt: new Date().toISOString(),
  };
  saveSubscriptions();
}

export function getPushSubscription(userId: string): PushSubscriptionRecord | null {
  const all = loadSubscriptions();
  return all[userId] || null;
}

export function removePushSubscription(userId: string) {
  loadSubscriptions();
  if (inMemorySubscriptions[userId]) {
    delete inMemorySubscriptions[userId];
    saveSubscriptions();
  }
}

export function getAllPushSubscriptions(): Record<string, PushSubscriptionRecord> {
  return loadSubscriptions();
}
