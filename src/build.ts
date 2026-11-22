import { versionLabel } from '@/domain/update';

/** Set by `npm run build:web` (git short sha and build date); "dev" otherwise. Read with dot access so Expo inlines them. */
export const BUILD_ID = process.env.EXPO_PUBLIC_BUILD_ID || 'dev';
export const BUILD_DATE = process.env.EXPO_PUBLIC_BUILD_DATE || '';

export const VERSION_LABEL = versionLabel(BUILD_ID, BUILD_DATE);
