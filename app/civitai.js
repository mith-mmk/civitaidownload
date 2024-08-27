/* eslint-disable no-undef */
const civitaiUrl = 'https://civitai.com';
const fsPromises = require('fs').promises;
const fs = require('fs');
const crypto = require('crypto');
const process = require('process');
const path = require('path');
const config = require('../configs/config.json');

class Downloader {
  constructor(maxThreads = 4) {
    this.maxThreads = maxThreads;
    this.threads = 0;
    this.queue = [];
    this.status = [];
    for (let i = 0; i < maxThreads; i++) {
      this.status.push({
        status:'idle',
        message: ''});
    }
  }

  async download(url, opt) {
    return new Promise((resolve, reject) => {
      this.queue.push({url, opt, resolve, reject});
      this.run();
    });
  }

  async run() {
    // wait for threads
    while (this.threads >= this.maxThreads) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const task = this.queue.shift();
    if (task) {
      this.modelDownload(task.url, task.opt, this.threads++).then((result) => {
        task.resolve(result);
      }).catch((e) => {
        task.reject(e);
      }).finally(() => {
        this.setStatus(this.threads, {
          status: 'idle',
          message: ''
        });
        this.threads--;
        this.run();
      });
    }
  }

  setStatus(threadNumber, status) {
    this.status[threadNumber] = status;
    for (let i = 0; i < this.status.length; i++) {
      // stdout
      process.stdout.write(`${i}: ${this.status[i].status} ${this.status[i].message}\n`);
    }
    process.stdout.write(`\x1b[${this.status.length}A`);
  }

