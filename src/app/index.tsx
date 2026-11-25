import { Redirect } from 'expo-router';

/**
 * The app's address opens the new app (P-88): `/` — the installed icon's start too — lands on `/go`,
 * replacing this entry, so Back never loops through it. `/go` decides where you left off. The old home
 * lives at `/old` (`(home)/old.tsx`).
 */
export default function Index() {
  return <Redirect href="/go" />;
}
