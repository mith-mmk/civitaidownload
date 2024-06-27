
/* globals console, require, fetch */
const url = 'http://titus:7860/sdapi/v1/sd-models';
const remapping = require('f:/twitter/hash.json');
// const remapping = {};
async function run() {
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
