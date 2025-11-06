"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, TrendingUp, X } from "lucide-react";
import { searchTenorGifs, getTrendingGifs, getGifUrl, getGifPreviewUrl, registerTenorShare, TenorGif } from "@/lib/tenor-api";
import { Skeleton } from "@/components/ui/skeleton";

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGif: (gifUrl: string) => void;
  title?: string;
}

export function GifPicker({ 
  open, 
  onOpenChange, 
  onSelectGif,
  title = "Search for a GIF"
}: GifPickerProps) {
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPos, setNextPos] = useState<string | undefined>();
  const [selectedGif, setSelectedGif] = useState<TenorGif | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadTrendingGifs();
    } else {
      // Reset state when dialog closes
      setSearchTerm("");
      setCurrentSearchTerm("");
      setSelectedGif(null);
      setGifs([]);
    }
  }, [open]);

  // Debounced search effect - automatically search 1 second after typing stops
  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch(searchTerm);
      } else if (searchTerm === "" && currentSearchTerm !== "") {
        // If search term is cleared, show trending
        loadTrendingGifs();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, open]);

  const loadTrendingGifs = async () => {
    setIsLoading(true);
    try {
      const response = await getTrendingGifs(30);
      setGifs(response.results);
      setNextPos(response.next);
      setCurrentSearchTerm("");
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchTenorGifs(query, 30);
      setGifs(response.results);
      setNextPos(response.next);
      setCurrentSearchTerm(query);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreGifs = useCallback(async () => {
    if (!nextPos || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    try {
      const response = currentSearchTerm
        ? await searchTenorGifs(currentSearchTerm, 30, nextPos)
        : await getTrendingGifs(30, nextPos);

      setGifs(prev => [...prev, ...response.results]);
      setNextPos(response.next);
    } catch (error) {
      console.error('Error loading more GIFs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPos, isLoadingMore, isLoading, currentSearchTerm]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when scrolled to 80% of the content
    if (scrollPercentage > 0.8) {
      loadMoreGifs();
    }
  }, [loadMoreGifs]);


  const handleSelectGif = (gif: TenorGif) => {
    setSelectedGif(gif);
  };

  const handleConfirm = async () => {
    if (selectedGif) {
      const gifUrl = getGifUrl(selectedGif, 'large');
      
      // Register the share with Tenor (helps improve their search)
      try {
        await registerTenorShare(selectedGif.id, currentSearchTerm);
      } catch (error) {
        console.error('Error registering share:', error);
      }
      
      onSelectGif(gifUrl);
      setSelectedGif(null);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedGif(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/20 bg-black/40 backdrop-blur-xl max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
          </DialogTitle>
          <DialogDescription>
            {currentSearchTerm ? `Results for "${currentSearchTerm}"` : 'Trending GIFs'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="space-y-2">
            <div className="relative">
              {isLoading ? (
                <Loader2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Search Tenor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                  }}
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={loadTrendingGifs}
              disabled={isLoading}
              className="w-full"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Show Trending
            </Button>
          </div>

          {/* Selected GIF Preview */}
          {selectedGif && (
            <div className="border border-green-500/50 bg-green-500/10 rounded-lg p-3">
              <Label className="text-sm text-green-400 mb-2 block">Selected GIF</Label>
              <div className="flex items-center gap-3">
                <img
                  src={getGifPreviewUrl(selectedGif)}
                  alt={selectedGif.content_description}
                  className="h-16 w-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedGif.content_description || selectedGif.title}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedGif(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* GIF Grid */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto scrollbar-frosted pr-3"
            style={{
              scrollbarWidth: 'auto',
              scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.08)',
            }}
          >
            {isLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {[...Array(20)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No GIFs found
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-4">
                  {gifs.map((gif) => {
                    const isSelected = selectedGif?.id === gif.id;
                    return (
                      <button
                        key={gif.id}
                        onClick={() => handleSelectGif(gif)}
                        className={`
                          relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:scale-105
                          ${isSelected
                            ? 'border-green-500 ring-2 ring-green-500/50'
                            : 'border-white/10 hover:border-white/30'
                          }
                        `}
                      >
                        <img
                          src={getGifPreviewUrl(gif)}
                          alt={gif.content_description}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <div className="bg-green-500 text-white rounded-full p-2">
                              ✓
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tenor Attribution */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2 border-t border-white/10">
            <span>Powered by</span>
            <img 
              src="https://media.tenor.com/website/gifapi-assets/PoweredBy_200px-White_VertText.png" 
              alt="Tenor" 
              className="h-5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedGif || isLoading}
          >
            Use This GIF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

