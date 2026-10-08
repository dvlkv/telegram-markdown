// Telegram Rich Markdown, the syntax accepted by sendRichMessage in the
// InputRichMessage.markdown field.
// See https://core.telegram.org/bots/api#rich-message-formatting-options
//
// This is a different syntax from MarkdownV2 (see ./markdown.ts): it is GitHub Flavored
// Markdown that may also contain a fixed set of HTML tags, and it describes whole blocks —
// headings, lists, tables, footnotes, media, collapsible sections — rather than a single
// run of text.
//
// **bold**   *italic*   ~~strikethrough~~   `code`   ==marked==   ||spoiler||
// <u>underline</u>  <ins>inserted</ins>  <sub>subscript</sub>  <sup>superscript</sup>
// [inline URL](https://t.me/)          [e-mail](mailto:user@example.com)
// [phone](tel:+123456789)              [mention](tg://user?id=123456789)
// ![👍](tg://emoji?id=5368324170671202286)
// ![22:45 tomorrow](tg://time?unix=1647531900&format=wDT)
// $x^2 + y^2$
//
// # Heading 1 … ###### Heading 6      ---      > quote      - item      1. item
// - [ ] task item    | table | row |    text[^id]    [^id]: definition
// <details open><summary>…</summary>…</details>   <aside>…<cite>…</cite></aside>
// <tg-collage>…</tg-collage>   <tg-slideshow>…</tg-slideshow>   <tg-map … />

/**
 * Characters a backslash actually escapes in Rich Markdown. Verified against the API:
 * `"`, `%`, `&`, `'`, `,`, `/`, `:`, `;`, `<`, `?`, `@` and `^` keep the backslash as
 * literal text instead, so they must never be escaped that way.
 */
const RICH_SPECIAL_CHARACTERS = /[\\`*_[\]()#+\-.!|~=${}>]/g;

/** Runs of backticks, used to pick a fence long enough to wrap a code block. */
const BACKTICK_RUN = /`+/g;

/** The date-time format string, shared with MarkdownV2 (see "Date-time entity formatting"). */
const DATE_TIME_FORMAT = /^(?:r|w?[dD]?[tT]?)$/;

/** A media id usable in tg://photo?id=, tg://video?id= and tg://audio?id= links. */
const MEDIA_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Telegram renders at most 20 columns of a table. */
const MAX_TABLE_COLUMNS = 20;

/**
 * A piece of already escaped Rich Markdown that is valid *inside* a line: emphasis, links,
 * code spans, formulas and the inline HTML tags.
 */
export class RichInline {
    constructor(public readonly text: string) {}

    toString() {
        return this.text;
    }
}

/**
 * A whole block: heading, paragraph, list, table, quote, media, details, ... Blocks are
 * separated from their neighbours by a blank line and can never be nested into inline
 * formatting.
 */
export class RichBlock {
    constructor(public readonly text: string) {}

    toString() {
        return this.text;
    }
}

/** Text, a template literal, or an already escaped inline fragment. */
export type RichInput = string | TemplateStringsArray | RichInline;

/** A value interpolated into an inline template literal. */
export type RichValue = string | number | bigint | boolean | null | undefined | RichInline;

/** Anything that can stand on its own between two blank lines. */
export type RichBlockInput = RichBlock | RichInline | string;

function isInline(value: unknown): value is RichInline {
    return value instanceof RichInline;
}

/** True for the first argument a tagged template literal passes to its tag function. */
function isTemplateStrings(value: unknown): value is TemplateStringsArray {
    return Array.isArray(value) && 'raw' in value;
}

/**
 * Escapes text so that it survives Rich Markdown parsing unchanged.
 *
 * `&` and `<` are replaced by HTML entities because a backslash in front of them stays
 * visible (Rich Markdown may contain arbitrary HTML, so `&` opens an entity and `<` opens a
 * tag). Everything else that is structurally meaningful is backslash-escaped. The entities
 * inserted here contain no character that the backslash pass touches, so the order is safe.
 */
export function escapeRich(text: string): RichInline {
    const escaped = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(RICH_SPECIAL_CHARACTERS, '\\$&');
    return new RichInline(escaped);
}

/**
 * Escapes text for a context that is *not* parsed as Markdown: the body of `<aside>` and
 * the `<figcaption>` of a collage, slideshow or map. Markdown isn't parsed inside block HTML
 * tags other than `<details>`, `<tg-collage>` and `<tg-slideshow>`, so a backslash escape
 * would be rendered literally; only HTML entities and tags are interpreted there.
 */
function escapePlainText(text: string): string {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** Like {@link resolveInline}, but for the non-Markdown contexts above. */
function resolvePlain(text: RichInput, values: readonly RichValue[]): string {
    if (isInline(text)) {
        return text.toString();
    }
    if (isTemplateStrings(text)) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += escapePlainText(text[i] as string);
            if (i < values.length) {
                const value = values[i];
                result += isInline(value) ? value.toString() : escapePlainText(String(value));
            }
        }
        return result;
    }
    return escapePlainText(String(text));
}

