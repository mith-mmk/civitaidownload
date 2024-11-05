/* global document, console, Blob, URL, window */

class DownloadEditor {
  constructor(toolBox) {
    this.stragedata = [];
    const storage = window.localStorage;
    this.storage = storage;
    this.stragedata = storage.getItem('download');
    this.createToolBox(toolBox);
    if (!this.stragedata) {
      storage.setItem('download', this.stragedata);
    } else {
      this.checkItems();
    }
  }

  updateStrage() {
    document.addEventListener('strage', (event) => {
      if (event.key === 'download') {
        this.remakeTbody(event.newValue);
        this.setDownloadData(event.newValue);
      }
    });
  }

  clearTbody() {
    this.tbody.innerHTML = '';
  }

  remakeTbody(storagedata) {
    this.clearTbody();
    storagedata.forEach((item) => {
      const tr = document.createElement('tr');
      this.tbody.appendChild(tr);
      item.forEach((data) => {
        const td = document.createElement('td');
        td.innerText = data;
        tr.appendChild(td);
      });
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
    this.remakeTbody(this.storage.getItem('download'));
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
      this.storage.setItem('download', this.getDownloadData(event.target));
    });
    toolBox.appendChild(downText);
    const downloadButton = document.createElement('button');
    downloadButton.innerText = 'Download';
    downloadButton.className = 'download-button';
    downloadButton.addEventListener('click', (event) => {
      console.log('clicked:', event.target);
      let data = '';
      this.stragedata.forEach((item) => {
        data += `cget ${item.url} '${item?.title}' '${item?.category}' '${item?.series}'\n`;
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
      span.innerText = `cget ${item.url} '${item.title}' '${item.category}' '${item.series}\n'`;
      this.downText.appendChild(span);
      this.downText.appendChild(document.createElement('br'));
    });
  }

  getDownloadData(downText) {
    const texts = downText.innerText.split('\n');
    const data = [];
    texts.forEach((text) => {
      if (text) {
        const parts = text.split(' ');
        if (parts[0] === 'cget') {
          parts.shift();
          data.push(parts);
        }
      }
    });
    return data;
  }

  checkItems(downText) {
    const texts = downText.innerText.split('\n');
    const urls = [];
    texts.forEach((text) => {
      if (text) {
        const parts = text.split(' ');
        urls.push(parts[1]);
      }
    });
    const lists = document.querySelectorAll('.title .download');
    lists.forEach((list) => {
      if (urls.includes(list.innerText)) {
        const checkElm = document.createElement('span');
        checkElm.className = 'checked';
        checkElm.innerText = '✔';
        list.appendChild(checkElm);
      }
    });
  }

  createDowloadInput() {
    let data = '';
    const storagedata = this.storage.getItem('download');
    storagedata.forEach((item) => {
      const text = item.map((text) => `'${text}'`).split(' ');
      data += `<span>cget ${text}'</span><br>\n`;
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
    this.storage.setItem('download', data);
  }

  appendDownloadData(url, title='', category='', series='') {
    const data = [
      url,
      title,
      category,
      series
    ];
    this.stragedata.push(data);
    this.storage.setItem('download', this.stragedata);
  }

  upodateDownloadData(url, title='', category='', series='') {
    const data = [
      url,
      title,
      category,
      series
    ];
    this.stragedata = this.stragedata.map((item) => item.url === url ? data : item);
    this.storage.setItem('download', this.stragedata);
  }

  removeDownloadData(url) {
    this.stragedata = this.stragedata.filter((item) => item.url !== url);
    this.storage.setItem('download', this.stragedata);
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
    this.storage.setItem('download', []);
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
        downloadEditor.removeDownloadData(event.target.src);
        return;
      }
      const checkElm = document.createElement('span');
      checkElm.className = 'checked';
      checkElm.innerText = '✔';
      item.appendChild(checkElm);
      console.log('clicked:', event.target.src);
      const title = item.querySelector('.title');
      console.log('title:', title.innerText);
      const link = title.querySelector('a.download').href;
      const tilteText = title.innerText;
      title.addEventListener('click', (event) => {
        console.log('clicked:', event.target);
        event.stopPropagation();
      });
      downloadEditor.appendDownloadData(link, tilteText);
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