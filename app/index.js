const cluster = require('cluster');
const CPUs = require('os').cpus().length;
const express = require('express');
const defaultCivitai = require('./civitai.js');
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
  }).finally(() => {
    tasks[taskId].isDone = true;
    tasks[taskId].endTime = new Date();
    this.taskCount--;
  });
}

// eslint-disable-next-line no-unused-vars
function taskWatcher(promise, func, opt) {
  const taskId = new Date().getTime().toString('36');
  taskRunner(func, opt);
  promiseWatcher(promise, func, opt, taskId);
  return taskId;
}

// eslint-disable-next-line no-unused-vars
function taskRunner(func, opt) {
  try {
    queue.push({func: func, opt: opt});
  } catch (err) {
    console.error('taskRunner error:', err);
  }
}

function getMissingKeys(data) {
  const requireKeys = ['url', 'title', 'resume', 'force', 'categories', 'member'];
  const keys = Object.keys(data);
  return requireKeys.filter((key) => !keys.includes(key));
}

function attachApiKey(data, authHeader) {
  if (!authHeader) {
    return null;
  }

  const args = authHeader.split(' ');
  if (args.length !== 2 || args[0] !== 'Bearer') {
    return 'invalid Authorization header';
  }
  data.apiKey = args[1];
  return null;
}

function createApp(deps = {}) {
  const civitai = deps.civitai || defaultCivitai;
  const app = express();
  app.use(express.json());

  app.post('/api/download', (req, res) => {
    const body = req.body;
    const dataList = Array.isArray(body) ? body : [body];
    if (dataList.length === 0 || dataList.some((item) => !item || typeof item !== 'object')) {
      res.send(JSON.stringify({status: 'error', error: 'invalid request body'}));
      return;
    }

    const missingKeys = dataList.flatMap((item) => getMissingKeys(item));
    if (missingKeys.length > 0) {
      res.send(JSON.stringify({
        status: 'error',
        error: 'missing keys',
        badKeys: [...new Set(missingKeys)]
      }));
      return;
    }

    const authError = dataList.map((item) => attachApiKey(item, req?.headers?.authorization))
      .find((error) => error != null);
    if (authError) {
      res.send(JSON.stringify({status: 'error', error: authError}));
      return;
    }

    try {
      const isMultiple = dataList.length > 1;
      const promise = isMultiple
        ? civitai.modelDownloadAll(dataList.map((item) => item.url), dataList)
        : civitai.modelDownload(dataList[0].url, dataList[0]);
      const taskName = isMultiple ? 'modelDownloadAll' : 'modelDownload';
      const taskOpt = isMultiple ? dataList : dataList[0];
      const taskId = taskWatcher(promise, taskName, taskOpt);
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
      items.status = 'ok';
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
      items.status = 'ok';
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
    console.log('request root');
    console.log('server static path:', staticPath);
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
    console.log('files:', files);
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
    console.log(`request css file: /css${file}`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404);
      res.send('css file not found');
    }
  });

  app.get('/js/:file', (req, res) => {
    const staticPath = config?.server?.jsPath || config?.server?.staticPath || 'public/js';
    const fs = require('fs');
    const file = req.params.file;
    const filePath = path.join(staticPath, file);
    console.log(`request js file: /js${file}`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404);
      res.send('js file not found');
    }
  });


  app.get('/:file', (req, res) => {
    const staticPath = config?.server?.staticPath || 'public';
    const file = req.params.file;
    const filePath = path.join(staticPath, file);
    console.log(`request file: /${file}`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404);
      res.send('file not found');
    }
  });

  return app;
}

function startServer() {
  const app = createApp();
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
}

if (require.main === module) {
  startServer();
}

exports.createApp = createApp;
exports.startServer = startServer;
exports.tasks = tasks;
exports.getMissingKeys = getMissingKeys;
exports.attachApiKey = attachApiKey;

// taskWatcher();
