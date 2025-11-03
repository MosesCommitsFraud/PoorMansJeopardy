"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { Category, Question } from "@/types/game";

export default function HostSetup() {
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

  const addCategory = () => {
    // Generate unique ID using timestamp to avoid duplicates
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
    await fetch("/api/game/default", { method: "POST" });
    const response = await fetch("/api/game/state");
    const data = await response.json();
    setCategories(data.categories);
  };

  const saveGame = async () => {
    await fetch("/api/game/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories }),
    });
    router.push("/host/game");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Game Setup</h1>
            <p className="text-blue-200">Create categories and questions for your Jeopardy game</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={loadDefaultGame} variant="outline">
              Load Default Game
            </Button>
            <Button onClick={addCategory} variant="secondary">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button onClick={saveGame}>
              <Save className="mr-2 h-4 w-4" />
              Save & Start
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

