import { NextResponse } from "next/server";
import { gameStore } from "@/lib/game-store";
import { Category } from "@/types/game";

export async function POST(request: Request) {
  const body = await request.json();
  const { categories } = body as { categories: Category[] };
  
  gameStore.setCategories(categories);
  
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ success: true, message: "Use POST to setup game" });
}

