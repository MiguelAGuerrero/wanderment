import { Home } from '@/components/Home';

/**
 * One home (P-74, D-15): the trailhead (`/`), the sky (`/sky`), under a star (`/star/<id>`) and on a
 * trail (`/trail/<id>`) are one place. The night is drawn once, here; the routes in it are the ground
 * at rest and the sessions over it, so a deep link opens the home already tilted.
 */
export default function HomeLayout() {
  return <Home />;
}
