import * as _ from 'lodash';
const binding = require('bindings')('fontFinder');

describe('font-manager', () => {
    test('findFontSync', () => {
        binding.getAllLocalFonts().forEach((desc: any) => {
            expect(typeof _.get(desc, 'font-family')).toBe('string');
            expect(typeof _.get(desc, 'font-style')).toBe('string');
            expect(typeof _.get(desc, 'font-weight')).toBe('number');
            expect(typeof _.get(desc, 'src')).toBe('string');
            expect(typeof _.get(desc, 'postscriptName')).toBe('string');
            expect(typeof _.get(desc, 'italic')).toBe('boolean');
            expect(typeof _.get(desc, 'bold')).toBe('boolean');
            expect(typeof _.get(desc, 'monoSpace')).toBe('boolean');
        });
    });
});
