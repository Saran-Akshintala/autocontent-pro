export class RateLimiter {
  private lastMessageTimes: Map<string, number> = new Map();
  private readonly baseDelay: number;
  private readonly jitterRange: number;

  constructor(baseDelaySeconds: number = 12, jitterSeconds: number = 3) {
    this.baseDelay = baseDelaySeconds * 1000; // Convert to milliseconds
    this.jitterRange = jitterSeconds * 1000;
  }

  /**
   * Check if we can send a message to a chat and get the delay needed
   * @param chatId - The chat identifier
   * @returns Promise that resolves when it's safe to send
   */
  async waitForRateLimit(chatId: string): Promise<void> {
    const now = Date.now();
    const lastMessageTime = this.lastMessageTimes.get(chatId) || 0;
    
    // Calculate delay with jitter
    const jitter = Math.random() * (this.jitterRange * 2) - this.jitterRange; // +/- jitterRange
    const totalDelay = this.baseDelay + jitter;
    
    const timeSinceLastMessage = now - lastMessageTime;
    const remainingDelay = Math.max(0, totalDelay - timeSinceLastMessage);

    if (remainingDelay > 0) {
      console.log(`⏳ Rate limiting: waiting ${Math.round(remainingDelay / 1000)}s for chat ${chatId}`);
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }

    // Update the last message time
    this.lastMessageTimes.set(chatId, Date.now());
  }

  /**
   * Get the next available time for a chat
   */
  getNextAvailableTime(chatId: string): Date {
    const lastMessageTime = this.lastMessageTimes.get(chatId) || 0;
    const jitter = Math.random() * (this.jitterRange * 2) - this.jitterRange;
    const totalDelay = this.baseDelay + jitter;
    
    return new Date(lastMessageTime + totalDelay);
  }

  /**
   * Check if we can send immediately without waiting
   */
  canSendImmediately(chatId: string): boolean {
    const now = Date.now();
    const lastMessageTime = this.lastMessageTimes.get(chatId) || 0;
    const timeSinceLastMessage = now - lastMessageTime;
    
    return timeSinceLastMessage >= this.baseDelay;
  }

  /**
   * Clear rate limit data for a chat (useful for testing or reset)
   */
  clearChatHistory(chatId: string): void {
    this.lastMessageTimes.delete(chatId);
  }

  /**
   * Get statistics about rate limiting
   */
  getStats(): { totalChats: number; rateLimitedChats: number } {
    const now = Date.now();
    const rateLimitedChats = Array.from(this.lastMessageTimes.entries())
      .filter(([_, lastTime]) => (now - lastTime) < this.baseDelay).length;

    return {
      totalChats: this.lastMessageTimes.size,
      rateLimitedChats,
    };
  }
}
