import type { Metadata } from 'next';
import CasinoGate from '@/components/casino/CasinoGate';
export const metadata: Metadata = { title: 'Casino rehearsal · Aqua' };
export default function Page() { return <CasinoGate desk />; }