  async modelDownload(url, opt, threadNumber) {
    try {
      this.setStatus(threadNumber, {
        status: 'start',
        message: url
      });
      const modelVersionId = url.split('/').pop();
      this.setStatus(threadNumber, {
        status: 'info',
        message: `fetching model version info ${modelVersionId}`
      });
      const info = await getModelVersionInfo(modelVersionId, opt);
      this.setStatus(threadNumber, {
        status: 'info',
        message: `fetching model info ${info.modelId}`
      });
      const modelInfo = await getModelInfo(info.modelId, opt);
      const tags = modelInfo.tags;
      let conceptTag = '';
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (baseTag.includes(tag)) {
          conceptTag = tag;
          break;
        }
      }
      // opt.resume = true;
      const baseModel = config?.mapper[info.baseModel] || info.baseModel;
      const modelName = info?.model?.name;
      const downloadFile = info.files.filter((file) => file.primary)[0];

      const autoV2Hash = downloadFile.hashes.AutoV2 ? downloadFile.hashes.AutoV2.toLowerCase() : '';
      const sha256 = downloadFile.hashes.SHA256 ? downloadFile.hashes.SHA256.toLowerCase() : '';
      if (sha256 == '') {
        this.setStatus(threadNumber, {
          status: 'warning',
          message: 'SHA256 hash not found, force download'
        });
        opt.force = true;
      }
      const filename = downloadFile.name;
      const modelType = info?.model?.type;
      this.setStatus(threadNumber, {
        status: 'info',
        message: `model: ${modelName} baseModel: ${baseModel} conceptTag: ${conceptTag}`
      });
      const mainDirectory = config?.mapper[modelType] || modelType;
      const baseModelDirectory = config?.mapper[baseModel] || baseModel;
      const subDirectory = config?.mapper[conceptTag] || conceptTag;
      let outputDir = opt?.output || config?.output?.dir || './data';
      let responseJSON = null;
      opt.response = opt.response || config?.output?.response;

      // check modelType
      switch (modelType) {
      case 'LORA':
      case 'LoCon':
      case 'DoRA':
        {
        // 拡張子を削除
          const loraname = filename.substring(0, filename.lastIndexOf('.'));
          outputDir = `${outputDir}/${mainDirectory}/${baseModelDirectory}/${subDirectory}`;
          opt.hash = config?.output?.lorahash;
          switch (conceptTag) {
          case 'character':
            responseJSON = {
              W: 0.1,
              C: opt.categories || [],
              series: opt.series || '',
              title: opt.title || '',
              lora: `<lora:${loraname}:0.7>`,
              prompt: info.trainedWords[0] || '',
              neg: '',
              V: info.trainedWords || ''
            };
            break;
          case 'concept':
          case 'poses':
            responseJSON = {
              W: 0.1,
              C: opt.categories || [],
              title: opt.title || '',
              member: opt.member || '${member}',
              V: `${info.trainedWords[0]} <lora:${loraname}:0.7>`,
              append: '',
              neg: '',
              multipy: 1
            };
            break;
          default:
            responseJSON = {
              W: 0.1,
              C: opt.categories || [],
              title: opt.title || '',
              V: `${info.trainedWords[0]} <lora:${loraname}:0.7>`
            };
          }
          responseJSON = JSON.stringify(responseJSON);
        }
        break;
      case 'VAE':
        outputDir = `${outputDir}/${mainDirectory}`;
        opt.hash = config?.output?.vaehash;
        break;
      case 'Checkpoint':
        outputDir = `${outputDir}/${mainDirectory}/${baseModelDirectory}`;
        opt.hash = config?.output?.modelhash;
        break;
      default:
        outputDir = `${outputDir}/${mainDirectory}`;
        opt.hash = config?.output?.modelhash;
        break;
      }
      this.setStatus(threadNumber, {
        status: 'info',
        message: `download ${filename} to ${outputDir}`
      });

      // check hash file
      if (opt.hash) {
        try {
          if (!fs.existsSync(opt.hash)) {
            fs.writeFileSync(opt.hash, '{}');
          }
          let hash = await fsPromises.readFile(opt.hash, 'utf8');
          hash = JSON.parse(hash);
          console.log(`hash[${autoV2Hash}]: ${autoV2Hash}`);
          if (hash) {
            if (hash[autoV2Hash] != null) {
              this.setStatus(threadNumber, {
                status: 'info',
                message: `always download ${filename}`
              });
              this.setStatus(threadNumber, {
                status: 'ok',
                message: `always download ${filename}`
              });
              return;
            }
          }
        } catch (e) {
          this.setStatus(threadNumber, {
            status: 'error',
            message: 'hash file not found'
          });
          throw new Error('hash file not found');
        }
      }

      // create temp filename
      const file = path.join(outputDir, filename);
      const tempDir = opt?.temp || config?.temp ||'./temp';
      fsPromises.mkdir(tempDir, {recursive: true});
      this.setStatus(threadNumber, {
        status: 'info',
        message: `download ${tempDir} to ${autoV2Hash}`
      });
      const tempFile = path.join(tempDir, `tmp_${autoV2Hash}`);

      // download file
      const downloadHeaders = createHeaders(opt);
      const filehash = crypto.createHash('sha256');
      const isExists = fs.existsSync(tempFile);
      let received = 0;

      if (isExists && opt.resume) {
        this.setStatus(threadNumber, {
          status: 'info',
          message: `file ${tempFile} is already exists try resuming download`
        });
        const f = await fsPromises.open(tempFile, 'r');
        const stream = f.createReadStream();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const chunk = stream.read(1024 * 1024);
          if (chunk) {
            filehash.update(chunk);
            received += chunk.length;
          } else {
            break;
          }
        }
        this.setStatus(threadNumber, {
          status: 'info',
          message: `received ${received} bytes`
        });
        await f.close();
        downloadHeaders['Range'] = `bytes=${received}-`;
      }
      const response = await fetch(url, {headers: downloadHeaders});
      if (!response.ok) {
        const error = await response.text();
        if (response.status == 416) {
          this.setStatus(threadNumber, {
            status: 'info',
            message: 'file is already downloaded'
          });
        } else {
          this.setStatus(threadNumber, {
            status: 'error',
            message: `HTTP error! status: ${response.status} ${error}`
          });
          throw new Error(`HTTP error! status: ${response.status} ${error}`);
        }
      } else {
        const contentLength = response.headers.get('Content-Length');
        const reader = response.body.getReader();
        const total = parseInt(contentLength, 10);

        const f = isExists ? await fsPromises.open(tempFile, 'a') :  await fsPromises.open(tempFile, 'w');
        const startTime = new Date().getTime();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            break;
          }
          filehash.update(value);
          await f.write(value);
          received += value.length;
          //
          const lapTime = new Date().getTime();
          const elapsedTime = (lapTime - startTime) / 1000;
          this.setStatus(threadNumber, {
            status: 'downloading',
            // eslint-disable-next-line max-len
            message: `Received ${received} of ${total} ${Math.floor(received / total * 100)}% in ${elapsedTime} seconds`});
        }
        await f.close();
      }
      const sha256sum = filehash.digest('hex').toLowerCase();
      if ((sha256sum != sha256) && !opt.force) {
        this.setStatus(threadNumber, {
          status: 'error',
          message: `hash error ${sha256} != ${sha256sum}`
        });
        fs.unlink(tempFile);
        throw new Error(`hash error ${sha256} != ${sha256sum}`);
      }
      process.stdout.write('\n');
      const filebase = filename.substring(0, filename.lastIndexOf('.'));

      if (opt.response && responseJSON != null) {
        try {
          await fsPromises.appendFile(opt.response, responseJSON + '\n');
        } catch (e) {
          this.setStatus(threadNumber, {
            status: 'warning',
            message: `response file ${opt.responce} is not found`}
          );
        }
      }

      // save info file
      await fsPromises.mkdir(outputDir, {recursive: true});
      const infoFile = filebase + '.civitai.info';
      await fsPromises.writeFile(path.join(outputDir, infoFile), JSON.stringify(info, null, 2));
      this.setStatus(threadNumber, `info file saved ${infoFile}`);

      // save preview image
      const imageFile = filebase + '.preview.png';
      const images = info.images.filter((image) => image.type == 'image');
      const imageUrl = images[0]?.url.replace('.jpeg', '.png');
      this.setStatus(threadNumber, `imageUrl: ${imageUrl}`);
      try {
        const headers = createHeaders(opt);
        const imageResponse = await fetch(imageUrl, {headers: headers});
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fsPromises.writeFile(path.join(outputDir, imageFile), buffer);
        this.setStatus(threadNumber, `preview downloaded ${file}`);
      } catch (e) {
        this.setStatus(threadNumber, 'preview download error:', e);
      }

      // move model file
      let renameCount = 0;
      let saveFile = file;
      while (fs.existsSync(saveFile)) {
        saveFile = `${filebase}_${++renameCount}${path.extname(file)}`;
        saveFile = path.join(outputDir, saveFile);
      }
      await fsPromises.rename(tempFile, saveFile);
      this.setStatus(threadNumber, 'responseJSON:', responseJSON);

      // update hash file
      if (opt.hash) {
        const hashtext = await fsPromises.readFile(opt.hash, 'utf8');
        const hash = JSON.parse(hashtext);
        const v2hash = autoV2Hash == '' ? sha256sum.substring(0, 10) : autoV2Hash;
        if (autoV2Hash) {
          if (modelType == 'Checkpoint') {
            hash[autoV2Hash] = filebase;
          } else {
            hash[autoV2Hash] = filename;
          }
        } else {
          hash[v2hash] = filename;
        }
        await fsPromises.rename(opt.hash, opt.hash + '.bak');
        await fsPromises.writeFile(opt.hash, JSON.stringify(hash, null, 2));
      }
      this.setStatus(threadNumber, {
        status: 'ok',
        filename: saveFile
      });
      return {
        status: 'ok',
        filename: saveFile
      };
    } catch (e) {
      console.log('Error:', e);
      this.setStatus(threadNumber, {
        status: 'error',
        error: e
      });
      return {
        status: 'error',
        error: e
      };
    }
  }

}

