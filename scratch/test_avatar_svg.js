function getInitialsAvatar(name) {
  const cleanName = (name || 'User').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = '';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else {
    initials = (parts[0]?.[0] || 'U').toUpperCase();
  }
  
  const gradients = [
    ['#10b981', '#059669'], // emerald
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
  
  let base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

const res = getInitialsAvatar('Tysha BONGO');
console.log('Result data URL:');
console.log(res);
