"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Category, Question } from "@/types/game";

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

  useEffect(() => {
    loadGameState();
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-lg">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Game Setup</h1>
            <p className="text-blue-200">Lobby Code: <span className="font-mono font-bold text-yellow-300">{resolvedParams.code}</span></p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => router.push(`/lobby/${resolvedParams.code}`)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
            <Button onClick={loadDefaultGame} variant="outline">
              Load Default Game
            </Button>
            <Button onClick={addCategory} variant="secondary">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button onClick={saveGame}>
              <Save className="mr-2 h-4 w-4" />
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
    </div>
  );
}

