import * as fs from 'fs';
import * as path from 'path';

export const MARKDOWN = fs.readFileSync(path.resolve(__dirname, 'markdown.md')).toString();
