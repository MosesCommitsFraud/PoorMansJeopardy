'use client';

import { useEffect, useRef, useState } from 'react';
import { VideoDisplayMode } from '@/types/game';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX } from 'lucide-react';

interface YouTubePlayerProps {
  videoUrl: string;
  showTitle: boolean;
  mode: VideoDisplayMode;
  autoplay?: boolean;
  startAt?: number; // Timestamp to start synchronized playback
  className?: string;
  showControls?: boolean; // Show volume slider (for host)
  onVolumeChange?: (volume: number) => void;
  volume?: number; // Initial volume (0-100)
}

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?#]+)/,
    /youtube\.com\/shorts\/([^&\s?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Extract timestamp from YouTube URL
function extractTimestamp(url: string): number | null {
  // Check for ?t= or &t= or #t= parameter
  const timeMatch = url.match(/[?&#]t=([^&\s]+)/);
  if (!timeMatch) return null;

  const timeString = timeMatch[1];

  // Handle formats like "1m30s", "90s", "90", "1h2m3s"
  const hourMatch = timeString.match(/(\d+)h/);
  const minuteMatch = timeString.match(/(\d+)m/);
  const secondMatch = timeString.match(/(\d+)s/);

  let totalSeconds = 0;

  if (hourMatch || minuteMatch || secondMatch) {
    // Format with h/m/s suffixes
    if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
    if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
    if (secondMatch) totalSeconds += parseInt(secondMatch[1]);
  } else {
    // Plain number (seconds)
    const seconds = parseInt(timeString);
    if (!isNaN(seconds)) {
      totalSeconds = seconds;
    }
  }

  return totalSeconds > 0 ? totalSeconds : null;
}

// Global flag to track if API is loaded
let apiLoadStarted = false;
let apiLoadedCallbacks: (() => void)[] = [];

// Load the YouTube API once globally
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    // If already loaded, resolve immediately
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
      return;
    }

    // Add to callbacks
    apiLoadedCallbacks.push(resolve);

    // If already loading, just wait
    if (apiLoadStarted) {
      return;
    }

    apiLoadStarted = true;

    // Set up the callback that YouTube API will call
    (window as any).onYouTubeIframeAPIReady = () => {
      apiLoadedCallbacks.forEach(cb => cb());
      apiLoadedCallbacks = [];
    };

    // Load the script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
}

export function YouTubePlayer({
  videoUrl,
  showTitle,
  mode,
  autoplay = false,
  startAt,
  className = '',
  showControls = false,
  onVolumeChange,
  volume: initialVolume = 100,
}: YouTubePlayerProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerIdRef = useRef(`youtube-player-${Math.random().toString(36).substring(2, 11)}`);

  const videoId = extractVideoId(videoUrl);
  const urlTimestamp = extractTimestamp(videoUrl);

  // Load YouTube API and initialize player
  useEffect(() => {
    if (!videoId || typeof window === 'undefined') return;

    let mounted = true;

    const initializePlayer = async () => {
      try {
        await loadYouTubeAPI();

        if (!mounted) return;

        // Prepare player vars with optional start time
        const playerVars: any = {
          autoplay: autoplay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: showTitle ? 1 : 0,
          iv_load_policy: 3,
          origin: window.location.origin,
          enablejsapi: 1,
        };

        // Add start time if found in URL
        if (urlTimestamp !== null) {
          playerVars.start = urlTimestamp;
        }

        // Create player
        const player = new (window as any).YT.Player(playerIdRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars,
          events: {
            onReady: (event: any) => {
              if (!mounted) return;
              playerRef.current = event.target;
              setIsReady(true);

              // Set initial volume
              event.target.setVolume(volume);

              // Apply mode settings when ready
              if (mode === 'muted') {
                event.target.mute();
                setIsMuted(true);
              } else {
                event.target.unMute();
                setIsMuted(false);
              }
            },
            onError: (event: any) => {
              console.error('YouTube Player Error:', event.data);
            },
          },
        });
      } catch (error) {
        console.error('Failed to initialize YouTube player:', error);
      }
    };

    initializePlayer();

    return () => {
      mounted = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Handle mode changes
  useEffect(() => {
    if (!playerRef.current || !isReady) return;

    try {
      if (mode === 'muted') {
        playerRef.current.mute();
        setIsMuted(true);
      } else {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    } catch (error) {
      console.error('Error changing mode:', error);
    }
  }, [mode, isReady]);

  // Handle volume prop changes (from host)
  useEffect(() => {
    if (!playerRef.current || !isReady) return;

    try {
      setVolume(initialVolume);
      playerRef.current.setVolume(initialVolume);
      if (initialVolume === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else if (isMuted && mode !== 'muted') {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    } catch (error) {
      console.error('Error updating volume:', error);
    }
  }, [initialVolume, isReady]);

  // Handle synchronized playback start
  useEffect(() => {
    if (!playerRef.current || !isReady || !startAt) return;

    const now = Date.now();
    const delay = startAt - now;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    if (delay > 0) {
      syncTimeoutRef.current = setTimeout(() => {
        try {
          playerRef.current?.playVideo();
        } catch (error) {
          console.error('Error starting video:', error);
        }
      }, delay);
    } else {
      try {
        playerRef.current?.playVideo();
      } catch (error) {
        console.error('Error starting video:', error);
      }
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [startAt, isReady]);

  // Handle volume changes
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);

    if (playerRef.current && isReady) {
      try {
        playerRef.current.setVolume(newVolume);
        if (newVolume === 0) {
          playerRef.current.mute();
          setIsMuted(true);
        } else if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
      } catch (error) {
        console.error('Error changing volume:', error);
      }
    }

    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    if (!playerRef.current || !isReady) return;

    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

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
        <div className="absolute inset-0 bg-black z-10 flex items-center justify-center rounded-lg">
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
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
        <div
          id={playerIdRef.current}
          ref={playerContainerRef}
          className="w-full h-full"
        />
      </div>

      {/* Volume Control */}
      {showControls && (
        <div className="mt-3 flex items-center gap-3 px-2">
          <button
            onClick={toggleMute}
            className="text-white hover:text-gray-300 transition-colors"
            type="button"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-white w-10 text-right">{Math.round(volume)}%</span>
        </div>
      )}
    </div>
  );
}

// Helper function to check if a URL is a valid YouTube URL
export function isYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
