"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  soundEnabled: boolean;
  ditherPaused: boolean;
  buzzerVolume: number; // 0-100
  videoVolume: number; // 0-100
}

interface SettingsContextType {
  settings: Settings;
  toggleSound: () => void;
  toggleDither: () => void;
  setBuzzerVolume: (volume: number) => void;
  setVideoVolume: (volume: number) => void;
  updateSettings: (partial: Partial<Settings>) => void; // Easy way to add more settings
}

const defaultSettings: Settings = {
  soundEnabled: true,
  ditherPaused: false,
  buzzerVolume: 50, // 50% default
  videoVolume: 100, // 100% default
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jeopardy_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('jeopardy_settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  }, [settings, isLoaded]);

  const toggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleDither = () => {
    setSettings(prev => ({ ...prev, ditherPaused: !prev.ditherPaused }));
  };

  const setBuzzerVolume = (volume: number) => {
    setSettings(prev => ({ ...prev, buzzerVolume: Math.max(0, Math.min(100, volume)) }));
  };

  const setVideoVolume = (volume: number) => {
    setSettings(prev => ({ ...prev, videoVolume: Math.max(0, Math.min(100, volume)) }));
  };

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      toggleSound,
      toggleDither,
      setBuzzerVolume,
      setVideoVolume,
      updateSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
