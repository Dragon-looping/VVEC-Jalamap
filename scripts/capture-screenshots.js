import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Simple static HTTP server for production build
function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Local server listening at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function main() {
  const server = await startServer();

  const userDataDir = path.resolve(process.cwd(), '.chrome-profile-' + Date.now());
  console.log(`Using browser: ${CHROME_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900', '--disable-gpu'],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. STATE A: Initial Journey
    console.log('Navigating to app...');
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    
    // Clear localStorage to guarantee pristine State A
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);

    const shot1Path = path.resolve(process.cwd(), 'docs/screenshots/01-initial-route.png');
    await page.screenshot({ path: shot1Path });
    console.log(`Saved screenshot 1: ${shot1Path}`);

    // 2. STATE B: One Observation (Rider A reports blockage)
    console.log('Clicking "Report a blockage"...');
    await page.click('.btn-report');
    await sleep(800);

    const shot2Path = path.resolve(process.cwd(), 'docs/screenshots/02-awaiting-confirmation.png');
    await page.screenshot({ path: shot2Path });
    console.log(`Saved screenshot 2: ${shot2Path}`);

    // Test duplicate prevention: Try confirming as Rider A
    console.log('Testing duplicate prevention (Rider A confirms)...');
    await page.click('.btn-confirm');
    await sleep(400);
    const inlineNotice = await page.$eval('.inline-feedback-banner', el => el.textContent);
    console.log(`Inline notice received: "${inlineNotice.trim()}"`);

    // 3. Switch to Rider B and Confirm Blockage (STATE C)
    console.log('Switching demo identity to Rider B...');
    // Click "Switch to Rider B" button in action stack
    await page.click('.secondary-action-btn');
    await sleep(400);

    console.log('Confirming blockage as Rider B...');
    await page.click('.btn-confirm');
    // Wait for the route transition (650-850ms) to settle completely
    await sleep(1500);

    const shot3Path = path.resolve(process.cwd(), 'docs/screenshots/03-confirmed-detour.png');
    await page.screenshot({ path: shot3Path });
    console.log(`Saved screenshot 3: ${shot3Path}`);

    // 4. Verification QA at 1366x768
    console.log('Testing 1366x768 laptop viewport QA...');
    await page.setViewport({ width: 1366, height: 768 });
    await sleep(500);
    const hasScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
    console.log(`1366x768 viewport scroll needed: ${hasScroll}`);

    // 5. Mobile QA at 390x844
    console.log('Testing mobile 390x844 viewport QA...');
    await page.setViewport({ width: 390, height: 844 });
    await sleep(500);
    const mobileBtnVisible = await page.$eval('.sheet-action-footer', el => Boolean(el));
    console.log(`Mobile action footer rendered: ${mobileBtnVisible}`);

    console.log('>>> SCREENSHOT CAPTURE & QA COMPLETED SUCCESSFULLY! <<<');
  } finally {
    try { await browser?.close(); } catch {}
    try { server.close(); } catch {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
