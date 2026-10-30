const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/cemendus.js':'cemendus.js','/cemendus-model.js':'cemendus-model.js'};
http.createServer((req,res)=>{const file=files[req.url.split('?')[0]];if(!file){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');fs.createReadStream(path.join(__dirname,file)).pipe(res);}).listen(4173,'127.0.0.1',()=>console.log('XHabitat: http://127.0.0.1:4173'));
