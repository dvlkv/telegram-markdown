import 'dotenv/config';
import { rich, richDocument } from './rich';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface RichBlockResult {
  type: string;
  [key: string]: unknown;
}

interface RichResponse {
  ok: boolean;
  description?: string;
  result?: { rich_message?: { blocks?: RichBlockResult[] } };
}

async function sendRichMessage(markdown: string): Promise<RichResponse> {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment');
  }
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendRichMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      rich_message: { markdown },
      // keep the assertions about what the builders produced, not about URLs and @handles
      // that Telegram would detect on its own
      skip_entity_detection: true,
    }),
  });
  return res.json() as Promise<RichResponse>;
}

/**
 * Sends a rich message and returns the block types Telegram parsed out of it. A message can
 * be accepted and still be parsed into the wrong blocks, so this is what makes the
 * assertions meaningful.
 */
async function sendAndParse(markdown: string) {
  const response = await sendRichMessage(markdown);
  if (!response.ok) {
    throw new Error(
      `Telegram rejected the rich message: ${response.description}\nmarkdown: ${markdown}`,
    );
  }
  const blocks = response.result?.rich_message?.blocks ?? [];
  return { blocks, kinds: blocks.map(block => block.type) };
}

/** Collects every inline entity type inside a parsed block tree. */
function inlineTypes(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(inlineTypes);
  }
  if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const own = typeof record.type === 'string' ? [record.type] : [];
    return own.concat(Object.values(record).flatMap(inlineTypes));
  }
  return [];
}

const PHOTO = 'https://telegram.org/img/t_logo.png';

const conditionalDescribe = BOT_TOKEN && CHAT_ID ? describe : describe.skip;

