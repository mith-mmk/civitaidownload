
/* globals console, require, fetch */
const fs = require('fs');
const url = 'http://localhost:7860/sdapi/v1/sd-models';
const jsonfile = 'f:/ai/models/model-hash.json';
// const remapping = {};
async function run() {
  const remapping = fs.existsSync(jsonfile) ? JSON.parse(fs.readFileSync(jsonfile, 'utf8')) : {};
  const response = await fetch(url);
  const data = await response.json();
  data.forEach(element => {
    if (remapping[element.hash]) {
      element['model_name'] = remapping[element.hash];
    }
  });
  console.log(JSON.stringify(remapping, null, 2));
}

run();
