import { Redirect } from 'expo-router';

/**
 * Map is retired (P-83, B-09 slice 5): the live map is the home. Old links land on the home with the
 * map lit (`/sky`), replacing this entry, so Back never loops through it.
 */
export default function Map() {
  return <Redirect href="/sky" />;
}
