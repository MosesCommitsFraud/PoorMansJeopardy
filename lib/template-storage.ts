import { GameTemplate, Category } from "@/types/game";

const TEMPLATES_KEY = "jeopardy_game_templates";

export const templateStorage = {
  /**
   * Get all saved templates
   */
  getAll(): GameTemplate[] {
    if (typeof window === "undefined") return [];
    
    try {
      const stored = localStorage.getItem(TEMPLATES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error("Error loading templates:", error);
      return [];
    }
  },

  /**
   * Get a specific template by ID
   */
  getById(id: string): GameTemplate | null {
    const templates = this.getAll();
    return templates.find(t => t.id === id) || null;
  },

  /**
   * Save a new template or update existing one
   */
  save(name: string, categories: Category[], id?: string): GameTemplate {
    const templates = this.getAll();
    const now = Date.now();
    
    if (id) {
      // Update existing template
      const index = templates.findIndex(t => t.id === id);
      if (index !== -1) {
        templates[index] = {
          ...templates[index],
          name,
          categories: JSON.parse(JSON.stringify(categories)), // Deep clone
          lastModified: now,
        };
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
        return templates[index];
      }
    }
    
    // Create new template
    const newTemplate: GameTemplate = {
      id: `template_${now}`,
      name,
      categories: JSON.parse(JSON.stringify(categories)), // Deep clone
      createdAt: now,
      lastModified: now,
    };
    
    templates.push(newTemplate);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return newTemplate;
  },

  /**
   * Delete a template by ID
   */
  delete(id: string): boolean {
    const templates = this.getAll();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) {
      return false; // Template not found
    }
    
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    return true;
  },

  /**
   * Rename a template
   */
  rename(id: string, newName: string): boolean {
    const templates = this.getAll();
    const template = templates.find(t => t.id === id);
    
    if (!template) return false;
    
    template.name = newName;
    template.lastModified = Date.now();
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  },

  /**
   * Check if a template name already exists
   */
  nameExists(name: string, excludeId?: string): boolean {
    const templates = this.getAll();
    return templates.some(t => 
      t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId
    );
  },
};

