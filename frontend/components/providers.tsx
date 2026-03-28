'use client';

import { DailyProvider } from '@daily-co/daily-react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <DailyProvider>{children}</DailyProvider>;
}
