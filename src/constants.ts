/**
 * Shared constants for ClaimSaathi
 */

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' }
] as const;

export const PAGE_TRANSITION = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
  transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
};

export const STAGGER_CONTAINER = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export const STAGGER_ITEM = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 }
};
