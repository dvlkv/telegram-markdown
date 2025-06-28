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
    constructor(public readonly text: string) {}

    toString() {
        return this.text;
    }
}

function escaped(text: string) {
    return new MdEscapedString(text);
}

export const md = {
    bold: (text: string) => escaped(`*${escapeMarkdown(text)}*`),
    italic: (text: string) => escaped(`_${escapeMarkdown(text)}_`),
    underline: (text: string) => escaped(`__${escapeMarkdown(text)}__`),
    strikethrough: (text: string) => escaped(`~${escapeMarkdown(text)}~`),
    spoiler: (text: string) => escaped(`||${escapeMarkdown(text)}||`),
    inlineUrl: (text: string, url: string) => escaped(`[${escapeMarkdown(text)}](${url})`),
    inlineMention: (text: string, userId: string) => escaped(`[${text}](tg://user?id=${userId})`),
    customEmoji: (emoji: string, emojiId: string) => escaped(`![${emoji}](tg://emoji?id=${emojiId})`),
    inlineCode: (text: string) => escaped(`\`${escapeMarkdown(text)}\``),
    codeBlock: (text: string, lang?: string) => escaped(`\`\`\`${lang ?? ''}\n${escapeMarkdown(text)}\n\`\`\``),
    blockQuote: (text: string) => escaped(text.split('\n').map(line => `>${escapeMarkdown(line)}`).join('\n')),
    expandableBlockQuote: (text: string) => {
        const lines = text.split('\n');
        let result = '';
        result += `**>${escapeMarkdown(lines.shift() ?? '')}\n`;
        for (const line of lines) {
            result += `>${escapeMarkdown(line)}\n`;
        }
        result += '||';
        return escaped(result);
    },
}

export function escapeMarkdown(text: string): MdEscapedString {
    return escaped(text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&'));
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
                result += value;
            } else {
                result += escapeMarkdown(value as string);
            }
        }
    }
    return result;
}