import * as _ from 'lodash';
import { GraphEdge, graphlib, Node } from 'dagre';

import {
    extractStyle,
    initGraph, Token, voidToken, createNode,
    parseInline, parseFootnoteInline,
    parseTokens, parseMarkdown,
} from '../markdownParser';
import { MARKDOWN } from './markdown';

const genToken = (obj: any): Token => {
    return _.defaults(obj, voidToken) as Token;
};

describe('createNode', () => {
    let graph: graphlib.Graph;

    beforeEach(() => {
        graph = initGraph({});
    });

    test('createNode 1', () => {
        const text = genToken({ type: 'text', content: 'DIAGRAM1' });
        const token = genToken({ children: [text] });
        const diagram = createNode(graph, 1, token);
        expect(diagram).toEqual({
            id: 'DIAGRAM1',
            ref: '',
            type: 'diagram',
            items: [{ type: 'text', depth: 0, text: 'DIAGRAM1' }],
        });
    });

    test('createNode 2', () => {
        const text = genToken({ type: 'text', content: 'SCREEN2' });
        const token = genToken({ children: [text] });
        const diagram = createNode(graph, 2, token);
        expect(diagram).toEqual({
            id: 'SCREEN2',
            ref: '',
            type: 'screen',
            items: [{ type: 'text', depth: 0, text: 'SCREEN2' }],
        });
    });

    test('createNode 3', () => {
        const text = genToken({ type: 'text', content: 'OPERATION3' });
        const token = genToken({ children: [text] });
        const diagram = createNode(graph, 3, token);
        expect(diagram).toEqual({
            id: 'OPERATION3',
            ref: '',
            type: 'operation',
            items: [{ type: 'text', depth: 0, text: 'OPERATION3' }],
        });
    });

    test('createNode duplicated', () => {
        const text = genToken({ type: 'text', content: 'SCREEN2' });
        const token = genToken({ children: [text] });
        createNode(graph, 2, token);
        createNode(graph, 2, token);
        createNode(graph, 2, token);
        expect(graph.nodes()).toEqual(['SCREEN2', 'SCREEN2 [1]', 'SCREEN2 [2]']);
    });

    test('createNode ref', () => {
        const text = genToken({ type: 'text', content: 'SCREEN2' });
        const footnote = genToken({ type: 'footnote_ref', meta: { label: 'sc2' } });
        const token = genToken({ children: [text, footnote] });
        const diagram = createNode(graph, 2, token);
        expect(diagram).toEqual({
            id: 'SCREEN2',
            ref: 'sc2',
            type: 'screen',
            items: [{ type: 'text', depth: 0, text: 'SCREEN2' }],
        });
    });
});

describe('parseInline', () => {
    let graph: graphlib.Graph;
    let node: Node;
    let edge: GraphEdge;

    beforeEach(() => {
        graph = initGraph({});
        graph.setNode('SCREEN1', {
            id: 'SCREEN1',
            ref: 'sc1',
            type: 'screen',
            items: [{ type: 'text', depth: 0, text: 'SCREEN1' }],
        });
        graph.setNode('SCREEN2', {
            id: 'SCREEN2',
            ref: 'sc2',
            type: 'screen',
            items: [{ type: 'text', depth: 0, text: 'SCREEN2' }],
        });
        graph.setEdge('SCREEN2', 'SCREEN1', { label: '', ref: 'eg1' }, '(SCREEN2)[](SCREEN1)');
        node = graph.node('SCREEN1');
        edge = graph.edge(graph.edges()[0]);
    });

    test('parseInline text', () => {
        const text = genToken({ type: 'text', content: 'Lorem ipsum' });
        const token = genToken({ children: [text] });
        parseInline(graph, node, token);
        expect(node.items[1]).toEqual({ type: 'text', depth: 0, text: 'Lorem ipsum' });
    });

    test('parseInline multi line', () => {
        const text1 = genToken({ type: 'text', content: 'Lorem ipsum' });
        const softbreak = genToken({ type: 'softbreak' });
        const text2 = genToken({ type: 'text', content: 'dolor sit amet' });
        const token = genToken({ children: [text1, softbreak, text2] });
        parseInline(graph, node, token);
        expect(node.items[1]).toEqual({ type: 'text', depth: 0, text: 'Lorem ipsum' });
        expect(node.items[2]).toEqual({ type: 'text', depth: 0, text: 'dolor sit amet' });
    });

    test('parseInline extract edge', () => {
        const open = genToken({ type: 'link_open', attrs: [['href', 'SCREEN2']] });
        const text = genToken({ type: 'text', content: 'Lorem ipsum' });
        const close = genToken({ type: 'link_close' });
        const footnote = genToken({ type: 'footnote_ref', meta: { label: 'eg2' } });
        const token = genToken({ children: [open, text, close, footnote] });
        parseInline(graph, node, token);
        const edgeObj = graph.edges()[1];
        expect(edgeObj.v).toBe('SCREEN1');
        expect(edgeObj.w).toBe('SCREEN2');
        expect(graph.edge(edgeObj).label).toBe('Lorem ipsum');
        expect(graph.edge(edgeObj).ref).toBe('eg2');
    });

    test('parseInline openbrace', () => {
        const text = genToken({ type: 'text', content: '@' });
        const token = genToken({ children: [text], level: 3 });
        parseInline(graph, node, token);
        expect(node.items[1]).toEqual({ type: 'text', depth: 1, text: '@ {' });
    });

    test('extractStyle', () => {
        const style = extractStyle('stroke-width: 2;');
        expect(style).toEqual({ 'stroke-width': '2' });
        const style2 = extractStyle('stroke-width: 2;fill: red; stroke:black;');
        expect(style2).toEqual({ 'stroke-width': '2', fill: 'red', stroke: 'black' });
        const style3 = extractStyle('stroke-width=2');
        expect(style3).toEqual({});
    });

    test('parseFootnoteInline', () => {
        const text = genToken({ type: 'text', content: 'stroke-width: 2;' });
        const token = genToken({ children: [text] });
        parseFootnoteInline(graph, 'sc1', token);
        expect(node.style).toEqual({ 'stroke-width': '2' });
    });
});

