// Telegram MarkdownV2 syntax implemented by this module.
// See https://core.telegram.org/bots/api#markdownv2-style
//
// *bold \*text*
// _italic \*text_
// __underline__
// ~strikethrough~
// ||spoiler||
// [inline URL](http://www.example.com/)
// [inline mention of a user](tg://user?id=123456789)
// ![👍](tg://emoji?id=5368324170671202286)
// ![22:45 tomorrow](tg://time?unix=1647531900&format=wDT)
// ![22:45 tomorrow](tg://time?unix=1647531900)
// `inline fixed-width code`
// ```
// pre-formatted fixed-width code block
// ```
// ```python
// pre-formatted fixed-width code block written in the Python programming language
// ```
// >Block quotation started
// >Block quotation continued
// >The last line of the block quotation
// **>The expandable block quotation started right after the previous block quotation
// >It is separated from the previous block quotation by an empty bold entity
// >The last line of the expandable block quotation with the expandability mark||
//
// Nesting restrictions (spec "Nesting rules"):
// - bold, italic, underline, strikethrough and spoiler can contain and be part of any
//   other entity, except pre and code;
// - blockquote and expandable_blockquote can't be nested;
// - all other entities can't contain each other, i.e. pre, code, text_url (inline url
//   and mention), custom_emoji and date-time entities are mutually exclusive.
//
// On top of that, a pre/code entity can't be written inside a blockquote in MarkdownV2:
// blockquote continuation is expressed with a '>' at the start of every line, but once a
// code entity is open Telegram no longer treats '>' (or the newline) as markup, so the
// prefixes would silently become part of the code text. Such combinations are rejected.

