/* globals require, process, console */
const config = require('./data/config.json');
const civitai = require('./app/civitai.js');

run();

// node.js only
async function run() {
  if (typeof window !== 'undefined') {
    console.log('This is not node.js');
    return;
  }
  const opt = argMapper(process.argv.slice(2)) || {query: 'fate', maxNumber: 10};
  const url = opt.url;
  opt.apiKey = opt.apiKey || config.apiKey;
  await civitai.modelDownload(url, opt);
}

function argMapper(args) {
  const argMap = {};
  let key = '';
  argMap['url'] = args[0];
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      key = args[i].slice(2);
      if (key == 'C') key = 'categories';
      argMap[key] = [];
    } else {
      argMap[key].push(args[i]);
    }
  }

  // convert array to string
  // single args
  const singleArgs = ['temp', 'output'];
  for (const key in argMap) {
    if (singleArgs.includes(key)) {
      argMap[key] = argMap[key][0];
    }
  }
  console.log('argMap:', argMap);
  return argMap;
}

// argMapper
// modelversionID --temp [tempDir] --output [outputDir]
