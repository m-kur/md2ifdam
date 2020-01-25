#! /usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { argv } from 'yargs';
import * as _ from 'lodash';
import { compileFile } from './compiler';

(async () => {
    const sourceFileName = argv._[0];
    if (!sourceFileName || !fs.existsSync(sourceFileName)) {
        console.error('Source not found.');
        return 404;
    }
    const defaultFileName = `./${path.basename(sourceFileName, path.extname(sourceFileName))}.svg`;
    const outputFileName = _.get(argv, 'o', defaultFileName);
    return compileFile(sourceFileName, outputFileName);
})();