conditionalDescribe('Rich message formatting', () => {
  it('parses every block type', async () => {
    const document = richDocument(
      rich.heading(1, 'H1'),
      rich.heading(6, 'H6'),
      rich.paragraph('paragraph'),
      rich.divider(),
      rich.pre("print('hi')", 'python'),
      rich.mathBlock('E = mc^2'),
      rich.unorderedList(['a', 'b']),
      rich.orderedList(['one', 'two'], { start: 3 }),
      rich.taskList([{ text: 'todo' }, { text: 'done', checked: true }]),
      rich.blockQuote('quoted line one\nquoted line two'),
      rich.pullQuote('pulled', 'The Author'),
    );

    const { kinds } = await sendAndParse(document);
    expect(kinds).toEqual([
      'heading',
      'heading',
      'paragraph',
      'divider',
      'pre',
      'mathematical_expression',
      'list',
      'list',
      'list',
      'blockquote',
      'pullquote',
    ]);
  });

  it('parses every inline entity', async () => {
    const document = richDocument(
      rich.text`${rich.bold('b')} ${rich.italic('i')} ${rich.strikethrough('s')} ${rich.marked('m')} ${rich.spoiler('sp')} ${rich.underline('u')} ${rich.subscript('sub')} ${rich.superscript('sup')} ${rich.code('c')} ${rich.formula('x^2')} ${rich.link('https://t.me/')('L')} ${rich.customEmoji('👍', '5368324170671202286')} ${rich.dateTimeText(1647531900, 'wDT')('dt')}`,
    );

    const { blocks } = await sendAndParse(document);
    const types = new Set(inlineTypes(blocks));
    for (const expected of [
      'bold',
      'italic',
      'strikethrough',
      'marked',
      'spoiler',
      'underline',
      'subscript',
      'superscript',
      'code',
      'mathematical_expression',
      'url',
      'custom_emoji',
      'date_time',
    ]) {
      expect([...types]).toContain(expected);
    }
  });

  it('keeps nested inline formatting', async () => {
    const document = richDocument(
      rich.text`${rich.bold`bold ${rich.italic`italic ${rich.underline('underlined italic bold')}`} bold`}`,
    );
    const { blocks } = await sendAndParse(document);
    const types = inlineTypes(blocks);
    expect(types).toContain('bold');
    expect(types).toContain('italic');
    expect(types).toContain('underline');
  });

  it('parses tables, footnotes and details', async () => {
    const document = richDocument(
      rich.table({
        header: ['Metric', 'Value'],
        rows: [
          ['Speed', rich.bold('42')],
          ['Status', rich.spoiler('ready')],
        ],
        align: ['left', 'right'],
      }),
      rich.text`text ${rich.footnote('n1')}`,
      rich.footnoteDefinition('n1', rich.italic('a footnote')),
      rich.details('Summary', [rich.heading(3, 'Inside'), rich.unorderedList(['x'])], {
        open: true,
      }),
    );

    const { kinds } = await sendAndParse(document);
    // footnote definitions are collected into a trailing footer block
    expect(kinds).toEqual(['table', 'paragraph', 'details', 'footer']);
  });

  it('parses media, collages, slideshows and maps', async () => {
    const document = richDocument(
      rich.media({ url: PHOTO, caption: 'Photo caption' }),
      rich.collage([{ url: PHOTO }, { url: PHOTO }], 'Collage caption'),
      rich.slideshow([{ url: PHOTO }, { url: PHOTO }]),
      rich.map({ latitude: 41.9, longitude: 12.5, zoom: 14, caption: 'Rome' }),
    );

    const { kinds } = await sendAndParse(document);
    expect(kinds).toEqual(['photo', 'collage', 'slideshow', 'map']);
  });

  it('parses links, mentions and every date-time format', async () => {
    const document = richDocument(
      rich.text`${rich.link('https://t.me/')('url')} ${rich.email('user@example.com')('mail')} ${rich.phone('+123456789')('phone')} ${rich.mention(CHAT_ID as string)('mention')}`,
      rich.text`${rich.dateTimeText(1647531900, 'r')('r')} ${rich.dateTimeText(1647531900, 'w')('w')} ${rich.dateTimeText(1647531900, 'd')('d')} ${rich.dateTimeText(1647531900, 'D')('D')} ${rich.dateTimeText(1647531900, 't')('t')} ${rich.dateTimeText(1647531900, 'T')('T')} ${rich.dateTimeText(1647531900, 'wDT')('wDT')}`,
    );

    const { blocks } = await sendAndParse(document);
    const types = inlineTypes(blocks);
    expect(types).toContain('url');
    expect(types).toContain('email_address');
    expect(types).toContain('phone_number');
    expect(types.filter(type => type === 'date_time')).toHaveLength(7);
  });

  // Everything below is markup that must survive as literal text rather than being parsed.
  it('escapes text so that no markup is interpreted', async () => {
    const literal =
      '**not bold** *not italic* ~~not strike~~ ==not marked== `not code` $not formula$ ' +
      '<b>not a tag</b> & &amp; # not a heading - not an item > not a quote | not a table | ' +
      '[^not a footnote] [not a link](x) \\ backslash';

    const { blocks, kinds } = await sendAndParse(richDocument(rich.paragraph(literal)));
    expect(kinds).toEqual(['paragraph']);
    // the whole paragraph came back as one plain string, with no entities inside it
    expect(blocks[0]?.text).toBe(literal);
  });

  // The "Example Nested Syntax Report" from the Bot API docs, rebuilt through the builder
  // API. Its three intro lines are one paragraph with soft line breaks, not three
  // paragraphs, so the structure matches the documented example block for block.
  it('builds the documented nested syntax example', async () => {
    const document = richDocument(
      rich.heading(2, rich.text`Example Nested Syntax Report for ${rich.italic('Q1')}`),
      rich.text`Intro with ${rich.underline('underlined text')}, ${rich.marked('marked text')}, and ${rich.formula('x^2 + y^2')}.
${rich.bold`Bold ${rich.italic`italic ${rich.underline('underlined italic bold')} italic`} bold`}
${rich.underline`In inline tags, nested ${rich.bold('markdown')} is parsed`}`,
      rich.blockQuote(
        rich.text`Quote with ${rich.bold`bold text, ${rich.strikethrough`strikethrough, and ${rich.spoiler('spoiler')}`}`}, plus ${rich.link('https://t.me/')('a link')}.`,
      ),
      rich.unorderedList([
        rich.text`List item with ${rich.code('code')}, ${rich.superscript('superscript')}, ${rich.subscript('subscript')}, and a footnote${rich.footnote('note')}`,
        rich.text`Another item with ${rich.bold`bold ${rich.spoiler(rich.code('spoiler code'))}`}`,
        rich.text`Another item with ${rich.strikethrough`strikethrough and ${rich.inserted('inserted text')}`}`,
      ]),
      rich.table({
        header: ['Metric', 'Value'],
        rows: [
          ['Speed', rich.text`${rich.bold('42')} ${rich.superscript('ms')}`],
          ['Status', rich.spoiler('ready')],
        ],
        align: ['left', 'right'],
      }),
      rich.footnoteDefinition(
        'note',
        rich.text`Footnote with ${rich.italic('italic text')} and ${rich.underline('HTML underline')}.`,
      ),
      rich.divider(),
      rich.heading(1, 'Details blocks can contain Markdown content:'),
      rich.details(
        rich.text`Summary with ${rich.bold('bold text')}`,
        [
          rich.heading(3, 'Details heading'),
          rich.unorderedList([
            rich.text`List item with ${rich.italic('italic text')}`,
            rich.text`List item with ${rich.spoiler('spoiler')}`,
          ]),
        ],
        { open: true },
      ),
    );

    const { kinds } = await sendAndParse(document);
    // exactly the blocks the documented example itself parses into
    expect(kinds).toEqual([
      'heading',
      'paragraph',
      'blockquote',
      'list',
      'table',
      'divider',
      'heading',
      'details',
      'footer',
    ]);
  });
});
