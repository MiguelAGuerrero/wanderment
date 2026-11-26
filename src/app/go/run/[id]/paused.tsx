import { Redirect } from 'expo-router';

/**
 * P-96 (ruling 7): the paused screen is gone — Pause goes home, where the paused run is first with
 * Resume. Its old address lands home (in its place: Back never loops).
 */
export default function GoPaused() {
  return <Redirect href="/go" />;
}
