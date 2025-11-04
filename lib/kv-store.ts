// KV Store wrapper that works both locally and on Vercel
import { Lobby } from "@/types/game";

// In-memory fallback for local development - using global to persist across hot reloads
declare global {
  var localLobbyStore: Map<string, Lobby> | undefined;
}

// Persist the store across hot reloads in development
const localStore = global.localLobbyStore || new Map<string, Lobby>();
if (!global.localLobbyStore) {
  global.localLobbyStore = localStore;
}

// Check if we're in Vercel environment
const isVercel = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

let kv: any = null;

// Initialize KV only on server side and when available
if (typeof window === "undefined" && isVercel) {
  try {
    kv = require("@vercel/kv").kv;
  } catch (error) {
    console.log("Vercel KV not available, using local storage");
  }
}

export const kvStore = {
  async getLobby(code: string): Promise<Lobby | null> {
    if (kv) {
      try {
        return await kv.get<Lobby>(`lobby:${code}`);
      } catch (error) {
        console.error("KV get error:", error);
        return null;
      }
    }
    return localStore.get(`lobby:${code}`) || null;
  },

  async setLobby(code: string, lobby: Lobby, ttl: number = 86400): Promise<void> {
    if (kv) {
      try {
        await kv.set(`lobby:${code}`, lobby, { ex: ttl });
      } catch (error) {
        console.error("KV set error:", error);
      }
    } else {
      localStore.set(`lobby:${code}`, lobby);
    }
  },

  async deleteLobby(code: string): Promise<void> {
    if (kv) {
      try {
        await kv.del(`lobby:${code}`);
      } catch (error) {
        console.error("KV delete error:", error);
      }
    } else {
      localStore.delete(`lobby:${code}`);
    }
  },

  async getAllLobbyCodes(): Promise<string[]> {
    if (kv) {
      try {
        const keys = await kv.keys("lobby:*");
        return keys.map((key: string) => key.replace("lobby:", ""));
      } catch (error) {
        console.error("KV keys error:", error);
        return [];
      }
    }
    return Array.from(localStore.keys()).map(key => key.replace("lobby:", ""));
  },
};

