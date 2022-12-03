import { requestUrl } from 'obsidian';

export class ParserResult {
    title: string
    author: string
    abstract: string
    url: string
    datePublished: Date
    
    constructor(title: string, authors: string, abstract: string, url: string, datePublished: Date) {
        this.title = title;
        this.author = authors;
        this.abstract = abstract;
        this.url = url;
        this.datePublished = datePublished
    }
}

export class Parser {
    urlPatternRegex: RegExp;
    parseCallback: (url: string, urlPatternRegex: RegExp) => Promise<ParserResult | null>
    parse(url: string) {
        return this.parseCallback(url, this.urlPatternRegex)
    } 
    constructor(urlPatternRegex: RegExp, parseCallback: (url: string, urlPatternRegex: RegExp) => Promise<ParserResult | null>){
        this.urlPatternRegex = urlPatternRegex;
        this.parseCallback = parseCallback;
    }
}

const registeredParsers: Parser[] = [] 
function registerParser(parser: Parser) {
    registeredParsers.push(parser);
}

registerParser(new Parser(
    /(https?:\/\/)?arxiv\.org\/(abs)|(pdf)\/\d{4}\.\d{5}(.pdf)?/,
    async (url: string, urlPatternRegex: RegExp) => {
        if (url.endsWith("pdf")) {
            url = url.slice(0, url.length - 3);
            url = url.replace("/pdf/", "/abs/");
        }
        const dom = await getSourceAsDOM(url);
        const contentElement = dom.getElementById("content-inner");
        let title = contentElement?.getElementsByClassName("title")[0].textContent;
        let authors = contentElement?.getElementsByClassName("authors")[0].textContent;
        let abstract = contentElement?.getElementsByClassName("abstract")[0].innerHTML;
        let date = contentElement?.getElementsByClassName("dateline")[0].textContent;

        if (title == null || authors == null || abstract == null || date == null) {
            return null;
        }
        title = title.trim().slice("Title:".length).trim();
        authors = authors.trim().slice("Authors:".length).trim();
        date = date.trim().slice("Submitted on".length).trim().split(" ").slice(0, 3).join(" ")

        abstract = abstract.trim().replace(/\r?\n|\r/g, ' ').replace(/<\/?br>/g, "\n");
        abstract = abstract.slice('<span class="descriptor">Abstract:</span>'.length).trim();
        abstract = abstract.replace(/<a.*href="(.*)".*>(.*)<\/a>/g, "[$2]($1)");

        const dateTime = Date.parse(date);
        const datePublished = new Date(dateTime);
        return new ParserResult(title, authors, abstract, url, datePublished);
    }
));

registerParser(new Parser(
    /(https?:\/\/)?openreview\.net\/forum\?id=([a-zA-Z0-9]{10})(&.*)?/,
    async (url: string, urlPatternRegex: RegExp) => {
        const id = urlPatternRegex.exec(url)?.at(2);

        if (id == null) {
            return null;
        }
        
        const dom = await getSourceAsDOM(url);
        url = "https://openreview.net/forum?id=" + id;
        const contentElement = dom.getElementById("content");
        let title = contentElement?.getElementsByClassName("note_content_title")[0].textContent;
        let authors = contentElement?.getElementsByClassName("meta_row")[0].textContent;
        const potentatialAbstractContainers = contentElement?.getElementsByClassName("note-content")[0].children;

        if (potentatialAbstractContainers == null) {return null;}
        
        let abstract: string | null = "";
        for (let i=0; i<potentatialAbstractContainers.length; i++) {
            if (potentatialAbstractContainers[i].children[0].textContent == "Abstract:") {
                abstract = potentatialAbstractContainers[i].children[1].textContent;
                break;
            }
        }
        let date = contentElement?.getElementsByClassName("meta_row")[1].textContent;

        if (title == null || authors == null || abstract == null || date == null) {
            return null;
        }
        date = date.trim().slice("Published:".length).trim().split(" ").slice(0, 3).join(" ");
        title = title.trim();
        authors = authors.trim();

        abstract = abstract.trim().replace(/\r?\n|\r/g, ' ').replace(/<\/?br>/g, "\n");
        abstract = abstract.replace(/<a.*href="(.*)".*>(.*)<\/a>/g, "[$2]($1)");

        const dateTime = Date.parse(date);
        const datePublished = new Date(dateTime);
        return new ParserResult(title, authors, abstract, url, datePublished);
    }
));



async function getSourceAsDOM(url: string)
{
    const html = await requestUrl(url).text;
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");      
}


export function getParser(url: string) : Parser | undefined {
    for (let i=0; i<registeredParsers.length; i++){
        const parser = registeredParsers[i];
        if ((new RegExp(parser.urlPatternRegex).test(url))) {
            return parser;
        }
    }
    return undefined;
}