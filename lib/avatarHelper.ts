import { createClient } from '@/lib/supabase/client';

/**
 * Resizes and compresses an image file to max width/height of 500px as JPEG/WebP.
 * Returns a lightweight base64 Data URL.
 */
export async function compressImageToDataUrl(file: File, maxSize = 500, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for broad compatibility and compact size
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a profile picture chosen from device gallery.
 * Attempts Supabase Storage first; if the bucket doesn't exist or errors,
 * gracefully falls back to the compressed base64 Data URL.
 * In all cases, updates profiles.avatar_url in Supabase and local storage.
 */
export async function uploadGalleryAvatar(
  file: File, 
  userId: string
): Promise<{ success: boolean; avatarUrl: string; error?: string }> {
  const supabase = createClient();

  try {
    // 1. Always generate optimized compressed Data URL
    const compressedDataUrl = await compressImageToDataUrl(file, 400, 0.85);

    let finalUrl = compressedDataUrl;

    // 2. Try Supabase storage if available
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrl) {
          finalUrl = publicUrl;
        }
      }
    } catch {
      // Storage bucket not configured or blocked; fallback to compressed Data URL
    }

    // 3. Save into Supabase profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: finalUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Supabase profile update warning:', profileError);
    }

    // 4. Cache in browser localStorage for instant retrieval
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`eb_avatar_${userId}`, finalUrl);
      } catch {}
    }

    return { success: true, avatarUrl: finalUrl };
  } catch (err: any) {
    return { success: false, avatarUrl: '', error: err?.message || 'Upload failed' };
  }
}

/**
 * Updates profile avatar with an existing URL (e.g. from preset avatar gallery).
 */
export async function updateUserAvatarUrl(
  avatarUrl: string,
  userId: string
): Promise<{ success: boolean; avatarUrl: string; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.warn('Profile avatar update warning:', error);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`eb_avatar_${userId}`, avatarUrl);
      } catch {}
    }

    return { success: true, avatarUrl };
  } catch (err: any) {
    return { success: false, avatarUrl: '', error: err?.message || 'Failed to update avatar' };
  }
}

// High performance in-memory LRU/memoization cache for avatars
const initialsCache = new Map<string, string>();

/**
 * Generates an SVG Data URI initials avatar with gradient background (base64 encoded).
 */
export function getInitialsAvatar(name?: string | null): string {
  const cleanName = (name || 'EB').trim();
  if (initialsCache.has(cleanName)) {
    return initialsCache.get(cleanName)!;
  }

  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : cleanName.slice(0, 2).toUpperCase() || 'EB';
  
  const gradients = [
    ['#10b981', '#047857'], // emerald
    ['#3b82f6', '#1d4ed8'], // blue
    ['#8b5cf6', '#6d28d9'], // violet
    ['#f59e0b', '#b45309'], // amber
    ['#ec4899', '#be185d'], // pink
    ['#06b6d4', '#0e7490'], // cyan
    ['#14b8a6', '#0f766e'], // teal
    ['#6366f1', '#4338ca'], // indigo
  ];
  
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
  }
  const gradIdx = Math.abs(hash) % gradients.length;
  const [c1, c2] = gradients[gradIdx];
  const gradId = `eb_grad_${Math.abs(hash)}`;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#${gradId})"/><text x="60" y="66" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text></svg>`;
  
  let base64 = '';
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      base64 = window.btoa(unescape(encodeURIComponent(svg)));
    } catch {
      base64 = '';
    }
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(svg).toString('base64');
  }

  const dataUrl = base64 ? `data:image/svg+xml;base64,${base64}` : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  if (initialsCache.size < 500) {
    initialsCache.set(cleanName, dataUrl);
  }
  return dataUrl;
}

export function getUserAvatar(
  avatarUrl?: string | null, 
  name?: string | null, 
  email?: string | null
): string {
  const cleanEmail = (email || '').toLowerCase().trim();
  const isFounder = cleanEmail === 'tychiquebongo@gmail.com' || cleanEmail === 'tychiquebong@gmail.com';
  const localFounderPhoto = '/assets/images/tychique-bongo.jpg';

  if (isFounder) {
    if (!avatarUrl || avatarUrl.includes('/assets/avatars/')) {
      return localFounderPhoto;
    }
    return avatarUrl;
  }

  if (!avatarUrl || avatarUrl.includes('/assets/avatars/')) {
    return getInitialsAvatar(name || 'Member');
  }

  return avatarUrl;
}



