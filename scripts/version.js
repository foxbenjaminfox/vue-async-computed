// Replace version in README.md
const { version: NEW_VERSION } = require('../package.json');
const fs = require('fs');
const { execSync } = require('child_process');

const readme = fs.readFileSync('README.md', 'utf8');
const newReadme = readme.replace(/vue-async-computed@\d+\.\d+\.\d+/g, `vue-async-computed@${NEW_VERSION}`);
fs.writeFileSync('README.md', newReadme, 'utf8');

execSync('git add README.md');
