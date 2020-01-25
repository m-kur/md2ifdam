import * as fs from 'fs';
import { JSDOM } from 'jsdom';

import { parseMarkdown } from './markdownParser';
import { render } from './graphRenderer';
import * as d3 from 'd3';

export const appendSVGElement = (doc: Document): void => {
    d3.select<Document, {}>(doc)
        .select<HTMLBodyElement>('body')
        .append<SVGSVGElement>('svg')
        .attr('version', '1.1')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .append<SVGDefsElement>('defs');
};

export const adjustSVGElement = (doc: Document, width: number, height: number): void => {
    d3.select<Document, {}>(doc)
        .select<SVGSVGElement>(`svg`)
        .attr('width', width)
        .attr('height', height)
        .style('background', 'white');
};

export const compile = (source: string): Document => {
    const doc = new JSDOM().window.document;
    appendSVGElement(doc);
    const graph = parseMarkdown(source, { marginx: 30, marginy: 30 });
    render(doc, 'svg', graph);
    const info = graph.graph();
    adjustSVGElement(doc, info.width || 0, info.height || 0);
    return doc;
};

export const compileFile = (sourceFileName: string, outputFileName: string): number => {
    try {
        const buffer = fs.readFileSync(sourceFileName);
        const doc = compile(buffer.toString());
        const svg = '<?xml version="1.0" encoding="UTF-8"?>' + doc.body.innerHTML;
        fs.writeFileSync(outputFileName, svg);
    } catch (e) {
        console.error(e);
        return 500;
    }
    return 0;
};
