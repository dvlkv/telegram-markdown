import {
  escapeRich,
  rich,
  richDocument,
  richMarkdown,
  RichBlock,
  RichInline,
} from './rich';

describe('rich markdown', () => {
  describe('escapeRich', () => {
    // A backslash in front of these stays visible in Rich Markdown, so '&' and '<' have to
    // be written as HTML entities instead.
    it('should encode & and < as HTML entities', () => {
      expect(escapeRich('a & b').toString()).toBe('a &amp; b');
      expect(escapeRich('<b>x</b>').toString()).toBe('&lt;b\\>x&lt;/b\\>');
      expect(escapeRich('&amp;').toString()).toBe('&amp;amp;');
    });

    it('should backslash-escape the structural markdown characters', () => {
      expect(escapeRich('**bold**').toString()).toBe('\\*\\*bold\\*\\*');
      expect(escapeRich('_italic_').toString()).toBe('\\_italic\\_');
      expect(escapeRich('~~strike~~').toString()).toBe('\\~\\~strike\\~\\~');
      expect(escapeRich('==marked==').toString()).toBe('\\=\\=marked\\=\\=');
      expect(escapeRich('# heading').toString()).toBe('\\# heading');
      expect(escapeRich('- item').toString()).toBe('\\- item');
      expect(escapeRich('> quote').toString()).toBe('\\> quote');
      expect(escapeRich('a | b').toString()).toBe('a \\| b');
      expect(escapeRich('$x$').toString()).toBe('\\$x\\$');
      expect(escapeRich('[^note]').toString()).toBe('\\[^note\\]');
      expect(escapeRich('[link](url)').toString()).toBe('\\[link\\]\\(url\\)');
      expect(escapeRich('`code`').toString()).toBe('\\`code\\`');
      expect(escapeRich('a\\b').toString()).toBe('a\\\\b');
      expect(escapeRich('{a}').toString()).toBe('\\{a\\}');
    });

    // These are safe as they are: a backslash in front of them would be rendered literally.
    it('should leave characters that a backslash cannot escape alone', () => {
      expect(escapeRich(`a"b%c'd,e/f:g;h?i@j^k`).toString()).toBe(`a"b%c'd,e/f:g;h?i@j^k`);
    });

    it('should handle an empty string', () => {
      expect(escapeRich('').toString()).toBe('');
    });
  });

  describe('inline formatting', () => {
    it('should wrap each inline entity', () => {
      expect(rich.bold('b').toString()).toBe('**b**');
      expect(rich.italic('i').toString()).toBe('*i*');
      expect(rich.strikethrough('s').toString()).toBe('~~s~~');
      expect(rich.marked('m').toString()).toBe('==m==');
      expect(rich.spoiler('sp').toString()).toBe('||sp||');
      expect(rich.underline('u').toString()).toBe('<u>u</u>');
      expect(rich.inserted('ins').toString()).toBe('<ins>ins</ins>');
      expect(rich.subscript('sub').toString()).toBe('<sub>sub</sub>');
      expect(rich.superscript('sup').toString()).toBe('<sup>sup</sup>');
    });

    // rich.text adds no formatting of its own; it is how a *line* of mixed text and inline
    // entities is built for a heading, list item, table cell, summary or footnote body.
    it('should join escaped text and fragments without adding formatting', () => {
      expect(rich.text('plain *text*').toString()).toBe('plain \\*text\\*');
      expect(rich.text`a ${rich.bold('b')} c`.toString()).toBe('a **b** c');
      expect(rich.text``.toString()).toBe('');
      expect(rich.heading(2, rich.text`H ${rich.italic('i')}`).toString()).toBe('## H *i*');
    });

    it('should escape plain text but keep nested fragments', () => {
      expect(rich.bold('**raw**').toString()).toBe('**\\*\\*raw\\*\\***');
      expect(rich.bold(rich.italic('i')).toString()).toBe('***i***');
      expect(rich.bold`a ${rich.italic('i')} b`.toString()).toBe('**a *i* b**');
      expect(rich.bold`n=${42}`.toString()).toBe('**n\\=42**');
    });

    it('should nest inline entities arbitrarily deep', () => {
      expect(
        rich.bold`bold ${rich.italic`italic ${rich.underline('deep')}`} bold`.toString(),
      ).toBe('**bold *italic <u>deep</u>* bold**');
    });

    it('should not escape the body of a code span', () => {
      expect(rich.code('*not bold*').toString()).toBe('`*not bold*`');
    });

    it('should widen the fence of a code span containing backticks', () => {
      expect(rich.code('a `b` c').toString()).toBe('``a `b` c``');
      expect(rich.code('a ``b`` c').toString()).toBe('```a ``b`` c```');
      // padding keeps a leading/trailing backtick from merging with the fence
      expect(rich.code('`x`').toString()).toBe('`` `x` ``');
    });

    it('should pass formula source through verbatim', () => {
      expect(rich.formula('x^2 + y^2').toString()).toBe('$x^2 + y^2$');
    });
  });

  describe('links', () => {
    it('should build the documented link forms', () => {
      expect(rich.link('https://t.me/')('text').toString()).toBe('[text](https://t.me/)');
      expect(rich.email('user@example.com')('mail').toString()).toBe(
        '[mail](mailto:user@example.com)',
      );
      expect(rich.phone('+123456789')('phone').toString()).toBe('[phone](tel:+123456789)');
      expect(rich.mention('123456789')('who').toString()).toBe('[who](tg://user?id=123456789)');
    });

    it('should escape ) and backslash in the destination', () => {
      expect(rich.link('https://e.com/a)b\\c')('t').toString()).toBe(
        '[t](https://e.com/a\\)b\\\\c)',
      );
    });

    it('should allow inline formatting in the label', () => {
      expect(rich.link('https://t.me/')(rich.bold('b')).toString()).toBe('[**b**](https://t.me/)');
    });

    it('should build custom emoji and footnote references', () => {
      expect(rich.customEmoji('👍', '5368324170671202286').toString()).toBe(
        '![👍](tg://emoji?id=5368324170671202286)',
      );
      expect(rich.footnote('n1').toString()).toBe('[^n1]');
    });

    it('should build tg:// references to uploaded media', () => {
      expect(rich.uploaded('photo', 'my-photo_1')).toBe('tg://photo?id=my-photo_1');
      expect(rich.uploaded('video', 'v1')).toBe('tg://video?id=v1');
      expect(() => rich.uploaded('audio', 'bad id!')).toThrow(/Invalid media id/);
      expect(() => rich.uploaded('photo', '')).toThrow(/Invalid media id/);
    });
  });

  describe('date-time entities', () => {
    it('should accept unix seconds and a Date', () => {
      expect(rich.dateTimeText(1647531900, 'wDT')('22:45').toString()).toBe(
        '![22:45](tg://time?unix=1647531900&format=wDT)',
      );
      expect(
        rich.dateTimeText(new Date('2022-03-17T15:45:00Z'), 't')('22:45').toString(),
      ).toBe('![22:45](tg://time?unix=1647531900&format=t)');
    });

    it('should default to an ISO 8601 label', () => {
      expect(rich.dateTime(1647531900, 't').toString()).toBe(
        '![2022\\-03\\-17T15:45:00Z](tg://time?unix=1647531900&format=t)',
      );
    });

    // MarkdownV2 accepts tg://time?unix=... on its own, but a rich message is rejected with
    // RICH_MESSAGE_PHOTO_URL_INVALID because the link is then read as media.
    it('should require a non-empty format', () => {
      expect(() => rich.dateTime(1647531900, '')).toThrow(/needs a non-empty format/);
      expect(() => rich.dateTimeText(1647531900, '')).toThrow(/needs a non-empty format/);
    });

    it('should reject formats that do not match the spec', () => {
      expect(() => rich.dateTime(1, 'rd')).toThrow(/Invalid date-time format/);
      expect(() => rich.dateTime(1, 'x')).toThrow(/Invalid date-time format/);
      expect(() => rich.dateTimeText(1, 'tD')).toThrow(/Invalid date-time format/);
      expect(() => rich.dateTime(new Date('nope'), 't')).toThrow(/Invalid date/);
    });

    it('should accept every documented format', () => {
      for (const format of ['r', 'w', 'd', 'D', 't', 'T', 'wd', 'wD', 'dt', 'DT', 'wDT']) {
        expect(() => rich.dateTimeText(1647531900, format)('x')).not.toThrow();
      }
    });
  });

  describe('blocks', () => {
    it('should build headings and reject invalid levels', () => {
      expect(rich.heading(1, 'H1').toString()).toBe('# H1');
      expect(rich.heading(6, 'H6').toString()).toBe('###### H6');
      expect(rich.heading(2, rich.italic('i')).toString()).toBe('## *i*');
      expect(() => rich.heading(0, 'x')).toThrow(/heading level/);
      expect(() => rich.heading(7, 'x')).toThrow(/heading level/);
      expect(() => rich.heading(1.5, 'x')).toThrow(/heading level/);
    });

    it('should build paragraphs, dividers and pre blocks', () => {
      expect(rich.paragraph('text').toString()).toBe('text');
      expect(rich.divider().toString()).toBe('---');
      expect(rich.pre('code').toString()).toBe('```\ncode\n```');
      expect(rich.pre("print('hi')", 'python').toString()).toBe("```python\nprint('hi')\n```");
      // the fence has to be longer than any backtick run inside the block
      expect(rich.pre('a ``` b').toString()).toBe('````\na ``` b\n````');
      expect(rich.mathBlock('E = mc^2').toString()).toBe('```math\nE = mc^2\n```');
    });

    it('should build quotes', () => {
      expect(rich.blockQuote('one\ntwo').toString()).toBe('>one\n>two');
      expect(rich.blockQuote(rich.paragraph`a ${rich.bold('b')}`).toString()).toBe('>a **b**');
      expect(rich.pullQuote('quoted').toString()).toBe('<aside>quoted</aside>');
      expect(rich.pullQuote('quoted', { cite: 'The Author' }).toString()).toBe(
        '<aside>quoted<cite>The Author</cite></aside>',
      );
    });

    // Both take a tagged template for a single line of inline content. The credit of a pull
    // quote is an option rather than a second argument, so an interpolated value can never
    // be mistaken for it.
    it('should accept quotes as tagged templates', () => {
      // the trailing '.' is escaped, like any other structural character
      expect(rich.blockQuote`Quote with ${rich.bold('bold')}.`.toString()).toBe(
        '>Quote with **bold**\\.',
      );
      expect(rich.blockQuote`a ${'b'} c`.toString()).toBe('>a b c');
      // the interpolated value stays in the body instead of becoming the credit
      expect(rich.pullQuote`a ${'b'} c`.toString()).toBe('<aside>a b c</aside>');
    });

    // Markdown is not parsed inside <aside>, so a backslash escape would be rendered
    // literally. Only HTML entities and HTML tags are interpreted there.
    it('should HTML-escape a pull quote instead of backslash-escaping it', () => {
      expect(rich.pullQuote('costs $5. 100% - really!').toString()).toBe(
        '<aside>costs $5. 100% - really!</aside>',
      );
      expect(rich.pullQuote`a & b <c>`.toString()).toBe('<aside>a &amp; b &lt;c></aside>');
      expect(rich.pullQuote('x', { cite: 'A & B' }).toString()).toBe(
        '<aside>x<cite>A &amp; B</cite></aside>',
      );
      // the HTML-based inline entities still work there
      expect(rich.pullQuote`by ${rich.underline('u')}`.toString()).toBe(
        '<aside>by <u>u</u></aside>',
      );
      expect(rich.pullQuote(rich.underline('u')).toString()).toBe('<aside><u>u</u></aside>');
    });

    it('should keep multi-line and multi-block quotes working', () => {
      expect(rich.blockQuote`line one
line two`.toString()).toBe('>line one\n>line two');
      expect(rich.blockQuote(rich.paragraph('a'), rich.paragraph('b')).toString()).toBe(
        '>a\n>\n>b',
      );
    });

    it('should build lists', () => {
      expect(rich.unorderedList(['a', 'b']).toString()).toBe('- a\n- b');
      expect(rich.orderedList(['a', 'b']).toString()).toBe('1. a\n2. b');
      expect(rich.orderedList(['a', 'b'], { start: 3 }).toString()).toBe('3. a\n4. b');
      expect(rich.taskList([{ text: 'todo' }, { text: 'done', checked: true }]).toString()).toBe(
        '- [ ] todo\n- [x] done',
      );
      expect(rich.unorderedList([rich.bold('b')]).toString()).toBe('- **b**');
      expect(() => rich.orderedList(['a'], { start: -1 })).toThrow(/ordered list start/);
    });

    it('should indent continuation lines of a multi-line list item', () => {
      expect(rich.unorderedList(['first\nsecond']).toString()).toBe('- first\n  second');
      expect(rich.orderedList(['first\nsecond'], { start: 9 }).toString()).toBe(
        '9. first\n   second',
      );
      expect(rich.taskList([{ text: 'first\nsecond' }]).toString()).toBe(
        '- [ ] first\n      second',
      );
    });

    it('should build footnote definitions', () => {
      expect(rich.footnoteDefinition('n1', 'text').toString()).toBe('[^n1]: text');
      expect(rich.footnoteDefinition('n1', rich.italic('i')).toString()).toBe('[^n1]: *i*');
    });
  });

  describe('tables', () => {
    it('should build a table with a divider row', () => {
      expect(rich.table({ header: ['a', 'b'], rows: [['1', '2']] }).toString()).toBe(
        '| a | b |\n| ---- | ---- |\n| 1 | 2 |',
      );
    });

    it('should apply per-column alignment', () => {
      expect(
        rich
          .table({
            header: ['l', 'c', 'r', 'd'],
            rows: [],
            align: ['left', 'center', 'right'],
          })
          .toString(),
      ).toBe('| l | c | r | d |\n| :--- | :--: | ---: | ---- |');
    });

    it('should keep inline formatting in cells and pad short rows', () => {
      expect(
        rich.table({ header: ['a', 'b'], rows: [[rich.bold('42')], []] }).toString(),
      ).toBe('| a | b |\n| ---- | ---- |\n| **42** |  |\n|  |  |');
    });

    it('should accept template-literal and non-string cells', () => {
      expect(
        rich.table({ header: [rich.text`h ${rich.bold('b')}`], rows: [[42], [null]] }).toString(),
      ).toBe('| h **b** |\n| ---- |\n| 42 |\n|  |');
    });

    it('should escape a pipe inside a cell so it cannot split the row', () => {
      expect(rich.table({ header: ['a'], rows: [['x | y']] }).toString()).toBe(
        '| a |\n| ---- |\n| x \\| y |',
      );
    });

    it('should reject an empty or oversized table', () => {
      expect(() => rich.table({ header: [], rows: [] })).toThrow(/at least one column/);
      expect(() =>
        rich.table({ header: Array.from({ length: 21 }, (_, i) => `c${i}`), rows: [] }),
      ).toThrow(/at most 20 columns/);
    });
  });

  describe('media and containers', () => {
    it('should build media blocks', () => {
      expect(rich.media({ url: 'https://e.com/p.jpg' }).toString()).toBe('![](https://e.com/p.jpg)');
      expect(rich.media({ url: 'https://e.com/p.jpg', caption: 'Cap' }).toString()).toBe(
        '![](https://e.com/p.jpg "Cap")',
      );
      expect(rich.media({ url: 'https://e.com/p.jpg', caption: 'a "q"' }).toString()).toBe(
        '![](https://e.com/p.jpg "a \\"q\\"")',
      );
    });

    it('should build collages and slideshows', () => {
      expect(rich.collage([{ url: 'a.jpg' }, { url: 'b.mp4' }]).toString()).toBe(
        '<tg-collage>\n\n![](a.jpg)\n![](b.mp4)\n\n</tg-collage>',
      );
      // the <figcaption> is not a Markdown context, so it is only HTML-escaped
      expect(rich.slideshow([{ url: 'a.jpg' }], 'Cap & co').toString()).toBe(
        '<tg-slideshow>\n\n![](a.jpg)\n\n<figcaption>Cap &amp; co</figcaption>\n\n</tg-slideshow>',
      );
      expect(() => rich.collage([])).toThrow(/at least one media element/);
      expect(() => rich.slideshow([])).toThrow(/at least one media element/);
    });

    it('should build details blocks', () => {
      expect(rich.details('Title', 'Content').toString()).toBe(
        '<details><summary>Title</summary>\n\nContent\n\n</details>',
      );
      expect(rich.details('Title', 'Content', { open: true }).toString()).toBe(
        '<details open><summary>Title</summary>\n\nContent\n\n</details>',
      );
      expect(
        rich.details(rich.bold('T'), [rich.heading(3, 'H'), rich.paragraph('P')]).toString(),
      ).toBe('<details><summary>**T**</summary>\n\n### H\n\nP\n\n</details>');
    });

    it('should build maps and anchors', () => {
      expect(rich.map({ latitude: 41.9, longitude: 12.5 }).toString()).toBe(
        '<tg-map lat="41.9" long="12.5"/>',
      );
      expect(rich.map({ latitude: 41.9, longitude: 12.5, zoom: 14 }).toString()).toBe(
        '<tg-map lat="41.9" long="12.5" zoom="14"/>',
      );
      expect(
        rich.map({ latitude: 1, longitude: 2, zoom: 14, caption: 'Rome & Co' }).toString(),
      ).toBe(
        '<figure><tg-map lat="1" long="2" zoom="14"/>' +
          '<figcaption>Rome &amp; Co</figcaption></figure>',
      );
      // without a zoom level Telegram drops the whole <figure>, leaving an empty message
      expect(() => rich.map({ latitude: 1, longitude: 2, caption: 'Rome' })).toThrow(
        /also needs a zoom level/,
      );
      expect(rich.anchor('chapter-1').toString()).toBe('<a name="chapter-1"></a>');
      expect(rich.anchor('a"b').toString()).toBe('<a name="a&quot;b"></a>');
    });
  });

  describe('document assembly', () => {
    it('should separate blocks with a blank line', () => {
      expect(richDocument(rich.heading(1, 'H'), rich.paragraph('P'))).toBe('# H\n\nP');
      expect(richDocument(rich.paragraph('a'), rich.divider(), rich.paragraph('b'))).toBe(
        'a\n\n---\n\nb',
      );
    });

    it('should escape plain strings passed as blocks and skip empty ones', () => {
      expect(richDocument('a *b*')).toBe('a \\*b\\*');
      expect(richDocument(rich.paragraph('a'), '', rich.paragraph('b'))).toBe('a\n\nb');
    });

    it('should accept an inline fragment as a standalone block', () => {
      expect(richDocument(rich.text`a ${rich.bold('b')}`, rich.paragraph('c'))).toBe(
        'a **b**\n\nc',
      );
    });

    it('should interpolate inline fragments in a template', () => {
      expect(richMarkdown`Hello ${rich.bold('World')}!`).toBe('Hello **World**\\!');
      expect(richMarkdown`${'*raw*'}`).toBe('\\*raw\\*');
      expect(richMarkdown`n=${7}`).toBe('n\\=7');
    });

    it('should put blocks on their own, separated by blank lines', () => {
      expect(richMarkdown`${rich.heading(1, 'H')}${rich.paragraph('P')}`).toBe('# H\n\nP');
      expect(richMarkdown`intro ${rich.divider()} outro`).toBe('intro\n\n---\n\noutro');
    });

    it('should handle an empty template', () => {
      expect(richMarkdown``).toBe('');
      // an empty block contributes nothing and leaves no stray blank lines behind
      expect(richMarkdown`a${rich.paragraph('')}b`).toBe('ab');
    });
  });

  describe('types', () => {
    it('should tag inline fragments and blocks distinctly', () => {
      expect(rich.bold('b')).toBeInstanceOf(RichInline);
      expect(rich.heading(1, 'h')).toBeInstanceOf(RichBlock);
      expect(rich.paragraph('p')).toBeInstanceOf(RichBlock);
      // a block is not an inline fragment, so it cannot be nested into one
      expect(rich.heading(1, 'h')).not.toBeInstanceOf(RichInline);
    });
  });
});
