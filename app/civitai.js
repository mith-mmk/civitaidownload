/* eslint-disable no-undef */
const civitaiUrl = 'https://civitai.com';

// eslint-disable-next-line no-unused-vars
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
    'Stable Cascade'],
  // period (OPTIONAL)	enum (AllTime, Year, Month, Week, Day)
  period: ['AllTime', 'Year', 'Month', 'Week', 'Day'],
};


async function getPage(url) {
  const response = await fetch(url);
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


async function getLoras(opt) {
  const baseModel = opt.baseModel || ['Pony'];
  const loraType = ['LORA', 'LoCon', 'DoRA'];
  // const page = opt.page || 1;
  const query = opt.query || '';
  const tags = opt.tag || [];
  const period = opt.period || 'Month';
  const sort = opt.sort || 'Most Downloaded';
  const apiKey = opt.apiKey || config.apiKey || '';
  const max_number = opt.max_number || 100;

  const types = loraType.map((type) => `types=${type}`).join('&');
  const tag = tags.length == 0 ? '' : '&' + tags.map((tag) => `tag=${tag}`).join('&');
  const payload = {
    sort: sort,
    period: period,
    nsfw: true,
    limit: 20,
  };  
  if (query != '') {
    payload['query'] = query;
  }

  const optionKeys = [
    'username', 'parimalFileOnly', 'allowDerivatives',
    'allowDifferentLicenses', 'allowCommercialUse',
    'supportsGeneration'
  ]

  optionKeys.forEach((key) => {
    if (opt[key]) {
      payload[key] = opt[key];
    }
  });
  
  if (opt.username) {
    payload['username'] = opt.username;
  }

  if (apiKey != '') {
    payload['token'] = apiKey;
  }

  const privateKeys = [
    'favarites', 'hidden', 
  ]
  privateKeys.forEach((key) => {
    if (opt[key]) {
      if (payload.hasOwnProperty('token')) {
        payload[key] = opt[key];
      } else {
        console.log('You need to set apiKey to get private option');
        throw new Error('You need to set apiKey to get private option');
      }
    }
  });

  const items = [];
  const url = `${civitaiUrl}/api/v1/models?${types}${tag}&${new URLSearchParams(payload)}`;
  console.log('fetch url:');
  const data = await getPage(url);
  console.log('fetch data:');
  const metadata = data.metadata;
  const filteredItems = filterItems(data.items, baseModel, opt.nsfw);
  items.push(...filteredItems);
  let nextPage = metadata.nextPage;

  while (nextPage && items.length < max_number) { 
    console.log(`download data ${items.length} / ${max_number}`);
    const nextData = await getPage(nextPage);
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
    items: items,
    nextPage: nextPage,
    metadata: data.metadata,
  };
}

function createHtmlFromItems(items) {
  const html = items.map((item) => {
    const modelVersion = item?.modelVersions[0];
    const url = modelVersion?.downloadUrl;
    const images = modelVersion?.images.filter((image) => image.type == 'image');
    const imageUrl = images[0]?.url;
    // console.log('images:', JSON.stringify(modelVersion?.images, null, 2));
    const publishedAt = new Date(modelVersion?.publishedAt).toLocaleString();
    const trainedWords = modelVersion?.trainedWords || [];
    let html = `
      <div class="item">
        <div class="image"><img src="${imageUrl}"/></div>
        <div class="inner">
          <div class="title">
            <a href="${url}" target="_blank"><h2>${item.name}</h2></a>
          </div>
          <div class="footer">
            <div class="version">version ${modelVersion.name} published at: ${publishedAt}</div>
            <div class="tags">${item.tags.join(', ')}</div>
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
    for(let i = 1; i < modelVersions.length; i++) {
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
  const result = await getLoras(opt);
  const filebase = opt.query || opt.tag[0] || 'loras';
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

exports.getLoras = getLoras;
exports.createHtml = createHtml;
exports.createHtmlFromItems = createHtmlFromItems;
