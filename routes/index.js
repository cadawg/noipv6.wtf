const express = require('express');
const fs = require('fs');
const path = require("path");
const router = express.Router();
const http = require('http');

const rawTopSites = parseCSVToArray(path.join(__dirname, '..', 'routes','rawTopSites.csv'));

function parseCSVToArray(csvPath) {
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n');
  const result = [];
  for (let i = 1; i < lines.length; i++) { // Skip top line as it's the header
    const currentLine = lines[i].trim().split(',');
    result.push(currentLine);
  }
  return result;
}

function stripToTop100Domains(initialList) {
    let top = initialList.slice(0, 100);
    top = top.map(row => row[1]);
    top = [...top, "noipv6.wtf", "shitpoststatus.com", "vote.hive.uno", "engine.hive.uno", "hivel.ink", "babushkaspin.com", "cookieclicker.dbuidl.com"];
    return top;
}

const top100 = stripToTop100Domains(rawTopSites);

let requestResults = [];

async function makeRequest(domain) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: domain,
      port: 80,
      path: '/',
      method: 'GET',
      family: 6,
      timeout: 10000,
    }, (res) => {
      resolve(res);
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });

    req.end();
  });
}

async function pingTop100() {
  let tmpRequestResults = [];

  // request (ipv6 only) from top 100 sites
  for (let i = 0; i < top100.length; i++) {
    let doesIpv6 = false;
    try {
      // make an ipv6-only get request to the base url
      console.log(`Pinging ${top100[i]}`);

      const res = await makeRequest(top100[i]);

      if (res.socket.remoteFamily === 'IPv6') {
        doesIpv6 = true;
      }

    } catch (e) {
        console.log(e);
    }

    tmpRequestResults.push({domain: top100[i], ipv6: doesIpv6, number: i + 1});
  }

  console.log(tmpRequestResults, requestResults);

  requestResults = tmpRequestResults;
}

setInterval(pingTop100, 1000 * 60 * 60 * 24);

pingTop100();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { pingResults: [...requestResults].slice(0, 100), pingResultsMe: [...requestResults].slice(100), title: "Top 100 Sites IPv6 Test | NoIPv6.wtf?" });
});

module.exports = router;
