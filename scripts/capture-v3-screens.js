import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const BROWSER_PATH = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

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
      console.log(`Local static server listening at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function captureScreens() {
  const server = await startServer();
  const outDir = path.resolve(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const userDataDir = path.join(os.tmpdir(), 'jalamap-v3-screens-' + Date.now());

  console.log('Launching browser with:', BROWSER_PATH);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,820', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 });

  try {
    console.log('Opening JALAMAP V3...');
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    await sleep(800);

    // 1. Initial Navigation Home Screen
    console.log('Capturing 01-v3-navigation-home.png...');
    await page.screenshot({ path: path.join(outDir, '01-v3-navigation-home.png') });

    // 2. Click Start Navigation
    console.log('Starting navigation...');
    const startNavBtn = await page.$('.btn-start-nav');
    if (startNavBtn) {
      await startNavBtn.click();
      await sleep(1400);
      console.log('Capturing 02-v3-active-journey.png...');
      await page.screenshot({ path: path.join(outDir, '02-v3-active-journey.png') });
    }

    // 3. Open Demo Panel and trigger Scenario 2 (Mid-journey CCTV hazard & auto reroute)
    console.log('Opening Simulation Studio...');
    const demoToggle = await page.$('.demo-toggle-btn');
    if (demoToggle) {
      await demoToggle.click();
      await sleep(500);
      console.log('Capturing 05-v3-demo-panel.png...');
      await page.screenshot({ path: path.join(outDir, '05-v3-demo-panel.png') });

      // Run Scenario 2
      const scenarioButtons = await page.$$('.btn-run-scenario');
      if (scenarioButtons.length >= 2) {
        console.log('Triggering Scenario 2 (Mid-Journey CCTV Hazard)...');
        await scenarioButtons[1].click();
        await sleep(1500);

        // Close demo drawer to reveal the updated route map and alert HUD
        const closeDrawer = await page.$('.drawer-close-btn');
        if (closeDrawer) await closeDrawer.click();
        await sleep(800);

        console.log('Capturing 03-v3-cctv-reroute.png...');
        await page.screenshot({ path: path.join(outDir, '03-v3-cctv-reroute.png') });
      }
    }

    // 4. Open Community Report Modal
    console.log('Opening Report Modal...');
    const reportBtn = await page.$('.btn-report-condition');
    if (reportBtn) {
      await reportBtn.click();
      await sleep(500);
      console.log('Capturing 04-v3-report-modal.png...');
      await page.screenshot({ path: path.join(outDir, '04-v3-report-modal.png') });
    }

    console.log('✓ All V3 screenshots captured successfully in docs/screenshots/');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

captureScreens();
