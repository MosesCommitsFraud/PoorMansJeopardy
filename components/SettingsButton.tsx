"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Play, Pause, Trash2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, toggleSound, toggleDither } = useSettings();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear all local storage? This will delete all settings and saved templates.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-700 flex items-center justify-center transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl group"
        aria-label="Settings"
      >
        <Settings
          className={`w-6 h-6 text-zinc-300 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'group-hover:rotate-45'}`}
        />
      </button>

      {/* Expandable Menu */}
      <div
        className={`absolute bottom-16 right-0 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ minWidth: '300px' }}
      >
        <div className="p-4 space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="sound-toggle" className="flex items-center gap-2 text-sm font-medium text-zinc-200 cursor-pointer">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              Sound
            </label>
            <Switch
              id="sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>

          {/* Dither Effect Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="dither-toggle" className="flex items-center gap-2 text-sm font-medium text-zinc-200 cursor-pointer">
              {settings.ditherPaused ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Background Animation
            </label>
            <Switch
              id="dither-toggle"
              checked={!settings.ditherPaused}
              onCheckedChange={toggleDither}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-700"></div>

          {/* Clear Storage Button */}
          <Button
            onClick={handleClearStorage}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-zinc-300 hover:text-zinc-100"
            size="sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Local Storage
          </Button>
        </div>
      </div>
    </div>
  );
}
