import * as _ from 'lodash';
import * as d3 from 'd3';
import { graphlib, Node, GraphEdge, layout } from 'dagre';
import { getComputedTextWidth, getTextHeight, openFont, FontFace } from './fontUtils';

// Duck-typing between Node and GraphEdge
type DatumObject = { [key: string]: any; };
type NodeItem = { type: string, depth: number, text: string, close?: boolean };
type RootG = d3.Selection<SVGGElement, any, null, undefined>;
type Target<T extends SVGGraphicsElement> = d3.Selection<T, any, null, undefined>;

const CSS_NAME_DICTIONARY = [
    { in: 'font-fill', out: 'fill' },
    { in: 'font-stroke', out: 'stroke' },
];

const getCSSName = (name: string): string => {
    const hit = _.find(CSS_NAME_DICTIONARY, (def) => { return def.in === name; });
    return hit ? hit.out : name;
};

export const applyStyles = <T extends SVGGraphicsElement>
        (target: Target<T>, style: DatumObject, ...defaultStyles: DatumObject[]): DatumObject => {
    const styles = _.defaults({}, ...defaultStyles);
    const applying = _.defaults(style, styles);
    _.forOwn(applying, (value, name) => {
        if (_.has(styles, name)) {
            target.style(getCSSName(name), value);
        }
    });
    return applying;
};

const OSAKA_REGULAR = { 'font-family': 'Osaka', 'font-style': 'Regular', 'font-weight': 400 };

// Write text left justified. The return value is the BBOX of the rendered text.
export const appendText = (g: RootG, y: number, item: NodeItem,
                           style: DatumObject, defaultStyles: DatumObject): SVGRect => {
    const text = g.append<SVGTextElement>('text')
        .text(item.text)
        .attr('dominant-baseline', 'text-before-edge');
    const applying = applyStyles(text, style, defaultStyles, OSAKA_REGULAR, {
        'font-size': '12',
        'font-fill': 'black',
        'font-stroke': 'none',
    });

    const indent = item.depth < 0 ? 0 : item.depth + 1;
    const margin = applying.margin | 0;
    text.attr('x', indent * margin)
        .attr('y', y);

    // When margin is set at list time. The hyphen does not fall within the text width
    if (!item.close && margin > 0 && item.depth > 0) {
        text.append<SVGTSpanElement>('tspan')
            .text('-')
            .attr('x', (indent - 1) * margin)
            .attr('y', y);
    }
    let font = openFont(applying as FontFace);
    if (!font) {
        font = openFont(OSAKA_REGULAR);
    }
    if (!font) {
        throw new Error(`font not found. Setting is ${JSON.stringify(applying)}`);
    }
    const fontSize = _.parseInt(_.get(applying, 'font-size'));
    const fontHeight = getTextHeight(font!, fontSize);
    return { y, x: margin * indent, width: getComputedTextWidth(font!, fontSize, item.text) , height: fontHeight };
};

export const appendHorizontalRule = (g: RootG, y: number, style: DatumObject): SVGRect => {
    const height = style.margin | 10;
    const hr = g.append<SVGLineElement>('line')
        .attr('x1', 0)
        .attr('y1', y + height / 2)
        .attr('x2', 0) // Adjust the width later
        .attr('y2', y + height / 2);
    applyStyles(hr, style, {
        stroke: 'black',
        'stroke-width': '1',
        'stroke-dasharray': 'none',
    });
    return { y, height,  x: 0, width: 0 };
};

export const adjustHorizontalRule = (g: RootG, width: number): void => {
    g.selectAll('line').attr('x2', width);
};

interface elementFactory<Datum> {
    (doc: Document, datum: Datum): SVGGElement;
}

const MARGIN = 10;

export const nodeFactory: elementFactory<Node> = (doc, node) => {
    const element = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    const nodeType = node.type || 'unknown';
    const g = d3.select<SVGGElement, {}>(element).datum(node).classed(nodeType, true);
    let outerRect: d3.Selection<SVGRectElement, any, null, undefined> | null = null;

    if (nodeType !== 'diagram') {
        outerRect = g.append<SVGRectElement>('rect')
            .attr('x', 0)
            .attr('y', 0);
        applyStyles(outerRect, node.style, {
            fill: 'white',
            stroke: 'black',
            'stroke-width': '1',
            'stroke-dasharray': 'none',
        });
    }

    const cx: SVGRect[] = [];
    let last: SVGRect = { x: 0, y: MARGIN, width: 0, height: 0 };

    const items: NodeItem[] = node.items || [];
    for (const item of items) {
        const style = _.defaults({}, node.style, { margin: MARGIN });
        if (item.type === 'paragraph' || item.type === 'text') {
            last = appendText(g, last.y + last.height, item, style, {});
            cx.push(last);
        } else if (item.type === 'hr' && nodeType  !== 'diagram') {
            last = appendHorizontalRule(g, last.y + last.height, style);
            cx.push(last);
        }
    }

    let width = d3.max(cx, rect => rect.x + rect.width + MARGIN) || 0;
    let height = last.y + last.height + MARGIN;
    if (nodeType === 'screen') {
        width = _.max([width, 200])!;
        height = _.max([height, 120])!;
    }

    if (nodeType !== 'diagram') {
        outerRect!.attr('width', width).attr('height', height);
        if (nodeType === 'operation') {
            outerRect!.attr('rx', 10).attr('ry', 10);
        }
        adjustHorizontalRule(g, width);
    }

    node.width = width;
    node.height = height;

    return element;
};

