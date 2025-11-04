"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Database } from "lucide-react";
import { CategoryData, getUniqueCategories, searchCategories, loadQuestionsDataset } from "@/lib/questions-loader";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategories: (categories: string[]) => void;
  maxSelection?: number;
}

export function CategoryBrowser({ 
  open, 
  onOpenChange, 
  onSelectCategories,
  maxSelection = 6 
}: CategoryBrowserProps) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryData[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  useEffect(() => {
    const results = searchCategories(categories, searchTerm);
    setFilteredCategories(results);
  }, [searchTerm, categories]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const questions = await loadQuestionsDataset();
      const uniqueCategories = getUniqueCategories(questions);
      setCategories(uniqueCategories);
      setFilteredCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        if (prev.length >= maxSelection) {
          return prev;
        }
        return [...prev, categoryName];
      }
    });
  };

  const handleConfirm = () => {
    onSelectCategories(selectedCategories);
    setSelectedCategories([]);
    setSearchTerm("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedCategories([]);
    setSearchTerm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/20 bg-black/40 backdrop-blur-xl max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Browse Questions Dataset
          </DialogTitle>
          <DialogDescription>
            Select {maxSelection} categories from 216,000+ real Jeopardy! questions. 
            Selected: {selectedCategories.length}/{maxSelection}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Bar */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Categories</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Type to search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Categories */}
          {selectedCategories.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Categories</Label>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(cat => (
                  <Badge 
                    key={cat} 
                    variant="default"
                    className="cursor-pointer hover:bg-destructive"
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat} ✕
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            <Label>
              Available Categories 
              {!isLoading && ` (${filteredCategories.length} found)`}
            </Label>
            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-black/20">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No categories found matching &quot;{searchTerm}&quot;
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredCategories.map(cat => {
                    const isSelected = selectedCategories.includes(cat.name);
                    const isDisabled = !isSelected && selectedCategories.length >= maxSelection;
                    
                    return (
                      <button
                        key={cat.name}
                        onClick={() => !isDisabled && toggleCategory(cat.name)}
                        disabled={isDisabled}
                        className={`
                          text-left p-3 rounded-lg border transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-500/20' 
                            : isDisabled
                            ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{cat.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {cat.questionCount}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedCategories.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Generate Game (${selectedCategories.length} categories)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

