import * as _ from 'lodash';
import * as d3 from 'd3';
import { graphlib, Node } from 'dagre';
import { JSDOM } from 'jsdom';
import {
    applyStyles, appendText, appendHorizontalRule,
    nodeFactory, render, adjustHorizontalRule,
} from '../graphRenderer';

describe('append items', () => {
    let doc: Document;
    let g: d3.Selection<SVGGElement, any, null, undefined>;

    beforeAll(() => {
        doc = new JSDOM().window.document;
        g = d3.select<Document, {}>(doc)
            .select<HTMLBodyElement>('body')
            .append<SVGSVGElement>('svg')
            .append<SVGGElement>('g');
    });

    beforeEach(() => {
        g.selectAll('*').remove();
        g.append<SVGDefsElement>('defs');
    });

    test('applyStyles 1', () => {
        const target = g.append<SVGRectElement>('rect');
        applyStyles(target, { fill: 'red' }, { fill: 'black', stroke: 'blue' });
        expect(target.style('fill')).toBe('red');
        expect(target.style('stroke')).toBe('blue');
    });

    test('applyStyles filtering', () => {
        const target = g.append<SVGRectElement>('rect');
        applyStyles(target, { fill: 'red' }, { stroke: 'blue' });
        expect(target.style('fill')).toBe('');
        expect(target.style('stroke')).toBe('blue');
    });

    test('applyStyles no styles', () => {
        const target = g.append<SVGRectElement>('rect');
        applyStyles(target, {}, { stroke: 'blue' });
        expect(target.style('fill')).toBe('');
        expect(target.style('stroke')).toBe('blue');
    });

    test('parseInline', () => {
        const rect = appendText(
            g, 0, { type: 'text', depth: 0, text: 'Lorem ipsum dolor sit amet,' },
            { 'font-size': '16', margin: 20 }, {});
        const text = g.selectAll('text');
        expect(text.size()).toBe(1);
        expect(text.attr('dominant-baseline')).toBe('text-before-edge');
        expect(text.style('font-size')).toBe('16');
        expect(rect).toEqual({ x: 20, y: 0, width: 214, height: 20 });
    });

    test('appendHorizontalRule', () => {
        const node: Node = { x: 0, y: 0, width: 0, height: 0, style: { stroke: 'red', 'stroke-width': '3' } };
        const rect = appendHorizontalRule(g, 95, node.style);
        const line = g.select('line');
        expect(line.size()).toBe(1);
        expect(line.attr('x1')).toBe('0');
        expect(line.attr('y1')).toBe('100');
        expect(line.attr('x2')).toBe('0');
        expect(line.attr('y2')).toBe('100');
        expect(line.style('stroke')).toBe('red');
        expect(line.style('stroke-width')).toBe('3');
        expect(rect).toEqual({ x: 0, y: 95, width: 0, height: 10 });

        adjustHorizontalRule(g, 258);
        const line2 = g.select('line');
        expect(line2.attr('x2')).toBe('258');
    });

    test('nodeFactory', () => {
        const node = { x: 0, y: 0, width: 0, height: 0 };
        _.set(node, 'type', 'screen');
        _.set(node, 'items', [
            { type: 'paragraph', depth: 0, text: 'Lorem ipsum dolor sit amet,' },
        ]);
        g.append<SVGGElement>(() => nodeFactory(doc, node));
    });

    test('render', () => {
        const graph = new graphlib.Graph({ multigraph: true });
        graph.setGraph({});
        graph.setDefaultEdgeLabel(() => ({}));
        graph.setNode('Lorem-screen', {
            id: 'Lorem-screen',
            type: 'screen',
            items: [{ type: 'paragraph', depth: 0, text: 'Lorem ipsum dolor sit amet,' }],
        });
        graph.setNode('Hello-op', {
            id: 'Hello-op',
            type: 'operation',
            items: [{ type: 'paragraph', depth: 0, text: 'Hello World!' }],
        });
        graph.setNode('Good-bye-op', {
            id: 'Good-bye-op',
            type: 'operation',
            items: [{ type: 'paragraph', depth: 0, text: 'Good bye!' }],
        });
        graph.setEdge('Lorem-screen', 'Hello-op', {}, '(Lorem-screen)[](Hello-op)');
        graph.setEdge('Lorem-screen', 'Good-bye-op', {}, '(Lorem-screen)[](Good-bye-op)');

        render(doc, 'svg g', graph);
    });
});
