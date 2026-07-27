import 'dotenv/config';
import { markdownV2, md } from './markdown';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(text: string) {
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
  return res.json();
}

const conditionalDescribe = BOT_TOKEN && CHAT_ID ? describe : describe.skip;

conditionalDescribe('Telegram Bot API integration', () => {
  it('sends a bold message', async () => {
    const message = md.bold('Hello, integration!').toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('sends a nested markdown message', async () => {
    const message = md.bold`Hello ${md.italic('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('sends a nested markdown message', async () => {
    const message = md.italic`Hello ${md.bold('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send block quote', async () => {
    const message = md.blockQuote`Hello ${md.bold('world')}
    tralala`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send italic underline', async () => {
    const message = md.italic`Hello ${md.underline('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send bold underline', async () => {
    const message = md.bold`Hello ${md.underline('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send italic strikethrough', async () => {
    const message = md.italic`Hello ${md.strikethrough('world')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send markdown bold italic strikethrough', async () => {
    const message = markdownV2`Hello ${md.bold(md.strikethrough('world'))}!`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send markdown bold url', async () => {
    const message = markdownV2`Hello ${md.strikethrough(md.inlineUrl('https://example.com')('world'))}!`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  // Code block
  it('send code block', async () => {
    const message = md.codeBlock('*Hello world!*').toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('send code block with language', async () => {
    const message = md.codeBlock('*Hello world!*', 'js').toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
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
    expect(result).toBeDefined();
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
    console.log(message);
    const result = await sendTelegramMessage(message);
    console.log(result);
    expect(result).toBeDefined();
  });

  // pre entities can't be part of any other entity, including a blockquote: the '>' line
  // prefixes would be swallowed into the code text. The quote and the code block have to
  // be siblings instead.
  it('sends a code block next to a block quote', async () => {
    const message = markdownV2`${md.blockQuote('quote')}${md.codeBlock('*Hello world!*')}`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  // Spec note 1: backslashes must be escaped
  it('sends text containing backslashes', async () => {
    const message = markdownV2`path ${'C:\\dir\\file'} and a lone \\`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  // Spec note 2: only ` and \ are escaped inside code entities
  it('sends code containing backticks and backslashes', async () => {
    const message = markdownV2`${md.inlineCode('a `b` c \\ d')}
${md.codeBlock('```\n*not bold*\nC:\\dir', 'text')}`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  // Spec note 3: ) and \ must be escaped inside the (...) part of a link
  it('sends a link with parentheses in the url', async () => {
    const message = md.inlineUrl('https://en.wikipedia.org/wiki/Telegram_(software)')('Telegram').toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  // Spec note 5: italic/underline ambiguity is resolved with an empty bold entity
  it('sends italic nested in underline', async () => {
    const message = markdownV2`${md.underline(md.italic('italic underline'))} and ${md.italic(md.underline('underline italic'))}`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  // Date-time entities
  it('sends a date-time entity with the default text', async () => {
    const message = markdownV2`meeting at ${md.dateTime(new Date(Date.now() + 86_400_000))}`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('sends date-time entities in every documented format', async () => {
    const unix = Math.floor(Date.now() / 1000) + 3600;
    const message = markdownV2`
${md.dateTimeText(unix, 'wDT')('22:45 tomorrow')}
${md.dateTimeText(unix, 't')('22:45 tomorrow')}
${md.dateTimeText(unix, 'r')('22:45 tomorrow')}
${md.dateTimeText(unix)('22:45 tomorrow')}`;
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
  });

  it('sends a date-time entity nested in bold', async () => {
    const message = md.bold`starts ${md.dateTimeText(Math.floor(Date.now() / 1000), 'r')('soon')}`.toString();
    const result = await sendTelegramMessage(message);
    expect(result).toBeDefined();
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
    expect(result).toBeDefined();
  });
}); 