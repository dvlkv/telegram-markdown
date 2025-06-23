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
    bold: (text: string) => escaped(`*${text}*`),
    italic: (text: string) => escaped(`_${text}_`),
    underline: (text: string) => escaped(`__${text}__`),
    strikethrough: (text: string) => escaped(`~${text}~`),
    spoiler: (text: string) => escaped(`||${text}||`),
    inlineUrl: (text: string, url: string) => escaped(`[${text}](${url})`),
    inlineMention: (text: string, userId: string) => escaped(`[${text}](tg://user?id=${userId})`),
    customEmoji: (emoji: string, emojiId: string) => escaped(`![${emoji}](tg://emoji?id=${emojiId})`),
    inlineCode: (text: string) => escaped(`\`${text}\``),
    codeBlock: (text: string, lang?: string) => escaped(`\`\`\`${lang ?? ''}\n${text}\n\`\`\``),
    blockQuote: (text: string) => escaped(text.split('\n').map(line => `>${line}`).join('\n')),
    expandableBlockQuote: (text: string) => {
        let lines = text.split('\n');
        let result = '';
        result += '**>' + lines.shift() + '\n';
        for (let line of lines) {
            result += '>' + line + '\n';
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