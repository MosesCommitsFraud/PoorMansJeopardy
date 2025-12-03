"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ArrowLeft, BookTemplate, FolderOpen, Edit3, Database, Film, X, HardDrive, AlertTriangle } from "lucide-react";
import { Category, Question, GameTemplate } from "@/types/game";
import { templateStorage } from "@/lib/template-storage";
import { CategoryBrowser } from "@/components/category-browser";
import { generateCategoriesFromDataset } from "@/lib/questions-loader";
import { GifPicker } from "@/components/gif-picker";
import { YouTubePlayer, isYouTubeUrl } from "@/components/youtube-player";
import { compressData } from "@/lib/compression";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import imageCompression from 'browser-image-compression';

export default function HostSetup({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "1",
      name: "Category 1",
      questions: [
        { id: "1-1", question: "", answer: "", value: 200, answered: false },
        { id: "1-2", question: "", answer: "", value: 400, answered: false },
        { id: "1-3", question: "", answer: "", value: 600, answered: false },
        { id: "1-4", question: "", answer: "", value: 800, answered: false },
        { id: "1-5", question: "", answer: "", value: 1000, answered: false },
      ],
    },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifPickerTarget, setGifPickerTarget] = useState<{
    categoryId: string;
    questionId: string;
    type: 'question' | 'answer';
  } | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    usedMB: number;
    quotaMB: number;
    percentUsed: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentBoardSize, setCurrentBoardSize] = useState<number>(0);
  const [uncompressedBoardSize, setUncompressedBoardSize] = useState<number>(0);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'default',
  });

  useEffect(() => {
    loadGameState();
    loadTemplates();
    loadStorageInfo();
  }, []);

  // Estimate current board size (compressed) whenever categories change
  useEffect(() => {
    const estimateBoardSize = () => {
      try {
        // Calculate size: base64 images vs regular text/URLs
        let base64ImageDataSize = 0;
        let textDataSize = 0;

        categories.forEach(category => {
          // Category name is text
          textDataSize += new Blob([JSON.stringify(category.name)]).size;

          category.questions.forEach(question => {
            // Question and answer text
            textDataSize += new Blob([JSON.stringify(question.question)]).size;
            textDataSize += new Blob([JSON.stringify(question.answer)]).size;

            // Image URLs: base64 (heavy) vs regular URLs (light like videos)
            if (question.questionImageUrl) {
              const size = new Blob([question.questionImageUrl]).size;
              if (question.questionImageUrl.startsWith('data:image/')) {
                base64ImageDataSize += size; // Pasted images (base64)
              } else {
                textDataSize += size; // URL-based images (like videos)
              }
            }
            if (question.answerImageUrl) {
              const size = new Blob([question.answerImageUrl]).size;
              if (question.answerImageUrl.startsWith('data:image/')) {
                base64ImageDataSize += size; // Pasted images (base64)
              } else {
                textDataSize += size; // URL-based images (like videos)
              }
            }

            // Video URLs (small URLs)
            if (question.questionVideoUrl) {
              textDataSize += new Blob([question.questionVideoUrl]).size;
            }
            if (question.answerVideoUrl) {
              textDataSize += new Blob([question.answerVideoUrl]).size;
            }
          });
        });

        const totalUncompressedSize = (base64ImageDataSize + textDataSize) / (1024 * 1024);
        setUncompressedBoardSize(totalUncompressedSize);

        // If data is small, no compression will be used
        if (totalUncompressedSize < 1) {
          setCurrentBoardSize(totalUncompressedSize);
        } else {
          // Apply different compression ratios
          // Base64-encoded images (pasted): LZ-String achieves only ~15-20% reduction (use 85%)
          // Text/JSON/URLs: LZ-String achieves ~60-70% reduction (use 35%)
          const compressedBase64ImageSize = (base64ImageDataSize / (1024 * 1024)) * 0.85;
          const compressedTextSize = (textDataSize / (1024 * 1024)) * 0.35;
          const estimatedCompressedSize = compressedBase64ImageSize + compressedTextSize;

          setCurrentBoardSize(estimatedCompressedSize);
        }
      } catch {
        setCurrentBoardSize(0);
        setUncompressedBoardSize(0);
      }
    };

    estimateBoardSize();
  }, [categories]);

  const loadStorageInfo = async () => {
    const info = await templateStorage.getStorageInfo();
    setStorageInfo(info);
  };

  // Helper to show confirmation dialog
  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'default' | 'destructive' = 'default') => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm,
      variant,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // Estimate size of current categories in MB
  const estimateTemplateSize = (): number => {
    try {
      const jsonString = JSON.stringify(categories);
      return new Blob([jsonString]).size / (1024 * 1024);
    } catch {
      return 0;
    }
  };

  const loadTemplates = async () => {
    const allTemplates = await templateStorage.getAll();
    setTemplates(allTemplates);
  };

  const loadGameState = async () => {
    try {
      const response = await fetch(`/api/lobby/${resolvedParams.code}/state`);
      const data = await response.json();
      
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading game state:", error);
      setIsLoading(false);
    }
  };

  const addCategory = () => {
    const newId = String(Date.now());
    const categoryNumber = categories.length + 1;
    const newCategory: Category = {
      id: newId,
      name: `Category ${categoryNumber}`,
      questions: [
        { id: `${newId}-1`, question: "", answer: "", value: 200, answered: false },
        { id: `${newId}-2`, question: "", answer: "", value: 400, answered: false },
        { id: `${newId}-3`, question: "", answer: "", value: 600, answered: false },
        { id: `${newId}-4`, question: "", answer: "", value: 800, answered: false },
        { id: `${newId}-5`, question: "", answer: "", value: 1000, answered: false },
      ],
    };
    setCategories([...categories, newCategory]);
  };

  const removeCategory = (categoryId: string) => {
    setCategories(categories.filter(c => c.id !== categoryId));
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map(c => 
      c.id === categoryId ? { ...c, name } : c
    ));
  };

  const updateQuestion = (categoryId: string, questionId: string, field: keyof Question, value: string | number) => {
    setCategories(categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          questions: c.questions.map(q =>
            q.id === questionId ? { ...q, [field]: value } : q
          ),
        };
      }
      return c;
    }));
  };

  // Check if a category has no content (all questions and answers are empty)
  const isCategoryEmpty = (category: Category): boolean => {
    return category.questions.every(q => 
      !q.question.trim() && 
      !q.answer.trim() && 
      !q.questionImageUrl && 
      !q.answerImageUrl
    );
  };

  // Check if all categories are empty (for determining if we should replace or append)
  const areAllCategoriesEmpty = (): boolean => {
    return categories.every(cat => isCategoryEmpty(cat));
  };

  const validateCategories = (): { isValid: boolean; message: string } => {
    if (categories.length === 0) {
      return { isValid: false, message: "Please add at least one category" };
    }

    for (const category of categories) {
      if (!category.name.trim()) {
        return { isValid: false, message: "All categories must have a name" };
      }

      for (const question of category.questions) {
        // Question must have either text OR an image/GIF
        if (!question.question.trim() && !question.questionImageUrl) {
          return { 
            isValid: false, 
            message: `Category "${category.name}" has a question with no text or image. Please add text or an image/GIF.` 
          };
        }
        // Answer must have either text OR an image/GIF
        if (!question.answer.trim() && !question.answerImageUrl) {
          return { 
            isValid: false, 
            message: `Category "${category.name}" has an answer with no text or image. Please add text or an image/GIF.` 
          };
        }
      }
    }

    return { isValid: true, message: "" };
  };

  const loadDefaultGame = async () => {
    setIsGenerating(true);
    try {
      // Load all questions from dataset
      const allQuestions = await fetch('/api/questions/dataset').then(res => res.json());
      
      // Get unique categories (with at least 5 questions each)
      const categoryMap = new Map<string, number>();
      allQuestions.forEach((q: any) => {
        const upperCategory = q.category.toUpperCase();
        categoryMap.set(upperCategory, (categoryMap.get(upperCategory) || 0) + 1);
      });
      
      const availableCategories = Array.from(categoryMap.entries())
        .filter(([_, count]) => count >= 5)
        .map(([name]) => name);
      
      // Randomly select 5 categories
      const shuffled = availableCategories.sort(() => Math.random() - 0.5);
      const selectedCategories = shuffled.slice(0, 5);
      
      // Generate categories using the existing function
      const generatedCategories = await generateCategoriesFromDataset(selectedCategories);
      // Replace empty categories, otherwise append
      if (areAllCategoriesEmpty()) {
        setCategories(generatedCategories);
      } else {
        setCategories(prev => [...prev, ...generatedCategories]);
      }
    } catch (error) {
      console.error('Error loading default game from dataset:', error);
      setSaveError('Failed to load default game. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGame = async () => {
    setSaveError(null); // Clear any previous errors
    setSuccessMessage(null); // Clear any previous success messages

    const validation = validateCategories();
    if (!validation.isValid) {
      setSaveError(validation.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check data size with accurate estimation
    let base64ImageDataSize = 0;
    let textDataSize = 0;

    categories.forEach(category => {
      textDataSize += new Blob([JSON.stringify(category.name)]).size;
      category.questions.forEach(question => {
        textDataSize += new Blob([JSON.stringify(question.question)]).size;
        textDataSize += new Blob([JSON.stringify(question.answer)]).size;

        // Separate base64 images (pasted) from URL-based images
        if (question.questionImageUrl) {
          const size = new Blob([question.questionImageUrl]).size;
          if (question.questionImageUrl.startsWith('data:image/')) {
            base64ImageDataSize += size;
          } else {
            textDataSize += size; // URL-based images count as text
          }
        }
        if (question.answerImageUrl) {
          const size = new Blob([question.answerImageUrl]).size;
          if (question.answerImageUrl.startsWith('data:image/')) {
            base64ImageDataSize += size;
          } else {
            textDataSize += size; // URL-based images count as text
          }
        }

        if (question.questionVideoUrl) textDataSize += new Blob([question.questionVideoUrl]).size;
        if (question.answerVideoUrl) textDataSize += new Blob([question.answerVideoUrl]).size;
      });
    });

    const sizeMB = (base64ImageDataSize + textDataSize) / (1024 * 1024);
    console.log(`[SaveGame] Uncompressed size: ${sizeMB.toFixed(2)} MB (Base64 Images: ${(base64ImageDataSize / (1024 * 1024)).toFixed(2)} MB, Text/URLs: ${(textDataSize / (1024 * 1024)).toFixed(2)} MB)`);

    // Warn if even compressed data might be too large
    // Base64 images (pasted): ~85% of original (15% reduction)
    // Text/JSON/URLs: ~35% of original (65% reduction)
    const estimatedCompressedMB = ((base64ImageDataSize / (1024 * 1024)) * 0.85) + ((textDataSize / (1024 * 1024)) * 0.35);
    if (estimatedCompressedMB > 4.5) {
      setSaveError(
        `This game has ${sizeMB.toFixed(1)} MB of data (estimated ${estimatedCompressedMB.toFixed(1)} MB after compression). ` +
        `This exceeds Vercel's 4.5 MB limit. Please reduce the number of images or use smaller images.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    } else if (estimatedCompressedMB > 3.5) {
      showConfirm(
        'Large Game Data Warning',
        `This game has ${sizeMB.toFixed(1)} MB of data (estimated ${estimatedCompressedMB.toFixed(1)} MB after compression). ` +
        `This is approaching Vercel's 4.5 MB limit and may fail to save. Continue anyway?`,
        () => {
          closeConfirmDialog();
          performSave();
        }
      );
      return;
    } else if (sizeMB > 5) {
      showConfirm(
        'Compress Game Data',
        `This game has ${sizeMB.toFixed(1)} MB of data. ` +
        `It will be compressed to approximately ${estimatedCompressedMB.toFixed(1)} MB before saving. Continue?`,
        () => {
          closeConfirmDialog();
          performSave();
        }
      );
      return;
    }

    performSave();
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/lobby/${resolvedParams.code}/state`);
      const gameState = await response.json();

      gameState.categories = categories;

      // Recalculate size for compression decision
      const sizeMB = estimateTemplateSize();

      // Compress data if it's large (>1MB to ensure it works)
      let payload;
      if (sizeMB > 1) {
        console.log(`[SaveGame] Compressing data...`);
        const compressed = compressData(gameState);
        const compressedSizeMB = compressed.length / (1024 * 1024);
        console.log(`[SaveGame] Compressed: ${sizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${((1 - compressedSizeMB / sizeMB) * 100).toFixed(1)}% reduction)`);

        payload = {
          compressed: true,
          data: compressed
        };
      } else {
        console.log(`[SaveGame] Sending uncompressed (size < 1MB)`);
        payload = { gameState };
      }

      const payloadSize = JSON.stringify(payload).length / (1024 * 1024);
      console.log(`[SaveGame] Final payload size: ${payloadSize.toFixed(2)} MB`);

      const saveResponse = await fetch(`/api/lobby/${resolvedParams.code}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error(`[SaveGame] Server error: ${saveResponse.status}`, errorText);

        // Handle 413 Payload Too Large specifically
        if (saveResponse.status === 413) {
          setSaveError(
            `Game data is too large to save (${payloadSize.toFixed(2)} MB compressed). ` +
            `Vercel has a 4.5 MB request limit. Please reduce the number of images or use smaller images. ` +
            `Error: ${errorText}`
          );
        } else {
          setSaveError(`Failed to save game. Server returned ${saveResponse.status}: ${errorText}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSaving(false);
        return;
      }

      console.log(`[SaveGame] Success!`);
      router.push(`/lobby/${resolvedParams.code}`);
    } catch (error) {
      console.error("[SaveGame] Error:", error);
      setSaveError(`Failed to save game. ${error instanceof Error ? error.message : 'Unknown error'}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsSaving(false);
    }
  };

  const openSaveTemplateDialog = () => {
    setTemplateName("");
    setEditingTemplateId(null);
    setShowSaveDialog(true);
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      setSaveError("Please enter a template name");
      return;
    }

    const nameExists = await templateStorage.nameExists(templateName.trim(), editingTemplateId || undefined);
    if (nameExists) {
      setSaveError("A template with this name already exists");
      return;
    }

    const validation = validateCategories();
    if (!validation.isValid) {
      setSaveError(validation.message);
      return;
    }

    // Warn if template is very large
    const sizeMB = estimateTemplateSize();
    if (sizeMB > 50) {
      showConfirm(
        'Large Template Warning',
        `This template is quite large (${sizeMB.toFixed(1)} MB). Saving to IndexedDB may take a moment. Continue?`,
        async () => {
          closeConfirmDialog();
          await performTemplateSave(sizeMB);
        }
      );
      return;
    }

    await performTemplateSave(sizeMB);
  };

  const performTemplateSave = async (sizeMB: number) => {
    setIsSaving(true);
    try {
      await templateStorage.save(templateName.trim(), categories, editingTemplateId || undefined);
      await loadTemplates();
      await loadStorageInfo();
      setShowSaveDialog(false);
      setTemplateName("");

      // Show success message with size info if large
      if (sizeMB > 10) {
        setSuccessMessage(`Template saved successfully! (${sizeMB.toFixed(1)} MB stored in IndexedDB)`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      setSaveError("Failed to save template. The template might be too large or you may be out of storage space.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    const template = await templateStorage.getById(templateId);
    if (template) {
      // Deep clone to avoid reference issues
      const templateCategories = JSON.parse(JSON.stringify(template.categories));
      // Replace empty categories, otherwise append
      if (areAllCategoriesEmpty()) {
        setCategories(templateCategories);
      } else {
        setCategories(prev => [...prev, ...templateCategories]);
      }
    }
  };

  const deleteTemplate = async (templateId: string) => {
    showConfirm(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      async () => {
        closeConfirmDialog();
        await templateStorage.delete(templateId);
        await loadTemplates();
        await loadStorageInfo();
      },
      'destructive'
    );
  };

  const startRenameTemplate = (template: GameTemplate) => {
    setTemplateName(template.name);
    setEditingTemplateId(template.id);
    setShowSaveDialog(true);
  };

  const handleGenerateFromDataset = async (selectedCategories: string[]) => {
    setIsGenerating(true);
    try {
      const generatedCategories = await generateCategoriesFromDataset(selectedCategories);
      // Replace empty categories, otherwise append
      if (areAllCategoriesEmpty()) {
        setCategories(generatedCategories);
      } else {
        setCategories(prev => [...prev, ...generatedCategories]);
      }
    } catch (error) {
      console.error('Error generating categories from dataset:', error);
      setSaveError('Failed to generate categories from dataset');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsGenerating(false);
    }
  };

  const openGifPicker = (categoryId: string, questionId: string, type: 'question' | 'answer') => {
    setGifPickerTarget({ categoryId, questionId, type });
    setShowGifPicker(true);
  };

  const handleSelectGif = (gifUrl: string) => {
    if (gifPickerTarget) {
      const field = gifPickerTarget.type === 'question' ? 'questionImageUrl' : 'answerImageUrl';
      updateQuestion(gifPickerTarget.categoryId, gifPickerTarget.questionId, field, gifUrl);
      setGifPickerTarget(null);
    }
  };

  const removeImage = (categoryId: string, questionId: string, type: 'question' | 'answer') => {
    const field = type === 'question' ? 'questionImageUrl' : 'answerImageUrl';
    updateQuestion(categoryId, questionId, field, '');
  };

  const removeVideo = (categoryId: string, questionId: string, type: 'question' | 'answer') => {
    const field = type === 'question' ? 'questionVideoUrl' : 'answerVideoUrl';
    updateQuestion(categoryId, questionId, field, '');
  };

  // Compress an image file or blob
  const compressImage = async (file: File | Blob): Promise<string> => {
    try {
      const options = {
        maxSizeMB: 0.5, // Max 500KB per image
        maxWidthOrHeight: 1920, // Max dimension
        useWebWorker: true,
        fileType: 'image/jpeg', // Convert to JPEG for better compression
      };

      const compressedFile = await imageCompression(file as File, options);

      // Convert to data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      // Fallback to uncompressed if compression fails
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // Helper to get the proper src for an image (use proxy for URLs, direct for base64)
  const getImageSrc = (imageUrl: string): string => {
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl; // Base64, use directly
    }
    // URL-based image, use proxy
    return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  };

  // Verify image URL works via proxy (but don't download/compress - just store the URL)
  const verifyImageUrl = async (url: string, imageKey: string): Promise<boolean> => {
    // Add to loading set
    setLoadingImages(prev => new Set(prev).add(imageKey));

    try {
      // Use server-side proxy to verify the URL works
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;

      // Just verify it loads (don't process the image data)
      const img = new Image();

      const imageLoaded = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = proxyUrl;
      });

      // Remove from loading set
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageKey);
        return newSet;
      });

      return imageLoaded;
    } catch (error) {
      console.error('Error verifying image URL:', error);

      // Remove from loading set
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageKey);
        return newSet;
      });

      return false;
    }
  };

  // Handle text change with auto image and video detection
  const handleTextChange = async (categoryId: string, questionId: string, field: 'question' | 'answer', value: string) => {
    updateQuestion(categoryId, questionId, field, value);

    // Auto-detect URLs - check each line
    const lines = value.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        // Check for YouTube URL first
        if (isYouTubeUrl(trimmedLine)) {
          const videoField = field === 'question' ? 'questionVideoUrl' : 'answerVideoUrl';
          updateQuestion(categoryId, questionId, videoField, trimmedLine);
          break; // Use first valid URL found
        }
        // Try to verify as image URL - just store the URL (like YouTube)
        else if (trimmedLine.match(/^https?:\/\//i)) {
          const imageField = field === 'question' ? 'questionImageUrl' : 'answerImageUrl';
          const imageKey = `${categoryId}-${questionId}-${field}`;
          // Verify the image URL works (but don't download/compress)
          const isValid = await verifyImageUrl(trimmedLine, imageKey);
          if (isValid) {
            // Store the original URL (not base64) - just like YouTube videos
            updateQuestion(categoryId, questionId, imageField, trimmedLine);
            break; // Use first valid URL found
          }
        }
      }
    }
  };

  // Handle paste event for clipboard images
  const handlePaste = async (
    e: React.ClipboardEvent,
    categoryId: string,
    questionId: string,
    field: 'question' | 'answer'
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for image in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if it's an image
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();
        if (file) {
          // Compress and convert to data URL
          const compressedDataUrl = await compressImage(file);
          const imageField = field === 'question' ? 'questionImageUrl' : 'answerImageUrl';
          updateQuestion(categoryId, questionId, imageField, compressedDataUrl);
        }
        return;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-lg">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Error Alert */}
        {saveError && (
          <Alert variant="destructive" className="mb-4 relative">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 pr-8">
              {saveError}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => setSaveError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Success Alert */}
        {successMessage && (
          <Alert className="mb-4 border-green-500/50 text-green-500 bg-green-500/10 relative">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription className="mt-2 pr-8">
              {successMessage}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/20"
              onClick={() => setSuccessMessage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-card/60 backdrop-blur-md border border-border px-6 py-3 rounded-lg">
              <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>Setup</h1>
            </div>
            <Badge variant="outline" className="px-3 py-1 text-sm font-mono backdrop-blur-md">
              {resolvedParams.code}
            </Badge>
            <Badge
              variant="outline"
              className={`px-3 py-1.5 text-sm backdrop-blur-md flex items-center gap-2 ${
                currentBoardSize > 4.5 ? 'border-red-500/50 bg-red-500/10 text-red-500' :
                currentBoardSize > 3.5 ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' :
                'border-blue-500/50 bg-blue-500/10 text-blue-500'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span className="font-mono">
                {uncompressedBoardSize.toFixed(2)} MB → {currentBoardSize.toFixed(2)} MB
              </span>
              {currentBoardSize > 4.5 && <AlertTriangle className="h-4 w-4" />}
            </Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => router.push(`/lobby/${resolvedParams.code}`)} variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Lobby
            </Button>

            {/* Template Actions */}
            {templates.length > 0 && (
              <Select onValueChange={loadTemplate}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Load Template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={openSaveTemplateDialog} variant="outline" size="sm">
              <BookTemplate className="mr-1 h-3 w-3" />
              Save Template
            </Button>

            {templates.length > 0 && (
              <Button onClick={() => setShowManageDialog(true)} variant="outline" size="sm">
                <FolderOpen className="mr-1 h-3 w-3" />
                Templates
              </Button>
            )}

            <Button
              onClick={() => setShowCategoryBrowser(true)}
              variant="outline"
              size="sm"
              disabled={isGenerating}
            >
              <Database className="mr-1 h-3 w-3" />
              {isGenerating ? "Loading..." : "Browse"}
            </Button>

            <Button onClick={loadDefaultGame} variant="outline" size="sm" disabled={isGenerating}>
              {isGenerating ? "Loading..." : "Random"}
            </Button>

            <Button onClick={addCategory} variant="secondary" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>

            <Button onClick={saveGame} size="sm" disabled={isSaving} className="min-w-[80px]">
              <Save className="mr-1 h-3 w-3" />
              <span className="whitespace-nowrap">{isSaving ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex-1 mr-4">
                    <Input
                      value={category.name}
                      onChange={(e) => updateCategoryName(category.id, e.target.value)}
                      className="text-xl font-bold"
                      placeholder="Category Name"
                    />
                  </div>
                  <Button
                    onClick={() => removeCategory(category.id)}
                    variant="destructive"
                    size="icon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.questions.map((question) => (
                    <div key={question.id} className="grid grid-cols-12 gap-4 p-4 border rounded-lg">
                      <div className="col-span-1 flex items-center">
                        <div className="text-lg font-bold text-white">
                          ${question.value}
                        </div>
                      </div>
                      <div className="col-span-5">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm">Question</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openGifPicker(category.id, question.id, 'question')}
                            className="h-6 px-2 text-xs"
                          >
                            <Film className="h-3 w-3 mr-1" />
                            GIF
                          </Button>
                        </div>
                        <Textarea
                          value={question.question}
                          onChange={(e) => handleTextChange(category.id, question.id, "question", e.target.value)}
                          onPaste={(e) => handlePaste(e, category.id, question.id, "question")}
                          placeholder="Enter text, paste image URL, YouTube URL, or paste image from clipboard..."
                          className="min-h-[80px]"
                        />
                        {loadingImages.has(`${category.id}-${question.id}-question`) && (
                          <div className="mt-2 text-sm text-blue-500 flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            Loading and compressing image...
                          </div>
                        )}
                        {question.questionImageUrl && (
                          <div className="mt-2 relative border rounded overflow-hidden">
                            <img
                              src={getImageSrc(question.questionImageUrl)}
                              alt="Question"
                              className="w-full max-h-32 object-contain bg-black/20"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={() => removeImage(category.id, question.id, 'question')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {question.questionVideoUrl && isYouTubeUrl(question.questionVideoUrl) && (
                          <div className="mt-2 relative border rounded overflow-hidden">
                            <YouTubePlayer
                              videoUrl={question.questionVideoUrl}
                              showTitle={true}
                              mode="full"
                              isHost={true}
                              showPreview={true}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2 z-10"
                              onClick={() => removeVideo(category.id, question.id, 'question')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="col-span-6">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm">Answer</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openGifPicker(category.id, question.id, 'answer')}
                            className="h-6 px-2 text-xs"
                          >
                            <Film className="h-3 w-3 mr-1" />
                            GIF
                          </Button>
                        </div>
                        <Textarea
                          value={question.answer}
                          onChange={(e) => handleTextChange(category.id, question.id, "answer", e.target.value)}
                          onPaste={(e) => handlePaste(e, category.id, question.id, "answer")}
                          placeholder="Enter text, paste image URL (auto-compressed), YouTube URL, or paste image from clipboard..."
                          className="min-h-[80px]"
                        />
                        {loadingImages.has(`${category.id}-${question.id}-answer`) && (
                          <div className="mt-2 text-sm text-blue-500 flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            Loading and compressing image...
                          </div>
                        )}
                        {question.answerImageUrl && (
                          <div className="mt-2 relative border rounded overflow-hidden">
                            <img
                              src={getImageSrc(question.answerImageUrl)}
                              alt="Answer"
                              className="w-full max-h-32 object-contain bg-black/20"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={() => removeImage(category.id, question.id, 'answer')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {question.answerVideoUrl && isYouTubeUrl(question.answerVideoUrl) && (
                          <div className="mt-2 relative border rounded overflow-hidden">
                            <YouTubePlayer
                              videoUrl={question.answerVideoUrl}
                              showTitle={true}
                              mode="full"
                              isHost={true}
                              showPreview={true}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2 z-10"
                              onClick={() => removeVideo(category.id, question.id, 'answer')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplateId ? "Rename Template" : "Save as Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplateId 
                ? "Enter a new name for this template" 
                : "Give your game configuration a name to reuse it later"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., History Quiz, Science Trivia..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSaving) saveAsTemplate();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveAsTemplate} disabled={isSaving}>
              {isSaving ? "Saving..." : editingTemplateId ? "Rename" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Browser Dialog */}
      <CategoryBrowser
        open={showCategoryBrowser}
        onOpenChange={setShowCategoryBrowser}
        onSelectCategories={handleGenerateFromDataset}
        maxSelection={6}
      />

      {/* GIF Picker Dialog */}
      <GifPicker
        open={showGifPicker}
        onOpenChange={setShowGifPicker}
        onSelectGif={handleSelectGif}
        title={gifPickerTarget?.type === 'question' ? 'Add GIF to Question' : 'Add GIF to Answer'}
      />

      {/* Manage Templates Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Templates</DialogTitle>
            <DialogDescription>
              Your saved game templates ({templates.length} total)
            </DialogDescription>
            {/* Board Size Indicator with Warning */}
            <div className="mt-3 flex items-center gap-2">
              <Badge
                variant="outline"
                className={`px-3 py-1.5 text-sm flex items-center gap-2 ${
                  currentBoardSize > 4.5 ? 'border-red-500/50 bg-red-500/10 text-red-500' :
                  currentBoardSize > 3.5 ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' :
                  'border-blue-500/50 bg-blue-500/10 text-blue-500'
                }`}
              >
                <HardDrive className="h-4 w-4" />
                <span className="font-semibold">Current Board:</span>
                <span className="font-mono">{uncompressedBoardSize.toFixed(2)} MB → {currentBoardSize.toFixed(2)} MB</span>
              </Badge>
              {currentBoardSize > 4.5 && (
                <div className="flex items-center gap-1 text-red-500 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Exceeds Vercel&apos;s 4.5 MB limit!</span>
                </div>
              )}
              {currentBoardSize > 3.5 && currentBoardSize <= 4.5 && (
                <div className="flex items-center gap-1 text-yellow-500 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Approaching limit</span>
                </div>
              )}
            </div>
            {storageInfo && (
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={`px-3 py-1.5 text-xs flex items-center gap-2 w-fit ${
                    storageInfo.percentUsed > 80 ? 'border-yellow-500/50 text-yellow-500' :
                    storageInfo.percentUsed > 95 ? 'border-red-500/50 text-red-500' : ''
                  }`}
                >
                  <span>Total IndexedDB Storage:</span>
                  <span>{(storageInfo.usedMB / 1024).toFixed(2)} / {(storageInfo.quotaMB / 1024).toFixed(1)} GB ({storageInfo.percentUsed.toFixed(1)}%)</span>
                </Badge>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
            {templates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No templates saved yet. Create one by clicking &quot;Save as Template&quot;
              </p>
            ) : (
              templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.categories.length} {template.categories.length === 1 ? "category" : "categories"} • 
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            loadTemplate(template.id);
                            setShowManageDialog(false);
                          }}
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowManageDialog(false);
                            startRenameTemplate(template);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowManageDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={() => closeConfirmDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirmDialog}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => {
                confirmDialog.onConfirm();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

