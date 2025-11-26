'use client';

import { useEffect, useRef, useState } from 'react';
import { VideoDisplayMode } from '@/types/game';

interface YouTubePlayerProps {
  videoUrl: string;
  showTitle: boolean;
  mode: VideoDisplayMode;
  autoplay?: boolean;
  startAt?: number; // Timestamp to start synchronized playback
  className?: string;
}

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function YouTubePlayer({
  videoUrl,
  showTitle,
  mode,
  autoplay = false,
  startAt,
  className = '',
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoId = extractVideoId(videoUrl);

  // Load YouTube iframe API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      return;
    }

    // Load the API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  // Initialize player
  useEffect(() => {
    if (!videoId || !iframeRef.current) return;

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        // API not ready yet, try again in 100ms
        setTimeout(initPlayer, 100);
        return;
      }

      const newPlayer = new (window as any).YT.Player(iframeRef.current, {
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: showTitle ? 1 : 0,
          iv_load_policy: 3, // Hide annotations
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            setPlayer(event.target);

            // Apply mode settings when ready
            if (mode === 'muted') {
              event.target.mute();
            } else if (mode === 'audio-only') {
              // For audio-only, we'll just hide the iframe with CSS
              event.target.unMute();
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [videoId, autoplay, showTitle]);

  // Handle mode changes
  useEffect(() => {
    if (!player || !isReady) return;

    if (mode === 'muted') {
      player.mute();
    } else if (mode === 'full' || mode === 'audio-only') {
      player.unMute();
    }
  }, [mode, player, isReady]);

  // Handle synchronized playback start
  useEffect(() => {
    if (!player || !isReady || !startAt) return;

    const now = Date.now();
    const delay = startAt - now;

    if (delay > 0) {
      // Schedule playback to start at the specified time
      syncTimeoutRef.current = setTimeout(() => {
        player.playVideo();
      }, delay);
    } else {
      // Start immediately if time has passed
      player.playVideo();
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [startAt, player, isReady]);

  if (!videoId) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
        Invalid YouTube URL
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {mode === 'audio-only' && (
        <div className="absolute inset-0 bg-black z-10 flex items-center justify-center">
          <div className="text-white text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            <p className="text-sm">Audio Only Mode</p>
          </div>
        </div>
      )}
      <div className="aspect-video w-full">
        <iframe
          ref={iframeRef}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// Helper function to check if a URL is a valid YouTube URL
export function isYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
