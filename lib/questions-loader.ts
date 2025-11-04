// Utility for working with the 200k questions dataset

export interface JeopardyQuestion {
  category: string;
  question: string;
  answer: string;
  value: string | null;
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
      questions: questions.map((q, qIndex) => ({
        id: `${categoryId}-${qIndex}`,
        question: q.question,
        answer: q.answer,
        value: normalizeValue(q.value, qIndex),
        answered: false
      }))
    };
  });
}

