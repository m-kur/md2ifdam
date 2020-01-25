import * as _ from 'lodash';
import { GraphEdge, GraphLabel, graphlib, Node } from 'dagre';
import * as MarkdownIt from 'markdown-it';

type NodeItem = { type: string, depth: number, text: string, close?: boolean };

// from Markdown-it token
export interface Token {
    type: string;
    markup: string;
    content: string;
    level: number;
    children: Token[] | null;
    meta: { label: string } | null;
    attrs: string[][] | null;
}

export const createNode = (graph: graphlib.Graph, depth: number, inline: Token): Node | null => {
    const NODE_TYPE = ['void', 'diagram', 'screen', 'operation'];
    if (depth < NODE_TYPE.length && inline.children) {
        let id = '';
        let ref = '';
        inline.children.forEach((token) => {
            if (token.type === 'text') {
                id = _.trim(token.content);
            } else if (token.type === 'footnote_ref' && token.meta) {
                ref = token.meta.label;
            }
        });
        // Protect duplicates
        let key = id;
        const count = graph.nodes().filter(v => key === _.get(graph.node(v), 'id')).length;
        if (count !== 0) {
            key = `${id} [${count}]`;
        }
        graph.setNode(key, {
            id,
            ref,
            type: NODE_TYPE[depth],
            items: [{ type: 'text', depth: 0, text: key }],
        });
        return graph.node(key);
    }
    return null;
};

const pushNodeItem = (node: Node, item: NodeItem): void => {
    const items: NodeItem[] = node.items || [];
    items.push(item);
    node.items = items;
};

const getDepth = (token: Token): number => {
    return token.level > 0 ? (token.level - 1) / 2 : 0;
};

export const voidToken = {
    type: 'void',
    markup: '',
    content: '',
    level: 0,
    children: null,
    meta: null,
    attrs: null,
};

// return false=normal, true=open brace (="@<text> {")
export const parseInline = (graph: graphlib.Graph, node: Node, inline: Token): boolean => {
    let text = '';
    const link = { w: '', label: '', ref: '' };

    const append = () => {
        if (text) {
            pushNodeItem(node, { text, type: 'text', depth: getDepth(inline) });
        }
        if (link.w) {
            const v: string = node.id;
            const w = link.w;
            const label = link.label;
            graph.setEdge(v, w, { label, ref: link.ref }, `(${v})[${label}](${w})`);
        }
        text = '';
        link.w = ''; link.label = ''; link.ref = '';
    };

    inline.children!.reduce(
        (previous, current) => {
            switch (current.type) {
                case 'text':
                    const s = _.trim(current.content);
                    if (previous.type === 'link_open') {
                        link.label += s;
                    } else {
                        text += s;
                    }
                    break;
                case 'footnote_ref':
                    if (previous.type === 'link_open') {
                        link.ref = current.meta!.label;
                    }
                    break;
                case 'link_open':
                    link.w = decodeURIComponent(current.attrs![0][1]);
                    return current;
                case 'softbreak':
                    append();
                    return current;
            }
            return previous;
        },
        voidToken,
    );
    const openBrace = inline.level > 0 && text.startsWith('@');
    if (openBrace) {
        text += ' {';
    }
    append();
    return openBrace;
};

const findGraphObjectByRef = (graph: graphlib.Graph, ref: string): Node | GraphEdge | null => {
    for (const id of graph.nodes()) {
        const node = graph.node(id);
        if (node.ref === ref) {
            return node;
        }
    }
    for (const obj of graph.edges()) {
        const edge = graph.edge(obj);
        if (edge.ref === ref) {
            return edge;
        }
    }
    return null;
};

export const extractStyle = (text: string): { [key: string]: string } => {
    const pattern = /^\s*([^;]+):\s*([^:]+);/;
    const result = {};
    for (let str = text; str.length > 0;) {
        const re = pattern.exec(str);
        if (!re) {
            break;
        }
        _.set(result, re[1], re[2]);
        str = str.slice(re[0].length);
    }
    return result;
};

export const parseFootnoteInline = (graph: graphlib.Graph, ref: string, inline: Token): void => {
    const target = findGraphObjectByRef(graph, ref);
    if (target && inline.children) {
        inline.children.forEach((token) => {
            if (token.type === 'text') {
                target.style = _.defaults({}, target.style, extractStyle(token.content));
            }
        });
    }
};

export const parseTokens = (graph: graphlib.Graph, tokens: Token[]): void => {
    let node: Node | null = null;
    const listStack: [Token, boolean][] = [];
    tokens.reduce(
        (previous, current) => {
            switch (current.type) {
                case 'heading_open':
                case 'heading_close':
                case 'footnote_open':
                case 'footnote_close':
                    return current;
            }
            if (current.type === 'inline' && previous.type === 'heading_open') {
                node = createNode(graph, previous.markup.length, current);
                return previous;
            }
            if (node) {
                switch (current.type) {
                    case 'inline':
                        if (previous.type === 'footnote_open') {
                            parseFootnoteInline(graph, previous.meta!.label, current);
                            break;
                        }
                        const openBrace = parseInline(graph, node, current);
                        const last1 = _.last(listStack);
                        if (last1) {
                            // has already appended open brace
                            last1[1] = openBrace;
                        }
                        break;
                    case 'hr':
                        pushNodeItem(node, { type: 'hr', depth: 0, text: '' });
                        break;
                    case 'list_item_open':
                        listStack.push([current, false]);
                        break;
                    case 'list_item_close':
                        const last2 = listStack.pop();
                        if (last2 && last2[1]) {
                            // append close brace
                            pushNodeItem(node, { type: 'text', depth: getDepth(current), text: '}', close: true });
                        }
                        break;
                }
            }
            return previous;
        },
        voidToken,
    );
};

export const initGraph = (config: GraphLabel): graphlib.Graph => {
    const graph = new graphlib.Graph({ multigraph: true });
    graph.setGraph(config);
    graph.setDefaultNodeLabel(() => ({}));
    graph.setDefaultEdgeLabel(() => ({}));
    return graph;
};

export const parseMarkdown = (source: string, config: GraphLabel): graphlib.Graph => {
    const graph = initGraph(config);
    const md = new MarkdownIt().enable(['list']).use(require('markdown-it-footnote'));
    parseTokens(graph, md.parse(source, {}));
    return graph;
};
