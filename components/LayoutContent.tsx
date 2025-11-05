"use client";

import React, { ReactNode } from 'react';
import Dither from '@/components/Dither';
import { useSettings } from '@/contexts/SettingsContext';

export default function LayoutContent({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  return (
    <>
      {/* Fixed background with Dither effect */}
      <div className="fixed inset-0 -z-10">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={settings.ditherPaused}
          enableMouseInteraction={false}
          colorNum={6}
          waveAmplitude={0.3}
          waveFrequency={5}
          waveSpeed={0.02}
        />
      </div>
      {children}
    </>
  );
}
