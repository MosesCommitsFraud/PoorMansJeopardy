import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache for parsed dataset - persists in memory across requests
let cachedDataset: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // Cache for 1 hour

// Simple CSV parser
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length === headers.length) {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index].replace(/^"|"$/g, ''); // Remove surrounding quotes
      });
      results.push(obj);
    }
  }

  return results;
}

// API route to load the questions dataset from CSV
export async function GET() {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (cachedDataset && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached dataset');
      return NextResponse.json(cachedDataset);
    }

    console.log('Loading and parsing dataset from CSV...');
    const filePath = path.join(process.cwd(), 'assets', 'files', 'JEOPARDY_CSV.csv');

    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const allQuestions = parseCSV(fileContent);

    // Extract only the fields we need: Category, Question, Answer, Value
    const simplifiedQuestions = allQuestions.map((q: any) => ({
      category: q.Category || '',
      question: q.Question || '',
      answer: q.Answer || '',
      value: q.Value || null
    }));

    // Cache the result
    cachedDataset = simplifiedQuestions;
    cacheTimestamp = now;
    console.log(`Cached ${simplifiedQuestions.length} questions`);

    return NextResponse.json(simplifiedQuestions);
  } catch (error) {
    console.error('Error loading questions dataset:', error);
    return NextResponse.json(
      { error: 'Failed to load questions dataset' },
      { status: 500 }
    );
  }
}

