import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";

export async function POST(request: Request) {
  const body = await request.json();
  const { action, categoryId, questionId, question } = body;

  if (action === "select") {
    const state = gameStore.getState();
    const category = state.categories.find(c => c.id === categoryId);
    const q = category?.questions.find(q => q.id === questionId);
    
    if (q) {
      gameStore.setCurrentQuestion(q);
    }
  } else if (action === "mark_answered") {
    gameStore.markQuestionAnswered(categoryId, questionId);
    gameStore.setCurrentQuestion(null);
  } else if (action === "close") {
    gameStore.setCurrentQuestion(null);
  }

  return NextResponse.json({ success: true });
}

