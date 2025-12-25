/**
 * WhatsApp Parser Types
 */

export type MessageType = 'text' | 'media' | 'system' | 'deleted';

export interface ParsedMessage {
  id: string;
  timestamp: Date;
  sender: string;
  content: string;
  type: MessageType;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact';
  rawLine: string;
}

export interface ParserResult {
  messages: ParsedMessage[];
  participants: string[];
  startDate: Date | null;
  endDate: Date | null;
  metadata: {
    totalMessages: number;
    textMessages: number;
    mediaMessages: number;
    systemMessages: number;
    deletedMessages: number;
  };
}

export interface ParserOptions {
  /**
   * Locale hint for date parsing (auto-detected if not provided)
   * Examples: 'en-US', 'fr-FR', 'de-DE'
   */
  locale?: string;

  /**
   * Whether to include system messages (e.g., "X joined the group")
   * Default: true
   */
  includeSystemMessages?: boolean;

  /**
   * Whether to include deleted messages placeholders
   * Default: true
   */
  includeDeletedMessages?: boolean;
}

/**
 * Supported WhatsApp export date formats
 */
export const DATE_FORMATS = {
  // US format: 1/15/23, 10:30 AM (requires AM/PM)
  US: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i,

  // EU format: 15/01/2023, 10:30 (24h format, no AM/PM)
  EU: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?!\s*[AP]M)/i,

  // ISO-like: 2023-01-15, 10:30
  ISO: /^(\d{4})-(\d{2})-(\d{2}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,

  // German format: 15.01.23, 10:30
  DE: /^(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,

  // Brazilian format: 15/01/2023 10:30
  BR: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
} as const;

/**
 * Common media placeholders in different languages
 */
export const MEDIA_PLACEHOLDERS: Record<string, string> = {
  // English
  '<Media omitted>': 'media',
  'image omitted': 'image',
  'video omitted': 'video',
  'audio omitted': 'audio',
  'document omitted': 'document',
  'sticker omitted': 'sticker',
  'GIF omitted': 'image',
  'Contact card omitted': 'contact',
  'Location:': 'location',

  // French
  '<Téléchargement indisponible>': 'media',
  '<Téléchargement du fichier média impossible>': 'media',
  'image téléchargement indisponible': 'image',

  // German
  '<Medien weggelassen>': 'media',
  'Bild weggelassen': 'image',

  // Spanish
  '<Multimedia omitido>': 'media',
  'imagen omitida': 'image',

  // Portuguese
  '<Mídia oculta>': 'media',
  'imagem ocultada': 'image',
};

/**
 * System message patterns (messages without a sender)
 */
export const SYSTEM_PATTERNS = [
  /created group/i,
  /changed the subject/i,
  /changed this group/i,
  /added you/i,
  /removed you/i,
  /left$/i,
  /joined using/i,
  /changed the group/i,
  /messages and calls are end-to-end encrypted/i,
  /security code changed/i,
  /vous a ajouté/i,
  /a quitté/i,
  /a créé le groupe/i,
];

/**
 * Deleted message patterns
 */
export const DELETED_PATTERNS = [
  /this message was deleted/i,
  /you deleted this message/i,
  /ce message a été supprimé/i,
  /diese nachricht wurde gelöscht/i,
  /este mensaje fue eliminado/i,
  /esta mensagem foi apagada/i,
];
