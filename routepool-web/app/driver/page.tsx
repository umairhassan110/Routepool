import type { Metadata } from 'next';
import { DriverScreen } from '@/components/driver-screen';

export const metadata: Metadata = {
  title: 'Driver console | RoutePool PK',
  description: 'Publish routes, start trips, and keep RoutePool passengers accounted for.',
};

export default function DriverPage() {
  return <DriverScreen />;
}
