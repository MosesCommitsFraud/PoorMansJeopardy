import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface CategoryData {
  name: string;
  questionCount: number;
}

// Cache for categories - persists in memory across requests
let cachedCategories: CategoryData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // Cache for 1 hour

// Extract categories directly from CSV without parsing all questions
function extractCategoriesFromCSV(csvText: string): CategoryData[] {
  const lines = csvText.split('\n');
  const categoryMap = new Map<string, number>();

  // Find the category column index from header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const categoryIndex = headers.findIndex(h => h.toLowerCase() === 'category');

  if (categoryIndex === -1) {
    throw new Error('Category column not found in CSV');
  }

  // Process each line to count categories
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Quick parse - just get the category value
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';

        // Early exit once we have the category
        if (values.length > categoryIndex) break;
      } else {
        current += char;
      }
    }

    // Add the last value if we need it
    if (values.length === categoryIndex) {
      values.push(current.trim().replace(/^"|"$/g, ''));
    }

    if (values.length > categoryIndex) {
      const category = values[categoryIndex].toUpperCase();
      if (category) {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }
    }
  }

  // Convert to array and filter
  return Array.from(categoryMap.entries())
    .map(([name, questionCount]) => ({ name, questionCount }))
    .filter(cat => cat.questionCount >= 5) // Only categories with at least 5 questions
    .sort((a, b) => a.name.localeCompare(b.name));
}

// API route to get just the categories (much faster than loading all questions)
export async function GET() {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (cachedCategories && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log(`Returning ${cachedCategories.length} cached categories`);
      return NextResponse.json(cachedCategories);
    }

    console.log('Extracting categories from CSV...');
    const filePath = path.join(process.cwd(), 'assets', 'files', 'JEOPARDY_CSV.csv');

    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const categories = extractCategoriesFromCSV(fileContent);

    // Cache the result
    cachedCategories = categories;
    cacheTimestamp = now;
    console.log(`Cached ${categories.length} categories`);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    return NextResponse.json(
      { error: 'Failed to load categories' },
      { status: 500 }
    );
  }
}