/*
const requireOptions = {
  // Checkpoint, TextualInversion, Hypernetwork, AestheticGradient, LORA, Controlnet, Poses
  types: ['Checkpoint', 'TextualInversion', 'Hypernetwork', 'AestheticGradient', 'LORA', 'Controlnet', 'Poses',
    'LoCon', 'DoRA', 'VAE'
  ],
  sort: ['Most Downloaded', 'Relevancy', 'Most Liked', 'Newest', 'Oldest', 'Most Discussed',
    'Most Collected', 'Most Buzz'],
  models: ['Pony', 'SD 1.4', 'SD 1.5', 'SD 1.5 Hpyter', 'SD 1.5 LCM', 'SD 2.0', 'SD 2.0', 'SD 2.0 768',
    'SD 2.1', 'SD 2.1 768', 'SD 2.1 Unclip', 'SD 3', 'SDXL 0.9', 'SDXL 1.0', 'SDXL LCM',
    'SDXL Disttilled', 'SDXL Hyper', 'SDXL Lightning', 'SDXL Turbo', 'SVD', 'SVD XT',
    'Stable Cascade'],
  // period (OPTIONAL)	enum (AllTime, Year, Month, Week, Day)
  period: ['AllTime', 'Year', 'Month', 'Week', 'Day']
};
*/

