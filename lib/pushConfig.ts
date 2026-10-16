// Web Push VAPID configuration for English Booster
export const VAPID_PUBLIC_KEY = 
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
  'BDp0HIarL5miW_8L8OQo2JmPqZrI5Pm-h_uYFSMhI7v_gHZvzpU5fezTrJaiI08HLmOR2G2twtDURUj9QtBZpN0';

export const VAPID_PRIVATE_KEY = 
  process.env.VAPID_PRIVATE_KEY || 
  '2AXYzzwLQywgjMIEfjmZNdbWnC_sXAbqNpbc_Ntk5Ho';

export const VAPID_SUBJECT = 
  process.env.VAPID_SUBJECT || 
  'mailto:support@englishbooster.com';

/**
 * Convert URL-safe base64 string to Uint8Array for PushManager subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
