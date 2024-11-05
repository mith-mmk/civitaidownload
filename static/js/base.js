/* global document, console, Blob, URL, window */

class DownloadEditor {
  constructor(toolBox) {
    const storage = window.localStorage;
    this.storage = storage;
    this.createToolBox(toolBox);
    const storagedata = this.storage.getItem('download');
    if (!storagedata) {
      this.setStorageItem('download', '');
      this.storagedata = {};
    } else {
      try {
        this.storagedata = JSON.parse(storagedata);
        this.checkItems();
      } catch (e) {
        console.error('storagedata:', e);
        this.setStorageItem('download', '');
      }
    }
  }


  setStorageItem(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('setStorageItem:', e);
      this.storage.setItem(key, '{}');
    }
    const array = Object.keys(value).map((key) => value[key]);
    this.remakeTbody(array);
    this.setDownloadData(array);
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
      inputTitle.value = item.title || this.defaultTitle.value;
      tdTitle.appendChild(inputTitle);
      const tdCategory = document.createElement('td');
      const inputCategory = document.createElement('input');
      inputCategory.type = 'text';
      inputCategory.value = item.category || this.defaultCategory.value;
      tdCategory.appendChild(inputCategory);
      const tdSeries = document.createElement('td');
      const inputSeries = document.createElement('input');
      inputSeries.type = 'text';
      inputSeries.value = item.series || this.defaultSeries.value;
      inputSeries.type = 'text';
      inputSeries.value = item.series || this.defaultSeries.value;
      tdSeries.appendChild(inputSeries);

      inputTitle.addEventListener('change', (event) => {
        console.log('input:', event.target);
        const prop = {
          title: inputTitle.value,
          category: inputCategory.value,
          series: inputSeries.value
        };
        this.updateDownloadData(item.url, prop);
      });
      inputCategory.addEventListener('change', (event) => {
        console.log('input:', event.target);
        const prop = {
          title: inputTitle.value,
          category: inputCategory.value,
          series: inputSeries.value
        };
        this.updateDownloadData(item.url, prop);
      });
      inputCategory.addEventListener('change', (event) => {
        console.log('input:', event.target);
        const prop = {
          title: inputTitle.value,
          category: inputCategory.value,
          series: inputSeries.value
        };
        this.updateDownloadData(item.url, prop);
      });
      inputSeries.addEventListener('change', (event) => {
        console.log('input:', event.target);
        const prop = {
          title: inputTitle.value,
          category: inputCategory.value,
          series: inputSeries.value
        };
        this.updateDownloadData(item.url, prop);
      });

      const tdOrigin = document.createElement('td');
      tdOrigin.innerText = item.origin;
      tr.appendChild(tdUrl);
      tr.appendChild(tdTitle);
      tr.appendChild(tdCategory);
      tr.appendChild(tdSeries);
      tr.appendChild(tdOrigin);
      this.tbody.appendChild(tr);
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
    const headers = ['URL', 'title', 'category', 'TITLE', 'SERIES', 'ORIGIN'];
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.innerText = header;
      toolTr.appendChild(th);
    });
    const tbody = document.createElement('tbody');
    toolTable.appendChild(tbody);
    this.tbody = tbody;
    this.remakeTbody(this.storagedata);
    const inputTool = document.createElement('div');
    inputTool.className = 'input-tool';
    inputTool.style.display = 'flex';
    toolBox.appendChild(inputTool);
    const defaultTitle = document.createElement('input');
    defaultTitle.type = 'text';
    defaultTitle.value = '()-Lora';
    this.defaultTitle = defaultTitle;
    inputTool.appendChild(defaultTitle);
    const defaultCategory = document.createElement('input');
    defaultCategory.type = 'text';
    defaultCategory.value = '';
    this.defaultCategory = defaultCategory;
    inputTool.appendChild(defaultCategory);
    const defaultSeries = document.createElement('input');
    defaultSeries.type = 'text';
    defaultSeries.value = '';
    this.defaultSeries = defaultSeries;
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
      const storagedata = this.storagedata;
      if (!storagedata) {
        return;
      }
      const array = Object.keys(storagedata).map((key) => storagedata[key]);
      array.forEach((item) => {
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
    this.downText.innerHTML = '';
    data.forEach((item) => {
      const span = document.createElement('span');
      span.innerText = `cget ${item.url} ${item.title || ''} ${item.category || ''} ${item.series || ''}`;
      this.downText.appendChild(span);
      this.downText.appendChild(document.createElement('br'));
    });
  }

  checkItems() {
    const storagedata = this.storagedata;
    if (!storagedata) {
      return;
    }
    const urls = Object.keys(storagedata);
    const array = Object.keys(storagedata).map((key) => storagedata[key]);
    const lists = document.querySelectorAll('.title .download');
    lists.forEach((list) => {
      if (urls.includes(list.href)) {
        const checkElm = document.createElement('span');
        checkElm.className = 'checked';
        checkElm.innerText = '✔';
        const parent = list.parentElement;
        parent.appendChild(checkElm);
      }
    });
    this.setDownloadData(array);
    this.createDowloadInput(array);
  }

  createDowloadInput() {
    let data = '';
    const storagedata = this.storagedata;
    const array = Object.keys(storagedata).map((key) => storagedata[key]);
    array.forEach((item) => {
      data += `<span>cget ${item.url} '${item.title}' '${item.category}' '${item.series}'</span><br>\n`;
    });
    this.downText.innerHTML = data;
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
    const storagedata = this.storagedata;
    if (!storagedata) {
      this.storagedata = {};
      this.storagedata[url] = data;
      this.setStorageItem('download', this.storagedata);
    } else {
      // find url
      if (!storagedata[url]) {
        storagedata[url] = data;
        this.setStorageItem('download', storagedata);
      }
    }
  }


  updateDownloadData(url, properties) {
    console.log('updateDownloadData:', url, properties);
    const storagedata = this.storagedata;
    if (!storagedata) {
      return;
    }
    const data = {
      url
    };
    this.appendProperty(data, properties);
    storagedata[url] = data;
    this.setStorageItem('download', storagedata);
  }

  removeDownloadData(url) {
    const storagedata = this.storagedata;
    if (!storagedata) {
      return;
    }
    delete storagedata[url];
    this.setStorageItem('download', storagedata);
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
    this.setStorageItem('download', {});
    this.storage.clear();
    this.storagedata = {};
  }
}



function itemsInit() {
  const toolBox = document.querySelector('.tool-box');
  const downloadEditor = new DownloadEditor(toolBox);
  // downloadEditor.updateStorage();
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
      const title = item.querySelector('.title');
      console.log('title:', title.innerText);
      const link = title.querySelector('a.download').href;
      const tilteText = title.innerText;
      console.log('clicked:', event.target.src);
      title.addEventListener('click', (event) => {
        console.log('clicked:', event.target);
        event.stopPropagation();
      });
      downloadEditor.appendDownloadData(link, {origin:tilteText});
      const checkElm = document.createElement('span');
      checkElm.className = 'checked';
      checkElm.innerText = '✔';
      title.appendChild(checkElm);
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