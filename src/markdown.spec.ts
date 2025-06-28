import { escapeMarkdown, markdownV2, md } from './markdown';

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
            dsdsd
\`\`\`
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
        expect(md.inlineUrl('http://example.com')('Click here').toString()).toBe('[Click here](http://example.com)');
      });
    });

    describe('inlineMention', () => {
      it('should create inline mention markdown', () => {
        expect(md.inlineMention('123456789')('John Doe').toString()).toBe('[John Doe](tg://user?id=123456789)');
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
        expect(md.codeBlock('console.log("hello")').toString()).toBe('```\nconsole.log("hello")\n```');
      });

      it('should create code block with language', () => {  
        expect(md.codeBlock('console.log("hello")', 'javascript').toString()).toBe('```javascript\nconsole.log("hello")\n```');
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
        expect(md.expandableBlockQuote('First line\nSecond line\nThird line').toString()).toBe('**>First line\n>Second line\n>Third line||\n');
      });

      it('should handle single line', () => {
        expect(md.expandableBlockQuote('Single line').toString()).toBe('**>Single line||\n');
      });

      it('should handle empty string', () => {
        expect(md.expandableBlockQuote('').toString()).toBe('**>||\n');
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

    it('should not escape markdown twice', () => {
      expect(markdownV2`*_italic_*`).toBe('\\*\\_italic\\_\\*');
      expect(markdownV2`${md.bold('_italic_')}`).toBe('*\\_italic\\_*');
      expect(markdownV2`${md.bold(escapeMarkdown('_italic_'))}`).toBe('*\\_italic\\_*');
    });
  });

  describe('md API overloads and nesting', () => {
    it('bold: string, template, MdEscapedString, nested', () => {
      expect(md.bold('_italic_').toString()).toBe('*\\_italic\\_*');
      expect(md.bold`${md.italic('italic')}`.toString()).toBe('*_italic_*');
      expect(md.bold`test ${md.italic('italic')}`.toString()).toBe('*test _italic_*');
    });
    it('italic: string, template, MdEscapedString, nested', () => {
      expect(md.italic('*bold*').toString()).toBe('_\\*bold\\*_');
      expect(md.italic(md.bold('bold')).toString()).toBe('_*bold*_');
      expect(md.italic`test ${md.bold('bold')}`.toString()).toBe('_test *bold*_');
    });
    it('underline: string, template, MdEscapedString, nested', () => {
      expect(md.underline('*bold*').toString()).toBe('__\\*bold\\*__');
      expect(md.underline(md.bold('bold')).toString()).toBe('__*bold*__');
      expect(md.underline`test ${md.bold('bold')}`.toString()).toBe('__test *bold*__');
    });
    it('strikethrough: string, template, MdEscapedString, nested', () => {
      expect(md.strikethrough('*bold*').toString()).toBe('~\\*bold\\*~');
      expect(md.strikethrough(md.bold('bold')).toString()).toBe('~*bold*~');
      expect(md.strikethrough`test ${md.bold('bold')}`.toString()).toBe('~test *bold*~');
    });
    it('spoiler: string, template, MdEscapedString, nested', () => {
      expect(md.spoiler('*bold*').toString()).toBe('||\\*bold\\*||');
      expect(md.spoiler(md.bold('bold')).toString()).toBe('||*bold*||');
      expect(md.spoiler`test ${md.bold('bold')}`.toString()).toBe('||test *bold*||');
    });
    it('inlineUrl: string, template, MdEscapedString, nested', () => {
      expect(md.inlineUrl('http://a')('*bold*').toString()).toBe('[\\*bold\\*](http://a)');
      expect(md.inlineUrl('http://a')(md.bold('bold')).toString()).toBe('[*bold*](http://a)');
    });
    it('inlineMention: string, template, MdEscapedString, nested', () => {
      expect(md.inlineMention('123')('*bold*').toString()).toBe('[\\*bold\\*](tg://user?id=123)');
      expect(md.inlineMention('123')(md.bold('bold')).toString()).toBe('[*bold*](tg://user?id=123)');
    });
    it('inlineCode: string, template, MdEscapedString, nested', () => {
      expect(md.inlineCode('*bold*').toString()).toBe('`\\*bold\\*`');
      expect(md.inlineCode(md.bold('bold')).toString()).toBe('`*bold*`');
      expect(md.inlineCode`test ${md.bold('bold')}`.toString()).toBe('`test *bold*`');
    });
    it('codeBlock: string, template, MdEscapedString, nested', () => {
      expect(md.codeBlock('*bold*').toString()).toBe('```\n*bold*\n```');
      expect(md.codeBlock('*bold*', 'js').toString()).toBe('```js\n*bold*\n```');
    });
    it('blockQuote: string, template, MdEscapedString, nested', () => {
      expect(md.blockQuote('*bold*').toString()).toBe('>\\*bold\\*');
      expect(md.blockQuote(md.bold('bold')).toString()).toBe('>*bold*');
      expect(md.blockQuote`test ${md.bold('bold')}`.toString()).toBe('>test *bold*');
    });
    it('expandableBlockQuote: string, template, MdEscapedString, nested', () => {
      expect(md.expandableBlockQuote('*bold*').toString()).toBe('**>\\*bold\\*||\n');
      expect(md.expandableBlockQuote(md.bold('bold')).toString()).toBe('**>*bold*||\n');
      expect(md.expandableBlockQuote`test ${md.bold('bold')}`.toString()).toBe('**>test *bold*||\n');
    });
    it('inlineUrl: curried API', () => {
      expect(md.inlineUrl('http://a')('*bold*').toString()).toBe('[\\*bold\\*](http://a)');
      expect(md.inlineUrl('http://a')(md.bold('bold')).toString()).toBe('[*bold*](http://a)');
      expect(md.inlineUrl('http://a')`test ${md.bold('bold')}`.toString()).toBe('[test *bold*](http://a)');
    });
    it('inlineMention: curried API', () => {
      expect(md.inlineMention('123')('*bold*').toString()).toBe('[\\*bold\\*](tg://user?id=123)');
      expect(md.inlineMention('123')(md.bold('bold')).toString()).toBe('[*bold*](tg://user?id=123)');
      expect(md.inlineMention('123')`test ${md.bold('bold')}`.toString()).toBe('[test *bold*](tg://user?id=123)');
    });
  });
});