/** Any character that must be escaped outside of code entities (spec notes 1 and 4). */
const SPECIAL_CHARACTERS = /[\\_*[\]()~`>#+\-=|{}.!]/g;

/** Inside pre and code entities only ` and \ have to be escaped (spec note 2). */
const CODE_SPECIAL_CHARACTERS = /[\\`]/g;

/** Inside the (...) part of a link, custom emoji or date-time only ) and \ (spec note 3). */
const URL_SPECIAL_CHARACTERS = /[\\)]/g;

/** Date-time entity format string, see "Date-time entity formatting". */
const DATE_TIME_FORMAT = /^(?:r|w?[dD]?[tT]?)$/;

/** An empty bold entity, used to disambiguate italic and underline (spec note 5). */
const EMPTY_BOLD_SEPARATOR = '**';

/**
 * A piece of already escaped MarkdownV2.
 *
 * The base class is used for fragments that must not be nested into anything else.
 * `trimStart` asks {@link markdownV2} to place the fragment at the beginning of a line,
 * `blockEnd` asks it to continue on a new line after the fragment.
 */
export class MdEscapedString {
    constructor(
        public readonly text: string,
        public readonly trimStart = false,
        public readonly blockEnd = false,
        /**
         * True when the fragment already contains a "continuous" entity — a text link,
         * a custom emoji or a date-time entity. Those can't contain each other, and the
         * flag survives the splittable entities (bold, italic, ...) they may be wrapped
         * in, so `md.inlineUrl(url)(md.bold(otherLink))` can still be rejected.
         */
        public readonly containsLink = false,
    ) {}

    toString() {
        return this.text;
    }
}

/**
 * A fragment produced by a splittable entity (bold, italic, underline, strikethrough,
 * spoiler) or by plain escaping: it can be nested inside any entity except pre and code.
 */
export class MdEscapedStringNestable extends MdEscapedString {
    get nestable(): true {
        return true;
    }

    /** Marks the fragment as *not* being a link entity itself (see {@link MdEscapedLink}). */
    get link(): false {
        return false;
    }
}

/**
 * A text link, custom emoji or date-time fragment. It can be part of a splittable entity
 * or of a blockquote, but "all other entities can't contain each other", so it can never
 * be nested inside another link/custom emoji/date-time entity.
 */
export class MdEscapedLink extends MdEscapedString {
    constructor(text: string) {
        super(text, false, false, true);
    }

    get nestable(): true {
        return true;
    }

    get link(): true {
        return true;
    }
}

/** A pre/code fragment: it can neither contain other entities nor be part of one. */
export class MdEscapedCode extends MdEscapedString {
    get code() {
        return true;
    }
}

/** A blockquote fragment: blockquotes can't be nested into anything, including each other. */
export class MdEscapedQuote extends MdEscapedString {
    get quote() {
        return true;
    }
}

function escapedNestable(text: string, trimStart = false, blockEnd = false, containsLink = false) {
    return new MdEscapedStringNestable(text, trimStart, blockEnd, containsLink);
}

function isEscapedString(value: unknown): value is MdEscapedString {
    return value instanceof MdEscapedString;
}

/** Input accepted by the splittable entities (bold, italic, underline, ...). */
export type MdInput = string | TemplateStringsArray | MdEscapedStringNestable | MdEscapedLink;

/** Interpolated value accepted by the splittable entities. */
export type MdNestedValue = string | MdEscapedStringNestable | MdEscapedLink;

/**
 * Input accepted by link-like entities (inline url, mention, date-time): anything but
 * another link, custom emoji or date-time entity.
 */
export type MdLinkInput = string | TemplateStringsArray | MdEscapedStringNestable;

/** Interpolated value accepted by link-like entities. */
export type MdLinkValue = string | MdEscapedStringNestable;

/** Input accepted by blockquotes: anything but a code entity or another blockquote. */
export type MdQuoteInput = string | TemplateStringsArray | MdEscapedStringNestable | MdEscapedLink;

/** Interpolated value accepted by blockquotes. */
export type MdQuoteValue = string | MdEscapedStringNestable | MdEscapedLink;

/** Input accepted by code entities: plain text only, entities can't be nested there. */
export type MdCodeInput = string | TemplateStringsArray;

/** Interpolated value accepted by code entities: primitives only, never another entity. */
export type MdCodeValue = string | number | bigint | boolean | null | undefined;

type AnyMdInput = string | TemplateStringsArray | MdEscapedString;

type AnyMdValue = string | MdEscapedString;

export function escapeMarkdown(text: string): MdEscapedStringNestable {
    // A single pass, so the backslashes inserted by the replacement are never re-processed.
    return escapedNestable(String(text).replace(SPECIAL_CHARACTERS, '\\$&'));
}

function escapeCode(code: string): string {
    return String(code).replace(CODE_SPECIAL_CHARACTERS, '\\$&');
}

function escapeUrl(url: string): string {
    return String(url).replace(URL_SPECIAL_CHARACTERS, '\\$&');
}

/** True when `text` ends with an underscore that Telegram reads as a delimiter. */
function endsWithDelimiterUnderscore(text: string): boolean {
    if (!text.endsWith('_')) {
        return false;
    }
    let backslashes = 0;
    for (let i = text.length - 2; i >= 0 && text[i] === '\\'; i -= 1) {
        backslashes += 1;
    }
    // An odd number of backslashes means the underscore itself is escaped.
    return backslashes % 2 === 0;
}

/**
 * Concatenates two escaped fragments, inserting an empty bold entity whenever the
 * result would contain an ambiguous run of underscores: `__` is always greedily
 * treated from left to right as an underline delimiter (spec note 5).
 */
function joinFragments(left: string, right: string): string {
    if (endsWithDelimiterUnderscore(left) && right.startsWith('_')) {
        return `${left}${EMPTY_BOLD_SEPARATOR}${right}`;
    }
    return `${left}${right}`;
}

function wrapItalic(text: string): string {
    return joinFragments(joinFragments('_', text), '_');
}

function wrapUnderline(text: string): string {
    return joinFragments(joinFragments('__', text), '__');
}

/** An escaped fragment together with the nesting information that has to travel with it. */
interface MdFragment {
    text: string;
    containsLink: boolean;
}

function getFullText(text: AnyMdInput, values: readonly AnyMdValue[]): MdFragment {
    if (isEscapedString(text)) {
        return { text: text.toString(), containsLink: text.containsLink };
    }
    if (Array.isArray(text)) {
        let result = '';
        let containsLink = false;
        for (let i = 0; i < text.length; i++) {
            result = joinFragments(result, escapeMarkdown(text[i] as string).toString());
            if (i < values.length) {
                const value = values[i];
                const part = isEscapedString(value)
                    ? value.toString()
                    : escapeMarkdown(String(value)).toString();
                if (isEscapedString(value) && value.containsLink) {
                    containsLink = true;
                }
                result = joinFragments(result, part);
            }
        }
        return { text: result, containsLink };
    }
    return { text: escapeMarkdown(String(text)).toString(), containsLink: false };
}

function processMdInput(
    wrapper: (s: string) => string,
    textOrStrings: MdInput,
    ...values: MdNestedValue[]
): MdEscapedStringNestable {
    assertNestable(textOrStrings);
    for (const value of values) {
        assertNestable(value);
    }
    const fragment = getFullText(textOrStrings, values);
    return escapedNestable(wrapper(fragment.text), false, false, fragment.containsLink);
}

/**
 * Link-like entities (text link, mention, custom emoji, date-time) are "continuous"
 * entities: they may contain splittable entities, but never another continuous one.
 */
function processLinkInput(
    wrapper: (s: string) => string,
    textOrStrings: MdLinkInput,
    ...values: MdLinkValue[]
): MdEscapedLink {
    assertNestable(textOrStrings);
    assertNotLink(textOrStrings);
    for (const value of values) {
        assertNestable(value);
        assertNotLink(value);
    }
    return new MdEscapedLink(wrapper(getFullText(textOrStrings, values).text));
}

function assertNotEntity(value: unknown, entity: string): void {
    if (isEscapedString(value)) {
        throw new Error(
            `${entity} entities can't contain other entities (Telegram MarkdownV2 nesting rules)`,
        );
    }
}