const baseTag = ['character', 'style', 'concept', 'clothing', 'poses'];

async function getModelVersionInfo(modelId, opt) {
  const headers = createHeaders(opt);
  const url = `${civitaiUrl}/api/v1/model-versions/${modelId}`;
  const response = await fetch(url, {headers: headers});
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP error! status: ${response.status} ${error}`);
  }
  return await response.json();
}


async function getModelInfo(modelId, opt) {
  const headers = createHeaders(opt);
  const url = `${civitaiUrl}/api/v1/models/${modelId}`;
  const response = await fetch(url, {headers: headers});
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP error! status: ${response.status} ${error}`);
  }
  return await response.json();
}

/* model download
 * @param {string} url            model version url
 * @param {object} opt            options
 * @param {string} opt.output     output directory
 * @param {string} opt.apiKey     civitai api key
 * @param {string} opt.temp       temp directory
 * @param {string} opt.hash       hash file(if metadata hash in this file, skip download)
 * @param {boolean} opt.force     force download(ignore hash check)
 * @param {boolean} opt.resume    resume download
 * @returns {Promise<void>}
 *
 * Underoptions only for private use
 * @param {string} opt.title      private response title
 * @param {string} opt.response   private response file(.jsonl)
 * @param {string} opt.categories private response categories
 * @param {string} opt.member     private response member name
 */
