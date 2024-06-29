/* globals require, console */
const express = require('express');
// eslint-disable-next-line no-unused-vars
//const fs = require('fs');
//const path = require('path');
// const config = require('./data/config.json');
const civitai = require('./civitai.js');
const timer = require('timers');
const app = express();
const port = 3000;
// eslint-disable-next-line no-unused-vars


// eslint-disable-next-line no-unused-vars
function createTask(apiname, promise, opt) {
  return {
    taskname: apiname,
    promise: promise,
    isDone: false,
    params: opt,
    timestamp: new Date(),
    endeTime: null,
    status: 'none',
    result: null,
    error: null
  };
}

let isShutdown = false;
const tasks = [];
// eslint-disable-next-line no-unused-vars
async function taskWatcher() {
  while (!isShutdown) {
    tasks.forEach((task) => {
      if (task.promise.error) {
        task.isDone = true;
        task.status = 'error';
        task.error = task.promise.error;
        task.endTime = new Date();
      } else if (task.promise.isDone) {
        task.isDone = true;
        task.status = 'done';
        task.result = task.promise.result;
        task.endTime = new Date();
      }
    });
    // sleep
    const waitTime = 100;
    timer.setTimeout(() => {
      console.log('wake up');
    }, waitTime);
  }
}


app.post('/api/download', (req, res) => {
  // eslint-disable-next-line no-unused-vars
  const data = req.body;
  //  tasks.push(run(civitai.modelDownload(opt.url, opt)));
  res.send('POST request to the homepage');
});

app.get('/api/loras', (req, res) => {
  const query = req.query;
  query.types = ['LORA', 'LoCon', 'DoRA'];
  civitai.getModels(query).then((items) => {
    res.status(200);
    res.send(JSON.stringify(items));
  }).catch((err) => {
    res.status(500);
    console.error(err);
    res.send('error');
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// taskWatcher();

