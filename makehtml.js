/* globals require, process, console */
const fs = require('fs');
const config = require('./data/config.json');
const civitai = require('./app/civitai.js');
const path = require('path');

run();

// node.js only
async function run() {
  if (typeof window !== 'undefined') {
    console.log('This is not node.js');
    return;
  }
  const opt = argMapper(process.argv.slice(2)) || {query: 'fate', maxNumber: 10};
  let outputDir = opt.output || './data';
  if (config.apiKey) {
    opt.apiKey = config.apiKey;
  }
  const html = await civitai.createHtml(opt);
  const filebase = opt.filename || opt.query || opt?.tag?.join('-') || 'models';
  console.log(`filebase: ${filebase}`);
  const filename = path.join(outputDir, `${filebase}.html`);
  console.log(`write to ${filename}`);
  fs.writeFileSync(filename, html, 'utf8');
}

function argMapper(args) {
  const argMap = {};
  let key = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      key = args[i].slice(2);
      key = key.replace(/_./g, (s) => s.charAt(1).toUpperCase());
      key = key.replace(/-./g, (s) => s.charAt(1).toUpperCase());
      argMap[key] = [];
    } else {
      argMap[key].push(args[i]);
    }
  }

  // convert array to string
  // single args
  const singleArgs = ['query', 'maxNumber', 'filename', 'output'];
  for (const key in argMap) {
    if (singleArgs.includes(key)) {
      argMap[key] = argMap[key][0];
    }
  }
  console.log('argMap:', argMap);
  return argMap;
}

// argMapper
// --query query --tag [tag] --maxNumber maxNumber
// --query imas --tag idol --maxNumber 10