describe('markdownParser', () => {
    let graph: graphlib.Graph;

    beforeEach(() => {
        graph = initGraph({});
    });

    const text = genToken({ type: 'text', content: 'SCREEN1' });
    const ref = genToken({ type: 'footnote_ref', meta: { label: 'sc1' } });
    const tokensGenNode = [
        genToken({ type: 'heading_open', markup: '##' }),
        genToken({ type: 'inline', children: [text, ref] }),
        genToken({ type: 'heading_close' }),
    ];

    test('parseTokens node', () => {
        parseTokens(graph, tokensGenNode);
        expect(graph.node('SCREEN1')).toEqual({
            id: 'SCREEN1',
            type: 'screen',
            ref: 'sc1',
            items: [{ type: 'text', depth: 0, text: 'SCREEN1' }],
        });
    });

    test('parseTokens hr', () => {
        const tokens = [
            genToken({ type: 'hr' }),
        ];
        parseTokens(graph, _.concat(tokensGenNode, tokens));
        expect(graph.node('SCREEN1').items[1]).toEqual({ type: 'hr', depth: 0, text: '' });
    });

    test('parseToken brace', () => {
        const text1 = genToken({ type: 'text', content: '@ brace' });
        const text2 = genToken({ type: 'text', content: 'item' });
        const tokens = [
            genToken({ type: 'bullet_list_open' }),
            genToken({ type: 'list_item_open', level: 1 }),
            genToken({ type: 'paragraph_open', level: 2 }),
            genToken({ type: 'inline', level: 3, children: [text1] }),
            genToken({ type: 'paragraph_close', level: 2 }),
            genToken({ type: 'bullet_list_open', level: 2 }),
            genToken({ type: 'list_item_open', level: 3 }),
            genToken({ type: 'paragraph_open', level: 4 }),
            genToken({ type: 'inline', level: 5, children: [text2] }),
            genToken({ type: 'paragraph_close', level: 4 }),
            genToken({ type: 'list_item_close', level: 3 }),
            genToken({ type: 'bullet_list_close', level: 2 }),
            genToken({ type: 'list_item_close', level: 1 }),
            genToken({ type: 'bullet_list_close' }),
        ];
        parseTokens(graph, _.concat(tokensGenNode, tokens));
        expect(graph.node('SCREEN1').items[1]).toEqual({ type: 'text', depth: 1, text: '@ brace {' });
        expect(graph.node('SCREEN1').items[2]).toEqual({ type: 'text', depth: 2, text: 'item' });
        expect(graph.node('SCREEN1').items[3]).toEqual({ type: 'text', depth: 0, text: '}', close: true });
    });

    test('parseToken footnote', () => {
        const text = genToken({ type: 'text', content: 'fill: red;' });
        const tokens = [
            genToken({ type: 'footnote_block_open' }),
            genToken({ type: 'footnote_open', meta: { label: 'sc1' } }),
            genToken({ type: 'paragraph_open', level: 1 }),
            genToken({ type: 'inline', level: 2, children: [text] }),
            genToken({ type: 'footnote_anchor', level: 0, meta: { label: 'sc1' } }),
            genToken({ type: 'paragraph_close', level: 1 }),
            genToken({ type: 'footnote_close' }),
            genToken({ type: 'footnote_block_close' }),
        ];
        parseTokens(graph, _.concat(tokensGenNode, tokens));
        expect(graph.node('SCREEN1').style).toEqual({ fill: 'red' });
        console.log(graph.node('SCREEN1').items);
        expect(graph.node('SCREEN1').items.length).toBe(1);
    });
});

describe('parser', () => {
    test('parseMarkdown', () => {
        const graph = parseMarkdown(MARKDOWN, {});
        expect(graph.nodeCount()).toBeGreaterThan(1);
        expect(graph.edgeCount()).toBeGreaterThan(1);
    });
});
