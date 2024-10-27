/* globals require, process, console */
const fs = require('fs');
const path = require('path');
const config = require('./configs/config.json');
const civitai = require('./app/civitai.js');



runAll();

async function runAll() {
  if (typeof window !== 'undefined') {
    console.log('This is not node.js');
    return;
  }
  const opt = argMapper(process.argv.slice(2)) || {query: 'fate', maxNumber: 10};
  const url = opt.url;
  run(url, opt);
}

// node.js only
async function run(url, opt) {
  if (!url) {
    console.log('url is required');
    return;
  }
  opt.apiKey = opt.apiKey || config.apiKey;
  const failed = [];
  if (url.startsWith('http')) {
    try {
      await civitai.modelDownload(url, opt);
    } catch (err) {
      console.error('Error:', err);
    }
  } else {
    // batch download
    // [command] url (title) (categories)
    // command: is not used, yet
    const batchText = fs.readFileSync(url, 'utf8');
    const directory = path.dirname(url);
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
      if (parts.length > 4) {
        opt.series = parts[4];
      }
      // console.log('opt:', opt);
      try {
        const result = await civitai.modelDownload(url, opt);
        console.log('result:', result);
        if (!result) {
          failed.push(line);
        }
      } catch (err) {
        failed.push(line);
      }
    }
    const saveText = failed.join('\n') + '\n';
    console.log('saveText:', saveText);
    if (failed.length > 0) {
      const failedFile = path.join(directory, 'failed.txt');
      if (fs.existsSync(failedFile)) {
        fs.appendFileSync(failedFile, saveText, 'utf8');
      } else {
        fs.writeFileSync(failedFile, saveText, 'utf8');
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
  const singleArgs = ['temp', 'output', 'title', 'series'];
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
