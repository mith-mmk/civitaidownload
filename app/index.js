const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

function getLoras(opt) {
  // filter "LORA", "LyCORIS", "DoRA"
  // opt {
  //   ",
  //   "data": {}
  
}

app.get('/', (req, res) => {
  // rootの場合は ../static/index.html を返す 
  res.sendFile(path.join(__dirname, '/static/index.html'));
});

// /loras
app.get('/loras', (req, res) => {
  // /lorasの場合は ../static/loras.html を返す 
  res.sendFile(path.join(__dirname, '/static/loras.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});