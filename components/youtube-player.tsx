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
  showControls?: boolean; // Show volume slider (for players)
  onVolumeChange?: (volume: number) => void;
  volume?: number; // Initial volume (0-100)
  isHost?: boolean; // Whether this is the host (shows full controls)
  playing?: boolean; // Controlled playback state from host
  seekTo?: number; // Seek position from host (in seconds)
  commandAt?: number; // Timestamp of last playback command
}

// Format time in MM:SS or HH:MM:SS format
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
  startAt,
  className = '',
  showControls = false,
  onVolumeChange,
  volume: initialVolume = 100,
  isHost = false,
  playing,
  seekTo,
  commandAt,
}: YouTubePlayerProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
          autoplay: 0, // Never autoplay - we control playback via API
          controls: isHost ? 1 : 0, // Only host gets controls
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
          enablejsapi: 1,
          fs: isHost ? 1 : 0, // Only host can fullscreen
          disablekb: isHost ? 0 : 1, // Only host can use keyboard controls
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

              // Get video duration
              try {
                const videoDuration = event.target.getDuration();
                setDuration(videoDuration);
              } catch (error) {
                console.error('Error getting duration:', error);
              }

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

              // IMPORTANT: Stop the video if it auto-started due to timestamp
              // YouTube sometimes starts playing even with autoplay: 0 when start parameter is present
              try {
                const playerState = event.target.getPlayerState();
                // 1 = playing, 3 = buffering
                if (playerState === 1 || playerState === 3) {
                  event.target.pauseVideo();
                }
              } catch (error) {
                console.error('Error checking/stopping player:', error);
              }
            },
            onStateChange: (event: any) => {
              // Track when video starts playing
              if (event.data === 1) { // 1 = playing
                setHasStartedPlaying(true);
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

  // Update current time for host (poll every 100ms when ready)
  useEffect(() => {
    if (!isHost || !playerRef.current || !isReady) return;

    const interval = setInterval(() => {
      try {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      } catch (error) {
        // Ignore errors
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isHost, isReady]);

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
          setHasStartedPlaying(true);
        } catch (error) {
          console.error('Error starting video:', error);
        }
      }, delay);
    } else {
      try {
        playerRef.current?.playVideo();
        setHasStartedPlaying(true);
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

  // Handle play/pause commands from host (only after initial synchronized start)
  useEffect(() => {
    if (!playerRef.current || !isReady || isHost) return;

    // Only respond to play/pause after synchronized start has completed
    if (playing !== undefined) {
      const now = Date.now();
      const syncStartCompleted = !startAt || startAt <= now;

      if (syncStartCompleted) {
        try {
          if (playing) {
            playerRef.current.playVideo();
            setHasStartedPlaying(true);
          } else if (playing === false) {
            playerRef.current.pauseVideo();
          }
        } catch (error) {
          console.error('Error controlling playback:', error);
        }
      }
    }
  }, [playing, commandAt, isReady, isHost, startAt]);

  // Handle seek commands from host
  useEffect(() => {
    if (!playerRef.current || !isReady || isHost || seekTo === undefined) return;

    try {
      playerRef.current.seekTo(seekTo, true);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [seekTo, commandAt, isReady, isHost]);

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
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative">
        <div
          id={playerIdRef.current}
          ref={playerContainerRef}
          className="w-full h-full"
        />
        {/* Thumbnail blocker - hides video thumbnail until playback starts */}
        {!hasStartedPlaying && (
          <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
            <div className="text-white text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm opacity-70">
                {isHost ? 'Click "Start Video" or "Play" to begin' : 'Waiting for host to start video...'}
              </p>
            </div>
          </div>
        )}
        {/* Title overlay - hides YouTube's title when showTitle is false */}
        {!showTitle && (
          <div className="absolute top-0 left-0 right-0 h-20 bg-black pointer-events-none z-10 flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-widest opacity-60">
              CENSORED
            </span>
          </div>
        )}
        {/* Interaction blocker - prevents players from controlling the video */}
        {!isHost && (
          <div
            className="absolute inset-0 z-50 bg-transparent"
            style={{
              pointerEvents: 'all',
              cursor: 'default'
            }}
            onClick={(e) => e.preventDefault()}
            onDoubleClick={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.preventDefault()}
            onTouchStart={(e) => e.preventDefault()}
            onTouchEnd={(e) => e.preventDefault()}
            title="Video playback is controlled by the host"
          />
        )}
        {/* Host time display */}
        {isHost && hasStartedPlaying && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-mono z-40">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}
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
