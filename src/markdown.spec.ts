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
      // The entity ends with the expandability mark '||'; the trailing newline the
      // library used to append is not part of the entity (markdownV2 adds the line
      // break when something follows the quote).
      it('should create expandable block quote with first line bold', () => {
        expect(md.expandableBlockQuote('First line\nSecond line\nThird line').toString()).toBe('**>First line\n>Second line\n>Third line||');
      });

      it('should handle single line', () => {
        expect(md.expandableBlockQuote('Single line').toString()).toBe('**>Single line||');
      });

      it('should handle empty string', () => {
        expect(md.expandableBlockQuote('').toString()).toBe('**>||');
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
    // Spec note 2: inside code entities only ` and \ are escaped, so '*' stays as it is.
    // Spec nesting rules: code entities can't contain other entities at all.
    it('inlineCode: string, template, primitive interpolation', () => {
      expect(md.inlineCode('*bold*').toString()).toBe('`*bold*`');
      expect(md.inlineCode`test ${'value'}`.toString()).toBe('`test value`');
      expect(md.inlineCode`sum ${1 + 1}`.toString()).toBe('`sum 2`');
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
      expect(md.expandableBlockQuote('*bold*').toString()).toBe('**>\\*bold\\*||');
      expect(md.expandableBlockQuote(md.bold('bold')).toString()).toBe('**>*bold*||');
      expect(md.expandableBlockQuote`test ${md.bold('bold')}`.toString()).toBe('**>test *bold*||');
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

  // Spec note 1: any character between 1 and 126 can be escaped with a preceding '\',
  // which implies that '\' itself must be escaped.
  describe('backslash escaping', () => {
    it('should escape a lone backslash', () => {
      expect(escapeMarkdown('a\\b').toString()).toBe('a\\\\b');
      expect(markdownV2`a\\b`).toBe('a\\\\b');
    });

    it('should escape backslashes in interpolated values', () => {
      expect(markdownV2`${'C:\\dir\\file'}`).toBe('C:\\\\dir\\\\file');
      expect(md.bold('a\\b').toString()).toBe('*a\\\\b*');
    });

    it('should not re-process the backslashes it inserts itself', () => {
      expect(escapeMarkdown('*').toString()).toBe('\\*');
      expect(escapeMarkdown('\\*').toString()).toBe('\\\\\\*');
      expect(escapeMarkdown('\\').toString()).toBe('\\\\');
    });
  });

  // Spec note 2: inside pre and code entities only '`' and '\' must be escaped.
  describe('code entity escaping', () => {
    it('should escape backticks and backslashes in inline code', () => {
      expect(md.inlineCode('a`b').toString()).toBe('`a\\`b`');
      expect(md.inlineCode('a\\b').toString()).toBe('`a\\\\b`');
    });

    it('should not escape anything else in inline code', () => {
      expect(md.inlineCode('_*[]().!#').toString()).toBe('`_*[]().!#`');
    });

    it('should escape backticks and backslashes in code blocks', () => {
      expect(md.codeBlock('a`b').toString()).toBe('```\na\\`b\n```');
      expect(md.codeBlock('a\\b').toString()).toBe('```\na\\\\b\n```');
    });

    it('should escape a triple backtick inside a code block', () => {
      expect(md.codeBlock('```').toString()).toBe('```\n\\`\\`\\`\n```');
    });

    it('should escape the language tag', () => {
      expect(md.codeBlock('x', 'j`s').toString()).toBe('```j\\`s\nx\n```');
      expect(md.codeBlock('x', 'javascript').toString()).toBe('```javascript\nx\n```');
    });

    it('should keep markdown characters untouched in code blocks', () => {
      expect(md.codeBlock('*not bold* _not italic_').toString()).toBe('```\n*not bold* _not italic_\n```');
    });
  });

  // Spec note 3: inside the (...) part of a link and of a custom emoji definition
  // all ')' and '\' must be escaped.
  describe('url escaping', () => {
    it('should escape ) and \\ in inline urls', () => {
      expect(md.inlineUrl('https://e.com/a)b')('t').toString()).toBe('[t](https://e.com/a\\)b)');
      expect(md.inlineUrl('https://e.com/a\\b')('t').toString()).toBe('[t](https://e.com/a\\\\b)');
    });

    it('should not escape anything else in inline urls', () => {
      expect(md.inlineUrl('https://e.com/a_b-c.d(e')('t').toString()).toBe('[t](https://e.com/a_b-c.d(e)');
    });

    it('should escape the mention url', () => {
      expect(md.inlineMention('12)3')('t').toString()).toBe('[t](tg://user?id=12\\)3)');
      expect(md.inlineMention(123)('t').toString()).toBe('[t](tg://user?id=123)');
    });

    it('should escape the custom emoji url and label', () => {
      expect(md.customEmoji('👍', '53683)241').toString()).toBe('![👍](tg://emoji?id=53683\\)241)');
      expect(md.customEmoji('.', '1').toString()).toBe('![\\.](tg://emoji?id=1)');
    });
  });

  // Spec note 5: '__' is greedily treated from left to right as an underline
  // delimiter, so an empty bold entity is used as a separator.
  describe('italic and underline ambiguity', () => {
    it('should separate italic nested in underline', () => {
      expect(md.underline(md.italic('x')).toString()).toBe('__**_x_**__');
      expect(md.underline`${md.italic('x')}`.toString()).toBe('__**_x_**__');
    });

    it('should separate underline nested in italic', () => {
      expect(md.italic(md.underline('x')).toString()).toBe('_**__x__**_');
    });

    it('should separate adjacent italic and underline siblings', () => {
      expect(md.bold`${md.italic('a')}${md.underline('b')}`.toString()).toBe('*_a_**__b__*');
      expect(markdownV2`${md.italic('a')}${md.underline('b')}`).toBe('_a_**__b__');
      expect(markdownV2`${md.underline('a')}${md.italic('b')}`).toBe('__a__**_b_');
    });

    it('should not add a separator when the delimiters are not adjacent', () => {
      expect(md.bold`${md.italic('a')} ${md.underline('b')}`.toString()).toBe('*_a_ __b__*');
      expect(md.underline(md.bold('x')).toString()).toBe('__*x*__');
      expect(md.italic('x').toString()).toBe('_x_');
    });

    it('should not treat an escaped underscore as a delimiter', () => {
      expect(markdownV2`${'a_'}${md.italic('b')}`).toBe('a\\__b_');
      expect(md.italic('_x_').toString()).toBe('_\\_x\\__');
    });
  });

  describe('dateTime', () => {
    const unix = 1647531900;
    const date = new Date('2022-03-17T15:45:00.000Z');
    const label = '2022\\-03\\-17T15:45:00Z';

    it('should accept a unix timestamp in seconds', () => {
      expect(md.dateTime(unix).toString()).toBe(`![${label}](tg://time?unix=${unix})`);
    });

    it('should accept a Date and convert it to whole seconds', () => {
      expect(md.dateTime(date).toString()).toBe(`![${label}](tg://time?unix=${unix})`);
      expect(md.dateTime(new Date(unix * 1000 + 999)).toString()).toBe(`![${label}](tg://time?unix=${unix})`);
    });

    it('should omit the format when it is missing or empty', () => {
      expect(md.dateTime(unix).toString()).not.toContain('format');
      expect(md.dateTime(unix, '').toString()).toBe(`![${label}](tg://time?unix=${unix})`);
    });

    it.each(['r', 'w', 'd', 'D', 't', 'T', 'wd', 'wD', 'wt', 'wT', 'dt', 'dT', 'Dt', 'DT', 'wdt', 'wDT'])(
      'should accept the format %s',
      format => {
        expect(md.dateTime(unix, format).toString()).toBe(`![${label}](tg://time?unix=${unix}&format=${format})`);
      },
    );

    it.each(['x', 'rw', 'wr', 'rd', 'dr', 'dw', 'td', 'ddt', 'tT', 'Dd', 'ww', ' ', 'wDTx', 'R'])(
      'should reject the format %s',
      format => {
        expect(() => md.dateTime(unix, format)).toThrow(/Invalid date-time format/);
      },
    );

    it('should reject an invalid date', () => {
      expect(() => md.dateTime(new Date('not a date'))).toThrow(/Invalid date/);
      expect(() => md.dateTime(Number.NaN)).toThrow(/Invalid date/);
      expect(() => md.dateTime(Number.POSITIVE_INFINITY)).toThrow(/Invalid date/);
    });

    it('should be nestable', () => {
      expect(md.bold`Starts ${md.dateTime(unix, 't')}`.toString()).toBe(
        `*Starts ![${label}](tg://time?unix=${unix}&format=t)*`,
      );
    });
  });

  describe('dateTimeText', () => {
    const unix = 1647531900;

    it('should use a custom label', () => {
      expect(md.dateTimeText(unix, 'wDT')('22:45 tomorrow').toString()).toBe(
        '![22:45 tomorrow](tg://time?unix=1647531900&format=wDT)',
      );
    });

    it('should omit the format when it is missing', () => {
      expect(md.dateTimeText(new Date(unix * 1000))('22:45 tomorrow').toString()).toBe(
        '![22:45 tomorrow](tg://time?unix=1647531900)',
      );
    });

    it('should escape the label and support nesting', () => {
      expect(md.dateTimeText(unix)('a.b').toString()).toBe('![a\\.b](tg://time?unix=1647531900)');
      expect(md.dateTimeText(unix, 'r')`at ${md.bold('22:45')}`.toString()).toBe(
        '![at *22:45*](tg://time?unix=1647531900&format=r)',
      );
    });

    it('should validate eagerly', () => {
      expect(() => md.dateTimeText(unix, 'rd')).toThrow(/Invalid date-time format/);
      expect(() => md.dateTimeText(new Date('nope'))).toThrow(/Invalid date/);
    });
  });

  // Spec nesting rules: pre and code can't contain other entities and blockquotes
  // can't be nested.
  describe('nesting restrictions', () => {
    it('should reject entities inside inline code', () => {
      expect(() =>
        // @ts-expect-error - code entities can't contain other entities
        md.inlineCode(md.bold('x')),
      ).toThrow(/can't contain other entities/);
      expect(() =>
        // @ts-expect-error - code entities can't contain other entities
        md.inlineCode`test ${md.bold('x')}`,
      ).toThrow(/can't contain other entities/);
    });

    it('should reject entities inside a code block', () => {
      expect(() =>
        // @ts-expect-error - pre entities can't contain other entities
        md.codeBlock(md.bold('x')),
      ).toThrow(/can't contain other entities/);
      expect(() =>
        // @ts-expect-error - the language tag is plain text
        md.codeBlock('x', md.bold('js')),
      ).toThrow(/can't contain other entities/);
    });

    it('should reject nested blockquotes', () => {
      expect(() =>
        // @ts-expect-error - blockquotes can't be nested
        md.blockQuote(md.blockQuote('x')),
      ).toThrow(/can't be nested/);
      expect(() =>
        // @ts-expect-error - blockquotes can't be nested
        md.expandableBlockQuote(md.blockQuote('x')),
      ).toThrow(/can't be nested/);
      expect(() =>
        // @ts-expect-error - blockquotes can't be nested
        md.blockQuote`quote ${md.expandableBlockQuote('x')}`,
      ).toThrow(/can't be nested/);
    });

    it('should expose the entity kind markers', () => {
      expect(md.bold('x').nestable).toBe(true);
      expect(md.bold('x').link).toBe(false);
      expect(escapeMarkdown('x').nestable).toBe(true);
      expect(md.inlineCode('x').code).toBe(true);
      expect(md.codeBlock('x').code).toBe(true);
      expect(md.blockQuote('x').quote).toBe(true);
      expect(md.expandableBlockQuote('x').quote).toBe(true);
      expect(md.inlineUrl('http://a')('x').link).toBe(true);
      expect(md.inlineUrl('http://a')('x').nestable).toBe(true);
      expect(md.inlineMention(1)('x').link).toBe(true);
      expect(md.customEmoji('👍', '1').link).toBe(true);
      expect(md.dateTime(0).link).toBe(true);
      expect(md.dateTimeText(0)('x').link).toBe(true);
    });

    // Regression: blockquote continuation is a '>' at the start of every line, but once a
    // code entity is open Telegram stops treating '>' as markup, so the prefixes would end
    // up inside the code text (and can't be escaped away, spec note 2).
    it('should reject code entities inside blockquotes', () => {
      expect(() =>
        // @ts-expect-error - pre entities can't be part of a blockquote
        md.blockQuote(md.codeBlock('x')),
      ).toThrow(/can't be part of a blockquote/);
      expect(() =>
        // @ts-expect-error - code entities can't be part of a blockquote
        md.blockQuote`see ${md.inlineCode('x')}`,
      ).toThrow(/can't be part of a blockquote/);
      expect(() =>
        // @ts-expect-error - code entities can't be part of a blockquote
        md.blockQuote(md.inlineCode('a\nb')),
      ).toThrow(/can't be part of a blockquote/);
      expect(() =>
        // @ts-expect-error - pre entities can't be part of a blockquote
        md.expandableBlockQuote(md.codeBlock('x')),
      ).toThrow(/can't be part of a blockquote/);
      expect(() =>
        // @ts-expect-error - pre entities can't be part of a blockquote
        md.expandableBlockQuote`quote ${md.codeBlock('*Hello world!*')}`,
      ).toThrow(/can't be part of a blockquote/);
    });

    // Regression: the type error alone was not enough, JavaScript callers got silently
    // corrupted output. pre/code and blockquotes can't be part of any other entity.
    it('should reject code and blockquotes inside inline entities at runtime', () => {
      expect(() =>
        // @ts-expect-error - pre entities can't be part of bold
        md.bold(md.codeBlock('x')),
      ).toThrow(/can't be part of another entity/);
      expect(() =>
        // @ts-expect-error - code entities can't be part of italic
        md.italic`a ${md.inlineCode('x')}`,
      ).toThrow(/can't be part of another entity/);
      expect(() =>
        // @ts-expect-error - blockquotes can't be part of any other entity
        md.underline(md.blockQuote('x')),
      ).toThrow(/can't be part of another entity/);
      expect(() =>
        // @ts-expect-error - blockquotes can't be part of any other entity
        md.spoiler`a ${md.expandableBlockQuote('x')}`,
      ).toThrow(/can't be part of another entity/);
      expect(() =>
        // @ts-expect-error - pre entities can't be part of a link
        md.inlineUrl('http://a')(md.codeBlock('x')),
      ).toThrow(/can't be part of another entity/);
    });

    // Spec: "All other entities can't contain each other" — text_url (inline url and
    // mention), custom_emoji and date-time entities are all in that bucket.
    describe('link-like entities', () => {
      const message = /can't contain each other/;

      it('should reject a link inside a link', () => {
        expect(() =>
          // @ts-expect-error - a text link can't contain another text link
          md.inlineUrl('http://a')(md.inlineUrl('http://b')('c')),
        ).toThrow(message);
        expect(() =>
          // @ts-expect-error - a text link can't contain another text link
          md.inlineUrl('http://a')`see ${md.inlineUrl('http://b')('c')}`,
        ).toThrow(message);
      });

      it('should reject a custom emoji inside a link, mention or date-time', () => {
        expect(() =>
          // @ts-expect-error - a text link can't contain a custom emoji
          md.inlineUrl('http://a')(md.customEmoji('👍', '5368324170671202286')),
        ).toThrow(message);
        expect(() =>
          // @ts-expect-error - a mention can't contain a custom emoji
          md.inlineMention(1)(md.customEmoji('👍', '1')),
        ).toThrow(message);
        expect(() =>
          // @ts-expect-error - a date-time entity can't contain a custom emoji
          md.dateTimeText(1647531900)(md.customEmoji('👍', '1')),
        ).toThrow(message);
      });

      it('should reject a link inside a date-time entity and vice versa', () => {
        expect(() =>
          // @ts-expect-error - a date-time entity can't contain a text link
          md.dateTimeText(1647531900)(md.inlineUrl('http://a')('x')),
        ).toThrow(message);
        expect(() =>
          // @ts-expect-error - a text link can't contain a date-time entity
          md.inlineUrl('http://a')(md.dateTime(1647531900)),
        ).toThrow(message);
        expect(() =>
          // @ts-expect-error - a mention can't contain a text link
          md.inlineMention(1)(md.inlineUrl('http://a')('x')),
        ).toThrow(message);
      });

      // The taint has to survive the splittable entities it may be wrapped in.
      it('should reject a link laundered through bold/italic/...', () => {
        expect(() => md.inlineUrl('http://a')(md.bold(md.inlineUrl('http://b')('c')))).toThrow(message);
        expect(() => md.inlineUrl('http://a')`x ${md.italic(md.customEmoji('👍', '1'))}`).toThrow(message);
        expect(() =>
          md.dateTimeText(1647531900)(md.spoiler(md.underline(md.dateTime(1647531900)))),
        ).toThrow(message);
      });

      it('should still allow links next to each other and inside splittable entities', () => {
        expect(md.bold(md.inlineUrl('http://a')('x')).toString()).toBe('*[x](http://a)*');
        expect(md.bold`${md.inlineUrl('http://a')('x')} ${md.customEmoji('👍', '1')}`.toString()).toBe(
          '*[x](http://a) ![👍](tg://emoji?id=1)*',
        );
        expect(md.inlineUrl('http://a')(md.bold('x')).toString()).toBe('[*x*](http://a)');
        expect(md.blockQuote(md.inlineUrl('http://a')('x')).toString()).toBe('>[x](http://a)');
        expect(markdownV2`${md.inlineUrl('http://a')('x')} ${md.customEmoji('👍', '1')}`).toBe(
          '[x](http://a) ![👍](tg://emoji?id=1)',
        );
      });
    });
  });

  describe('markdownV2 block layout', () => {
    it('should start a block entity on its own line', () => {
      expect(markdownV2`before ${md.blockQuote('a')}`).toBe('before\n>a');
      expect(markdownV2`${md.blockQuote('a')}`).toBe('>a');
    });

    it('should continue on a new line after a block entity', () => {
      expect(markdownV2`${md.expandableBlockQuote('a\nb')}tail`).toBe('**>a\n>b||\ntail');
      expect(markdownV2`${md.blockQuote('a')}tail`).toBe('>a\ntail');
      expect(markdownV2`${md.codeBlock('x')}tail`).toBe('```\nx\n```\ntail');
    });

    it('should not add a second line break when one is already there', () => {
      expect(markdownV2`${md.blockQuote('a')}
tail`).toBe('>a\ntail');
    });
  });
});
