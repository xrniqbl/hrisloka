/**
 * avatarConfig.js — Avatar icon configuration
 * Maps user avatars to gender categories.
 * All 16 avatars from /public/avataricon/
 *
 * Gender split based on visual design:
 * - male:   1, 2, 4, 6, 7, 8, 9, 10, 11, 13
 * - female: 3, 5, 12, 14, 15, 16
 */

export const AVATAR_BASE = '/avataricon';

export const AVATARS = {
  male: [
    '/avataricon/users-1.svg',
    '/avataricon/users-2.svg',
    '/avataricon/users-4.svg',
    '/avataricon/users-6.svg',
    '/avataricon/users-7.svg',
    '/avataricon/users-8.svg',
    '/avataricon/users-9.svg',
    '/avataricon/users-10.svg',
    '/avataricon/users-11.svg',
    '/avataricon/users-13.svg',
  ],
  female: [
    '/avataricon/users-3.svg',
    '/avataricon/users-5.svg',
    '/avataricon/users-12.svg',
    '/avataricon/users-14.svg',
    '/avataricon/users-15.svg',
    '/avataricon/users-16.svg',
  ],
  all: [
    '/avataricon/users-1.svg',
    '/avataricon/users-2.svg',
    '/avataricon/users-3.svg',
    '/avataricon/users-4.svg',
    '/avataricon/users-5.svg',
    '/avataricon/users-6.svg',
    '/avataricon/users-7.svg',
    '/avataricon/users-8.svg',
    '/avataricon/users-9.svg',
    '/avataricon/users-10.svg',
    '/avataricon/users-11.svg',
    '/avataricon/users-12.svg',
    '/avataricon/users-13.svg',
    '/avataricon/users-14.svg',
    '/avataricon/users-15.svg',
    '/avataricon/users-16.svg',
  ],
};

/**
 * Get a random default avatar based on gender.
 * @param {'male'|'female'|'laki-laki'|'perempuan'|string} gender
 * @returns {string} avatar URL
 */
export function getDefaultAvatar(gender) {
  const g = (gender || '').toLowerCase();
  const isFemale = g === 'female' || g === 'perempuan' || g === 'wanita' || g === 'f';
  const pool = isFemale ? AVATARS.female : AVATARS.male;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Check if a photo URL is an avatar icon (not an uploaded file).
 */
export function isAvatarUrl(url) {
  return url?.includes('/avataricon/');
}
