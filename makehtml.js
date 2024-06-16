const fs = require('fs');
const config = require('./data/config.json');
const civitai = require('./app/civitai.js');

console.log('makehtml.js');
run();

// node.js only
async function run() {
  if (typeof window !== 'undefined') {
    console.log('This is not node.js');
    return;
  }
  const opt = argMapper(process.argv.slice(2)) || {query: 'fate', max_number: 10};
  
  if (config.apiKey) {
    opt.apiKey = config.apiKey;
  }

  const html = await civitai.createHtml(opt);
  const filebase = opt.query || opt.tag[0] || 'loras';
  const filename = `./data/${filebase}.html`;
  console.log(`write to ${filename}`);
  fs.writeFileSync(filename, html, 'utf8');
}

function argMapper(args) {
  const argMap = {};
  let key = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      key = args[i].slice(2);
      argMap[key] = [];
    } else {
      argMap[key].push(args[i]);
    }
  }
  // convert array to string
  // single args
  const singleArgs = ['query', 'max_number'];
  for (const key in argMap) {
    if (singleArgs.includes(key)) {
      argMap[key] = argMap[key][0];
    }
  }
  return argMap;
}

// argMapper
// --query query --tag [tag] --max_number max_number
// --query imas --tag idol --max_number 10
