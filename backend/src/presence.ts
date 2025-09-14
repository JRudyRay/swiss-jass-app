// Centralized presence tracking so multiple modules (routes, services) can access online status.
export interface OnlineUserEntry {
  sockets: Set<string>;
  username?: string;
}

// Map of userId -> connection metadata
export const onlineUsers: Map<string, OnlineUserEntry> = new Map();

export function setUserOnline(userId: string, socketId: string, username?: string) {
  const entry = onlineUsers.get(userId) || { sockets: new Set<string>(), username };
  entry.sockets.add(socketId);
  if (username && !entry.username) entry.username = username;
  onlineUsers.set(userId, entry);
}

export function setUserOffline(userId: string, socketId: string) {
  const entry = onlineUsers.get(userId);
  if (!entry) return;
  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) onlineUsers.delete(userId);
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineCount(): number {
  return onlineUsers.size;
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}
