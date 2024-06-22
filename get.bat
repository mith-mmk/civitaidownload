rem node .\makehtml.js --max_number 300 --tag 'concept' --sort 'Most Downloaded' --period Week --nsfw true --output 'data/concept.html'
rem node .\makehtml.js --max_number 300 --tag character --sort Newest --period Day --nsfw true
rem node .\makehtml.js --max_number 300 --tag concept --sort Newest --period Day --nsfw true
node .\makehtml.js --max_number 30 --tag character --query idolm@ster --sort Newest --period Week --nsfw true

