/* global process, require, console, exports */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function calcHash(file) {
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
        process.stdout.write(`${path.basename(file)} ${progressStr} % ${readed} bytes / ${filesize} bytes\r`);
        hash.update(data);
      });
      stream.on('end', () => {
        console.log(`read end ${file}`);
        const filebase = path.basename(file);
        const fullHash = hash.digest('hex');
        console.log(`filebase: ${filebase} hash: ${fullHash.digest('hex')}`);
        const hash8 = fullHash.slice(0, 10);
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

exports.calcHash = calcHash;