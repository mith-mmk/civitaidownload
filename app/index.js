/* globals require, console */
const cluster = require('cluster');
const CPUs = require('os').cpus().length;
const express = require('express');
const civitai = require('./civitai.js');
const app = express();
const port = 3000;
const config = require('../configs/config.json');
const fs = require('fs');
const path = require('path');
const process = require('process');



// eslint-disable-next-line no-unused-vars
//const queue = new TaskQueue();
const queue = [];


// eslint-disable-next-line no-unused-vars
class TaskQueue {
  constructor() {
    this.queue = [];
    this.taskCount = 0;
    this.taskLimit = config.maxTasks || 4;
    this.running = false;
  }

  push(task) {
    task.status = 'waiting';
    this.queue.push(task);
    this.run().then(() => {
      console.log('taskQueue.run done');
    }).catch((err) => {
      console.error('taskQueue.run error:', err);
    });
  }

  async run() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.taskCount++;
      task.status = 'running';
      task.jobStartTime = new Date();
      task.func(task.opt);
    }
  }
}


const tasks = {};
// eslint-disable-next-line no-unused-vars
async function promiseWatcher(promise, functionName, opt, taskId) {
  tasks[taskId] = {
    taskname: functionName,
    promise: promise,
    isDone: false,
    params: opt,
    timestamp: new Date(),
    jobStartTime: null,
    endTime: null,
    status: 'running',
    result: null,
    error: null
  };
  promise.then((result) => {
    console.log('promiseWatcher result:', result);
    tasks[taskId].status = 'done';
    tasks[taskId].result = result;
  }).catch((err) => {
    console.error('promiseWatcher error:', err);
    tasks[taskId].status = 'error';
    tasks[taskId].error = err;
  }).finary(() => {
    tasks[taskId].isDone = true;
    tasks[taskId].endTime = new Date();
    this.taskCount--;
  });
}

// eslint-disable-next-line no-unused-vars
async function taskWatcher(promise, func, opt) {
  const taskId = new Date().getTime().toString('36');
  taskRunner(func, opt);
  promiseWatcher(promise, func, opt, taskId);
  return taskId;
}

// eslint-disable-next-line no-unused-vars
async function taskRunner(func, opt) {
  try {
    queue.push({func: func, opt: opt});
  } catch (err) {
    console.error('taskRunner error:', err);
  }
}

app.post('/api/download', (req, res) => {
  // eslint-disable-next-line no-unused-vars
  let data = req.body;
  // eslint-disable-next-line no-unused-vars
  const requireKeys = ['url', 'title', 'resume', 'force', 'categories', 'member'];
  // data check
  const keys = Object.keys(data);
  let isOk = true;
  const badKeys = [];
  for (let i = 0; i < requireKeys.length; i++) {
    if (!keys.includes(requireKeys[i])) {
      badKeys.push(requireKeys[i]);
      isOk = false;
      return;
    }
  }
  if (!isOk) {
    res.send(JSON.stringify({status: 'error', error: 'missing keys', badKeys: badKeys}));
    return;
  }

  // header Authorization check
  const authHeader = req?.headers?.authorization; // 'Bearer ' + apiKey
  if (authHeader) {
    const args = authHeader.split(' ');
    // Baarer ?
    if (args.length !== 2 && args[0] !== 'Bearer') {
      res.send(JSON.stringify({status: 'error', error: 'invalid Authorization header'}));
      return;
    }
    data.apiKey = args[0];
  }

  try {
    const taskId = taskWatcher(civitai.modelDownload(data.url, data), 'modelDownload', data);
    res.send(JSON.stringify({status: 'ok', taskId: taskId, timestamp: new Date()}));
  } catch (err) {
    res.send(JSON.stringify({status: 'error', error: err}));
  }
});

app.get('/api/tasks/:taskid', (req, res) => {
  const taskId = req.params.taskid;
  if (tasks[taskId]) {
    res.send(JSON.stringify(tasks[taskId]));
  } else {
    res.send(JSON.stringify({status: 'error', error: 'task not found'}));
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


app.get('/', (req, res) => {
  const staticPath = config?.server?.staticPath || 'public';
  const fs = require('fs');
  let files = fs.readdirSync(staticPath);
  files = files.filter((file) => {
    return file.endsWith('.html');
  }).map((file) => {
    const stat = fs.statSync(path.join(staticPath, file));
    return {
      name: file,
      size: stat.size,
      mtime: stat.mtime,
      time: new Date(stat.mtime).toLocaleString()
    };
  });

  files.sort((a, b) => {
    return b.mtime - a.mtime;
  });

  const html = `
    <html>
      <head>
        <title>Model Server</title>
      </head>
      <body>
        <h1>Model Server</h1>
        <ul>
          ${files.map(file => `<li><a href="${file.name}">${file.name}</a> ${file.time}</li>`).join('')}
        </ul>
      </body>
  `;
  res.send(html);
});

app.get('/css/:file', (req, res) => {
  const staticPath = config?.server?.cssPath || config?.server?.staticPath || 'public/css';
  const fs = require('fs');
  const file = req.params.file;
  const filePath = path.join(staticPath, file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  }
});

app.get('/js/:file', (req, res) => {
  const staticPath = config?.server?.jsPath || config?.server?.staticPath || 'public/js';
  const fs = require('fs');
  const file = req.params.file;
  const filePath = path.join(staticPath, file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  }
});


app.get('/:file', (req, res) => {
  const staticPath = config?.server?.staticPath || 'public';
  const file = req.params.file;
  const filePath = path.join(staticPath, file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  }
});

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  for (let i = 0; i < CPUs; i++) {
    cluster.fork();
  }
  // eslint-disable-next-line no-unused-vars
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}


// taskWatcher();