async function modelDownload(url, opt) {
  try {
    const modelVersionId = url.split('/').pop();
    const info = await getModelVersionInfo(modelVersionId, opt);
    const modelInfo = await getModelInfo(info.modelId, opt);
    const tags = modelInfo.tags;
    let conceptTag = '';
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      if (baseTag.includes(tag)) {
        conceptTag = tag;
        break;
      }
    }
    // opt.resume = true;
    const baseModel = config?.mapper[info.baseModel] || info.baseModel;
    const modelName = info?.model?.name;
    const downloadFile = info.files.filter((file) => file.primary)[0];

    const autoV2Hash = downloadFile.hashes.AutoV2 ? downloadFile.hashes.AutoV2.toLowerCase() : '';
    const sha256 = downloadFile.hashes.SHA256 ? downloadFile.hashes.SHA256.toLowerCase() : '';
    if (sha256 == '') {
      console.log('SHA256 hash not found, force download');
      opt.force = true;
    }
    const filename = downloadFile.name;
    const modelType = info?.model?.type;
    console.log(`model: ${modelName} baseModel: ${baseModel} conceptTag: ${conceptTag}`);
    const mainDirectory = config?.mapper[modelType] || modelType;
    const baseModelDirectory = config?.mapper[baseModel] || baseModel;
    const subDirectory = config?.mapper[conceptTag] || conceptTag;
    let outputDir = opt?.output || config?.output?.dir || './data';
    let responseJSON = null;
    opt.response = opt.response || config?.output?.response;

    // check modelType
    switch (modelType) {
    case 'LORA':
    case 'LoCon':
    case 'DoRA':
      {
      // 拡張子を削除
        const loraname = filename.substring(0, filename.lastIndexOf('.'));
        outputDir = `${outputDir}/${mainDirectory}/${baseModelDirectory}/${subDirectory}`;
        opt.hash = config?.output?.lorahash;
        switch (conceptTag) {
        case 'character':
          responseJSON = {
            W: 0.1,
            C: opt.categories || [],
            series: opt.series || '',
            title: opt.title || '',
            lora: `<lora:${loraname}:0.7>`,
            prompt: info.trainedWords[0] || '',
            neg: '',
            V: info.trainedWords || []
          };
          break;
        case 'concept':
        case 'poses':
          responseJSON = {
            W: 0.1,
            C: opt.categories || [],
            title: opt.title || '',
            member: opt.member || '${member}',
            V: `${info.trainedWords[0]} <lora:${loraname}:0.8>`,
            append: '',
            neg: '',
            multipy: 1
          };
          break;
        default:
          responseJSON = {
            W: 0.1,
            C: opt.categories || [],
            title: opt.title || '',
            V: `${info.trainedWords[0]} <lora:${loraname}:0.8>`
          };
        }
        responseJSON = JSON.stringify(responseJSON);
      }
      break;
    case 'VAE':
      outputDir = `${outputDir}/${mainDirectory}`;
      opt.hash = config?.output?.vaehash;
      break;
    case 'Checkpoint':
      outputDir = `${outputDir}/${mainDirectory}/${baseModelDirectory}`;
      opt.hash = config?.output?.modelhash;
      break;
    default:
      outputDir = `${outputDir}/${mainDirectory}`;
      opt.hash = config?.output?.modelhash;
      break;
    }

    console.log(`download ${filename} to ${outputDir}`);

    // check hash file
    if (opt.hash) {
      try {
        if (!fs.existsSync(opt.hash)) {
          fs.writeFileSync(opt.hash, '{}');
        }
        let hash = await fsPromises.readFile(opt.hash, 'utf8');
        hash = JSON.parse(hash);
        console.log(`hash[${autoV2Hash}]: ${autoV2Hash}`);
        if (hash) {
          if (hash[autoV2Hash] != null) {
            console.log(`always download ${filename}`);
            return;
          }
        }
      } catch (e) {
        console.log('hash file not found', e);
        throw new Error('hash file not found');
      }
    }

    // create temp filename
    const file = path.join(outputDir, filename);
    const tempDir = opt?.temp || config?.temp ||'./temp';
    fsPromises.mkdir(tempDir, {recursive: true});
    console.log(`download ${tempDir} to ${autoV2Hash}`);
    const tempFile = path.join(tempDir, `tmp_${autoV2Hash}`);

    // download file
    const downloadHeaders = createHeaders(opt);
    const filehash = crypto.createHash('sha256');
    const isExists = fs.existsSync(tempFile);
    let received = 0;

    if (isExists && opt.resume) {
      console.log(`file ${tempFile} is already exists try resuming download`);
      const f = await fsPromises.open(tempFile, 'r');
      const stream = f.createReadStream();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const chunk = stream.read(1024 * 1024);
        if (chunk) {
          filehash.update(chunk);
          received += chunk.length;
        } else {
          break;
        }
      }
      console.log(`received ${received} bytes`);
      await f.close();
      downloadHeaders['Range'] = `bytes=${received}-`;
    }
    const response = await fetch(url, {headers: downloadHeaders});
    if (!response.ok) {
      const error = await response.text();
      if (response.status == 416) {
        console.log('file is already downloaded');
      } else {
        throw new Error(`HTTP error! status: ${response.status} ${error}`);
      }
    } else {
      const contentLength = response.headers.get('Content-Length');
      const reader = response.body.getReader();
      const total = parseInt(contentLength, 10);

      const f = isExists ? await fsPromises.open(tempFile, 'a') :  await fsPromises.open(tempFile, 'w');
      const startTime = new Date().getTime();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          break;
        }
        filehash.update(value);
        await f.write(value);
        received += value.length;
        //
        const lapTime = new Date().getTime();
        const elapsedTime = (lapTime - startTime) / 1000;
        process.stdout.write(
          `\rReceived ${received} of ${total} ${Math.floor(received / total * 100)}% in ${elapsedTime} seconds`);
      }
      await f.close();
    }
    const sha256sum = filehash.digest('hex').toLowerCase();
    if ((sha256sum != sha256) && !opt.force) {
      console.log(`\nhash error ${sha256} != ${sha256sum}`);
      fs.unlink(tempFile);
      throw new Error(`hash error ${sha256} != ${sha256sum}`);
    }
    process.stdout.write('\n');
    const filebase = filename.substring(0, filename.lastIndexOf('.'));

    if (opt.response && responseJSON != null) {
      try {
        await fsPromises.appendFile(opt.response, responseJSON + '\n');
      } catch (e) {
        console.log(`response file ${opt.responce} is not found`);
      }
    }

    // save info file
    await fsPromises.mkdir(outputDir, {recursive: true});
    const infoFile = filebase + '.civitai.info';
    await fsPromises.writeFile(path.join(outputDir, infoFile), JSON.stringify(info, null, 2));
    console.log(`info file saved ${infoFile}`);

    // save preview image
    const imageFile = filebase + '.preview.png';
    const images = info.images.filter((image) => image.type == 'image');
    const imageUrl = images[0]?.url.replace('.jpeg', '.png');
    console.log('imageUrl:', imageUrl);
    try {
      const headers = createHeaders(opt);
      const imageResponse = await fetch(imageUrl, {headers: headers});
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fsPromises.writeFile(path.join(outputDir, imageFile), buffer);
      console.log(`preview downloaded ${file}`);
    } catch (e) {
      console.log('preview download error:', e);
    }

    // move model file
    let renameCount = 0;
    let saveFile = file;
    while (fs.existsSync(saveFile)) {
      saveFile = `${filebase}_${++renameCount}${path.extname(file)}`;
      saveFile = path.join(outputDir, saveFile);
    }
    await fsPromises.rename(tempFile, saveFile);
    console.log('responseJSON:', responseJSON);

    // update hash file
    if (opt.hash) {
      const hashtext = await fsPromises.readFile(opt.hash, 'utf8');
      const hash = JSON.parse(hashtext);
      const v2hash = autoV2Hash == '' ? sha256sum.substring(0, 10) : autoV2Hash;
      if (autoV2Hash) {
        if (modelType == 'Checkpoint') {
          hash[autoV2Hash] = filebase;
        } else {
          hash[autoV2Hash] = filename;
        }
      } else {
        hash[v2hash] = filename;
      }
      await fsPromises.rename(opt.hash, opt.hash + '.bak');
      await fsPromises.writeFile(opt.hash, JSON.stringify(hash, null, 2));
    }
    return {
      status: 'ok',
      filename: saveFile
    };
  } catch (e) {
    console.log('Error:', e);
    return {
      status: 'error',
      error: e
    };
  }
}