const edgeLabelFactory: elementFactory<GraphEdge> = (doc, graphEdge) => {
    const element = doc.createElementNS('http://www.w3.org/2000/svg', 'g');

    const label = graphEdge.label || '';
    const g = d3.select<SVGGElement, {}>(element)
        .datum(graphEdge)
        .append<SVGGElement>('g');
    const background = g.append<SVGRectElement>('rect').attr('x', 0).attr('y', 0);
    applyStyles(background, graphEdge.style, { fill: 'white' });
    const rect = appendText(g, 0, { type: 'void', text: label, depth: 0 }, graphEdge.style, { 'font-size': '9' });
    background.attr('width', rect.width).attr('height', rect.height);
    graphEdge.width = rect.width;
    graphEdge.height = rect.height;
    return element;
};

const createShapes = <Datum extends DatumObject>(doc: Document, g: RootG, shapeClass: string,
                                                 data: Datum[], factory: elementFactory<Datum>): void => {
    g.selectAll<SVGGElement, Datum>(`.${shapeClass}`)
        .data<Datum>(data)
        .enter()
        .append<SVGGElement>(datum => factory(doc, datum))
        .classed(shapeClass, true);
};

const translateShapes = <Datum extends DatumObject>(root: RootG, shapeClass: string): void => {
    // Move node shapes and edge labels
    root.selectAll<SVGGElement, Datum>(`.${shapeClass}`)
        .attr('transform', (datum) => {
            const { x, y, width, height } = datum;
            return `translate(${x - width / 2}, ${y - height / 2})`;
        });
};

const appendMarker = (g: RootG, color: string): void => {
    // Define reusing parts
    g.select<SVGDefsElement>('defs')
        .append<SVGMarkerElement>('marker')
        .attr('id', `arrowhead-${color}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 8)
        .attr('markerHeight', 6)
        .attr('markerUnits', 'strokeWidth')
        .attr('orient', 'auto')
        .append<SVGPathElement>('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .style('fill', color);
};

const appendEdgePaths = (g: RootG, pathClass: string, graphEdges: GraphEdge[]): void => {
    const liner = d3.line<{ x: number, y: number}>()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveBundle.beta(1));

    // Draw edge paths
    g.selectAll<SVGGElement, GraphEdge>(`.${pathClass}`)
        .data<GraphEdge>(graphEdges)
        .enter()
        .append<SVGGElement>('g')
        .classed(pathClass, true)
        .append<SVGPathElement>('path')
        .attr('d', graphEdge => liner(graphEdge.points))
        .style('fill-opacity', '0')
        .each(function (graphEdge) {
            const target = d3.select<SVGPathElement, GraphEdge>(this);
            const applying = applyStyles(target, graphEdge.style, {
                stroke: 'black',
                'stroke-width': '1',
                'stroke-dasharray': 'none',
            });
            const color = applying.stroke;
            const selector = `#arrowhead-${color}`;
            target.attr('marker-end', `url(${selector})`);
            if (g.selectAll(selector).size() === 0) {
                appendMarker(g, color);
            }
        });
};

export const render = (doc: Document, selector: string, graph: graphlib.Graph): void => {
    const g = d3.select<Document, {}>(doc).select<SVGGElement>(selector);
    if (g.size() !== 1) {
        throw new Error(`selector '${selector}' is not for a SVGGElement.`);
    }
    const nodes = graph.nodes().map(v => graph.node(v));
    const graphEdges = graph.edges().map(v => graph.edge(v));
    const graphLabels = graphEdges.filter(e => _.get(e, 'label'));
    createShapes<Node>(doc, g, 'ifdam-node', nodes, nodeFactory);
    createShapes<GraphEdge>(doc, g, 'ifdam-edge-label', graphLabels, edgeLabelFactory);

    layout(graph);

    translateShapes<Node>(g, 'ifdam-node');
    translateShapes<GraphEdge>(g, 'ifdam-edge-label');

    appendEdgePaths(g, 'ifdam-edge-path', graphEdges);
};
