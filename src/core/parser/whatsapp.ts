/**
 * WhatsApp Export Parser
 * Parses WhatsApp chat exports into structured messages
 */

import { nanoid } from 'nanoid';
import type { ParsedMessage, ParserResult, ParserOptions } from './types.js';
import {
  DATE_FORMATS,
  MEDIA_PLACEHOLDERS,
  SYSTEM_PATTERNS,
  DELETED_PATTERNS,
} from './types.js';

/**
 * Parse a WhatsApp export file content
 */
export function parseWhatsAppExport(content: string, options: ParserOptions = {}): ParserResult {
  const {
    includeSystemMessages = true,
    includeDeletedMessages = true,
  } = options;

  const lines = content.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  const participantsSet = new Set<string>();

  let currentMessage: Partial<ParsedMessage> | null = null;
  let detectedFormat: keyof typeof DATE_FORMATS | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try to parse as a new message
    const parsed = parseMessageLine(line, detectedFormat);

    if (parsed) {
      // Save previous message if exists
      if (currentMessage?.timestamp && currentMessage?.content !== undefined) {
        const finalMessage = finalizeMessage(currentMessage as ParsedMessage);

        // Filter based on options
        if (finalMessage.type === 'system' && !includeSystemMessages) {
          // Skip system messages
        } else if (finalMessage.type === 'deleted' && !includeDeletedMessages) {
          // Skip deleted messages
        } else {
          messages.push(finalMessage);
          if (finalMessage.sender && finalMessage.type !== 'system') {
            participantsSet.add(finalMessage.sender);
          }
        }
      }

      // Start new message
      currentMessage = {
        id: nanoid(),
        timestamp: parsed.timestamp,
        sender: parsed.sender,
        content: parsed.content,
        rawLine: line,
      };
      detectedFormat = parsed.format;
    } else if (currentMessage) {
      // Continuation of previous message (multi-line)
      currentMessage.content += '\n' + line;
      currentMessage.rawLine += '\n' + line;
    }
  }

  // Don't forget the last message
  if (currentMessage?.timestamp && currentMessage?.content !== undefined) {
    const finalMessage = finalizeMessage(currentMessage as ParsedMessage);
    if (
      (finalMessage.type !== 'system' || includeSystemMessages) &&
      (finalMessage.type !== 'deleted' || includeDeletedMessages)
    ) {
      messages.push(finalMessage);
      if (finalMessage.sender && finalMessage.type !== 'system') {
        participantsSet.add(finalMessage.sender);
      }
    }
  }

  // Calculate metadata
  const participants = Array.from(participantsSet).sort();
  const metadata = {
    totalMessages: messages.length,
    textMessages: messages.filter((m) => m.type === 'text').length,
    mediaMessages: messages.filter((m) => m.type === 'media').length,
    systemMessages: messages.filter((m) => m.type === 'system').length,
    deletedMessages: messages.filter((m) => m.type === 'deleted').length,
  };

  return {
    messages,
    participants,
    startDate: messages.length > 0 ? messages[0].timestamp : null,
    endDate: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
    metadata,
  };
}

interface ParsedLine {
  timestamp: Date;
  sender: string;
  content: string;
  format: keyof typeof DATE_FORMATS;
}

/**
 * Try to parse a line as a new message
 */
function parseMessageLine(
  line: string,
  preferredFormat: keyof typeof DATE_FORMATS | null,
): ParsedLine | null {
  // Try preferred format first
  const formatsToTry = preferredFormat
    ? [preferredFormat, ...Object.keys(DATE_FORMATS).filter((f) => f !== preferredFormat)]
    : Object.keys(DATE_FORMATS);

  for (const formatKey of formatsToTry) {
    const format = DATE_FORMATS[formatKey as keyof typeof DATE_FORMATS];
    const match = line.match(format);

    if (match) {
      const timestamp = parseDateFromMatch(match, formatKey as keyof typeof DATE_FORMATS);
      if (!timestamp) continue;

      // Find the separator between date and message content
      // Common patterns: " - ", ": ", "] "
      const dateEndIndex = match[0].length;
      const remainder = line.slice(dateEndIndex);

      // Look for separator
      const separatorMatch = remainder.match(/^\s*[-:\]]\s*/);
      if (!separatorMatch) continue;

      const contentStart = dateEndIndex + separatorMatch[0].length;
      const messageContent = line.slice(contentStart);

      // Split sender and content (sender: content)
      const colonIndex = messageContent.indexOf(':');

      if (colonIndex > 0 && colonIndex < 50) {
        // Likely has a sender
        const sender = messageContent.slice(0, colonIndex).trim();
        const content = messageContent.slice(colonIndex + 1).trim();

        return {
          timestamp,
          sender,
          content,
          format: formatKey as keyof typeof DATE_FORMATS,
        };
      } else {
        // System message (no sender)
        return {
          timestamp,
          sender: '',
          content: messageContent.trim(),
          format: formatKey as keyof typeof DATE_FORMATS,
        };
      }
    }
  }

  return null;
}

