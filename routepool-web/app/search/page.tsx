import type { Metadata } from 'next';
import { SearchScreen } from '@/components/search-screen';

export const metadata: Metadata = {
  title: 'Find your everyday ride | RoutePool PK',
  description: 'Search trusted monthly commute routes across Islamabad and Rawalpindi.',
};

export default function SearchPage() {
  return <SearchScreen />;
}
