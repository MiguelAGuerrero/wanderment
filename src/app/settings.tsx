import { Redirect } from 'expo-router';

/** Settings lives at `/go/settings` (P-89); the address it had before still gets there. */
export default function OldSettings() {
  return <Redirect href="/go/settings" />;
}
