/* globals require, process, console */
const fs = require('fs');
const config = require('./configs/config.json');
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
  if (!url) {
    console.log('url is required');
    return;
  }
  opt.apiKey = opt.apiKey || config.apiKey;
  if (url.startsWith('http')) {
    await civitai.modelDownload(url, opt);
  } else {
    // batch download
    // [command] url (title) (categories)
    // command: is not used, yet
    const batchText = fs.readFileSync(url, 'utf8');
    const lines = batchText.split('\n');
    for (const line of lines) {
      console.log('line:', line);
      // spaceで分割するが、 ''でくくられた部分はそのまま
      const parts = line.replace(/\r/g, '').match(/'[^']+'|[^ ]+/g);
      // console.log('parts:', parts);
      if (!parts) {
        continue;
      }
      if (parts.length < 2) {
        continue;
      }
      // const _script = parts[0];
      opt.title = null;
      opt.categories = null;
      const url = parts[1];
      if (parts.length > 2) {
        opt.title = parts[2].replace(/'/g, '');
      }
      if (parts.length > 3) {
        opt.categories = parts[3].split(',');
      }
      // console.log('opt:', opt);
      try {
        await civitai.modelDownload(url, opt);
      } catch (err) {
        console.error('Error:', err);
      }
    }
  }
}

function argMapper(args) {
  const argMap = {};
  let key = '';
  argMap['url'] = args[0];
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      key = args[i].slice(2);
      if (argMap[key] === undefined) {
        argMap[key] = [];
      }
    } else if (args[i].startsWith('-')) {
      key = args[i].slice(1);
      if (key == 'C') key = 'categories';
      if (key == 'T') key = 'title';
      if (argMap[key] === undefined) {
        argMap[key] = [];
      }
    } else {
      argMap[key].push(args[i]);
    }
  }

  // convert array to string
  // single args
  const singleArgs = ['temp', 'output', 'title'];
  for (const key in argMap) {
    if (singleArgs.includes(key)) {
      argMap[key] = argMap[key][0];
    }
  }
  console.log('argMap:', argMap);
  return argMap;
}

// argMapper
// modelversionID --temp [tempDir] --output [outputDir] [--force true] [--resume true]
