import { PropsWithChildren } from 'react';
import { Snowfall } from '../components/layout/Snowfall';
import { FestiveHeader } from '../components/layout/FestiveHeader';
import { FestiveFooter } from '../components/layout/FestiveFooter';

export const AppLayout = ({ children }: PropsWithChildren): JSX.Element => (
  <div className="relative min-h-screen w-full bg-gradient-to-br from-red-800 to-red-900 overflow-x-hidden">
    <Snowfall />
    <FestiveHeader />
    <main className="relative z-10">{children}</main>
    <FestiveFooter />
  </div>
);
