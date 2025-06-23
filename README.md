# Telegram Markdown

A TypeScript library for formatting text with Telegram's Markdown V2 syntax using template literals.

## Installation

```bash
npm install telegram-markdown
```

## Usage

```typescript
import { md, escapeMarkdown, markdownV2 } from 'telegram-markdown';

// Basic formatting
const boldText = md.bold('Hello World').toString();
// Result: "*Hello World*"

const italicText = md.italic('Hello World').toString();
// Result: "_Hello World_"

const underlinedText = md.underline('Hello World').toString();
// Result: "__Hello World__"

const strikethroughText = md.strikethrough('Hello World').toString();
// Result: "~Hello World~"

const spoilerText = md.spoiler('Hello World').toString();
// Result: "||Hello World||"

// Links and mentions
const link = md.inlineUrl('Visit our website', 'https://example.com').toString();
// Result: "[Visit our website](https://example.com)"

const mention = md.inlineMention('John Doe', '123456789').toString();
// Result: "[John Doe](tg://user?id=123456789)"

const emoji = md.emoji('👍', '5368324170671202286').toString();
// Result: "![👍](tg://emoji?id=5368324170671202286)"

// Code formatting
const inlineCode = md.code('const x = 1;').toString();
// Result: "`const x = 1;`"

const codeBlock = md.codeBlock('console.log("Hello World");', 'javascript').toString();
// Result: "```javascript\nconsole.log("Hello World");\n```"

// Escaping special characters
const escapedText = escapeMarkdown('Text with *bold* and _italic_');
// Result: "Text with \*bold\* and \_italic\_"

// Template literal with automatic escaping
const formattedText = markdownV2`Hello ${md.bold('World')}!`;
// Result: "Hello *World*!"
```

## API Reference

### `md` object

The `md` object provides methods for creating Telegram Markdown V2 formatted text:

- `md.bold(text: string): MdEscapedString` - Creates bold text
- `md.italic(text: string): MdEscapedString` - Creates italic text
- `md.underline(text: string): MdEscapedString` - Creates underlined text
- `md.strikethrough(text: string): MdEscapedString` - Creates strikethrough text
- `md.spoiler(text: string): MdEscapedString` - Creates spoiler text
- `md.inlineUrl(text: string, url: string): MdEscapedString` - Creates inline URL
- `md.inlineMention(text: string, userId: string): MdEscapedString` - Creates user mention
- `md.emoji(emoji: string, emojiId: string): MdEscapedString` - Creates emoji with ID
- `md.code(text: string): MdEscapedString` - Creates inline code
- `md.codeBlock(text: string, lang?: string): MdEscapedString` - Creates code block

### `escapeMarkdown(text: string): MdEscapedString`

Escapes special characters that have special meaning in Telegram Markdown V2.

### `markdownV2(strings: TemplateStringsArray, ...values: unknown[]): string`

A template literal tag function that automatically escapes static parts while preserving formatted values.

## Development

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/dvlkv/telegram-markdown.git
cd telegram-markdown
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Available Scripts

- `npm run build` - Build the TypeScript code
- `npm run dev` - Watch mode for development
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run clean` - Clean build artifacts

### Testing

The project uses Jest for testing. Tests are located in `src/**/*.spec.ts` files.

```bash
npm test
```

### Code Quality

The project uses ESLint and Prettier for code quality and formatting:

```bash
npm run lint
npm run format
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## Changelog

### 1.0.0
- Initial release
- Basic Markdown V2 formatting functions
- Template literal support
- Character escaping utilities 