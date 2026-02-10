/**
 * Telegram Bot Client
 * Handles sending and receiving messages via Telegram Bot API
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

// ============================================================================
// Types
// ============================================================================

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
  };
  date: number;
  text?: string;
  voice?: {
    file_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    message?: TelegramMessage;
    data?: string;
  };
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

// ============================================================================
// Client
// ============================================================================

export class TelegramClient {
  private token: string;
  private baseUrl: string;

  constructor(token?: string) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.token) {
      console.warn('[Telegram] No bot token configured');
    }
    this.baseUrl = `${TELEGRAM_API}${this.token}`;
  }

  /**
   * Send a text message
   */
  async sendMessage(
    chatId: number,
    text: string,
    options: {
      parseMode?: 'Markdown' | 'HTML';
      replyToMessageId?: number;
      keyboard?: object;
    } = {}
  ): Promise<TelegramMessage | null> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options.parseMode,
          reply_to_message_id: options.replyToMessageId,
          reply_markup: options.keyboard
        })
      });

      const data = await response.json();
      if (!data.ok) {
        console.error('[Telegram] sendMessage failed:', data);
        return null;
      }

      return data.result;
    } catch (error) {
      console.error('[Telegram] sendMessage error:', error);
      return null;
    }
  }

  /**
   * Send a typing indicator
   */
  async sendTyping(chatId: number): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          action: 'typing'
        })
      });
    } catch (error) {
      console.error('[Telegram] sendTyping error:', error);
    }
  }

  /**
   * Get file download URL
   */
  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/getFile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId })
      });

      const data = await response.json();
      if (!data.ok || !data.result.file_path) {
        console.error('[Telegram] getFile failed:', data);
        return null;
      }

      return `https://api.telegram.org/file/bot${this.token}/${data.result.file_path}`;
    } catch (error) {
      console.error('[Telegram] getFile error:', error);
      return null;
    }
  }

  /**
   * Download a file as Buffer
   */
  async downloadFile(fileId: string): Promise<Buffer | null> {
    const url = await this.getFileUrl(fileId);
    if (!url) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('[Telegram] downloadFile error:', error);
      return null;
    }
  }

  /**
   * Set webhook URL
   */
  async setWebhook(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (!data.ok) {
        console.error('[Telegram] setWebhook failed:', data);
        return false;
      }

      console.log(`[Telegram] Webhook set to: ${url}`);
      return true;
    } catch (error) {
      console.error('[Telegram] setWebhook error:', error);
      return false;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<object | null> {
    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
      const data = await response.json();
      return data.ok ? data.result : null;
    } catch (error) {
      console.error('[Telegram] getWebhookInfo error:', error);
      return null;
    }
  }

  /**
   * Delete webhook (for local development with polling)
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('[Telegram] deleteWebhook error:', error);
      return false;
    }
  }

  /**
   * Get bot info
   */
  async getMe(): Promise<object | null> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();
      return data.ok ? data.result : null;
    } catch (error) {
      console.error('[Telegram] getMe error:', error);
      return null;
    }
  }

  /**
   * Send inline keyboard for confirmations
   */
  async sendConfirmation(
    chatId: number,
    text: string,
    confirmData: string,
    cancelData: string
  ): Promise<TelegramMessage | null> {
    return this.sendMessage(chatId, text, {
      keyboard: {
        inline_keyboard: [
          [
            { text: '✅ Confirm', callback_data: confirmData },
            { text: '❌ Cancel', callback_data: cancelData }
          ]
        ]
      }
    });
  }

  /**
   * Answer callback query (dismiss button loading state)
   */
  async answerCallback(callbackId: string, text?: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text
        })
      });
    } catch (error) {
      console.error('[Telegram] answerCallback error:', error);
    }
  }
}

// Singleton
let client: TelegramClient | null = null;

export function getTelegramClient(): TelegramClient {
  if (!client) {
    client = new TelegramClient();
  }
  return client;
}
