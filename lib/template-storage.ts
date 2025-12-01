import { GameTemplate, Category } from "@/types/game";
import { indexedDBStorage } from "./indexed-db-storage";

const TEMPLATES_KEY = "jeopardy_game_templates";

/**
 * Migrate templates from localStorage to IndexedDB (one-time operation)
 */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // Check if migration has already been done
    const migrated = localStorage.getItem("jeopardy_templates_migrated");
    if (migrated === "true") return;

    // Get templates from localStorage
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (stored) {
      const templates: GameTemplate[] = JSON.parse(stored);

      // Save each template to IndexedDB
      for (const template of templates) {
        await indexedDBStorage.save(template);
      }

      console.log(`Migrated ${templates.length} templates from localStorage to IndexedDB`);
    }

    // Mark migration as complete
    localStorage.setItem("jeopardy_templates_migrated", "true");

    // Optionally remove old data to free up localStorage space
    localStorage.removeItem(TEMPLATES_KEY);
  } catch (error) {
    console.error("Error migrating templates:", error);
  }
}

// Run migration once on module load
if (typeof window !== "undefined") {
  migrateFromLocalStorage();
}

export const templateStorage = {
  /**
   * Get all saved templates
   */
  async getAll(): Promise<GameTemplate[]> {
    try {
      return await indexedDBStorage.getAll();
    } catch (error) {
      console.error("Error loading templates:", error);
      return [];
    }
  },

  /**
   * Get a specific template by ID
   */
  async getById(id: string): Promise<GameTemplate | null> {
    try {
      return await indexedDBStorage.getById(id);
    } catch (error) {
      console.error("Error getting template:", error);
      return null;
    }
  },

  /**
   * Save a new template or update existing one
   */
  async save(name: string, categories: Category[], id?: string): Promise<GameTemplate> {
    const now = Date.now();

    if (id) {
      // Update existing template
      const existing = await indexedDBStorage.getById(id);
      if (existing) {
        const updated: GameTemplate = {
          ...existing,
          name,
          categories: JSON.parse(JSON.stringify(categories)), // Deep clone
          lastModified: now,
        };
        return await indexedDBStorage.save(updated);
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

    return await indexedDBStorage.save(newTemplate);
  },

  /**
   * Delete a template by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      return await indexedDBStorage.delete(id);
    } catch (error) {
      console.error("Error deleting template:", error);
      return false;
    }
  },

  /**
   * Rename a template
   */
  async rename(id: string, newName: string): Promise<boolean> {
    try {
      const template = await indexedDBStorage.getById(id);
      if (!template) return false;

      template.name = newName;
      template.lastModified = Date.now();
      await indexedDBStorage.save(template);
      return true;
    } catch (error) {
      console.error("Error renaming template:", error);
      return false;
    }
  },

  /**
   * Check if a template name already exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      const templates = await this.getAll();
      return templates.some(t =>
        t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId
      );
    } catch (error) {
      console.error("Error checking template name:", error);
      return false;
    }
  },

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{ usedMB: number; quotaMB: number; percentUsed: number } | null> {
    const estimate = await indexedDBStorage.getStorageEstimate();
    if (!estimate) return null;

    const usedMB = estimate.usage / (1024 * 1024);
    const quotaMB = estimate.quota / (1024 * 1024);
    const percentUsed = (estimate.usage / estimate.quota) * 100;

    return { usedMB, quotaMB, percentUsed };
  },
};

