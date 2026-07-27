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
// Result: "Hello *World*\\!"

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

// Date-time entities (rendered in the reader's timezone and language)
const when = md.dateTime(1647531900, 'wDT').toString();
// Result: "![2022\\-03\\-17T15:45:00Z](tg://time?unix=1647531900&format=wDT)"

const whenLabeled = md.dateTimeText(new Date('2022-03-17T15:45:00Z'), 'r')('22:45 tomorrow').toString();
// Result: "![22:45 tomorrow](tg://time?unix=1647531900&format=r)"

// Code formatting
const inlineCode = md.inlineCode('const x = 1;').toString();
// Result: "`const x = 1;`"

// Code block (no language)
const codeBlock = md.codeBlock('console.log("Hello World");').toString();
// Result: "```\nconsole.log(\"Hello World\");\n```"

// Code block (with language)
const codeBlockJs = md.codeBlock('console.log("Hello World");', 'javascript').toString();
// Result: "```javascript\nconsole.log(\"Hello World\");\n```"

// Block quotes
const quote = md.blockQuote('This is a block quote.').toString();
// Result: ">This is a block quote\\."

const expandable = md.expandableBlockQuote('Expandable\nHidden part').toString();
// Result: "**>Expandable\n>Hidden part||"

// Escaping special characters
const escapedText = escapeMarkdown('Text with *bold* and _italic_').toString();
// Result: "Text with \\*bold\\* and \\_italic\\_"

// Nested formatting
const nested = md.bold`Hello ${md.italic('World')}`.toString();
// Result: "*Hello _World_*"

const deeplyNested = md.bold(md.italic(md.underline('Deep'))).toString();
// Result: "*_**__Deep__**_*"  (empty bold entities separate '_' from '__', see note 5 below)

const urlWithNested = md.inlineUrl('https://example.com')`Click ${md.bold('here')}`.toString();
// Result: "[Click *here*](https://example.com)"

const blockQuoteNested = md.blockQuote`Hello ${md.bold('World')}`.toString();
// Result: ">Hello *World*"

const expandableNested = md.expandableBlockQuote`Title\n${md.italic('Hidden part')}`.toString();
// Result: "**>Title\n>_Hidden part_||"
```

## API Reference

### `md` object

The `md` object provides methods for creating Telegram Markdown V2 formatted text. Most formatting
functions accept a string, a template literal or another escaped fragment as input and can be nested;
the exceptions are `inlineCode`/`codeBlock` (plain text only, and not nestable into anything) and
`blockQuote`/`expandableBlockQuote` (not nestable into anything, including each other). See
[Nesting restrictions](#nesting-restrictions) for the full rules.

- `md.bold` - Creates bold text
- `md.italic` - Creates italic text
- `md.underline` - Creates underlined text
- `md.strikethrough` - Creates strikethrough text
- `md.spoiler` - Creates spoiler text
- `md.inlineUrl` - Curried. Creates inline URL
- `md.inlineMention(userId: string)` - Curried. Creates user mention
- `md.customEmoji(emoji: string, emojiId: string | number)` - Creates emoji with ID
- `md.dateTime(date: Date | number, format?: string)` - Date-time entity with an ISO 8601 (UTC) fallback text
- `md.dateTimeText(date: Date | number, format?: string)` - Curried. Date-time entity with a custom fallback text
- `md.inlineCode` - Creates inline code (plain text only)
- `md.codeBlock(code: string, lang?: string)` - Creates code block (plain text only, optional language)
- `md.blockQuote` - Block quote (each line prefixed with '>')
- `md.expandableBlockQuote` - Expandable block quote (first line bold, ends with '||')

### Date-time entities

`md.dateTime` / `md.dateTimeText` produce `![text](tg://time?unix=<seconds>&format=<format>)`, which Telegram
renders in the reader's own timezone and language.

```typescript
md.dateTime(1647531900);              // unix seconds
md.dateTime(new Date(), 'r');         // a Date is converted to whole unix seconds
md.dateTimeText(new Date(), 'wDT')('22:45 tomorrow');
md.bold`Starts ${md.dateTime(1647531900, 't')}`; // nestable like any other inline entity
```

The optional format string must match `r|w?[dD]?[tT]?`, otherwise an `Error` is thrown:

| Character | Meaning |
| --- | --- |
| `r` | Time relative to now. **Cannot** be combined with anything else |
| `w` | Day of the week, localized |
| `d` / `D` | Short (`17.03.22`) / long (`March 17, 2022`) date |
| `t` / `T` | Short (`22:45`) / long (`22:45:00`) time |

When the format is omitted (or empty) the `&format=` part is left out and the text is displayed as-is.

### Escaping rules

Escaping follows the notes of the Bot API formatting options:

- everywhere except code entities, `_ * [ ] ( ) ~ `` ` `` > # + - = | { } . !` **and `\`** are escaped (notes 1 and 4);
- inside `md.inlineCode` / `md.codeBlock` only `` ` `` and `\` are escaped, so markdown characters are shown
  verbatim (note 2);
- inside the `(...)` part of links, mentions, custom emoji and date-time entities only `)` and `\` are
  escaped (note 3);
- when an italic and an underline delimiter end up adjacent (`___`), an empty bold entity `**` is inserted
  as a separator, because `__` is always parsed greedily as underline (note 5).

### Nesting restrictions

The nesting rules of the Bot API are enforced through the type system, plus a runtime guard for
JavaScript callers:

- `md.inlineCode` and `md.codeBlock` accept plain text only — passing another entity throws;
- code entities can't be part of **any** other entity, `bold`/`italic`/... **and blockquotes included**.
  A blockquote marks its continuation with a `>` at the start of every line, but Telegram stops
  treating `>` as markup once a code entity is open, so the prefixes would silently end up inside the
  code text (and `\>` is a literal backslash there, note 2). Put the code block next to the quote
  instead: ``markdownV2`${md.blockQuote('quote')}${md.codeBlock('code')}` ``;
- `md.blockQuote` and `md.expandableBlockQuote` **cannot be nested inside any other formatting**, nor
  inside each other — they can contain any nested formatting except code entities;
- `md.inlineUrl`, `md.inlineMention`, `md.customEmoji`, `md.dateTime` and `md.dateTimeText` produce
  "continuous" entities that **can't contain each other** — a link inside a link, a custom emoji
  inside a date-time entity, etc. all throw. This holds even when the inner entity is wrapped in
  `bold`/`italic`/…, because Telegram would silently drop one of the two entities. They can still be
  freely nested *into* `bold`/`italic`/`underline`/`strikethrough`/`spoiler` and into blockquotes;
- `bold`, `italic`, `underline`, `strikethrough` and `spoiler` accept plain strings, template
  literals and can be nested freely into each other and into any other entity except code.

#### Overloads and Nesting
- You can nest formatting, e.g. `md.bold(md.italic('text'))` or use template literals: `md.bold`Hello ${md.italic('World')}`