async function getPage(url, headers={}) {
  const response = await fetch(url, {headers: headers});
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP error! status: ${response.status} ${error}`);
  }
  return  await response.json();
}

function filterItems(items, baseModel) {
  const filteredItems = items.filter((item) => {
    const modelVersions = item.modelVersions;
    const newModelVersions = modelVersions.filter(modelVersion => {
      return baseModel.includes(modelVersion.baseModel);
    });
    item.modelVersions = newModelVersions;
    return newModelVersions.length > 0;
  }
  );
  return filteredItems;
}

function createHeaders(opt) {
  const apiKey = opt.apiKey || '';
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey != '') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}


function createPayload(opt) {
  const query = opt.query || '';
  if (typeof(opt.tag) == 'string') {
    opt.tag = [opt.tag];
  }
  if (typeof(opt.types) == 'string') {
    opt.types = [opt.types];
  }
  const tags = opt.tag || [];
  const period = opt.period || 'Month';
  const sort = opt.sort || 'Most Downloaded';

  const types = opt.types.map((type) => `types=${type}`).join('&');
  const tag = tags.length == 0 ? '' : '&' + tags.map((tag) => `tag=${tag}`).join('&');


  const payload = {
    sort: sort,
    period: period,
    nsfw: true,
    limit: 20
  };

  if (query != '') {
    payload['query'] = query;
  }

  const optionKeys = [
    'username', 'parimalFileOnly', 'allowDerivatives',
    'allowDifferentLicenses', 'allowCommercialUse',
    'supportsGeneration'
  ];

  optionKeys.forEach((key) => {
    if (opt[key]) {
      payload[key] = opt[key];
    }
  });

  if (opt.username) {
    payload['username'] = opt.username;
  }

  const privateKeys = [
    'favarites', 'hidden'
  ];
  privateKeys.forEach((key) => {
    if (opt[key]) {
      if (payload.token) {
        payload[key] = opt[key];
      } else {
        console.log('You need to set apiKey to get private option');
        throw new Error('You need to set apiKey to get private option');
      }
    }
  });
  const url = `${civitaiUrl}/api/v1/models?${types}${tag}&${new URLSearchParams(payload)}`;
  return url;
}

async function getModels(opt) {
  try {
    const baseModel = opt.baseModel || ['Pony'];
    const loraType = ['LORA', 'LoCon', 'DoRA'];

    // const page = opt.page || 1;
    opt.types = opt.types || loraType;
    const maxNumber = opt.maxNumber || 100;

    const headers = createHeaders(opt);
    url = createPayload(opt);

    const items = [];
    console.log('fetch url:');
    const data = await getPage(url, headers);
    console.log('fetch data:');
    const metadata = data.metadata;
    const filteredItems = filterItems(data.items, baseModel, opt.nsfw);
    items.push(...filteredItems);
    let nextPage = metadata.nextPage;

    while (nextPage && items.length < maxNumber) {
      console.log(`download data ${items.length} / ${maxNumber}`);
      const nextData = await getPage(nextPage, headers);
      try {
        nextPage = nextData.metadata.nextPage;
        // eslint-disable-next-line no-unused-vars
      } catch (_) {
        console.log('no next page');
        break;
      }
      const filteredItems = filterItems(nextData.items, baseModel);
      items.push(...filteredItems);
      if (!nextPage) {
        console.log('no next page');
        break;
      }
    }

    return {
      status: 'ok',
      items: items,
      nextPage: nextPage,
      metadata: data.metadata
    };
  } catch (e) {
    console.log('Error:', e);
    return {
      status: 'error',
      error: e
    };
  }

}

function createHtmlFromItems(items) {
  const html = items.map((item) => {
    const modelVersion = item?.modelVersions[0];
    const civitaiUrl = `https://civitai.com/models/${item.id}`;
    const url = modelVersion?.downloadUrl;
    const images = modelVersion?.images.filter((image) => image.type == 'image');
    const imageUrl = images[0]?.url;
    // console.log('images:', JSON.stringify(modelVersion?.images, null, 2));
    const publishedAt = new Date(modelVersion?.publishedAt).toLocaleString();
    const trainedWords = modelVersion?.trainedWords || [];
    let html = `
      <div class="item">
        <div class="image"><img src="${imageUrl}" loading="lazy" /></div>
        <div class="inner">
          <div class="title">
            <a href="${civitaiUrl}" target="_blank"><h2>${item.name}</h2></a>
            <a href="${url}" style="display: none;" class="download"><h2>${item.id}</h2></a>
          </div>
          <div class="footer">
            <div class="version">version ${modelVersion.name} published at: ${publishedAt}</div>
            <details>
            <summary>Tags</summary>
            <div class="tags">${item.tags.join(', ')}</div>
            </details>
            <details>
            <summary>Trained Words</summary>
            <div class="trainWords">${trainedWords.join('<br>')}</div> 
            </details>
            <div class="description">
              <details>
              <summary>Description</summary>
              <div>${item.description}</div>
              </details>
            </div>
            <!-- ${JSON.stringify(modelVersion)} -->`;
    const modelVersions = item.modelVersions;
    if (modelVersions.length > 1) {
      html += `
            <div class="more_version">more version</div>`;
    }

    for (let i = 1; i < modelVersions.length; i++) {
      const modelVersion = modelVersions[i];
      const name = modelVersion.name;
      const publishedAt = new Date(modelVersion.publishedAt).toLocaleString();
      const url = modelVersion.downloadUrl;
      const trainedWords = modelVersion.trainedWords || [];
      html += `
            <div class="other-version" style="display:none">
              <details>
              <summary>Model Version ${name}</summary>
              <div class="more-inner">
                <a href="${url}" target="_blank">${name}</h2></a>
                <div>version ${name} Published at: ${publishedAt}</div>
                <div class="tags">${item.tags.join(', ')}</div>
                <details>
                <summary>Trained Words</summary>
                <div class="trainWords">${trainedWords.join('<br>')}</div>
                </details>
              </div>
              <details>
            </div>`;
    }
    html += `
    </div> <!-- footer -->
  </div> <!-- inner -->
</div> <!-- item -->`;
    return html;
  }).join('');

  return html;
}

async function createHtml(opt) {
  const result = await getModels(opt);
  const filebase = opt.filename || opt.query || opt?.tag?.join('-') || 'models';
  const cssbase = opt.cssbase || 'base.css';
  const jsbase = opt.jsbase || 'base.js';
  const items = result.items;
  const htmlHeader = `
  <DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Lora - ${filebase}</title>
    <link rel="stylesheet" href="${cssbase}">
  </head>
  <body>
  <header></header>
  <div class="tool-box"></div>
  <div class="container">
  `;
  const content = createHtmlFromItems(items);
  const htmlFooter = `
  </div>
  <footer></footer>
  <script src="${jsbase}" type="module"></script>
  </body>
  </html>
  `;
  const html = htmlHeader + content + htmlFooter;
  return html;
}

exports.getModels = getModels;
exports.createHtml = createHtml;
exports.createHtmlFromItems = createHtmlFromItems;
exports.modelDownload = modelDownload;
exports.Downloader = Downloader;