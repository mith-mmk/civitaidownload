/* global document, console, Blob, URL, window */

class DownloadEditor {
  constructor(toolBox) {
    const storage = window.localStorage;
    this.storage = storage;
    this.createToolBox(toolBox);
    if (!this.storage.getItem('download')) {
      this.setStorageItem('download', []);
    } else {
      this.checkItems();
    }
    this.updateStorage();
  }

  getStorageItem(key) {
    try {
      const item = this.storage.getItem(key);
      console.log('storagedata:', item);
      return JSON.parse(item);
    } catch (e) {
      console.error('getStorageItem:', e);
      return null;
    }
  }

  setStorageItem(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('setStorageItem:', e);
    }
  }

  updateStorage() {
    document.addEventListener('storage', (event) => {
      console.log('Storage event fired:', event);
      if (event.key === 'download') {
        console.log('new storage:', event.newValue);
        this.remakeTbody(event.newValue);
        this.setDownloadData(event.newValue);
      }
    });
  }

  clearTbody() {
    this.tbody.innerHTML = '';
  }

  remakeTbody(storagedata) {
    if (!storagedata) {
      return;
    }
    this.clearTbody();
    storagedata.forEach((item) => {
      const tr = document.createElement('tr');
      const tdUrl = document.createElement('td');
      tdUrl.innerText = item.url;
      const tdTitle = document.createElement('td');
      const inputTitle = document.createElement('input');
      inputTitle.type = 'text';
      inputTitle.value = item.title || this.defaultTitle;
      tdTitle.appendChild(inputTitle);
      const tdCategory = document.createElement('td');
      const inputCategory = document.createElement('input');
      inputCategory.type = 'text';
      inputCategory.value = item.category || this.defaultCategory;
      tdCategory.appendChild(inputCategory);
      const tdSeries = document.createElement('td');
      const inputSeries = document.createElement('input');
      inputSeries.type = 'text';
      inputSeries.value = item.series || this.defaultSeries;
      const tdOrigin = document.createElement('td');
      tdOrigin.innerText = item.origin;
      tdSeries.appendChild(inputSeries);
      tr.appendChild(tdUrl);
      tr.appendChild(tdTitle);
      tr.appendChild(tdCategory);
      tr.appendChild(tdSeries);
      tr.appendChild(tdOrigin);
    });
  }

  createToolBox(toolBox) {
    const toolTable = document.createElement('table');
    toolTable.className = 'tool-table';
    toolBox.appendChild(toolTable);
    const thead = document.createElement('thead');
    const toolTr = document.createElement('tr');
    toolTable.appendChild(thead);
    thead.appendChild(toolTr);
    const headers = ['URL', 'title', 'category', 'TITLE', 'SERIES'];
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.innerText = header;
      toolTr.appendChild(th);
    });
    const tbody = document.createElement('tbody');
    toolTable.appendChild(tbody);
    this.tbody = tbody;
    this.remakeTbody(this.getStorageItem('download'));
    const inputTool = document.createElement('div');
    inputTool.className = 'input-tool';
    inputTool.style.display = 'flex';
    toolBox.appendChild(inputTool);
    const defaultTitle = document.createElement('input');
    defaultTitle.type = 'text';
    defaultTitle.value = '()-Lora';
    inputTool.appendChild(defaultTitle);
    const defaultCategory = document.createElement('input');
    defaultCategory.type = 'text';
    defaultCategory.value = '';
    inputTool.appendChild(defaultCategory);
    const defaultSeries = document.createElement('input');
    defaultSeries.type = 'text';
    defaultSeries.value = '';
    inputTool.appendChild(defaultSeries);
    const downText = document.createElement('div');
    downText.className = 'down-text';
    downText.contentEditable = true;
    downText.addEventListener('input', (event) => {
      console.log('input:', event.target);
      this.setStorageItem('download', this.getDownloadData(event.target));
    });
    toolBox.appendChild(downText);
    const downloadButton = document.createElement('button');
    downloadButton.innerText = 'Download';
    downloadButton.className = 'download-button';
    downloadButton.addEventListener('click', (event) => {
      console.log('clicked:', event.target);
      let data = '';
      const storagedata = this.getStorageItem('download');
      if (!storagedata) {
        return;
      }
      storagedata.forEach((item) => {
        data += `cget '${item.url}' '${item.title || ''}' '${item.category || ''}' '${item.series || ''}'\n`;
      });
      const blob = new Blob([data], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'download.txt';
      a.click();
      URL.revokeObjectURL(url);
    });
    toolBox.appendChild(downloadButton);
    const clearButton = document.createElement('button');
    clearButton.innerText = 'Clear';
    clearButton.className = 'clear-button';
    clearButton.addEventListener('click', (event) => {
      console.log('clicked:', event.target);
      this.clearDownloadData();
    });
    toolBox.appendChild(clearButton);

    const header = document.querySelector('header');
    const headrA = document.createElement('a');
    headrA.name = 'header';
    headrA.innerText = '';
    header.appendChild(headrA);

    const gotop = document.createElement('div');
    gotop.className = 'gotop';
    gotop.innerHTML = '<a href="#header">▲</a>';
    document.body.appendChild(gotop);

    this.toolTable = toolTable;
    this.downText = downText;
    this.tbody = tbody;
    this.header = headrA;
    this.gotop = gotop;
    this.downloadButton = downloadButton;
    this.clearButton = clearButton;
  }

  setDownloadData(data) {
    data.forEach((item) => {
      const span = document.createElement('span');
      span.innerText = `cget ${item.url} '${item.title}' '${item.category}' '${item.series}'`;
      this.downText.appendChild(span);
      this.downText.appendChild(document.createElement('br'));
    });
  }

  getDownloadData(downText) {
    const texts = downText.innerText.split('\n');
    const data = [];
    texts.forEach((text) => {
      const item = {};
      if (text) {
        const parts = text.split(' ');
        if (parts[0] === 'cget') {
          parts.shift();
          item.url = parts.shift();
          item.title = parts.shift();
          item.category = parts.shift();
          item.series = parts.shift();
        }
      }
    });
    return data;
  }

  checkItems() {
    const storagedata = this.setStorageItem('download');
    if (!storagedata) {
      return;
    }
    const urls = storagedata.map((item) => item.url);

    const lists = document.querySelectorAll('.title .download');
    lists.forEach((list) => {
      if (urls.includes(list.innerText)) {
        const checkElm = document.createElement('span');
        checkElm.className = 'checked';
        checkElm.innerText = '✔';
        const parent = list.parentElement;
        parent.appendChild(checkElm);
      }
    });
  }

  createDowloadInput() {
    let data = '';
    const storagedata = this.getStorageItem('download');
    storagedata.forEach((item) => {
      data += `<span>cget ${item.url} '${item.title}' '${item.category}' '${item.series}'</span><br>\n`;
    });
    this.downText.innerHTML = data;
  }

  updateInput() {
    const text = this.downText.innerText;
    const lines = text.split('\n');
    const data = [];
    lines.forEach((line) => {
      if (line) {
        const parts = line.split(' ').slice(1);
        data.push(parts);
      }
    });
    this.setStorageItem('download', data);
  }

  appendProperty(data, properties) {
    if (properties) {
      Object.keys(properties).forEach((key) => {
        data[key] = properties[key];
      });
    }
    return data;
  }

  appendDownloadData(url, properties) {
    const data = {
      url
    };
    this.appendProperty(data, properties);
    const storagedata = this.getStorageItem('download');
    if (!storagedata) {
      this.setStorageItem('download', [data]);
    } else {
      storagedata.push(data);
      this.setStorageItem('download', storagedata);
    }
  }


  upodateDownloadData(url, properties) {
    const storagedata = this.getStorageItem('download');
    if (!storagedata) {
      return;
    }
    const data = {
      url
    };
    this.appendProperty(data, properties);
    this.setStorageItem('download', storagedata.map((item) => item.url === url ? data : item));
  }

  removeDownloadData(url) {
    const storagedata = this.getStorageItem('download');
    if (!storagedata) {
      return;
    }
    this.setStorageItem('download', storagedata.filter((item) => item.url !== url));
  }

  clearDownloadData() {
    this.downText.innerHTML = '';
    // search checked
    const titles = document.querySelectorAll('.title');
    titles.forEach((title) => {
      const checkElm = title.querySelector('.checked');
      if (checkElm) {
        checkElm.remove();
      }
    });
    // clear webstorage
    this.setStorageItem('download', []);
    this.storage.clear();
  }
}



