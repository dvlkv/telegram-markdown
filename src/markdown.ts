// *bold \*text*
// _italic \*text_
// __underline__
// ~strikethrough~
// ||spoiler||
// [inline URL](http://www.example.com/)
// [inline mention of a user](tg://user?id=123456789)
// ![👍](tg://emoji?id=5368324170671202286)
// `inline fixed-width code`
// ```
// pre-formatted fixed-width code block
// ```
// ```python
// pre-formatted fixed-width code block written in the Python programming language
// ```
// >Block quotation started
// >Block quotation continued
// >Block quotation continued
// >Block quotation continued
// >The last line of the block quotation
// **>The expandable block quotation started right after the previous block quotation
// >It is separated from the previous block quotation by an empty bold entity
// >Expandable block quotation continued
// >Hidden by default part of the expandable block quotation started
// >Expandable block quotation continued
// >The last line of the expandable block quotation with the expandability mark||

export class MdEscapedString {
    constructor(public readonly text: string, public readonly trimStart = false) {}

    toString() {
        return this.text;
    }
}

export class MdEscapedStringNestable extends MdEscapedString {
    get nestable() {
        return true;
    }
    
    constructor(text: string, trimStart = false) {
        super(text, trimStart);
    }
}

function escaped(text: string, trimStart = false) {
    return new MdEscapedString(text, trimStart);
}

function escapedNestable(text: string, trimStart = false) {
    return new MdEscapedStringNestable(text, trimStart);
}

function isEscapedString(value: unknown): value is MdEscapedString {
    return value instanceof MdEscapedString;
}

type MdInput = string | TemplateStringsArray | MdEscapedString;

type MdNestedValue = string | MdEscapedStringNestable;

function processMdInput(
    wrapper: (s: string) => string,
    textOrStrings: MdInput,
    ...values: MdNestedValue[]
): MdEscapedStringNestable {
    const fullText = getFullText(textOrStrings, values);
    return escapedNestable(wrapper(fullText));
}

function getFullText(text: MdInput, values: MdNestedValue[]): string {
    if (isEscapedString(text)) {
        return text.toString();
    } else if (Array.isArray(text)) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += escapeMarkdown(text[i] as string).toString();
            if (i < values.length) {
                const value = values[i];
                if (isEscapedString(value)) {
                    result += value.toString();
                } else {
                    result += escapeMarkdown(String(value)).toString();
                }
            }
        }
        return result;
    } else {
        return escapeMarkdown(text as string).toString();
    }
}

export const md = {
    bold: (text: MdInput, ...values: MdNestedValue[]) => processMdInput(s => `*${s}*`, text, ...values),
    italic: (text: MdInput, ...values: MdNestedValue[]) => processMdInput(s => `_${s}_`, text, ...values),
    underline: (text: MdInput, ...values: MdNestedValue[]) => processMdInput(s => `__${s}__`, text, ...values),
    strikethrough: (text: MdInput, ...values: MdNestedValue[]) => processMdInput(s => `~${s}~`, text, ...values),
    spoiler: (text: MdInput, ...values: MdNestedValue[]) => processMdInput(s => `||${s}||`, text, ...values),
    inlineUrl: (url: string) => (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(s => `[${s}](${url})`, text, ...values),
    inlineMention: (userId: string) => (text: MdInput, ...values: MdNestedValue[]) =>
        processMdInput(s => `[${s}](tg://user?id=${userId})`, text, ...values),
    customEmoji: (emoji: string, emojiId: string) => escapedNestable(`![${emoji}](tg://emoji?id=${emojiId})`),
    inlineCode: (text: MdInput, ...values: MdNestedValue[]) => processMdInput(s => `\`${s}\``, text, ...values),
    
    // Code block do not need to be escaped inside
    codeBlock: (code: string, lang?: string) => escapedNestable(`\u0060\u0060\u0060${lang ?? ''}\n${code}\n\u0060\u0060\u0060`, true),

    // Block quote and expandable block quote are not allowed to be nested inside any other formatting
    blockQuote: (text: MdInput, ...values: MdNestedValue[]) => {
        const fullText = getFullText(text, values);
        return escaped(fullText.split('\n').map(line => `>${line}`).join('\n'), true);
    },
    expandableBlockQuote: (text: MdInput, ...values: MdNestedValue[]) => {
        const fullText = getFullText(text, values);
        const lines: string[] = fullText.split('\n');
        const maybeFirstLine: string | undefined = lines.shift();
        const firstLine: string = maybeFirstLine ?? '';
        let result = `**>${firstLine}\n`;
        for (const line of lines) {
            result += `>${line}\n`;
        }
        result = result.trimEnd();
        result += '||\n';
        return escaped(result, true);
    }, 
};

export function escapeMarkdown(text: string): MdEscapedString {
    return escapedNestable(text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&'));
}

export function markdownV2(strings: TemplateStringsArray, ...values: unknown[]) {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
        const stringPart = strings[i];
        if (stringPart !== undefined) {
            result += escapeMarkdown(stringPart);
        }
        if (i < values.length) {
            const value = values[i];
            if (value instanceof MdEscapedString) {
                if (value.trimStart) {
                    result = result.trimEnd() + '\n';
                }
                result += value;
            } else {
                result += escapeMarkdown(String(value));
            }
        }
    }
    return result;
}