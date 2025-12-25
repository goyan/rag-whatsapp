import { describe, it, expect } from 'vitest';
import { parseWhatsAppExport } from '../src/core/parser/whatsapp.js';

describe('WhatsApp Parser', () => {
  describe('US Date Format', () => {
    it('should parse messages with US date format (12h)', () => {
      const content = `1/15/23, 10:30 AM - John: Hello there!
1/15/23, 10:31 AM - Jane: Hi John!`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(2);
      expect(result.participants).toEqual(['Jane', 'John']);

      expect(result.messages[0].sender).toBe('John');
      expect(result.messages[0].content).toBe('Hello there!');
      expect(result.messages[0].type).toBe('text');
      expect(result.messages[0].timestamp.getMonth()).toBe(0); // January
      expect(result.messages[0].timestamp.getDate()).toBe(15);

      expect(result.messages[1].sender).toBe('Jane');
      expect(result.messages[1].content).toBe('Hi John!');
    });

    it('should handle PM times correctly', () => {
      const content = `1/15/23, 2:30 PM - John: Afternoon message`;

      const result = parseWhatsAppExport(content);

      expect(result.messages[0].timestamp.getHours()).toBe(14);
    });
  });

  describe('EU Date Format', () => {
    it('should parse messages with EU date format (24h)', () => {
      const content = `15/01/2023, 14:30 - Marie: Bonjour!
15/01/2023, 14:35 - Pierre: Salut Marie!`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(2);
      expect(result.participants).toEqual(['Marie', 'Pierre']);

      expect(result.messages[0].sender).toBe('Marie');
      expect(result.messages[0].timestamp.getDate()).toBe(15);
      expect(result.messages[0].timestamp.getMonth()).toBe(0);
      expect(result.messages[0].timestamp.getHours()).toBe(14);
    });
  });

  describe('German Date Format', () => {
    it('should parse messages with German date format', () => {
      const content = `15.01.23, 14:30 - Hans: Guten Tag!`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].sender).toBe('Hans');
      expect(result.messages[0].timestamp.getDate()).toBe(15);
    });
  });

  describe('Multi-line Messages', () => {
    it('should handle multi-line messages', () => {
      const content = `1/15/23, 10:30 AM - John: This is line 1
This is line 2
This is line 3
1/15/23, 10:31 AM - Jane: Single line`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('This is line 1\nThis is line 2\nThis is line 3');
      expect(result.messages[1].content).toBe('Single line');
    });
  });

  describe('System Messages', () => {
    it('should detect system messages', () => {
      const content = `1/15/23, 10:30 AM - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
1/15/23, 10:31 AM - John created group "Friends"
1/15/23, 10:32 AM - John: Hello everyone!`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].type).toBe('system');
      expect(result.messages[1].type).toBe('system');
      expect(result.messages[2].type).toBe('text');
    });

    it('should filter system messages when option is set', () => {
      const content = `1/15/23, 10:30 AM - Messages and calls are end-to-end encrypted.
1/15/23, 10:31 AM - John: Hello!`;

      const result = parseWhatsAppExport(content, { includeSystemMessages: false });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].sender).toBe('John');
    });
  });

  describe('Media Messages', () => {
    it('should detect media omitted messages', () => {
      const content = `1/15/23, 10:30 AM - John: <Media omitted>
1/15/23, 10:31 AM - Jane: image omitted`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].type).toBe('media');
      expect(result.messages[1].type).toBe('media');
    });

    it('should detect file attachments', () => {
      const content = `1/15/23, 10:30 AM - John: IMG-20230115-WA0001.jpg (file attached)`;

      const result = parseWhatsAppExport(content);

      expect(result.messages[0].type).toBe('media');
      expect(result.messages[0].mediaType).toBe('image');
    });
  });

  describe('Deleted Messages', () => {
    it('should detect deleted messages', () => {
      const content = `1/15/23, 10:30 AM - John: This message was deleted
1/15/23, 10:31 AM - Jane: You deleted this message`;

      const result = parseWhatsAppExport(content);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].type).toBe('deleted');
      expect(result.messages[1].type).toBe('deleted');
    });

    it('should filter deleted messages when option is set', () => {
      const content = `1/15/23, 10:30 AM - John: This message was deleted
1/15/23, 10:31 AM - Jane: Hello!`;

      const result = parseWhatsAppExport(content, { includeDeletedMessages: false });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].sender).toBe('Jane');
    });
  });

  describe('Metadata', () => {
    it('should calculate correct metadata', () => {
      const content = `1/15/23, 10:30 AM - John: Hello
1/15/23, 10:31 AM - Jane: <Media omitted>
1/15/23, 10:32 AM - Messages and calls are end-to-end encrypted.
1/15/23, 10:33 AM - John: This message was deleted`;

      const result = parseWhatsAppExport(content);

      expect(result.metadata.totalMessages).toBe(4);
      expect(result.metadata.textMessages).toBe(1);
      expect(result.metadata.mediaMessages).toBe(1);
      expect(result.metadata.systemMessages).toBe(1);
      expect(result.metadata.deletedMessages).toBe(1);
    });

    it('should extract date range', () => {
      const content = `1/15/23, 10:30 AM - John: First
1/20/23, 2:00 PM - Jane: Last`;

      const result = parseWhatsAppExport(content);

      expect(result.startDate?.getDate()).toBe(15);
      expect(result.endDate?.getDate()).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = parseWhatsAppExport('');

      expect(result.messages).toHaveLength(0);
      expect(result.participants).toHaveLength(0);
      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
    });

    it('should handle content with only whitespace', () => {
      const result = parseWhatsAppExport('   \n\n   \n');

      expect(result.messages).toHaveLength(0);
    });

    it('should handle special characters in names', () => {
      const content = `1/15/23, 10:30 AM - +1 234 567 8900: Hello!
1/15/23, 10:31 AM - Jean-Pierre: Bonjour!`;

      const result = parseWhatsAppExport(content);

      expect(result.participants).toContain('+1 234 567 8900');
      expect(result.participants).toContain('Jean-Pierre');
    });

    it('should handle colons in message content', () => {
      const content = `1/15/23, 10:30 AM - John: Time is 10:30:45 now`;

      const result = parseWhatsAppExport(content);

      expect(result.messages[0].content).toBe('Time is 10:30:45 now');
    });
  });
});
