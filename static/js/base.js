/* global document, console, Blob, URL, window */

// webstorage
const storage = window.localStorage;

const toolBox = document.querySelector('.tool-box');
const toolTable = document.createElement('table');
toolTable.className = 'tool-table';
toolBox.appendChild(toolTable);
const thead = document.createElement('thead');
const toolTr = document.createElement('tr');
toolTable.appendChild(thead);
thead.appendChild(toolTr);
const headers = ['URL', 'title', 'category', 'TITLE'];
headers.forEach((header) => {
  const th = document.createElement('th');
  th.innerText = header;
  toolTr.appendChild(th);
});
const tbody = document.createElement('tbody');
toolTable.appendChild(tbody);
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
const downText = document.createElement('div');
downText.className = 'down-text';
// from webstorage
const data = storage.getItem('downloadData');
if (data) {
  downText.innerHTML = data;
}
toolBox.appendChild(downText);
const downloadButton = document.createElement('button');
downloadButton.innerText = 'Download';
downloadButton.className = 'download-button';
downloadButton.addEventListener('click', (event) => {
  console.log('clicked:', event.target);
  const data = downText.innerText;
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
  clearDownloadData();
});
toolBox.appendChild(clearButton);

const header = document.querySelector('header');
const headrA = document.createElement('a');
headrA.innerText = '';
header.appendChild(headrA);

const gotop = document.createElement('div');
gotop.className = 'gotop';
gotop.innerHTML = '<a href="#header">▲</a>';
document.body.appendChild(gotop);

/*
window.addEventListener("scroll", function () {
  var elm = document.querySelector('.gotop');
  if(elm) {
      if (document.body.scrollTop < 100) {
          elm.style.display = "none"
      } else {
          elm.style.display = "block"
      }
  }
});
*/

function createDownloadData() {
  console.log('createDownloadData');
  const tbody = toolTable.querySelector('tbody');
  const trs = tbody.querySelectorAll('tr');
  let data = '';
  // from webstorage
  data += storage.getItem('downloadData');
  trs.forEach((tr) => {
    console.log('tr:', tr);
    const tds = tr.querySelectorAll('td');
    console.log('tds:', tds);
    console.log('data:', tds[0].innerText, tds[1].querySelector('input').value, tds[2].querySelector('input').value);
    // eslint-disable-next-line max-len
    data += `<span>cget ${tds[0].innerText} '${tds[1].querySelector('input').value}' ${tds[2].querySelector('input').value}</span><br>`;
  });
  downText.innerHTML = data;
  // to webstorage
  storage.setItem('downloadData', data);
}

function clearDownloadData() {
  downText.innerHTML = '';
  // search checked
  const titles = document.querySelectorAll('.title');
  titles.forEach((title) => {
    const checkElm = title.querySelector('.checked');
    if (checkElm) {
      checkElm.remove();
    }
  });
  // clear webstorage
  storage.clear();
}

const items = document.querySelectorAll('.item');
items.forEach((item) => {
  item.addEventListener('click', (event) => {
    console.log('clicked:', event.target.src);
    const title = item.querySelector('.title');
    console.log('title:', title.innerText);
    const link = title.querySelector('a').href;
    const tilteText = title.innerText;


    const trs = tbody.querySelectorAll('tr');
    let isExist = false;
    trs.forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds[0].innerText === link) {
        tr.remove();
        const checkElm = title.querySelector('.checked');
        checkElm.remove();
        isExist = true;
      }
    });
    if (!isExist) {
      // titleの後にチェックを入れる
      const checkElm = document.createElement('span');
      checkElm.className = 'checked';
      checkElm.innerText = '✔';
      title.appendChild(checkElm);

      // new row
      const tr = document.createElement('tr');
      tbody.appendChild(tr);
      const tdText = [
        link,
        `<input type="text" value="${defaultTitle.value}"/>`,
        `<input type="text" value="${defaultCategory.value}"/>`,
        tilteText
      ];
      const tds = [];
      for (let i = 0; i < 4; i++) {
        tds[i] = document.createElement('td');
        tds[i].style.padding = '8px';
        tds[i].innerHTML = tdText[i];
        tr.appendChild(tds[i]);
      }
      const inputs = tr.querySelectorAll('input');
      inputs.forEach((input) => {
        input.addEventListener('change', (event) => {
          createDownloadData();
          console.log('change:', event.target.value);
        });
      });
    }
    createDownloadData();
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