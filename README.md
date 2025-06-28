# Telegram Markdown

A TypeScript library for formatting text with Telegram's Markdown V2 syntax using template literals.

## Installation

```bash
npm install telegram-markdown
```

## Usage

```typescript
import { md, escapeMarkdown, markdownV2 } from 'telegram-markdown';

// Template literal with automatic escaping
const formattedText = markdownV2`Hello ${md.bold('World')}!`;
// Result: "Hello *World*!"

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

// Links and mentions (curried API)
const link = md.inlineUrl('https://example.com')('Visit our website').toString();
// Result: "[Visit our website](https://example.com)"

const mention = md.inlineMention('123456789')('John Doe').toString();
// Result: "[John Doe](tg://user?id=123456789)"

// Custom emoji
const emoji = md.customEmoji('👍', '5368324170671202286').toString();
// Result: "![👍](tg://emoji?id=5368324170671202286)"

// Code formatting
const inlineCode = md.inlineCode('const x = 1;').toString();
// Result: "`const x = 1;`"

// Code block (no language)
const codeBlock = md.codeBlock('console.log("Hello World");').toString();
// Result: "```
console.log(\"Hello World\");
```"

// Code block (with language)
const codeBlockJs = md.codeBlock('console.log("Hello World");', 'javascript').toString();
// Result: "```javascript\nconsole.log(\"Hello World\");\n```"

// Block quotes
const quote = md.blockQuote('This is a block quote.').toString();
// Result: ">This is a block quote."

const expandable = md.expandableBlockQuote('Expandable\nHidden part').toString();
// Result: "**>Expandable\n>Hidden part\n||"

// Escaping special characters
const escapedText = escapeMarkdown('Text with *bold* and _italic_').toString();
// Result: "Text with \\*bold\\* and \\_italic\\_"

// Nested formatting
const nested = md.bold`Hello ${md.italic('World')}`.toString();
// Result: "*Hello _World_*"

const deeplyNested = md.bold(md.italic(md.underline('Deep'))).toString();
// Result: "*_\__Deep__\_*"

const urlWithNested = md.inlineUrl('https://example.com')`Click ${md.bold('here')}`.toString();
// Result: "[Click *here*](https://example.com)"

const blockQuoteNested = md.blockQuote`Hello ${md.bold('World')}`.toString();
// Result: ">Hello *World*"

const expandableNested = md.expandableBlockQuote`Title\n${md.italic('Hidden part')}`.toString();
// Result: "**>Title\n>_Hidden part_\n||"
```

## API Reference

### `md` object

The `md` object provides methods for creating Telegram Markdown V2 formatted text. All formatting functions support string, template literal, or `MdEscapedString` as input, and can be nested, **except** for `blockQuote` and `expandableBlockQuote`:

- `md.bold` - Creates bold text
- `md.italic` - Creates italic text
- `md.underline` - Creates underlined text
- `md.strikethrough` - Creates strikethrough text
- `md.spoiler` - Creates spoiler text
- `md.inlineUrl` - Curried. Creates inline URL
- `md.inlineMention(userId: string)` - Curried. Creates user mention
- `md.customEmoji(emoji: string, emojiId: string)` - Creates emoji with ID
- `md.inlineCode` - Creates inline code
- `md.codeBlock` - Creates code block (optional language)
- `md.blockQuote` - Block quote (each line prefixed with '>')
- `md.expandableBlockQuote` - Expandable block quote (first line bold, ends with '||')

**Important:**
- `md.blockQuote` and `md.expandableBlockQuote` **cannot be nested inside any other formatting** (such as bold, italic, underline, etc.), they themselves can contain nested formatting.
- All other formatting functions accept plain strings, template literals, and can be nested.

#### Overloads and Nesting
- You can nest formatting, e.g. `md.bold(md.italic('text'))` or use template literals: `md.bold`Hello ${md.italic('World')}`

### `escapeMarkdown(text: string): MdEscapedString`

Escapes special characters that have special meaning in Telegram Markdown V2.

### `markdownV2(strings: TemplateStringsArray, ...values: unknown[]): string`

A template literal tag function that automatically escapes static parts while preserving formatted values.

## Development

### Prerequisites

- Node.js >= 16.0.0
- npm, yarn, or pnpm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/dvlkv/telegram-markdown.git
cd telegram-markdown
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm run build
```

### Available Scripts

- `pnpm run build` - Build the TypeScript code
- `pnpm run dev` - Watch mode for development
- `pnpm test` - Run tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run lint` - Run Biome/ESLint
- `pnpm run lint:fix` - Fix lint issues automatically
- `pnpm run format` - Format code
- `pnpm run format:check` - Check code formatting
- `pnpm run clean` - Clean build artifacts

## Testing

The project uses Jest for testing. Tests are located in `src/**/*.spec.ts` files.

```bash
pnpm test
```

## Code Quality

The project uses Biome (or ESLint) and Prettier for code quality and formatting:

```bash
pnpm run lint
pnpm run format
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

### 2.0.1
- Bugfix: Accepts more flexible nested values in formatting functions (e.g., md.bold, md.italic, etc.)

### 2.0.0
- **API Overhaul & Nesting Support:**
  - All formatting functions (`md.bold`, `md.italic`, `md.underline`, etc.) now support string, template literal, or `MdEscapedString` as input, and can be nested.
  - Added curried API for `md.inlineUrl` and `md.inlineMention`.
  - Added `md.customEmoji` for custom emoji formatting.
  - Improved code block and block quote handling, including new `expandableBlockQuote` and better support for nested formatting.
  - Added overloads and template literal support for all formatting functions.
- **Escaping & Utilities:**
  - Improved escaping logic to prevent double-escaping.
  - Added more robust handling for nested and deeply nested formatting.
- **Breaking Changes:**
  - `md.inlineUrl` and `md.inlineMention` now use a curried API:
    - Before: `md.inlineUrl('Text', 'url')`  → Now: `md.inlineUrl('url')('Text')`
    - Before: `md.inlineMention('Text', 'userId')`  → Now: `md.inlineMention('userId')('Text')`
  - `md.emoji` replaced with `md.customEmoji`.
  - `md.blockQuote` and `md.expandableBlockQuote` cannot be nested inside other formatting functions, but can themselves contain nested formatting.

### 1.0.0
- Initial release
- Basic Markdown V2 formatting functions
- Template literal support
- Character escaping utilities
