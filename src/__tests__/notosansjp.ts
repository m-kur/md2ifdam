import * as fs from 'fs';
import * as path from 'path';

export const NOTOSANSJP = fs.readFileSync(path.resolve(__dirname, 'notosansjp.css')).toString();
