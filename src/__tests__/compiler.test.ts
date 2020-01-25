import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as d3 from 'd3';
import { MARKDOWN } from './markdown';
import { compile } from '../compiler';

describe('md2ifdam', () => {
    test('compile', async () => {
        const svg = d3.select<Document, {}>(compile(MARKDOWN)).select<SVGSVGElement>('svg');
        expect(_.parseInt(svg.attr('width'))).toBeGreaterThan(100);
        expect(_.parseInt(svg.attr('height'))).toBeGreaterThan(100);
        expect(svg.selectAll('rect').size()).toBeGreaterThan(5);
        expect(svg.selectAll('path').size()).toBeGreaterThan(5);
        expect(svg.selectAll('text').size()).toBeGreaterThan(20);
        fs.writeFileSync(
            path.resolve(__dirname, 'markdown.svg'),
            new Buffer('<?xml version="1.0" encoding="UTF-8"?>' + svg.node()!.outerHTML),
        );
    });
});