/**
 * Parse date from regex match based on format
 */
function parseDateFromMatch(match: RegExpMatchArray, format: keyof typeof DATE_FORMATS): Date | null {
  try {
    let year: number;
    let month: number;
    let day: number;
    let hour: number;
    let minute: number;
    let second = 0;

    switch (format) {
      case 'US': {
        // m/d/y, h:mm AM/PM
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = normalizeYear(parseInt(match[3], 10));
        hour = parseInt(match[4], 10);
        minute = parseInt(match[5], 10);
        second = match[6] ? parseInt(match[6], 10) : 0;

        // Handle AM/PM
        const ampm = match[7]?.toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        break;
      }

      case 'EU':
      case 'BR': {
        // d/m/y, h:mm
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = normalizeYear(parseInt(match[3], 10));
        hour = parseInt(match[4], 10);
        minute = parseInt(match[5], 10);
        second = match[6] ? parseInt(match[6], 10) : 0;
        break;
      }

      case 'ISO': {
        // y-m-d, h:mm
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
        hour = parseInt(match[4], 10);
        minute = parseInt(match[5], 10);
        second = match[6] ? parseInt(match[6], 10) : 0;
        break;
      }

      case 'DE': {
        // d.m.y, h:mm
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = normalizeYear(parseInt(match[3], 10));
        hour = parseInt(match[4], 10);
        minute = parseInt(match[5], 10);
        second = match[6] ? parseInt(match[6], 10) : 0;
        break;
      }

      default:
        return null;
    }

    const date = new Date(year, month - 1, day, hour, minute, second);

    // Validate the date is reasonable
    if (isNaN(date.getTime())) return null;
    if (date.getFullYear() < 2009 || date.getFullYear() > 2100) return null;

    return date;
  } catch {
    return null;
  }
}

/**
 * Normalize 2-digit years to 4-digit
 */
function normalizeYear(year: number): number {
  if (year < 100) {
    return year >= 50 ? 1900 + year : 2000 + year;
  }
  return year;
}

/**
 * Finalize a message by detecting its type
 */
function finalizeMessage(message: ParsedMessage): ParsedMessage {
  const content = message.content.trim();

  // Check for deleted message
  if (DELETED_PATTERNS.some((pattern) => pattern.test(content))) {
    return { ...message, type: 'deleted', content };
  }

  // Check for system message
  if (!message.sender || SYSTEM_PATTERNS.some((pattern) => pattern.test(content))) {
    return { ...message, type: 'system', content };
  }

  // Check for media
  for (const [placeholder, mediaType] of Object.entries(MEDIA_PLACEHOLDERS)) {
    if (content.toLowerCase().includes(placeholder.toLowerCase())) {
      return {
        ...message,
        type: 'media',
        mediaType: mediaType as ParsedMessage['mediaType'],
        content,
      };
    }
  }

  // Check for attached media file pattern (e.g., "IMG-20230115-WA0001.jpg (file attached)")
  if (/\.(jpg|jpeg|png|gif|webp|mp4|mp3|opus|ogg|pdf|doc|docx)\s*\(file attached\)/i.test(content)) {
    const mediaType = detectMediaTypeFromFilename(content);
    return { ...message, type: 'media', mediaType, content };
  }

  // Regular text message
  return { ...message, type: 'text', content };
}

/**
 * Detect media type from filename
 */
function detectMediaTypeFromFilename(content: string): ParsedMessage['mediaType'] {
  const lower = content.toLowerCase();

  if (/\.(jpg|jpeg|png|gif|webp)/i.test(lower)) return 'image';
  if (/\.(mp4|mov|avi)/i.test(lower)) return 'video';
  if (/\.(mp3|opus|ogg|m4a)/i.test(lower)) return 'audio';
  if (/\.(pdf|doc|docx|xls|xlsx)/i.test(lower)) return 'document';

  return undefined;
}

/**
 * Parse WhatsApp export from file path
 */
export async function parseWhatsAppFile(
  filePath: string,
  options: ParserOptions = {},
): Promise<ParserResult> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseWhatsAppExport(content, options);
}
