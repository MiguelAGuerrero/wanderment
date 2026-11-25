import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * P-90: See it all is folded into Plan. Its old address lands on the run's Plan, in its place (Back
 * never loops) — which, like every Plan address, shows Plan when the data says the run is in Plan.
 */
export default function GoAll() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/go/run/${String(id)}/plan`} />;
}
