import 'dotenv/config';
import { markdownV2, md, MdEscapedString, MdEscapedStringNestable } from './markdown';

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

  it('codeBlock inside bold', async () => {
    const message = md.bold`bold ${md.codeBlock('*Hello world!*')} still bold`.toString();
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