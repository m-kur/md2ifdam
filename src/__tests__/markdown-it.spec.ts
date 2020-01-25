import * as MarkdownIt from 'markdown-it';
import { MARKDOWN } from './markdown';

describe('markdown-it', () => {

    const md = new MarkdownIt().use(require('markdown-it-footnote')).enable(['link']);

    test('parse token', () => {
        const tokens = md.parse(MARKDOWN, {});
        for (let i = 0; i < tokens.length; i += 1) {
            console.warn(tokens[i]);
        }
    });

    test('parse token.type', () => {
        const tokens = md.parse(MARKDOWN, {});
        console.warn(tokens.map(token => [token.type, token.level, token.content]));
    });

    test('parse footnote', () => {
        const source =
            'パラグラフ [^注釈]\n' +
            '[^注釈]: 注釈内容\n';
        const tokens = md.parse(source, {});
        console.warn(tokens);
        console.warn(tokens[1].children);
        console.warn(tokens[6].children);
    });

    test('parse list', () => {
        const source =
            '平文\n' +
            '- リスト1\n' +
            '- リスト2\n' +
            '    - リスト2-1\n' +
            '- リスト3\n';
        const tokens = md.parse(source, {});
        console.warn(tokens);
    });

    test('parse H1, H2, H3', () => {
        const source =
            '# ヘッディング1\n' +
            '平文\n' +
            '## ヘッディング2\n' +
            '平文\n' +
            '### ヘッディング3\n';
        const tokens = md.parse(source, {});
        console.warn(tokens);
    });

    test('parse Edge', () => {
        const source =
            '- 平文[ラベル](遷移先) [^edge]\n' +
            '[^edge]: スタイル\n';
        const tokens = md.parse(source, {});
        console.warn(tokens);
        console.warn(tokens[3]);
        console.warn(tokens[3].children[1]);
        console.warn(decodeURIComponent(tokens[3].children[1].attrs[0][1]));
    });

    test('parse emoji', () => {
        const source =
            '@octocat :+1: **This PR looks great** - it\'s ready to merge! :shipit:\n';
        const tokens = md.parse(source, {});
        console.warn(tokens);
        console.warn(tokens[1]);
    });

});
