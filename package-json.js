const _ = require('lodash');
const fs = require('fs');

(function () {
    const packageJson = _.omit(require('./package.json'), ['scripts', 'jest', 'devDependencies']);
    const buildNumber = _.floor(new Date().valueOf() / 1000);
    _.update(packageJson, 'version', (v) => `${v}-${buildNumber}`);
    _.set(packageJson, 'bin.md2ifdam', 'bin.js');
    _.set(packageJson, 'scripts.install', 'cmake-js rebuild');
    if (fs.existsSync('dist/package.json')) {
        fs.unlinkSync('dist/package.json');
    }
    fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 4));
    fs.copyFileSync('CMakeLists.txt', 'dist/CMakeLists.txt');
    fs.mkdirSync('dist/src');
    fs.copyFileSync('src/FontFinderMac.cc', 'dist/src/FontFinderMac.cc');
})();
