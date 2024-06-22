#/bin/bash
node ./makehtml.js --max_number 300 --tag character --sort Newest --period Day --nsfw true
node ./makehtml.js --max_number 300 --tag concept --sort Newest --period Day --nsfw true
node ./makehtml.js --max_number 300 --tag character --query 'idolm@ster' --sort Newest --period Day --nsfw true