/** Escapes a value used inside an HTML attribute, e.g. a media URL or a caption. */
function escapeAttribute(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Escapes the destination of a markdown link, where `)` would end it early. */
function escapeUrl(url: string): string {
    return String(url).replace(/[\\)]/g, '\\$&');
}

function resolveInline(text: RichInput, values: readonly RichValue[]): string {
    if (isInline(text)) {
        return text.toString();
    }
    if (isTemplateStrings(text)) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += escapeRich(text[i] as string).toString();
            if (i < values.length) {
                const value = values[i];
                result += isInline(value)
                    ? value.toString()
                    : escapeRich(String(value)).toString();
            }
        }
        return result;
    }
    return escapeRich(String(text)).toString();
}

function inlineWrapper(wrap: (s: string) => string) {
    return (text: RichInput, ...values: RichValue[]): RichInline =>
        new RichInline(wrap(resolveInline(text, values)));
}

/** Renders a block, an inline fragment or plain text as a standalone block. */
function asBlockText(content: RichBlockInput): string {
    if (content instanceof RichBlock) {
        return content.toString();
    }
    if (isInline(content)) {
        return content.toString();
    }
    return escapeRich(String(content)).toString();
}

function joinBlocks(blocks: readonly RichBlockInput[]): string {
    return blocks.map(asBlockText).filter(block => block.length > 0).join('\n\n');
}

/** Prefixes every line, used for block quotes and list item continuation lines. */
function prefixLines(text: string, first: string, rest: string): string {
    const lines = text.split('\n');
    return lines.map((line, i) => `${i === 0 ? first : rest}${line}`).join('\n');
}

function toUnixSeconds(date: Date | number): number {
    const milliseconds = date instanceof Date ? date.getTime() : date;
    if (!Number.isFinite(milliseconds)) {
        throw new Error(`Invalid date passed to a date-time entity: ${String(date)}`);
    }
    return date instanceof Date ? Math.floor(milliseconds / 1000) : Math.floor(milliseconds);
}

function dateTimeUrl(unix: number, format: string): string {
    // MarkdownV2 accepts tg://time?unix=... without a format, but a rich message rejects it
    // with RICH_MESSAGE_PHOTO_URL_INVALID — without the format the link is read as media.
    if (format === '') {
        throw new Error(
            'A date-time entity in a rich message needs a non-empty format string: ' +
                'Telegram rejects tg://time links without one',
        );
    }
    if (!DATE_TIME_FORMAT.test(format)) {
        throw new Error(
            `Invalid date-time format "${format}": it must match ${DATE_TIME_FORMAT.source} ` +
                "('r' for relative time, 'w' week day, 'd'/'D' short/long date, 't'/'T' short/long time; " +
                "'r' can't be combined with anything else)",
        );
    }
    return `tg://time?unix=${unix}&format=${format}`;
}

