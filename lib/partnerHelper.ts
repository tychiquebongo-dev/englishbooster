/**
 * partnerHelper.ts
 * Centralized utility to strictly distinguish real registered members
 * from unreal, fake, test, or mock partner profiles across the platform.
 */

const BLACKLISTED_TEST_IDS = new Set([
  '939856ce-efb4-4d39-a9c9-54bce7514910',
  '23cbe44e-7168-4635-b792-0e711ba1be99',
  'seed-1',
  'seed-founder',
]);

const FAKE_OR_TEST_NAMES = [
  'sofia martínez',
  'sofia martinez',
  'kenji sato',
  'amara okafor',
  'lucas weber',
  'chloe laurent',
  'alex rivera',
  'test tester',
  'test user',
  'test.verification.app',
  'test verification',
  'fake user',
  'mock partner',
  'john doe',
  'jane doe',
];

const FAKE_OR_TEST_EMAIL_SUBSTRINGS = [
  'test_user',
  'testmail.com',
  'example.com',
  'example.org',
  'test.verification',
  'fake',
  'mock',
  '@test.',
  'testuser',
];

/**
 * Returns true if the account is identified as a test, fake, or mock profile.
 */
export function isTestAccount(profile: any): boolean {
  if (!profile) return true;

  if (profile.id && BLACKLISTED_TEST_IDS.has(profile.id)) {
    return true;
  }

  const email = (profile.email || '').toLowerCase().trim();
  const name = (profile.full_name || profile.name || '').toLowerCase().trim();

  // Founder and admin accounts are always real
  if (
    email === 'tychiquebongo@gmail.com' ||
    email === 'tychiquebong@gmail.com' ||
    profile.role === 'admin'
  ) {
    return false;
  }

  // Check email
  if (email) {
    for (const sub of FAKE_OR_TEST_EMAIL_SUBSTRINGS) {
      if (email.includes(sub)) return true;
    }
    if (email.startsWith('test.') || email.startsWith('test_')) {
      return true;
    }
  }

  // Check full name
  if (name) {
    for (const fake of FAKE_OR_TEST_NAMES) {
      if (name === fake || name.includes(fake)) return true;
    }
    if (name.startsWith('test ') || name === 'test' || name === 'tester') {
      return true;
    }
  }

  return false;
}

/**
 * Validates whether a profile corresponds to a genuine, real registered member.
 */
export function isRealPartnerProfile(profile: any): boolean {
  if (!profile) return false;

  const email = (profile.email || '').toLowerCase().trim();
  const name = (profile.full_name || profile.name || '').toLowerCase().trim();

  // Founder is always valid
  if (email === 'tychiquebongo@gmail.com' || email === 'tychiquebong@gmail.com') {
    return true;
  }

  // Must not be a test or fake account
  if (isTestAccount(profile)) {
    return false;
  }

  // Must have a real identity (either name or email)
  if (!name && !email) {
    return false;
  }

  return true;
}

/**
 * Filters any list of profiles/partners, ensuring only real registered members remain.
 */
export function filterRealPartners<T extends { email?: string | null; full_name?: string | null; name?: string | null }>(
  profiles: T[] | null | undefined
): T[] {
  if (!profiles || !Array.isArray(profiles)) return [];
  return profiles.filter(isRealPartnerProfile);
}
