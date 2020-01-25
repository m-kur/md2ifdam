// import * as rimraf from 'rimraf';
import {
    // getFontDir,
    // parseFontFacesCSS, addFontFaces, downloadFont,
    openFont, getAllLocalFonts, findLocalFonts,
    getTextHeight, getComputedTextWidth,
    // NOTO_SANS_JP_CSS, NOTO_SANS_JP_400,
} from '../fontUtils';

// import { NOTOSANSJP } from './notosansjp';

describe('font management', () => {
    /*
    test('parseFontFacesCSS', () => {
        const fontFaces = parseFontFacesCSS(NOTOSANSJP);
        expect(fontFaces.length).toBe(6);
        expect(fontFaces[0]['font-family']).toBe('Noto Sans JP');
        expect(fontFaces[1]['font-style']).toBe('normal');
        expect(fontFaces[2]['font-weight']).toBe(400);
        expect(fontFaces[3].src).toBe('//fonts.gstatic.com/ea/notosansjp/v5/NotoSansJP-Medium.otf');
    });

    test('addFontFaces', async () => {
        const fontDir = getFontDir();
        rimraf.sync(fontDir);
        const fontFaces = await addFontFaces(NOTO_SANS_JP_CSS);
        expect(fontFaces.length).toBe(6);
        expect(fontFaces[0]['font-family']).toBe('Noto Sans JP');
        expect(fontFaces[1]['font-style']).toBe('normal');
        expect(fontFaces[2]['font-weight']).toBe(400);
        // src.protocol
        expect(fontFaces[3].src).toBe('http://fonts.gstatic.com/ea/notosansjp/v5/NotoSansJP-Medium.otf');
        await downloadFont(NOTO_SANS_JP_400);
        const font = await openFont(NOTO_SANS_JP_400);
        expect(font).not.toBeNull();
    });
    */
    test('getAllLocalFonts', () => {
        expect(getAllLocalFonts().length).toBeGreaterThan(0);
    });

    test('findLocalFonts 1', () => {
        const fonts = findLocalFonts({ 'font-family': 'Osaka', 'font-style': 'Regular', 'font-weight': 400 });
        expect(fonts.length).toBe(1);
    });

    test('findLocalFonts 2', () => {
        const fonts = findLocalFonts({ 'font-family': 'Osaka', 'font-style': '', 'font-weight': 0 });
        expect(fonts.length).toBe(2);
    });

    test('openFont', () => {
        const font = openFont({ 'font-family': 'Osaka', 'font-style': 'Regular', 'font-weight': 400 });
        expect(font).not.toBeNull();
        expect(font!.ascent).toBe(256);
        expect(font!.lineGap).toBe(43);
        expect(font!.descent).toBe(-64);
        expect(font!.unitsPerEm).toBe(256);
    });

    test('getTextHeight & getComputedTextWidth', () => {
        const font = openFont({ 'font-family': 'Osaka', 'font-style': 'Regular', 'font-weight': 400 });
        expect(font).not.toBeNull();
        expect(getTextHeight(font!, 12)).toBe(15);
        expect(getComputedTextWidth(font!, 12, 'こんにちは世界')).toBe(77);
    });

});
