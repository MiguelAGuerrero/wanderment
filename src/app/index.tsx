import { Redirect } from 'expo-router';

/**
 * The app's address opens the new app (P-88): `/` — the installed icon's start too — lands on `/go`,
 * replacing this entry, so Back never loops through it. `/go` decides where you left off.
 */
export default function Index() {
  return <Redirect href="/go" />;
}
