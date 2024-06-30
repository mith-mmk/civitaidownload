/* globals require, console */
const express = require('express');
const civitai = require('./civitai.js');
const app = express();
const port = 3000;

// eslint-disable-next-line no-unused-vars
const tasks = {};

// eslint-disable-next-line no-unused-vars
async function promiseWatcher(promise, functionName, opt, taskId) {
  tasks[taskId] = {
    taskname: functionName,
    promise: promise,
    isDone: false,
    params: opt,
    timestamp: new Date(),
    endTime: null,
    status: 'running',
    result: null,
    error: null
  };
  promise.then((result) => {
    console.log('promiseWatcher result:', result);
    tasks[taskId].isDone = true;
    tasks[taskId].status = 'done';
    tasks[taskId].result = result;
    tasks[taskId].endTime = new Date();
  }).catch((err) => {
    console.error('promiseWatcher error:', err);
    tasks[taskId].isDone = true;
    tasks[taskId].status = 'error';
    tasks[taskId].error = err;
    tasks[taskId].endTime = new Date();
  });
}

// eslint-disable-next-line no-unused-vars
function taskWatcher(promise, functionName, opt) {
  const taskId = new Date().getTime().toString('36');
  promiseWatcher(promise, functionName, opt, taskId);
  return taskId;
}


app.post('/api/download', (req, res) => {
  // eslint-disable-next-line no-unused-vars
  const data = req.body;
  try {
    const taskId = taskWatcher(civitai.modelDownload(data.url, data), 'modelDownload', data);
    res.send(JSON.stringify({status: 'ok', taskId: taskId, timestamp: new Date()}));
  } catch (err) {
    res.send(JSON.stringify({status: 'error', error: err}));
  }
});

app.get('/api/loras', (req, res) => {
  const query = req.query;
  query.types = ['LORA', 'LoCon', 'DoRA'];
  civitai.getModels(query).then((items) => {
    res.status(200);
    items['status'] = 'ok';
    res.send(JSON.stringify(items));
  }).catch((err) => {
    res.status(500);
    const result = {
      status: 'error',
      error: err
    };
    console.error(err);
    res.send(JSON.stringify(result));
  });
});

app.get('/api/models', (req, res) => {
  const query = req.query;
  query.types = ['Checkpoint'];
  civitai.getModels(query).then((items) => {
    res.status(200);
    items['status'] = 'ok';
    res.send(JSON.stringify(items));
  }).catch((err) => {
    res.status(500);
    const result = {
      status: 'error',
      error: err
    };
    console.error(err);
    res.send(JSON.stringify(result));
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// taskWatcher();

