const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('./data/config.json');

const args = process.argv.slice(2);
const dir = args[0] || config?.loras?.dir || './lora';
const outputJson = args[1] || config?.loras?.hashfile || 'data/lorahash.json';
const outputFilesJson = outputJson.replace('.json', '.files.json');
let remain;
/*
  export autoV2 hash

  use nodejs 14.15.4 or later
  usage:
  node ./getmodelshash.js <hostname|filename|directory>? <outputJson>? <exportHashJson>? <importHashJson>? <sort>?
    <hostname|filename|directory>: hostname or filename or directory (default: http://localhost:7860)
    <outputJson>: output json filename (default: outputs/models.json)
    <exportHashJson>: export hash json filename (default: outputs/hash.json)
    <importHashJson>: import hash json filename (default: f:/twitter/hash.json)
    <sort>: sort hash json filename (default: false)
*/
function calc_hash(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const filesize = fs.statSync(file).size;
    let readed = 0;
    try {
      const stream = fs.createReadStream(file, { highWaterMark: 1024 * 1024 });
      stream.on('data', (data) => {
        readed += data.length;
        const progress = Math.floor(readed / filesize * 1000) / 10;
        const progressStr = `${progress}`.padStart(5);
        process.stdout.write(`${path.basename(file)} ${progressStr} % ${readed} bytes / ${filesize} bytes\n`);
        // 1行戻る
        process.stdout.write('\u001b[1A');
        // dulation
        hash.update(data);
      });
      stream.on('end', () => {
        console.log(`remain ${--remain} end ${file}`);
        const filebase = path.basename(file);
        const hash8 = hash.digest('hex').slice(0, 10);
        const json = {
          hash: hash8,
          filename: filebase
        };
        resolve(json);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function createHashFromFiles(files, opt = {}) {
  const hashList = opt.hashList || {};
  const fileList = opt.fileList || {};
  const promises = [];
  console.log(`search file numbers is ${files.length}`);
  remain = files.length;
  files.forEach(file => {
    const promise = calc_hash(file);
    promises.push(promise);
  });

  Promise.all(promises).then((results) => {
    results.forEach((result) => {
      hashList[result.hash] = result.filename;
      fileList[result.filename] = result.hash;
    });
    if (fs.existsSync(outputFilesJson)) {
      // move old file
      const oldfile = outputFilesJson.replace('.json', '.old.json');
      fs.renameSync(outputFilesJson, oldfile);
    }
    fs.writeFileSync(outputFilesJson, JSON.stringify(fileList, null, 2));
    if (fs.existsSync(outputJson)) {
      // move old file
      const oldfile = outputJson.replace('.json', '.old.json');
      fs.renameSync(outputJson, oldfile);
    }
    fs.writeFileSync(outputJson, JSON.stringify(hashList, null, 2));
  }).catch((err) => {
    console.log(err);
  });
}

function grabFiles(dir) {
  let files = [];
  const filter = /\.(safetensors|ckpt|pt)$/;
  if (fs.statSync(dir).isDirectory()) {
    // glob files recursively
    files = fs.readdirSync(dir).map(file => dir + '/' + file);
    for (let i = 0; i < files.length; i++) {
      if (fs.statSync(files[i]).isDirectory()) {
        files = grabFiles(files[i]).concat(files);
      }
    }
  } else {
    files = [dir];
  }
  files = files.filter(file => filter.test(file));
  return files;
}


// node getmodelshash.js <hostname|filename|directory>? <outputJson>? <exportHashJson>? <importHashJson>? <sort>?

async function main() {
  let prejson = {};
  let prefiles = {};
  if (fs.existsSync(outputJson)) {
    // load json
    const json = fs.readFileSync(outputJson, 'utf8');
    prejson = JSON.parse(json);
  }

  if (fs.existsSync(outputFilesJson)) {
    // load json
    const json = fs.readFileSync(outputFilesJson, 'utf8');
    prefiles = JSON.parse(json);
  }

  // file
  if (fs.existsSync(dir)) {
    // filr or directory
    const files = grabFiles(dir);
    const alreadys = Object.keys(prefiles);
    const newfiles = files.filter(file => {
      const base = path.basename(file);
      return !alreadys.includes(base)
    });
    if (!newfiles.length) {
      console.log(`no new files found`);
      return;
    }
    console.log(`new files found ${newfiles.length}`);
    await createHashFromFiles(newfiles), {
      hashList: prejson,
      fileList: prefiles
    }
  } else {
    console.log(`file not found ${path}`);
  }
}

main();