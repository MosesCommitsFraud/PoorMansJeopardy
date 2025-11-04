import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    
    return NextResponse.json(simplifiedQuestions);
  } catch (error) {
    console.error('Error loading questions dataset:', error);
    return NextResponse.json(
      { error: 'Failed to load questions dataset' }, 
      { status: 500 }
    );
  }
}

