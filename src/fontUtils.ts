// import * as fs from 'fs';
// import * as path from 'path';
import * as _ from 'lodash';
// import axios from 'axios';
// import { URL } from 'url';
import { openSync, Font } from 'fontkit';
/*
const REG_FONT_FACE = /@font-face\s*{[^}]+}/g;

const REG_FONT_CSS = {
    'font-family': /\s*font-family:\s*'([^']+)';/,
    'font-style': /\s*font-style:\s*(\w+);/,
    'font-weight': /\s*font-weight:\s*(\w+);/,
    src: /\s*src:[^;]*url\(([^)]+\.(woff2|woff|otf|ttf))\)[^;]*;/,
};
*/
export type FontFace = {
    'font-family': string,
    'font-style': string,
    'font-weight': number,
    postscriptName?: string,
    src?: string,
    localized?: string,
};
/*
export const NOTO_SANS_JP_CSS = 'http://fonts.googleapis.com/earlyaccess/notosansjp.css';

export const NOTO_SANS_JP_400 = {
    'font-family': 'Noto Sans JP',
    'font-style': 'normal',
    'font-weight': 400,
};

export const parseFontFacesCSS = (css: string): FontFace[] => {
    const fontFaces = css.match(REG_FONT_FACE);
    if (fontFaces) {
        return fontFaces.map((fontFace) => {
            const result = {};
            _.forOwn(REG_FONT_CSS, (re, prop) => {
                const hit = fontFace.match(re) || ['void', ''];
                _.set(result, prop, hit[1]);
            });
            return result as FontFace;
        });
    }
    return [];
};

export const getFontDir = (): string => {
    const home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
    return path.resolve(home || '', '.md2ifdam');
};

const getLockFileName = (): string => {
    return path.resolve(getFontDir(), 'font-faces.json');
};

let fontFaces: FontFace[] | null = null;

const initFontDir = (): FontFace[] => {
    if (fontFaces) {
        return fontFaces;
    }
    const dir = getFontDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const lockFile = getLockFileName();
    if (fs.existsSync(lockFile)) {
        return fontFaces = JSON.parse(fs.readFileSync(lockFile).toString());
    }
    return fontFaces = [];
};

const addMethod = (url: string, src: string): string => {
    const protocol = new URL(url).protocol;
    if (src.startsWith(protocol)) {
        return src;
    }
    return protocol + src;
};

const requestFontFacesCSS = async (url: string): Promise<FontFace[]> => {
    try {
        const response = await axios.get<string>(url);
        if (response.status === 200) {
            return parseFontFacesCSS(response.data).map(face => _.defaults({ src: addMethod(url, face.src!) }, face));
        }
        console.error(response.statusText);
    } catch (e) {
        console.error(e);
    }
    return [];
};

const sameFace = (A: FontFace, B: FontFace): boolean =>
    A['font-family'] === B['font-family'] &&
    A['font-style'] === B['font-style'] &&
    A['font-weight'] === B['font-weight'];

export const addFontFaces = async (url: string): Promise<FontFace[]> => {
    const oldFaces = initFontDir();
    const newFaces = await requestFontFacesCSS(url);
    if (newFaces.length > 0) {
        const filtered: FontFace[] = [];
        newFaces.forEach((newFace) => {
            if (_.findIndex(oldFaces, oldFace => sameFace(newFace, oldFace)) === -1) {
                filtered.push(newFace);
            }
        });
        if (filtered.length > 0) {
            const merged = _.concat<FontFace>(oldFaces, filtered);
            fs.writeFileSync(getLockFileName(), JSON.stringify(merged));
            fontFaces = merged;
            console.log(`lockfile(${getLockFileName()}) is updated.`);
            return merged;
        }
    }
    return oldFaces;
};
*/
const fonts = new Map<string, Font>();
const openAndCacheFont = (fontFileName: string): Font => {
    const font = fonts.get(fontFileName);
    if (font) {
        return font;
    }
    const newFont = openSync(fontFileName);
    fonts.set(fontFileName, newFont);
    console.log(`A font is loaded: ${fontFileName}`);
    return newFont;
};
/*
export const downloadFont = async (face: FontFace): Promise<Font | null> => {
    const oldFaces = initFontDir();
    const index = _.findIndex(oldFaces, oldFace => sameFace(face, oldFace));
    if (index !== -1) {
        const hitFace = oldFaces[index];
        try {
            // download and open
            const response = await axios.get<any>(hitFace.src!, { responseType: 'arraybuffer' });
            if (response.status === 200) {
                const fontFileName = path.resolve(getFontDir(), encodeURIComponent(hitFace.src!));
                fs.writeFileSync(fontFileName, new Buffer(response.data));
                return openAndCacheFont(fontFileName);
            }
            console.error(response.statusText);
        } catch (e) {
            console.error(e);
        }
    }
    return null;
};
*/
// bind native.
const binding = require('bindings')('fontFinder');
let localFonts: FontFace[] = [];
export const getAllLocalFonts = (): FontFace[] => {
    if (localFonts.length === 0) {
        localFonts = binding.getAllLocalFonts() as FontFace[];
    }
    return localFonts;
};

export const findLocalFonts = (query: FontFace): FontFace[] => {
    const all = getAllLocalFonts();
    return all.filter((face) => {
        const family = _.get(query, 'font-family', '');
        return family === '' || family === face['font-family'];
    }).filter((face) => {
        const style = _.get(query, 'font-style', '');
        return style === '' || style === face['font-style'];
    }).filter((face) => {
        const weight = _.get(query, 'font-weight', 0);
        return weight === 0 || weight === face['font-weight'];
    });
};
/*
export const openFont = (face: FontFace): Font | null => {
    const oldFaces = initFontDir();
    const index = _.findIndex(oldFaces, oldFace => sameFace(face, oldFace));
    if (index !== -1) {
        const hitFace = oldFaces[index];
        const fontFileName = path.resolve(getFontDir(), encodeURIComponent(hitFace.src!));
        // see cache
        const font = fonts.get(fontFileName);
        if (font) {
            return font;
        }
        // open local file
        if (fs.existsSync(fontFileName)) {
            return openAndCacheFont(fontFileName);
        }
    }
    return null;
};
*/
export const openFont = (query: FontFace): Font | null => {
    const fonts = findLocalFonts(query);
    if (fonts.length > 0) {
        const fontFileName = fonts[0].src!;
        // open local file
        return openAndCacheFont(fontFileName);
    }
    return null;
};

export const getTextHeight = (font: Font, fontSize: number): number => {
    const fontHeight = font.ascent - font.descent;
    const lineHeight = fontHeight > font.unitsPerEm ? fontHeight : fontHeight + font.lineGap;
    return Math.floor(lineHeight / font.unitsPerEm * fontSize);
};

export const getComputedTextWidth = (font: Font, fontSize: number, text: string): number => {
    const textGlyphs = font.layout(text).glyphs;
    const totalAdvanceWidth = textGlyphs.reduce((previous, current) => previous + current.advanceWidth, 0);
    return Math.ceil(totalAdvanceWidth / font.unitsPerEm * fontSize);
};
