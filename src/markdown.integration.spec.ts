import 'dotenv/config';
import { markdownV2, md } from './markdown';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: { text?: string; entities?: { type: string }[] };
}

async function sendTelegramMessage(text: string): Promise<TelegramResponse> {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment');
  }
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }),
  });
  return res.json() as Promise<TelegramResponse>;
}

/**
 * Sends a message and returns what Telegram actually parsed out of it: the plain text it
 * kept and how many entities of each type it recognised. Asserting on that is what makes
 * these tests meaningful — a message can be accepted and still be parsed into the wrong
 * entities.
 */
async function sendAndParse(text: string) {
  const response = await sendTelegramMessage(text);
  if (!response.ok) {
    throw new Error(`Telegram rejected the message: ${response.description}\nmarkup: ${text}`);
  }
  const counts: Record<string, number> = {};
  for (const entity of response.result?.entities ?? []) {
    counts[entity.type] = (counts[entity.type] ?? 0) + 1;
  }
  return { text: response.result?.text ?? '', counts };
}

const conditionalDescribe = BOT_TOKEN && CHAT_ID ? describe : describe.skip;

conditionalDescribe('Telegram Bot API integration', () => {
  it('sends a bold message', async () => {
    const message = md.bold('Hello, integration!').toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('sends a nested markdown message', async () => {
    const message = md.bold`Hello ${md.italic('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('sends a nested markdown message', async () => {
    const message = md.italic`Hello ${md.bold('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send block quote', async () => {
    const message = md.blockQuote`Hello ${md.bold('world')}
    tralala`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send italic underline', async () => {
    const message = md.italic`Hello ${md.underline('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send bold underline', async () => {
    const message = md.bold`Hello ${md.underline('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send italic strikethrough', async () => {
    const message = md.italic`Hello ${md.strikethrough('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send markdown bold italic strikethrough', async () => {
    const message = markdownV2`Hello ${md.bold(md.strikethrough('world'))}!`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send markdown bold url', async () => {
    const message = markdownV2`Hello ${md.strikethrough(md.inlineUrl('https://example.com')('world'))}!`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Code block
  it('send code block', async () => {
    const message = md.codeBlock('*Hello world!*').toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('send code block with language', async () => {
    const message = md.codeBlock('*Hello world!*', 'js').toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Block quote
  it('send block quote', async () => {
    const message = md.blockQuote`Hello ${md.bold('world')}
    tralala
    
    dsdsds
    sd
    sd
    sd
    sd
    sd
    sds`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Expandable block quote 
  it('send expandable block quote', async () => {
    const quote = md.expandableBlockQuote`Hello ${md.bold('world')}
    tralala
    sd
    dsdsdsds
    sd
    sd
    sdsd
    sd
    dsdsds
    ds`;
    const message = markdownV2`
    test
    ${quote}test
    `;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // pre entities can't be part of any other entity, including a blockquote: the '>' line
  // prefixes would be swallowed into the code text. The quote and the code block have to
  // be siblings instead.
  it('sends a code block next to a block quote', async () => {
    const message = markdownV2`${md.blockQuote('quote')}${md.codeBlock('*Hello world!*')}`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Spec note 1: backslashes must be escaped
  it('sends text containing backslashes', async () => {
    const message = markdownV2`path ${'C:\\dir\\file'} and a lone \\`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Spec note 2: only ` and \ are escaped inside code entities
  it('sends code containing backticks and backslashes', async () => {
    const message = markdownV2`${md.inlineCode('a `b` c \\ d')}
${md.codeBlock('```\n*not bold*\nC:\\dir', 'text')}`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Spec note 3: ) and \ must be escaped inside the (...) part of a link
  it('sends a link with parentheses in the url', async () => {
    const message = md.inlineUrl('https://en.wikipedia.org/wiki/Telegram_(software)')('Telegram').toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Spec note 5: italic/underline ambiguity is resolved with an empty bold entity
  it('sends italic nested in underline', async () => {
    const message = markdownV2`${md.underline(md.italic('italic underline'))} and ${md.italic(md.underline('underline italic'))}`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  // Date-time entities
  it('sends a date-time entity with the default text', async () => {
    const message = markdownV2`meeting at ${md.dateTime(new Date(Date.now() + 86_400_000))}`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('sends date-time entities in every documented format', async () => {
    const unix = Math.floor(Date.now() / 1000) + 3600;
    const message = markdownV2`
${md.dateTimeText(unix, 'wDT')('22:45 tomorrow')}
${md.dateTimeText(unix, 't')('22:45 tomorrow')}
${md.dateTimeText(unix, 'r')('22:45 tomorrow')}
${md.dateTimeText(unix)('22:45 tomorrow')}`;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('sends a date-time entity nested in bold', async () => {
    const message = md.bold`starts ${md.dateTimeText(Math.floor(Date.now() / 1000), 'r')('soon')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });

  it('expandable block quote inside markdown', async () => {
    const message = markdownV2`
    test
    ${md.expandableBlockQuote`Hello ${md.bold('world')}
    tralala
    sd
    dsdsdsds
    sd
    sd
    sdsd
    sd
    dsdsds
    ds`}test
    `;
    const result = await sendTelegramMessage(message);
    expect(result.ok).toBe(true);
  });
}); 
// A handful of large "sheets", each covering many entities at once, so a single round trip
// exercises a whole area of the spec. Every sheet asserts the plain text Telegram kept
// (i.e. that escaping round-trips exactly) and which entity types it recognised.
conditionalDescribe('MarkdownV2 formatting sheets', () => {
  const UNIX = 1647531900; // 2022-03-17T15:45:00Z, fixed so the default label is stable
  const EMOJI_ID = '5368324170671202286';

  const typesOf = (counts: Record<string, number>) => Object.keys(counts).sort();

  it('covers every inline entity, including the spec nesting example', async () => {
    const sheet = markdownV2`${md.bold('bold')}
${md.italic('italic')}
${md.underline('underline')}
${md.strikethrough('strikethrough')}
${md.spoiler('spoiler')}
${md.bold`bold ${md.italic`italic bold ${md.strikethrough`italic bold strikethrough ${md.spoiler('italic bold strikethrough spoiler')}`} ${md.underline('underline italic bold')}`} bold`}
${md.underline(md.italic('italic underline'))} / ${md.italic(md.underline('underline italic'))}
${md.bold(md.italic(md.underline(md.strikethrough(md.spoiler('all five')))))}`;

    const { text, counts } = await sendAndParse(sheet);
    expect(text).toBe(
      'bold\nitalic\nunderline\nstrikethrough\nspoiler\n' +
        // the spec's own example line: *bold _italic bold ~italic bold strikethrough
        // ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
        'bold italic bold italic bold strikethrough italic bold strikethrough spoiler ' +
        'underline italic bold bold\n' +
        'italic underline / underline italic\nall five',
    );
    expect(typesOf(counts)).toEqual(['bold', 'italic', 'spoiler', 'strikethrough', 'underline']);
  });

  // Custom emoji require the bot owner to have Telegram Premium (or a Fragment username),
  // and a mention only produces an entity for a user Telegram can resolve — hence CHAT_ID.
  it('covers links, mentions, custom emoji and every date-time format', async () => {
    const sheet = markdownV2`${md.inlineUrl('https://example.com/')('plain link')}
${md.inlineUrl('https://en.wikipedia.org/wiki/Telegram_(software)')('link with parens')}
${md.inlineMention(CHAT_ID as string)('mention')}
${md.customEmoji('👍', EMOJI_ID)}
${md.dateTimeText(UNIX, 'w')('w')} ${md.dateTimeText(UNIX, 'd')('d')} ${md.dateTimeText(UNIX, 'D')('D')} ${md.dateTimeText(UNIX, 't')('t')} ${md.dateTimeText(UNIX, 'T')('T')}
${md.dateTimeText(UNIX, 'wd')('wd')} ${md.dateTimeText(UNIX, 'wD')('wD')} ${md.dateTimeText(UNIX, 'dt')('dt')} ${md.dateTimeText(UNIX, 'DT')('DT')} ${md.dateTimeText(UNIX, 'wDT')('wDT')}
${md.dateTimeText(UNIX, 'r')('r')} ${md.dateTimeText(UNIX)('no format')}
${md.dateTime(UNIX, 't')}
${md.bold`link ${md.inlineUrl('https://example.com/')('in bold')}`} ${md.spoiler`emoji ${md.customEmoji('👍', EMOJI_ID)}`}`;

    const { text, counts } = await sendAndParse(sheet);
    expect(text).toBe(
      'plain link\nlink with parens\nmention\n👍\n' +
        'w d D t T\nwd wD dt DT wDT\nr no format\n' +
        '2022-03-17T15:45:00Z\nlink in bold emoji 👍',
    );
    expect(typesOf(counts)).toEqual([
      'bold',
      'custom_emoji',
      'date_time',
      'spoiler',
      'text_link',
      'text_mention',
    ]);
    // 12 explicit date-time entities plus the one with the default label
    expect(counts.date_time).toBe(13);
  });

  // Spec note 2: only ` and \ are escaped inside code, so markdown characters stay literal.
  it('covers code entities and their escaping', async () => {
    const sheet = markdownV2`${md.inlineCode('a `b` c \\ d')}
${md.codeBlock('plain\nblock')}
${md.codeBlock('print("hi")', 'python')}
${md.codeBlock('```\n*not bold* _not italic_\nC:\\dir\\file', 'text')}
${md.bold`code stays literal: `}${md.inlineCode('*not bold* _not italic_ [not a link](x)')}`;

    const { text, counts } = await sendAndParse(sheet);
    expect(text).toBe(
      'a `b` c \\ d\nplain\nblock\n\nprint("hi")\n\n' +
        '```\n*not bold* _not italic_\nC:\\dir\\file\n\n' +
        'code stays literal: *not bold* _not italic_ [not a link](x)',
    );
    expect(typesOf(counts)).toEqual(['bold', 'code', 'pre']);
    expect(counts.code).toBe(2);
    expect(counts.pre).toBe(3);
  });

  // Block quotes can't be nested, and a code entity can't live inside one, so the code
  // block has to be a sibling. Adjacent quotes need the empty-bold separator or they
  // merge into a single quote (and an expandable one leaves a dangling '||').
  it('covers block quotes and their neighbours', async () => {
    const sheet = markdownV2`${md.blockQuote`quote ${md.bold('bold')} ${md.italic('italic')} ${md.spoiler('spoiler')} ${md.inlineUrl('https://example.com/')('link')} ${md.customEmoji('👍', EMOJI_ID)}`}${md.expandableBlockQuote`head ${md.bold('bold')}
second ${md.underline('under')}
tail ${md.strikethrough('strike')}`}${md.blockQuote('adjacent quote')}${md.codeBlock('sibling code', 'js')}`;

    const { text, counts } = await sendAndParse(sheet);
    expect(text).toBe(
      'quote bold italic spoiler link 👍\n' +
        'head bold\nsecond under\ntail strike\n' +
        'adjacent quote\nsibling code',
    );
    expect(typesOf(counts)).toEqual([
      'blockquote',
      'bold',
      'custom_emoji',
      'expandable_blockquote',
      'italic',
      'pre',
      'spoiler',
      'strikethrough',
      'text_link',
      'underline',
    ]);
    // the plain quote and the adjacent one stayed separate instead of merging
    expect(counts.blockquote).toBe(2);
    expect(counts.expandable_blockquote).toBe(1);
  });

  // Spec notes 1, 3 and 4: everything reserved survives a round trip unchanged.
  it('covers escaping of every reserved character', async () => {
    const sheet = markdownV2`${'_*[]()~`>#+-=|{}.!\\'}
${'C:\\dir\\file and a lone \\'}
${'*not bold* _not italic_ __not underline__ ~not strike~ ||not spoiler||'}
${'>not a quote'}
${md.inlineUrl('https://example.com/a)b\\c')('url with ) and \\')}
${md.bold('1 + 1 = 2. 100% - 50%! (really)')}`;

    const { text, counts } = await sendAndParse(sheet);
    expect(text).toBe(
      '_*[]()~`>#+-=|{}.!\\\n' +
        'C:\\dir\\file and a lone \\\n' +
        '*not bold* _not italic_ __not underline__ ~not strike~ ||not spoiler||\n' +
        '>not a quote\n' +
        'url with ) and \\\n' +
        '1 + 1 = 2. 100% - 50%! (really)',
    );
    // none of the literal markup above was parsed as an entity
    expect(typesOf(counts)).toEqual(['bold', 'text_link']);
  });
});