function defaultDateTimeText(unix: number): string {
    return new Date(unix * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** A media element of a collage or slideshow, or a standalone media block. */
export interface RichMedia {
    /** HTTP(S) URL of the media, or a media id registered in InputRichMessage.media. */
    url: string;
    /** Optional caption rendered under the media. */
    caption?: string;
}

/** Reference to a file uploaded through InputRichMessage.media. */
export type RichMediaKind = 'photo' | 'video' | 'audio';

export interface RichTable {
    /** Header cells. Their count defines the number of columns. */
    header: readonly RichValue[];
    /** Body rows; shorter rows are padded with empty cells. */
    rows: readonly (readonly RichValue[])[];
    /** Per-column alignment, defaulting to the renderer's own. */
    align?: readonly ('left' | 'center' | 'right' | undefined)[];
}

export interface RichOrderedListOptions {
    /** Number of the first item, defaulting to 1. */
    start?: number;
}

export interface RichTaskItem {
    text: RichInput;
    checked?: boolean;
}

export interface RichDetailsOptions {
    /** Expand the block by default. */
    open?: boolean;
}

export interface RichMapOptions {
    latitude: number;
    longitude: number;
    zoom?: number;
    caption?: string;
}

function cellText(cell: RichValue): string {
    if (isInline(cell)) {
        return cell.toString();
    }
    return escapeRich(String(cell ?? '')).toString();
}

/** Credit shown under a pull quote. */
export interface RichPullQuoteOptions {
    cite?: string;
}

/**
 * Block quotation. Usable as a tagged template for a single line of inline content, or with
 * whole blocks: `rich.blockQuote\`Quote with ${rich.bold('bold')}\`` and
 * `rich.blockQuote(rich.paragraph('a'), rich.paragraph('b'))` both work.
 */
function blockQuote(text: TemplateStringsArray, ...values: RichValue[]): RichBlock;
function blockQuote(text: RichBlockInput, ...more: RichBlockInput[]): RichBlock;
function blockQuote(text: RichBlockInput | TemplateStringsArray, ...rest: unknown[]): RichBlock {
    const body = isTemplateStrings(text)
        ? resolveInline(text, rest as RichValue[])
        : joinBlocks([text as RichBlockInput, ...(rest as RichBlockInput[])]);
    return new RichBlock(prefixLines(body, '>', '>'));
}

/**
 * Pull quote with optional credit, rendered with the `<aside>` tag. The credit is passed as
 * an option rather than a second argument so that the tagged-template form stays
 * unambiguous: `rich.pullQuote\`…\`` and `rich.pullQuote('…', { cite: 'The Author' })`.
 *
 * Markdown is not parsed inside `<aside>`, so text is only HTML-escaped here and the
 * Markdown-based entities (bold, italic, ...) would show up as literal asterisks. Use the
 * HTML-based ones — `underline`, `inserted`, `subscript`, `superscript` — instead.
 */
function pullQuote(text: TemplateStringsArray, ...values: RichValue[]): RichBlock;
function pullQuote(text: RichInput, options?: RichPullQuoteOptions): RichBlock;
function pullQuote(text: RichInput, ...rest: unknown[]): RichBlock {
    const template = isTemplateStrings(text);
    const body = template ? resolvePlain(text, rest as RichValue[]) : resolvePlain(text, []);
    const cite = template ? undefined : (rest[0] as RichPullQuoteOptions | undefined)?.cite;
    const credit = cite === undefined ? '' : `<cite>${escapePlainText(cite)}</cite>`;
    return new RichBlock(`<aside>${body}${credit}</aside>`);
}

function mediaBlock(media: RichMedia): string {
    const url = escapeUrl(media.url);
    if (media.caption === undefined) {
        return `![](${url})`;
    }
    // The optional title after the URL becomes the caption.
    return `![](${url} "${media.caption.replace(/["\\]/g, '\\$&')}")`;
}

export const rich = {
    // ---- inline formatting -------------------------------------------------------------
    /**
     * Escapes and joins its arguments without adding any formatting of its own. Use it
     * wherever a *line* of mixed text and inline entities is needed rather than a block:
     * a heading, a list item, a table cell, a `<summary>` or a footnote definition.
     */
    text: inlineWrapper(s => s),
    bold: inlineWrapper(s => `**${s}**`),
    italic: inlineWrapper(s => `*${s}*`),
    strikethrough: inlineWrapper(s => `~~${s}~~`),
    marked: inlineWrapper(s => `==${s}==`),
    spoiler: inlineWrapper(s => `||${s}||`),
    // No Markdown syntax exists for these, so the documented HTML tags are used. Markdown
    // nested inside an inline tag is still parsed.
    underline: inlineWrapper(s => `<u>${s}</u>`),
    inserted: inlineWrapper(s => `<ins>${s}</ins>`),
    subscript: inlineWrapper(s => `<sub>${s}</sub>`),
    superscript: inlineWrapper(s => `<sup>${s}</sup>`),

    /** Inline fixed-width code. The content is never parsed, so it is not escaped. */
    code: (code: string): RichInline => {
        const source = String(code);
        const longest = (source.match(BACKTICK_RUN) ?? []).reduce(
            (max, run) => Math.max(max, run.length),
            0,
        );
        const fence = '`'.repeat(longest + 1);
        // A space keeps a leading/trailing backtick from merging with the fence.
        const pad = source.startsWith('`') || source.endsWith('`') ? ' ' : '';
        return new RichInline(`${fence}${pad}${source}${pad}${fence}`);
    },

    /** Inline LaTeX formula. The source is passed through verbatim. */
    formula: (latex: string): RichInline => new RichInline(`$${String(latex)}$`),

    link: (url: string) => {
        const target = escapeUrl(url);
        return (text: RichInput, ...values: RichValue[]): RichInline =>
            new RichInline(`[${resolveInline(text, values)}](${target})`);
    },
    email: (address: string) => rich.link(`mailto:${address}`),
    phone: (number: string) => rich.link(`tel:${number}`),
    mention: (userId: string | number) => rich.link(`tg://user?id=${userId}`),

    customEmoji: (emoji: string, emojiId: string | number): RichInline =>
        new RichInline(
            `![${escapeRich(emoji).toString()}](${escapeUrl(`tg://emoji?id=${emojiId}`)})`,
        ),

    /**
     * Date-time entity with an ISO 8601 (UTC) fallback label. Unlike in MarkdownV2 the
     * format is required — Telegram rejects a rich message whose tg://time link has none.
     */
    dateTime: (date: Date | number, format: string): RichInline => {
        const unix = toUnixSeconds(date);
        return new RichInline(
            `![${escapeRich(defaultDateTimeText(unix)).toString()}](${escapeUrl(dateTimeUrl(unix, format))})`,
        );
    },
    /** Date-time entity with a custom fallback label: `rich.dateTimeText(d, 't')('22:45')`. */
    dateTimeText: (date: Date | number, format: string) => {
        const url = escapeUrl(dateTimeUrl(toUnixSeconds(date), format));
        return (text: RichInput, ...values: RichValue[]): RichInline =>
            new RichInline(`![${resolveInline(text, values)}](${url})`);
    },

    /** Reference to a footnote defined with {@link rich.footnoteDefinition}. */
    footnote: (id: string): RichInline => new RichInline(`[^${escapeRich(id).toString()}]`),

    /** A `tg://photo?id=`-style reference to a file uploaded via InputRichMessage.media. */
    uploaded: (kind: RichMediaKind, id: string): string => {
        if (!MEDIA_ID.test(id)) {
            throw new Error(
                `Invalid media id "${id}": 1-64 characters of A-Z, a-z, 0-9, _ and - are allowed`,
            );
        }
        return `tg://${kind}?id=${id}`;
    },

    // ---- blocks ------------------------------------------------------------------------
    heading: (level: number, text: RichInput, ...values: RichValue[]): RichBlock => {
        if (!Number.isInteger(level) || level < 1 || level > 6) {
            throw new Error(`Invalid heading level ${level}: it must be an integer from 1 to 6`);
        }
        return new RichBlock(`${'#'.repeat(level)} ${resolveInline(text, values)}`);
    },

    paragraph: (text: RichInput, ...values: RichValue[]): RichBlock =>
        new RichBlock(resolveInline(text, values)),

    divider: (): RichBlock => new RichBlock('---'),

    /** Pre-formatted code block with optional syntax highlighting. */
    pre: (code: string, language?: string): RichBlock => {
        const source = String(code);
        const longest = (source.match(BACKTICK_RUN) ?? []).reduce(
            (max, run) => Math.max(max, run.length),
            0,
        );
        const fence = '`'.repeat(Math.max(3, longest + 1));
        return new RichBlock(`${fence}${language ?? ''}\n${source}\n${fence}`);
    },

    /** Block formula. The LaTeX source is passed through verbatim. */
    mathBlock: (latex: string): RichBlock => new RichBlock(`\`\`\`math\n${String(latex)}\n\`\`\``),

    blockQuote,
    pullQuote,

    unorderedList: (items: readonly RichInput[]): RichBlock =>
        new RichBlock(
            items.map(item => prefixLines(resolveInline(item, []), '- ', '  ')).join('\n'),
        ),

    orderedList: (
        items: readonly RichInput[],
        options: RichOrderedListOptions = {},
    ): RichBlock => {
        const start = options.start ?? 1;
        if (!Number.isInteger(start) || start < 0) {
            throw new Error(`Invalid ordered list start ${start}: it must be a non-negative integer`);
        }
        return new RichBlock(
            items
                .map((item, i) => {
                    const marker = `${start + i}. `;
                    return prefixLines(resolveInline(item, []), marker, ' '.repeat(marker.length));
                })
                .join('\n'),
        );
    },

    taskList: (items: readonly RichTaskItem[]): RichBlock =>
        new RichBlock(
            items
                .map(item =>
                    prefixLines(
                        resolveInline(item.text, []),
                        `- [${item.checked ? 'x' : ' '}] `,
                        '      ',
                    ),
                )
                .join('\n'),
        ),

    /** Definition of a footnote referenced with {@link rich.footnote}. */
    footnoteDefinition: (id: string, text: RichInput, ...values: RichValue[]): RichBlock =>
        new RichBlock(`[^${escapeRich(id).toString()}]: ${resolveInline(text, values)}`),

    table: ({ header, rows, align = [] }: RichTable): RichBlock => {
        if (header.length === 0) {
            throw new Error('A table needs at least one column');
        }
        if (header.length > MAX_TABLE_COLUMNS) {
            throw new Error(
                `A table can have at most ${MAX_TABLE_COLUMNS} columns, got ${header.length}`,
            );
        }
        const columns = header.length;
        const divider = Array.from({ length: columns }, (_, i) => {
            switch (align[i]) {
                case 'left':
                    return ':---';
                case 'center':
                    return ':--:';
                case 'right':
                    return '---:';
                default:
                    return '----';
            }
        });
        const line = (cells: readonly string[]) => `| ${cells.join(' | ')} |`;
        const body = rows.map(row =>
            line(
                Array.from({ length: columns }, (_, i) =>
                    i < row.length ? cellText(row[i]) : '',
                ),
            ),
        );
        return new RichBlock(
            [line(header.map(cellText)), line(divider), ...body].join('\n'),
        );
    },

    /** Standalone photo, video, audio or animation. Only HTTP(S) URLs are supported. */
    media: (media: RichMedia): RichBlock => new RichBlock(mediaBlock(media)),

    /** Collapsible section. Its body may contain any rich content. */
    details: (
        summary: RichInput,
        content: RichBlockInput | readonly RichBlockInput[],
        options: RichDetailsOptions = {},
    ): RichBlock => {
        const blocks = Array.isArray(content)
            ? (content as readonly RichBlockInput[])
            : [content as RichBlockInput];
        const open = options.open ? ' open' : '';
        // A blank line around the body is what makes Markdown inside <details> be parsed.
        return new RichBlock(
            `<details${open}><summary>${resolveInline(summary, [])}</summary>\n\n` +
                `${joinBlocks(blocks)}\n\n</details>`,
        );
    },

    collage: (items: readonly RichMedia[], caption?: string): RichBlock =>
        mediaGroup('tg-collage', items, caption),

    slideshow: (items: readonly RichMedia[], caption?: string): RichBlock =>
        mediaGroup('tg-slideshow', items, caption),

    map: ({ latitude, longitude, zoom, caption }: RichMapOptions): RichBlock => {
        if (caption !== undefined && zoom === undefined) {
            // A captioned map is wrapped in <figure>, and Telegram then drops the whole
            // block — producing a message with no content at all — unless zoom is given.
            throw new Error('A map with a caption also needs a zoom level');
        }
        const tag =
            `<tg-map lat="${escapeAttribute(String(latitude))}" ` +
            `long="${escapeAttribute(String(longitude))}"` +
            `${zoom === undefined ? '' : ` zoom="${escapeAttribute(String(zoom))}"`}/>`;
        if (caption === undefined) {
            return new RichBlock(tag);
        }
        // <figcaption> is not a Markdown context either.
        return new RichBlock(
            `<figure>${tag}<figcaption>${escapePlainText(caption)}</figcaption></figure>`,
        );
    },

    /** Named anchor that can be linked to with `rich.link('#name')`. */
    anchor: (name: string): RichBlock =>
        new RichBlock(`<a name="${escapeAttribute(name)}"></a>`),
};

function mediaGroup(
    tag: 'tg-collage' | 'tg-slideshow',
    items: readonly RichMedia[],
    caption?: string,
): RichBlock {
    if (items.length === 0) {
        throw new Error(`A <${tag}> needs at least one media element`);
    }
    const body = items.map(mediaBlock).join('\n');
    // The media blocks inside are parsed as Markdown, but the <figcaption> itself is not.
    const figcaption =
        caption === undefined ? '' : `\n\n<figcaption>${escapePlainText(caption)}</figcaption>`;
    return new RichBlock(`<${tag}>\n\n${body}${figcaption}\n\n</${tag}>`);
}

/**
 * Assembles a rich message from blocks, separating them with the blank line that Rich
 * Markdown uses as a block boundary.
 */
export function richDocument(...blocks: RichBlockInput[]): string {
    return joinBlocks(blocks);
}

/**
 * Template literal that escapes everything interpolated into it. Blocks are placed on their
 * own, separated from the surrounding content by a blank line.
 */
export function richMarkdown(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = '';
    // Set once a block has been written: whatever comes next has to start a new block, and
    // the whitespace that surrounded the interpolation in the template is not content.
    let afterBlock = false;

    const appendText = (chunk: string): void => {
        let text = chunk;
        if (afterBlock) {
            text = text.replace(/^\s+/, '');
            if (text.length === 0) {
                return;
            }
            result += '\n\n';
            afterBlock = false;
        }
        result += text;
    };

    const appendBlock = (chunk: string): void => {
        if (chunk.length === 0) {
            return;
        }
        result = result.replace(/\s+$/, '');
        if (result.length > 0) {
            result += '\n\n';
        }
        result += chunk;
        afterBlock = true;
    };

    for (let i = 0; i < strings.length; i++) {
        const part = strings[i];
        if (part !== undefined) {
            appendText(escapeRich(part).toString());
        }
        if (i < values.length) {
            const value = values[i];
            if (value instanceof RichBlock) {
                appendBlock(value.toString());
            } else if (isInline(value)) {
                appendText(value.toString());
            } else {
                appendText(escapeRich(String(value)).toString());
            }
        }
    }
    return result.trim();
}
