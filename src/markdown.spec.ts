import { markdownV2, md } from './markdown';

describe('markdown', () => {
  it('should escape markdown', () => {
    expect(markdownV2`*bold*`).toBe('\\*bold\\*');
  });

  it('should handle interpolation', () => {
    expect(markdownV2`*bold* ${md.bold('text')}`).toBe('\\*bold\\* *text*');
  });

  it('should handle complex interpolation', () => {
    expect(markdownV2`
            *bold* ${md.bold('text')} 
            zel ${md.italic('italic')} 
            kel ${md.underline('underline')} 
            dsdsd ${md.strikethrough('strikethrough')} 
            dsdsd ${md.inlineCode('code')} 
            dsdsd ${md.codeBlock('code block')}
        `).toBe(`
            \\*bold\\* *text* 
            zel _italic_ 
            kel __underline__ 
            dsdsd ~strikethrough~ 
            dsdsd \`code\` 
            dsdsd \`\`\`
code block
\`\`\`
        `);
  });

  describe('md object functions', () => {
    describe('bold', () => {
      it('should wrap text in asterisks', () => {
        expect(md.bold('hello').toString()).toBe('*hello*');
      });
    });

    describe('italic', () => {
      it('should wrap text in underscores', () => {
        expect(md.italic('hello').toString()).toBe('_hello_');
      });
    });

    describe('underline', () => {
      it('should wrap text in double underscores', () => {
        expect(md.underline('hello').toString()).toBe('__hello__');
      });
    });

    describe('strikethrough', () => {
      it('should wrap text in tildes', () => {
        expect(md.strikethrough('hello').toString()).toBe('~hello~');
      });
    });

    describe('spoiler', () => {
      it('should wrap text in double pipes', () => {
        expect(md.spoiler('hello').toString()).toBe('||hello||');
      });
    });

    describe('inlineUrl', () => {
      it('should create inline URL markdown', () => {
        expect(md.inlineUrl('Click here', 'http://example.com').toString()).toBe('[Click here](http://example.com)');
      });
    });

    describe('inlineMention', () => {
      it('should create inline mention markdown', () => {
        expect(md.inlineMention('John Doe', '123456789').toString()).toBe('[John Doe](tg://user?id=123456789)');
      });
    });

    describe('customEmoji', () => {
      it('should create custom emoji markdown', () => {
        expect(md.customEmoji('👍', '5368324170671202286').toString()).toBe('![👍](tg://emoji?id=5368324170671202286)');
      });
    });

    describe('inlineCode', () => {
      it('should wrap text in backticks', () => {
        expect(md.inlineCode('hello').toString()).toBe('`hello`');
      });
    });

    describe('codeBlock', () => {
      it('should create code block without language', () => {
        expect(md.codeBlock('console.log("hello")').toString()).toBe('```\nconsole\\.log\\("hello"\\)\n```');
      });

      it('should create code block with language', () => {  
        expect(md.codeBlock('console.log("hello")', 'javascript').toString()).toBe('```javascript\nconsole\\.log\\("hello"\\)\n```');
      });
    });

    describe('blockQuote', () => {
      it('should add > prefix to each line', () => {
        expect(md.blockQuote('First line\nSecond line').toString()).toBe('>First line\n>Second line');
      });

      it('should handle single line', () => {
        expect(md.blockQuote('Single line').toString()).toBe('>Single line');
      });

      it('should handle empty string', () => {
        expect(md.blockQuote('').toString()).toBe('>');
      });
    });

    describe('expandableBlockQuote', () => {
      it('should create expandable block quote with first line bold', () => {
        expect(md.expandableBlockQuote('First line\nSecond line\nThird line').toString()).toBe('**>First line\n>Second line\n>Third line\n||');
      });

      it('should handle single line', () => {
        expect(md.expandableBlockQuote('Single line').toString()).toBe('**>Single line\n||');
      });

      it('should handle empty string', () => {
        expect(md.expandableBlockQuote('').toString()).toBe('**>\n||');
      });
    });
  });

  describe('escapeMarkdown', () => {
    it('should escape special markdown characters', () => {
      const input = '_*[]()~`>#+-=|{}.!';
      const expected = '\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!';
      expect(markdownV2`${input}`).toBe(expected);
    });

    it('should handle text with mixed special characters', () => {
      expect(markdownV2`This is *bold* and _italic_`).toBe('This is \\*bold\\* and \\_italic\\_');
    });

    it('should handle empty string', () => {
      expect(markdownV2``).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(markdownV2`Hello world`).toBe('Hello world');
    });
  });
});
