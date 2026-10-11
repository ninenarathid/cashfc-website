import {redirect} from 'next/navigation';
export const metadata = { title: 'Casino rehearsal — Cash Town' };
/** Separate entrance: no town-hall gate or live purse is opened by this route. */
export default function CasinoTestPage() { redirect('/town?map=casino-test'); }
