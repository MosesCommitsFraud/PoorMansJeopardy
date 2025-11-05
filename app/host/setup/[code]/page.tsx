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
import { Plus, Trash2, Save, ArrowLeft, BookTemplate, FolderOpen, Edit3, Database, Film, X } from "lucide-react";
import { Category, Question, GameTemplate } from "@/types/game";
import { templateStorage } from "@/lib/template-storage";
import { CategoryBrowser } from "@/components/category-browser";
import { generateCategoriesFromDataset } from "@/lib/questions-loader";
import { GifPicker } from "@/components/gif-picker";

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

  useEffect(() => {
    loadGameState();
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setTemplates(templateStorage.getAll());
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
      setCategories(generatedCategories);
    } catch (error) {
      console.error('Error loading default game from dataset:', error);
      alert('Failed to load default game. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGame = async () => {
    const validation = validateCategories();
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    try {
      const response = await fetch(`/api/lobby/${resolvedParams.code}/state`);
      const gameState = await response.json();
      
      gameState.categories = categories;
      
      await fetch(`/api/lobby/${resolvedParams.code}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameState }),
      });
      
      router.push(`/lobby/${resolvedParams.code}`);
    } catch (error) {
      alert("Failed to save game");
    }
  };

  const openSaveTemplateDialog = () => {
    setTemplateName("");
    setEditingTemplateId(null);
    setShowSaveDialog(true);
  };

  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (templateStorage.nameExists(templateName.trim(), editingTemplateId || undefined)) {
      alert("A template with this name already exists");
      return;
    }

    const validation = validateCategories();
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    templateStorage.save(templateName.trim(), categories, editingTemplateId || undefined);
    loadTemplates();
    setShowSaveDialog(false);
    setTemplateName("");
  };

  const loadTemplate = (templateId: string) => {
    const template = templateStorage.getById(templateId);
    if (template) {
      // Deep clone to avoid reference issues
      setCategories(JSON.parse(JSON.stringify(template.categories)));
    }
  };

  const deleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      templateStorage.delete(templateId);
      loadTemplates();
    }
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
      setCategories(generatedCategories);
    } catch (error) {
      console.error('Error generating categories from dataset:', error);
      alert('Failed to generate categories from dataset');
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

  // Check if a string is a valid image URL
  const isImageUrl = (text: string): boolean => {
    // Must start with http:// or https://
    if (!text.match(/^https?:\/\//i)) return false;
    
    // Check for direct image file extensions
    const imageExtPattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg|apng|avif|jfif)(\?.*)?$/i;
    if (imageExtPattern.test(text)) return true;
    
    // Check for common image hosting services
    const imageHosts = [
      'imgur.com',
      'i.imgur.com',
      'giphy.com',
      'media.giphy.com',
      'tenor.com',
      'media.tenor.com',
      'i.redd.it',
      'preview.redd.it',
      'pbs.twimg.com',
      'media.discordapp.net',
      'cdn.discordapp.com',
      'i.postimg.cc',
      'postimg.cc'
    ];
    
    if (imageHosts.some(host => text.includes(host))) return true;
    
    // Check for common CDN patterns
    if (text.match(/\/media\//i) || text.match(/\/cdn\//i) || text.match(/\/images?\//i)) {
      return true;
    }
    
    return false;
  };

  // Handle text change with auto image detection
  const handleTextChange = (categoryId: string, questionId: string, field: 'question' | 'answer', value: string) => {
    updateQuestion(categoryId, questionId, field, value);
    
    // Auto-detect image URLs - check each line
    const lines = value.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && isImageUrl(trimmedLine)) {
        const imageField = field === 'question' ? 'questionImageUrl' : 'answerImageUrl';
        updateQuestion(categoryId, questionId, imageField, trimmedLine);
        break; // Use first valid URL found
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
          // Convert to data URL
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const imageField = field === 'question' ? 'questionImageUrl' : 'answerImageUrl';
            updateQuestion(categoryId, questionId, imageField, dataUrl);
          };
          reader.readAsDataURL(file);
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
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-card/60 backdrop-blur-md border border-border px-6 py-3 rounded-lg">
              <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>Setup</h1>
            </div>
            <Badge variant="outline" className="px-3 py-1 text-sm font-mono backdrop-blur-md">
              {resolvedParams.code}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => router.push(`/lobby/${resolvedParams.code}`)} variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back
            </Button>
            
            {/* Template Actions */}
            {templates.length > 0 && (
              <Select onValueChange={loadTemplate}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Templates..." />
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
              Save
            </Button>
            
            {templates.length > 0 && (
              <Button onClick={() => setShowManageDialog(true)} variant="outline" size="sm">
                <FolderOpen className="mr-1 h-3 w-3" />
                Manage
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
            
            <Button onClick={saveGame} size="sm">
              <Save className="mr-1 h-3 w-3" />
              Save
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
                          placeholder="Enter question, paste image URL, or paste image from clipboard..."
                          className="min-h-[80px]"
                        />
                        {question.questionImageUrl && (
                          <div className="mt-2 relative border rounded overflow-hidden">
                            <img 
                              src={question.questionImageUrl} 
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
                          placeholder="Enter answer, paste image URL, or paste image from clipboard..."
                          className="min-h-[80px]"
                        />
                        {question.answerImageUrl && (
                          <div className="mt-2 relative border rounded overflow-hidden">
                            <img 
                              src={question.answerImageUrl} 
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
                  if (e.key === "Enter") saveAsTemplate();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveAsTemplate}>
              {editingTemplateId ? "Rename" : "Save Template"}
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
    </div>
  );
}