/** pre/code and blockquotes can't be part of any other entity. */
function assertNestable(value: unknown): void {
    if (value instanceof MdEscapedCode) {
        throw new Error(
            "pre and code entities can't be part of another entity " +
                '(Telegram MarkdownV2 nesting rules)',
        );
    }
    if (value instanceof MdEscapedQuote) {
        throw new Error(
            "blockquote entities can't be part of another entity " +
                '(Telegram MarkdownV2 nesting rules)',
        );
    }
}

function assertNotLink(value: unknown): void {
    if (isEscapedString(value) && value.containsLink) {
        throw new Error(
            "inline url, mention, custom emoji and date-time entities can't contain each other " +
                '(Telegram MarkdownV2 nesting rules)',
        );
    }
}

function assertNotQuote(value: unknown): void {
    if (value instanceof MdEscapedQuote) {
        throw new Error(
            "blockquote entities can't be nested (Telegram MarkdownV2 nesting rules)",
        );
    }
}

/**
 * pre/code entities can't be expressed inside a blockquote: `md.blockQuote` prefixes every
 * line with '>', but Telegram stops treating '>' as markup once a code entity is open, so
 * the prefixes would end up inside the code text (and '\>' is a literal there, spec note 2).
 */
function assertNotCodeInQuote(value: unknown): void {
    if (value instanceof MdEscapedCode) {
        throw new Error(
            "pre and code entities can't be part of a blockquote in MarkdownV2: the '>' line " +
                'prefixes would become part of the code text (Telegram MarkdownV2 nesting rules)',
        );
    }
}

/** Builds the body of a code entity: raw text first, escaped once at the end. */
function getCodeText(
    code: MdCodeInput,
    values: readonly MdCodeValue[],
    entity: string,
): string {
    assertNotEntity(code, entity);
    for (const value of values) {
        assertNotEntity(value, entity);
    }
    if (Array.isArray(code)) {
        let result = '';
        for (let i = 0; i < code.length; i++) {
            result += code[i] as string;
            if (i < values.length) {
                result += String(values[i]);
            }
        }
        return escapeCode(result);
    }
    return escapeCode(String(code));
}

function getQuoteText(text: MdQuoteInput, values: readonly MdQuoteValue[]): MdFragment {
    assertNotQuote(text);
    assertNotCodeInQuote(text);
    for (const value of values) {
        assertNotQuote(value);
        assertNotCodeInQuote(value);
    }
    return getFullText(text, values);
}

function toUnixSeconds(date: Date | number): number {
    const milliseconds = date instanceof Date ? date.getTime() : date;
    if (!Number.isFinite(milliseconds)) {
        throw new Error(`Invalid date passed to a date-time entity: ${String(date)}`);
    }
    return date instanceof Date ? Math.floor(milliseconds / 1000) : Math.floor(milliseconds);
}

