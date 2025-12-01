import { GameTemplate } from "@/types/game";

const DB_NAME = "JeopardyDB";
const DB_VERSION = 1;
const TEMPLATES_STORE = "templates";

/**
 * IndexedDB wrapper for storing game templates with large images
 * Can store gigabytes of data (unlike localStorage's ~5-10MB limit)
 */
class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize and open the IndexedDB database
   */
  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("IndexedDB not available (SSR)"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create templates object store if it doesn't exist
        if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
          const store = db.createObjectStore(TEMPLATES_STORE, { keyPath: "id" });
          // Create indexes for efficient querying
          store.createIndex("name", "name", { unique: false });
          store.createIndex("lastModified", "lastModified", { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Get all templates
   */
  async getAll(): Promise<GameTemplate[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([TEMPLATES_STORE], "readonly");
      const store = transaction.objectStore(TEMPLATES_STORE);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error("Failed to get templates"));
      });
    } catch (error) {
      console.error("Error getting all templates:", error);
      return [];
    }
  }

  /**
   * Get a template by ID
   */
  async getById(id: string): Promise<GameTemplate | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([TEMPLATES_STORE], "readonly");
      const store = transaction.objectStore(TEMPLATES_STORE);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error("Failed to get template"));
      });
    } catch (error) {
      console.error("Error getting template by ID:", error);
      return null;
    }
  }

  /**
   * Save a template (create or update)
   */
  async save(template: GameTemplate): Promise<GameTemplate> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([TEMPLATES_STORE], "readwrite");
      const store = transaction.objectStore(TEMPLATES_STORE);
      const request = store.put(template);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(template);
        request.onerror = () => reject(new Error("Failed to save template"));
      });
    } catch (error) {
      console.error("Error saving template:", error);
      throw error;
    }
  }

  /**
   * Delete a template by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([TEMPLATES_STORE], "readwrite");
      const store = transaction.objectStore(TEMPLATES_STORE);
      const request = store.delete(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(new Error("Failed to delete template"));
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      return false;
    }
  }

  /**
   * Clear all templates (useful for testing/reset)
   */
  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([TEMPLATES_STORE], "readwrite");
      const store = transaction.objectStore(TEMPLATES_STORE);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error("Failed to clear templates"));
      });
    } catch (error) {
      console.error("Error clearing templates:", error);
      throw error;
    }
  }

  /**
   * Get storage usage estimation
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error("Error getting storage estimate:", error);
      return null;
    }
  }
}

// Export singleton instance
export const indexedDBStorage = new IndexedDBStorage();
