/* globals require, console, __dirname */
const express = require('express');
const path = require('path');

const app = express();
const port = 3000;


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