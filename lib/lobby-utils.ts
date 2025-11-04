import { customAlphabet } from "nanoid";

// Generate 4-character alphanumeric code (uppercase letters and numbers)
const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

export function generateLobbyCode(): string {
  return nanoid();
}

export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateHostId(): string {
  return `host_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validateLobbyCode(code: string): boolean {
  return /^[A-Z0-9]{4}$/.test(code.toUpperCase());
}

