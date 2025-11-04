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
import { Plus, Trash2, Save, ArrowLeft, BookTemplate, FolderOpen, Edit3 } from "lucide-react";
import { Category, Question, GameTemplate } from "@/types/game";
import { templateStorage } from "@/lib/template-storage";

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
  const [templateName, setTemplateName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

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
        if (!question.question.trim()) {
          return { 
            isValid: false, 
            message: `Category "${category.name}" has empty questions. Please fill in all questions.` 
          };
        }
        if (!question.answer.trim()) {
          return { 
            isValid: false, 
            message: `Category "${category.name}" has empty answers. Please fill in all answers.` 
          };
        }
      }
    }

    return { isValid: true, message: "" };
  };

  const loadDefaultGame = async () => {
    const defaultCategories: Category[] = [
      {
        id: "1",
        name: "History",
        questions: [
          { id: "1-1", question: "This war lasted from 1939 to 1945", answer: "What is World War II?", value: 200, answered: false },
          { id: "1-2", question: "This document was signed in 1776", answer: "What is the Declaration of Independence?", value: 400, answered: false },
          { id: "1-3", question: "This president issued the Emancipation Proclamation", answer: "Who is Abraham Lincoln?", value: 600, answered: false },
          { id: "1-4", question: "The Berlin Wall fell in this year", answer: "What is 1989?", value: 800, answered: false },
          { id: "1-5", question: "This empire was ruled by Julius Caesar", answer: "What is the Roman Empire?", value: 1000, answered: false },
        ]
      },
      {
        id: "2",
        name: "Science",
        questions: [
          { id: "2-1", question: "This is the chemical symbol for gold", answer: "What is Au?", value: 200, answered: false },
          { id: "2-2", question: "This planet is known as the Red Planet", answer: "What is Mars?", value: 400, answered: false },
          { id: "2-3", question: "This is the powerhouse of the cell", answer: "What is mitochondria?", value: 600, answered: false },
          { id: "2-4", question: "This force keeps planets in orbit", answer: "What is gravity?", value: 800, answered: false },
          { id: "2-5", question: "This scientist developed the theory of relativity", answer: "Who is Albert Einstein?", value: 1000, answered: false },
        ]
      },
      {
        id: "3",
        name: "Geography",
        questions: [
          { id: "3-1", question: "This is the capital of France", answer: "What is Paris?", value: 200, answered: false },
          { id: "3-2", question: "This is the longest river in the world", answer: "What is the Nile?", value: 400, answered: false },
          { id: "3-3", question: "This is the largest continent", answer: "What is Asia?", value: 600, answered: false },
          { id: "3-4", question: "This mountain is the tallest in the world", answer: "What is Mount Everest?", value: 800, answered: false },
          { id: "3-5", question: "This is the smallest country in the world", answer: "What is Vatican City?", value: 1000, answered: false },
        ]
      },
    ];
    setCategories(defaultCategories);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Card className="border border-white/20 bg-black/20 backdrop-blur-xl">
          <CardContent className="p-8">
            <p className="text-lg">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">Poor Man&apos;s Jeopardy - Setup</h1>
            <p className="text-gray-300">Lobby Code: <span className="font-mono font-bold text-yellow-400">{resolvedParams.code}</span></p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => router.push(`/lobby/${resolvedParams.code}`)} variant="outline" className="backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
            
            {/* Template Actions */}
            {templates.length > 0 && (
              <Select onValueChange={loadTemplate}>
                <SelectTrigger className="w-[200px] backdrop-blur-sm bg-white/5 border-white/10">
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
            
            <Button onClick={openSaveTemplateDialog} variant="outline" className="backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10">
              <BookTemplate className="mr-2 h-4 w-4" />
              Save as Template
            </Button>
            
            {templates.length > 0 && (
              <Button onClick={() => setShowManageDialog(true)} variant="outline" className="backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10">
                <FolderOpen className="mr-2 h-4 w-4" />
                Manage Templates
              </Button>
            )}
            
            <Button onClick={loadDefaultGame} variant="outline" className="backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10">
              Load Default Game
            </Button>
            
            <Button onClick={addCategory} variant="secondary" className="backdrop-blur-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            
            <Button onClick={saveGame}>
              <Save className="mr-2 h-4 w-4" />
              Save & Continue
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="border border-white/20 bg-black/20 backdrop-blur-xl">
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
                        <div className="text-lg font-bold text-blue-600">
                          ${question.value}
                        </div>
                      </div>
                      <div className="col-span-5">
                        <Label className="text-sm">Question</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(category.id, question.id, "question", e.target.value)}
                          placeholder="Enter question..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="col-span-6">
                        <Label className="text-sm">Answer</Label>
                        <Textarea
                          value={question.answer}
                          onChange={(e) => updateQuestion(category.id, question.id, "answer", e.target.value)}
                          placeholder="Enter answer..."
                          className="min-h-[80px]"
                        />
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
        <DialogContent className="border border-white/20 bg-black/40 backdrop-blur-xl">
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

      {/* Manage Templates Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="border border-white/20 bg-black/40 backdrop-blur-xl max-w-2xl">
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
                <Card key={template.id} className="border border-white/10 bg-white/5 backdrop-blur-sm">
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

