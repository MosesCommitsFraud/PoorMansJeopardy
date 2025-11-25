// Utility for working with the 200k questions dataset

export interface JeopardyQuestion {
  category: string;
  question: string;
  answer: string;
  value: string | null;
}

export interface ProcessedText {
  text: string;
  imageUrl?: string;
}

// Extract image URL from HTML anchor tags and clean up text
// Handles patterns like: <a href=http://example.com/image.jpg target=_blank>Text here</a>
export function extractImageFromHtml(text: string): ProcessedText {
  if (!text) return { text: '' };
  
  let imageUrl: string | undefined;
  let cleanedText = text;
  
  // Pattern to match <a href=URL>...</a> tags (with or without quotes around URL)
  const anchorPattern = /<a\s+href=["']?([^"'\s>]+)["']?[^>]*>(.*?)<\/a>/gi;
  
  // Check for anchor tags with image URLs
  const matches = [...text.matchAll(anchorPattern)];
  
  for (const match of matches) {
    const url = match[1];
    const innerText = match[2];
    
    // Check if the URL points to an image
    const isImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url) ||
      url.includes('j-archive.com/media/') ||
      url.includes('/images/') ||
      url.includes('/media/');
    
    if (isImageUrl && !imageUrl) {
      imageUrl = url;
      // Replace the anchor tag with just the inner text
      cleanedText = cleanedText.replace(match[0], innerText.trim());
    }
  }
  
  // Also handle standalone image URLs that might be in the text
  if (!imageUrl) {
    const urlPattern = /(https?:\/\/[^\s<>"]+\.(jpg|jpeg|png|gif|webp)(\?[^\s<>"]*)?)/gi;
    const urlMatch = cleanedText.match(urlPattern);
    if (urlMatch) {
      imageUrl = urlMatch[0];
      cleanedText = cleanedText.replace(urlMatch[0], '').trim();
    }
  }
  
  // Clean up any remaining HTML tags
  cleanedText = cleanedText
    .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return { text: cleanedText, imageUrl };
}

export interface CategoryData {
  name: string;
  questionCount: number;
}

// Load and parse questions from the dataset
export async function loadQuestionsDataset(): Promise<JeopardyQuestion[]> {
  try {
    const response = await fetch('/api/questions/dataset');
    if (!response.ok) {
      throw new Error('Failed to load questions dataset');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading questions dataset:', error);
    return [];
  }
}

// Get unique categories from the dataset
export function getUniqueCategories(questions: JeopardyQuestion[]): CategoryData[] {
  const categoryMap = new Map<string, number>();
  
  questions.forEach(q => {
    const upperCategory = q.category.toUpperCase();
    categoryMap.set(upperCategory, (categoryMap.get(upperCategory) || 0) + 1);
  });
  
  return Array.from(categoryMap.entries())
    .map(([name, questionCount]) => ({ name, questionCount }))
    .filter(cat => cat.questionCount >= 5) // Only categories with at least 5 questions
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Search categories by name
export function searchCategories(categories: CategoryData[], searchTerm: string): CategoryData[] {
  if (!searchTerm.trim()) {
    return categories;
  }
  
  const term = searchTerm.toLowerCase();
  return categories.filter(cat => 
    cat.name.toLowerCase().includes(term)
  );
}

// Get questions for a specific category
export function getQuestionsForCategory(
  questions: JeopardyQuestion[], 
  categoryName: string, 
  count: number = 5
): JeopardyQuestion[] {
  const upperCategory = categoryName.toUpperCase();
  const categoryQuestions = questions.filter(
    q => q.category.toUpperCase() === upperCategory
  );
  
  // Shuffle and take the requested count
  const shuffled = categoryQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Convert dataset question values to game values (200-1000)
export function normalizeValue(value: string | null, index: number): number {
  // Map to standard Jeopardy values: 200, 400, 600, 800, 1000
  const standardValues = [200, 400, 600, 800, 1000];
  return standardValues[index % standardValues.length] || 200;
}

// Generate game categories from dataset
export async function generateCategoriesFromDataset(
  selectedCategories: string[]
): Promise<any[]> {
  const allQuestions = await loadQuestionsDataset();
  
  return selectedCategories.map((categoryName, catIndex) => {
    const questions = getQuestionsForCategory(allQuestions, categoryName, 5);
    const categoryId = `cat-${Date.now()}-${catIndex}`;
    
    return {
      id: categoryId,
      name: categoryName,
      questions: questions.map((q, qIndex) => {
        // Extract images from HTML in questions and answers
        const processedQuestion = extractImageFromHtml(q.question);
        const processedAnswer = extractImageFromHtml(q.answer);
        
        return {
          id: `${categoryId}-${qIndex}`,
          question: processedQuestion.text,
          answer: processedAnswer.text,
          value: normalizeValue(q.value, qIndex),
          answered: false,
          questionImageUrl: processedQuestion.imageUrl,
          answerImageUrl: processedAnswer.imageUrl
        };
      })
    };
  });
}