function itemsInit() {
  const toolBox = document.querySelector('.tool-box');
  const downloadEditor = new DownloadEditor(toolBox);
  const items = document.querySelectorAll('.item');
  items.forEach((item) => {
    item.addEventListener('click', (event) => {
      // checked?
      if (event.target.querySelector('.checked')) {
        const checkElm = event.target.querySelector('.checked');
        checkElm.remove();
        const title = item.querySelector('.title');
        const link = title.querySelector('a.download').href;
        downloadEditor.removeDownloadData(link);
        return;
      }
      const checkElm = document.createElement('span');
      checkElm.className = 'checked';
      checkElm.innerText = '✔';
      console.log('clicked:', event.target.src);
      const title = item.querySelector('.title');
      title.appendChild(checkElm);
      console.log('title:', title.innerText);
      const link = title.querySelector('a.download').href;
      const tilteText = title.innerText;
      title.addEventListener('click', (event) => {
        console.log('clicked:', event.target);
        event.stopPropagation();
      });
      downloadEditor.appendDownloadData(link, {origin:tilteText});
    });
  });

  const versions = document.querySelectorAll('.more_version');
  versions.forEach((version) => {
    version.addEventListener('click', (event) => {
      console.log('clicked:', event.target);
      event.stopPropagation();
      const otherVersions = version.parentElement.querySelectorAll('.other-version');
      otherVersions.forEach((otherVersion) => {
        otherVersion.style.display = otherVersion.style.display === 'none' ? 'block' : 'none';
      });
    });
  });

  const allDetails = document.querySelectorAll('summary > div');
  allDetails.forEach((details) => {
    details.addEventListener('click', (event) => {
      console.log('clicked:', event.target);
      event.stopPropagation();
      details.open = !details.open;
    });
  });
}

itemsInit();