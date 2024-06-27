/* globals require, console */
const express = require('express');
const fs = require('fs');
// const config = require('./data/config.json');
const path = require('path');

const app = express();
const port = 3000;

app.post('/api/download', (req, res) => {
  req.on('data', (chunk) => {
    const filename = 'download.txt';
    const filepath = path.join('./data', filename);
    console.log(`write to ${filepath}`);
    // if exist file, append
    if (fs.existsSync(filepath)) {
      fs.appendFileSync(filepath
        , chunk.toString());
    } else {
      fs.writeFileSync(filepath, chunk.toString());
    }
  });
  res.send('POST request to the homepage');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});