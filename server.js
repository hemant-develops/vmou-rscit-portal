const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const hostname = '127.0.0.1';
const port = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'data', 'results.json');
const dataJsonlFile = path.join(__dirname, 'data', 'results.jsonl');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

let cache = {
  mtimeMs: 0,
  rows: []
};

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function readRows() {
  const source = fs.existsSync(dataFile) ? dataFile : fs.existsSync(dataJsonlFile) ? dataJsonlFile : null;

  if (!source) {
    cache = { mtimeMs: 0, rows: [] };
    return cache.rows;
  }

  const stat = fs.statSync(source);
  if (cache.mtimeMs === stat.mtimeMs) {
    return cache.rows;
  }

  const raw = fs.readFileSync(source, 'utf8').trim();
  const rows = raw
    ? source.endsWith('.jsonl')
      ? raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
      : JSON.parse(raw)
    : [];

  cache = { mtimeMs: stat.mtimeMs, rows };
  return cache.rows;
}

function sendJson(res, body, statusCode = 200) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function parseDateInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const parts = text.split(/[/-]/).map((part) => part.padStart(2, '0'));
  if (parts.length !== 3) return text;

  if (parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return `${parts[0]}-${parts[1]}-${parts[2]}`;
}

function groupLearners(rows) {
  const byLearner = new Map();

  rows.forEach((row) => {
    const key = row.learnerKey || row.scholar || row.learnerCode;
    if (!key) return;

    if (!byLearner.has(key)) {
      byLearner.set(key, {
        id: key,
        learnerKey: key,
        name: row.name || '',
        father: row.father || '',
        dob: row.dob || '',
        scholar: key,
        attempts: []
      });
    }

    const learner = byLearner.get(key);
    learner.name = learner.name || row.name || '';
    learner.father = learner.father || row.father || '';
    learner.dob = learner.dob || row.dob || '';
    learner.attempts.push(row);
  });

  return [...byLearner.values()].map((learner) => {
    learner.attempts.sort((a, b) => normalize(b.event).localeCompare(normalize(a.event)));
    learner.latest = learner.attempts[0] || {};
    return learner;
  });
}

function handleApi(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const rows = readRows();

  if (requestUrl.pathname === '/api/events') {
    const events = [...new Set(rows.map((row) => row.event).filter(Boolean))].sort();
    sendJson(res, { events, totalRows: rows.length, totalLearners: groupLearners(rows).length });
    return true;
  }

  if (requestUrl.pathname === '/api/search') {
    const started = Date.now();
    const query = normalize(requestUrl.searchParams.get('q'));
    const event = requestUrl.searchParams.get('event') || 'All';
    const status = requestUrl.searchParams.get('status') || 'All';
    const dob = parseDateInput(requestUrl.searchParams.get('dob'));
    const tokens = query.split(/\s+/).filter(Boolean);

    const exactId = /^\d{5,}$/.test(query);
    const matches = rows.filter((row) => {
      const learnerKey = normalize(row.learnerKey || row.scholar || row.learnerCode);
      const person = normalize(`${row.name || ''} ${row.father || ''} ${learnerKey}`);
      const queryMatches = !tokens.length || (exactId ? learnerKey === query : tokens.every((token) => person.includes(token)));
      const eventMatches = event === 'All' || row.event === event;
      const statusMatches = status === 'All' || row.result === status;
      const dobMatches = !dob || row.dob === dob;
      return queryMatches && eventMatches && statusMatches && dobMatches;
    });

    const learners = groupLearners(matches).slice(0, 100);
    sendJson(res, {
      learners,
      matchedRows: matches.length,
      totalRows: rows.length,
      elapsedMs: Date.now() - started,
      hasData: rows.length > 0
    });
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/') && handleApi(req, res)) {
    return;
  }

  let urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(urlPath).replace(/^\/+/, '');
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, hostname, () => {
  console.log(`College portal running at http://${hostname}:${port}`);
});
