import { Redirect } from 'expo-router';

/**
 * P-89: the old app is retired. Every address it had (`/old`, `/sky`, `/line/…`, `/star/…`, `/trail/…`,
 * `/activities`, `/wanders`, `/thread/…`, `/activity/…`, `/search`, `/explore`, `/map`, `/pull-in/…`)
 * and any address that was never one land on the new home, replacing the entry, so Back never loops.
 */
export default function Elsewhere() {
  return <Redirect href="/go" />;
}
