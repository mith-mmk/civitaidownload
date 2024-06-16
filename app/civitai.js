const { types } = require('util');

const config = {}
const civitaiUrl = 'https://civitai.com';

const requireOptions = {
  // Checkpoint, TextualInversion, Hypernetwork, AestheticGradient, LORA, Controlnet, Poses
  types: ['Checkpoint', 'TextualInversion', 'Hypernetwork', 'AestheticGradient', 'LORA', 'Controlnet', 'Poses',
      'LoCon', 'DoRA','VAE'
  ],
  sort: ['Most Downloaded', 'Relevancy', 'Most Liked', 'Newest', 'Oldest', 'Most Discussed',
    'Most Collected', 'Most Buzz'],
  models: ['Pony', 'SD 1.4', 'SD 1.5', 'SD 1.5 Hpyter', 'SD 1.5 LCM', 'SD 2.0', 'SD 2.0', 'SD 2.0 768', 
    'SD 2.1', 'SD 2.1 768', 'SD 2.1 Unclip', 'SD 3', 'SDXL 0.9', 'SDXL 1.0', 'SDXL LCM',
    'SDXL Disttilled', 'SDXL Hyper', 'SDXL Lightning', 'SDXL Turbo', 'SVD', 'SVD XT',
    'Stable Cascade']
}


async function getPage(url) {
  const response = await fetch(url);
  const data = await response.json();
  return data;    
}

function filterItems(items, baseModel) {
  const filteredItems = items.filter((item) => {
    const modelVersions = item.modelVersions;
    const newModelVersions = modelVersions.filter(modelVersion => {
      return baseModel.includes(modelVersion.baseModel);
    });
    return newModelVersions.length > 0;
  }
  );
  return filteredItems;
}


async function getLoras(opt) {
  const baseModel = opt.baseModel || ['Pony'];
  const loraType = opt.loraType || config.loraType || ['LORA', 'LoCon', 'DoRA'];
  // const page = opt.page || 1;
  const query = opt.query || '';
  const tags = opt.tag || [''];
  const period = opt.period || 'Year';
  const sort = opt.sort || 'Most Downloaded';
  const apiKey = opt.apiKey || config.apiKey || '';
  const max_number = opt.max_number || 100;

  const types = loraType.map((type) => `type=${type}`).join('&');
  const tag = tags.map((tag) => `tag=${tag}`).join('&');
  const payload = {
    sort: sort,
    period: period,
    limit: 20,
  };
  if (query != '') {
    payload['query'] = query;
  }
  if (apiKey != '') {
    payload['apiKey'] = apiKey;
  }

  const items = [];
  const url = `${civitaiUrl}/api/v1/models?${types}${tag}${new URLSearchParams(payload)}`
  const data = await getPage(url);
  const metadata = data.metadata;
  const filteredItems = filterItems(data.items, baseModel);
  items.push(...filteredItems);
  console.log(metadata);
  let nextPage = metadata.nextPage;

  while (nextPage && items.length < max_number) { 
    console.log(`download data ${items.length} / ${max_number}`);
    const nextData = await getPage(nextPage);
    nextPage = nextData.metadata.nextPage;
    const filteredItems = filterItems(nextData.items, baseModel);
    console.log(`filteredItems ${filteredItems.map((item) => item.name)}`);
    items.push(...filteredItems);
    if (!nextPage) {
      console.log('no next page');
      break;
    }
  }

  return {
    items: items,
    nextPage: nextPage,
    metadata: data.metadata,
  };
}

function createHtmlFromItems(items) {
  const html = items.map((item) => {
    const modelVersion = item.modelVersions[0];
    const url = modelVersion.downloadUrl;
    const imageUrl = modelVersion.images[0].url;
    const trainedWords = modelVersion.trainedWords || [];
    return `
      <div class="item">
        <div class="inner">
        <a href="${url}" target="_blank">
          <h2>${item.name}</h2>
          <div class="tags">${item.tags.join(', ')}</div>
          <div class="description">
            <details>
            <summary>Description</summary>
            <div>${item.description}</div>
            </details>
          <img src="${imageUrl}" />
          <details>
          <summary>Trained Words</summary>
          <div class="trainWords">${trainedWords.join('<br>')}</div> 
          </details>
        </a>
        <!-- ${JSON.stringify(item, null, 2)} -->
        </div>
      </div>
    `;
  }).join('');

  return html;
}

// node.js only
async function main() {
  if (typeof window !== 'undefined') {
    console.log('This is not node.js');
    return;
  }
  const fs = require('fs');
  const result = await getLoras({query: 'シャニマス', max_number: 10});
  const items = result.items;
  const htmlHeader = `
  <DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Lora</title>
    <style>
      h2 {
        color: #333;
        /* word overflow */
        overflow: hidden;
      }
      .item {
        display: inline-flex;
        margin: 10px;
        padding: 10px;
        border: 1px solid #ccc;
        width: 30%;
        /* word */
        word-wrap: break-word;
      }
      .inner {
        display: block;
      }
      .tags {
        color: #666;
      }
      .trainWords {
        color: #aaa;
        background-color: #222;
      }
      .description {
        color: #666;
      }
    </style>
  </head>
  `
  const content = createHtmlFromItems(items);
  const filename = 'data/loras.html';
  const htmlFooter = `
  </html>
  `
  const html = htmlHeader + content + htmlFooter;
  fs.writeFileSync(filename, html, 'utf8');
}

async function getCivitaiLora2Html(opt, max_number) {
  const result = await getLoras(opt);
  const items = result.items;
  html = createHtmlFromItems(items);
  return html;
}

main();