import { Home } from '@/components/Home';
import { Trailhead } from '@/components/Trailhead';

/**
 * One home (P-74, D-15; P-88: the old app's, at `/old`): the trailhead (`/old`), the lit map (`/sky`, P-81), under a star (`/star/<id>`)
 * and on a trail (`/trail/<id>`) are one place. The night is drawn once, here, and so is the trailhead
 * (P-81: lighting the map is `/old` ↔ `/sky`, and nothing on it moves or remounts); the sessions are the
 * routes over it, so a deep link opens the home already tilted.
 */
export default function HomeLayout() {
  return <Home trailhead={(lit) => <Trailhead lit={lit} />} />;
}