### `escapeMarkdown(text: string): MdEscapedStringNestable`

Escapes special characters that have special meaning in Telegram Markdown V2, including `\` itself.

### `markdownV2(strings: TemplateStringsArray, ...values: unknown[]): string`

A template literal tag function that automatically escapes static parts while preserving formatted values.
Block entities (code blocks and blockquotes) are automatically placed on their own line and the text that
follows them is continued on a new line.

### Exported types

`MdEscapedString` (base), `MdEscapedStringNestable` (splittable entities — can be nested anywhere except
code), `MdEscapedLink` (links, mentions, custom emoji, date-time — can't be nested into each other),
`MdEscapedCode` (`pre`/`code`), `MdEscapedQuote` (blockquotes), plus the input types `MdInput`,
`MdNestedValue`, `MdLinkInput`, `MdLinkValue`, `MdQuoteInput`, `MdQuoteValue`, `MdCodeInput` and
`MdCodeValue`.

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

### 3.0.0
- **Spec conformance** (Bot API "Rich message formatting options"):
  - `escapeMarkdown` now escapes `\` as well (note 1); text containing backslashes is no longer corrupted.
  - Code entities use the dedicated code escaping — only `` ` `` and `\` (note 2). `md.codeBlock` escapes its
    body and language tag (a body containing ``` no longer breaks the message) and `md.inlineCode` no longer
    over-escapes markdown characters.
  - The `(...)` part of links, mentions, custom emoji and date-time entities escapes `)` and `\` (note 3).
    Custom emoji alternative text is escaped as a label.
  - Adjacent italic and underline delimiters are separated with an empty bold entity (note 5).
  - `md.expandableBlockQuote` no longer appends a stray trailing newline; `markdownV2` places block entities
    on their own line instead.
- **New:** date-time entities — `md.dateTime(date, format?)` and `md.dateTimeText(date, format?)(text)`,
  accepting a `Date` or unix seconds, with validation of the format string.
- **New:** `MdEscapedStringNestable`, `MdEscapedLink`, `MdEscapedCode`, `MdEscapedQuote` and the input
  types are exported.
- **Breaking changes:**
  - `md.inlineCode` / `md.codeBlock` accept plain text only (no nested entities) and their results can no
    longer be nested inside *any* other entity — `bold`/`italic`/... **and blockquotes**. A blockquote
    prefixes every line with `>`, which Telegram does not treat as markup inside a code entity, so the
    prefixes leaked into the code text; the combination is now rejected at compile time and at runtime.
  - `md.blockQuote` / `md.expandableBlockQuote` reject nested blockquotes at compile time and at runtime.
  - `md.inlineUrl`, `md.inlineMention`, `md.customEmoji`, `md.dateTime` and `md.dateTimeText` return
    `MdEscapedLink` and reject each other as content ("all other entities can't contain each other"),
    including through an intermediate `bold`/`italic`/… wrapper. Previously Telegram silently dropped
    one of the two entities.
  - Output changed for the cases listed above (code escaping, backslashes, italic+underline, expandable
    blockquote trailing newline).

## 2.0.2
- Bugfix: string conversions in `markdownV2`

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