function dateTimeUrl(unix: number, format: string | undefined): string {
    if (format === undefined || format === '') {
        return `tg://time?unix=${unix}`;
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

/** Fallback text shown by clients that can't render a date-time entity. */
function defaultDateTimeText(unix: number): string {
    return new Date(unix * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export const md = {
    bold: (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(s => `*${s}*`, text, ...values),
    italic: (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(wrapItalic, text, ...values),
    underline: (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(wrapUnderline, text, ...values),
    strikethrough: (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(s => `~${s}~`, text, ...values),
    spoiler: (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(s => `||${s}||`, text, ...values),

    // The (...) part of a link only escapes ) and \ (spec note 3).
    // Links, mentions, custom emoji and date-time entities can't contain each other.
    inlineUrl: (url: string) => {
        const escapedUrl = escapeUrl(url);
        return (text: MdLinkInput, ...values: MdLinkValue[]) =>
            processLinkInput(s => `[${s}](${escapedUrl})`, text, ...values);
    },
    inlineMention: (userId: string | number) => {
        const escapedUrl = escapeUrl(`tg://user?id=${userId}`);
        return (text: MdLinkInput, ...values: MdLinkValue[]) =>
            processLinkInput(s => `[${s}](${escapedUrl})`, text, ...values);
    },
    customEmoji: (emoji: string, emojiId: string | number) =>
        new MdEscapedLink(
            `![${escapeMarkdown(emoji).toString()}](${escapeUrl(`tg://emoji?id=${emojiId}`)})`,
        ),

    /**
     * Date-time entity with a default (ISO 8601, UTC) fallback text.
     * `date` is either a Date or a unix timestamp in seconds.
     */
    dateTime: (date: Date | number, format?: string) => {
        const unix = toUnixSeconds(date);
        const url = escapeUrl(dateTimeUrl(unix, format));
        return new MdEscapedLink(
            `![${escapeMarkdown(defaultDateTimeText(unix)).toString()}](${url})`,
        );
    },
    /** Curried date-time entity with a custom fallback text: `md.dateTimeText(date)('22:45')`. */
    dateTimeText: (date: Date | number, format?: string) => {
        const url = escapeUrl(dateTimeUrl(toUnixSeconds(date), format));
        return (text: MdLinkInput, ...values: MdLinkValue[]) =>
            processLinkInput(s => `![${s}](${url})`, text, ...values);
    },

    // Code entities escape only ` and \ (spec note 2) and can't contain other entities.
    inlineCode: (code: MdCodeInput, ...values: MdCodeValue[]) =>
        new MdEscapedCode(`\`${getCodeText(code, values, 'code')}\``),
    codeBlock: (code: string, lang?: string) => {
        assertNotEntity(code, 'pre');
        assertNotEntity(lang, 'pre');
        const language = lang === undefined ? '' : escapeCode(lang);
        const fence = '```';
        return new MdEscapedCode(
            `${fence}${language}\n${escapeCode(String(code))}\n${fence}`,
            true,
            true,
        );
    },

    // Blockquotes can't be nested inside any other entity, including another blockquote,
    // and they can't contain a pre/code entity (the '>' prefixes would leak into it).
    blockQuote: (text: MdQuoteInput, ...values: MdQuoteValue[]) => {
        const fragment = getQuoteText(text, values);
        const quoted = fragment.text
            .split('\n')
            .map(line => `>${line}`)
            .join('\n');
        return new MdEscapedQuote(quoted, true, true, fragment.containsLink);
    },
    expandableBlockQuote: (text: MdQuoteInput, ...values: MdQuoteValue[]) => {
        const fragment = getQuoteText(text, values);
        const lines: string[] = fragment.text.split('\n');
        const firstLine: string = lines.shift() ?? '';
        let result = `**>${firstLine}`;
        for (const line of lines) {
            result += `\n>${line}`;
        }
        result += '||';
        return new MdEscapedQuote(result, true, true, fragment.containsLink);
    },
};

export function markdownV2(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = '';
    let pendingBlockEnd = false;
    let lastWasQuote = false;

    const append = (chunk: string, blockStart: boolean, isQuote = false): void => {
        if (chunk.length === 0) {
            return;
        }
        if (blockStart) {
            const trimmed = result.trimEnd();
            result = trimmed.length === 0 ? '' : `${trimmed}\n`;
        } else if (pendingBlockEnd && !chunk.startsWith('\n')) {
            result += '\n';
        }
        // Consecutive '>' lines are a single blockquote, so two adjacent quotes would
        // silently merge — and after an expandable quote the following '>' line keeps the
        // quote open, leaving its '||' terminator to be read as an unterminated spoiler
        // (the API rejects the whole message). An empty bold entity separates them, the
        // same idiom the spec uses to start an expandable quote right after another one.
        // An expandable quote already opens with '**>', so it carries its own separator.
        const needsSeparator =
            isQuote && lastWasQuote && !chunk.startsWith(EMPTY_BOLD_SEPARATOR);
        const separated = needsSeparator ? `${EMPTY_BOLD_SEPARATOR}${chunk}` : chunk;
        pendingBlockEnd = false;
        result = joinFragments(result, separated);
        // Whitespace between two quotes is trimmed away by the next block, so it must not
        // count as something that separates them on its own.
        if (chunk.trim().length > 0) {
            lastWasQuote = isQuote;
        }
    };

    for (let i = 0; i < strings.length; i++) {
        const stringPart = strings[i];
        if (stringPart !== undefined) {
            append(escapeMarkdown(stringPart).toString(), false);
        }
        if (i < values.length) {
            const value = values[i];
            if (isEscapedString(value)) {
                append(value.toString(), value.trimStart, value instanceof MdEscapedQuote);
                pendingBlockEnd = value.blockEnd;
            } else {
                append(escapeMarkdown(String(value)).toString(), false);
            }
        }
    }
    return result;
}
