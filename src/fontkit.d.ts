declare module 'fontkit' {
    function openSync(filename: string, postscriptName?: string): Font;

    class Font {
        unitsPerEm: number;
        ascent: number;
        descent: number;
        lineGap: number;
        layout(text: string): GlyphRun;
    }

    class GlyphRun {
        glyphs: Glyph[];
    }

    class Glyph {
        advanceWidth: number;
    }
}
