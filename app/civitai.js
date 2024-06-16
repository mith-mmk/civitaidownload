async function getNewModels(options) {
  const isFull = options.hasOwnProperty('json') && options.json == 'full';
  const payload = options.hasOwnProperty('payload') ? options.payload || {} : {};
  let types = options.hasOwnProperty('types') ? options.types : 'Checkpoint';
  const type = Array.isArray(types) ? options.types.join(',') : types;
  const maxPage = options['maxPage'] || 1;
  const outputJson = options.hasOwnProperty('filename') ? options.filename : 'civitai';
  payload['limit'] = 100;
  if (!payload.hasOwnProperty('sort')) {
      payload['sort'] = 'Newest';
  }
  if (types != null) {
      if (typeof (types) == 'string') {
          types = `&types=${types}`;
      } else if (Array.isArray(types)) {
          const array = types;
          types = '';
          array.forEach(elm => {
              types += `&types=${elm}`;
          });
      } else {
          types = '';
      }
  } else {
      types = '';
  }
  let allItems = [];
  let allFullItems = [];
  let page = 1;
  do {
      payload['page'] = page;
      const option = (new URLSearchParams(payload)).toString() + types;
      console.log(`Request ${type} ${page} page`);
      const response = await fetch(`${baseapi}/api/v1/models?${option}`)
      const json = await response.json();
      if (!json.hasOwnProperty('items')) {
          console.log('error!')
          console.log(JSON.stringify(json, null, 2));
          break;
      }

      allFullItems = allFullItems.concat(json.items);
      page++;
      if (json.metadata.totalPages < page) {
          break;
      }

  } while (page <= maxPage);

  if (options.hasOwnProperty('baseModel')) {
      const newAllFullItems = [];
      allFullItems.forEach(item => {
          const modelVersions = item.modelVersions;
          const newModelVersions = modelVersions.filter(modelVersion => {
              return options.baseModel.includes(modelVersion.baseModel);
          });
          console.log(`item ${item.name} ${newModelVersions.length}`);
          if (newModelVersions.length > 0) {
              item.modelVersions = newModelVersions;
              newAllFullItems.push(item);
          }
      });
      allFullItems = newAllFullItems;
  }
  // 重複チェック
  const hash = {};
  allFullItems = allFullItems.filter(item => {
      if (hash.hasOwnProperty(item.id)) {
          return false;
      }
      hash[item.id] = true;
      return true;
  });
  allItems = transrationShort(allFullItems);
  if (isFull) {
      writeJsonSync(allFullItems, `${outputJson}.json`);
  } else {
      writeJsonSync(allItems, `${outputJson}.json`);
  }
  try {
      const files = allItems.map(item => {
          if (item.modelVersions == null) {
              return {
                  itemName: item.name,
                  type: item.type,
                  hash: null,
                  word: null,
                  name: null,
                  url: null,
                  updatedAt: null,

              }
          }
          const files = item.modelVersions.files;
          let pos = 0;
          for (let i = 0; i < files.length; i++) {
              if (item.modelVersions.files[i]['primary']) {
                  pos = i;
                  break;
              }
          }
          return {
              itemName: item.name,
              type: item.type,
              hash: item.modelVersions?.files[pos]?.hash,
              words: item.modelVersions?.trainedWords,
              name: item.modelVersions?.files[pos]?.name,
              url: item.modelVersions?.files[pos]?.downloadUrl,
              publishedAt: item.modelVersions.publishedAt,
          }
      });
      let text = '#!/bin/sh\n';
      jsonlText = '';
      const bashFile = `${outputJson}.sh`
      const jsonlFile = `${outputJson}.jsonl`
      files.forEach(file => {
          if (file.url != null) {
              const name = file.name.split('.').slice(0, -1).join('');
              if (file.type == 'LORA' || file.type == 'LoCon' || file.type == 'DoRA') {
                  // use template.loraTemprate
                  jsonlText += `// ${file.itemName} ${name} ${file.publishedAt}\n`
                  file.words.forEach(word => {
                      data = {
                          W: 0.1,
                          C: "",
                          title: "",
                          lora: `<lora:${name}:0.7>`,
                          prompt: word,
                          new: "",
                          V: ["", `${word}<lora:${name}:0.7>`]
                      }
                      jsonlText += `${JSON.stringify(data)}\n`
                  });
              } else {
                  jsonlText += `// ${file.itemName} ${name} ${file.hash} ${file.publishedAt}\n`
              }
              text += `${SCRIPT} '${file.url}'\n\n`;
          }
      });
      try {
          if (bashFile != null) {
              const fd = fs.openSync(bashFile, 'w');
              fs.writeSync(fd, text);
              fs.closeSync(fd);
          }
      } catch (e) {
          console.error(`${bashFile} is write error`);
      }
      try {
          if (jsonlFile != null) {
              const fd = fs.openSync(jsonlFile, 'w');
              fs.writeSync(fd, jsonlText);
              fs.closeSync(fd);
          }
      } catch (e) {
          console.error(`${jsonlFile} is write error`);
      }
  } catch (e) {
      console.error(`${e}`);
  }
}