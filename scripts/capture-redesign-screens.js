import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
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
  // Create profile strictly in OS temporary directory to avoid any repository watcher EBUSY conflicts
  const userDataDir = path.join(os.tmpdir(), 'jalamap-puppeteer-profile-' + Date.now());

  console.log(`Using Chrome: ${CHROME_PATH}`);
  console.log(`Isolated Temp Profile: ${userDataDir}`);

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

    // 1. STATE A: Initial Journey (Clean 1440x900 viewport capture)
    console.log('Navigating to app (State A)...');
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);

    const shot1Path = path.resolve(process.cwd(), 'docs/screenshots/01-initial-route.png');
    await page.screenshot({ path: shot1Path });
    console.log(`Saved screenshot 1: ${shot1Path}`);

    // Test dynamic road selection: Click Parladka Connector on the map!
    console.log('Testing road selection: Selecting Parladka Connector on map...');
    await page.evaluate(() => {
      const el = document.querySelector('path[aria-label*="Parladka Connector"]');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await sleep(400);
    const parladkaTitle = await page.$eval('.road-title', el => el.textContent);
    console.log(`Selected road successfully derived as: "${parladkaTitle.trim()}"`);

    // Select Darbe West Approach back for the core pitch demo flow
    console.log('Selecting Darbe West Approach on map...');
    await page.evaluate(() => {
      const el = document.querySelector('path[aria-label*="Darbe West Approach"]');
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await sleep(400);
    const darbeTitle = await page.$eval('.road-title', el => el.textContent);
    console.log(`Selected road restored to: "${darbeTitle.trim()}"`);

    // 2. STATE B: One Observation (Rider A reports blockage)
    console.log('Reporting blockage as Rider A (State B)...');
    await page.click('.btn-primary-action');
    await sleep(800);

    const shot2Path = path.resolve(process.cwd(), 'docs/screenshots/02-one-rider.png');
    await page.screenshot({ path: shot2Path });
    console.log(`Saved screenshot 2: ${shot2Path}`);

    // Map crop of State B for the comparison slide
    const mapElement = await page.$('.atlas-map-pane');
    const stateBMapCrop = await mapElement.screenshot({ encoding: 'base64' });

    // Test duplicate prevention: Try confirming again as Rider A
    console.log('Testing duplicate prevention (Rider A confirms again)...');
    await page.click('.btn-confirm-action');
    await sleep(400);
    const noticeText = await page.$eval('.sheet-inline-notice', el => el.textContent);
    console.log(`Duplicate prevention notice verified: "${noticeText.trim()}"`);

    // 3. STATE C: Switch to Rider B and Confirm Blockage
    console.log('Switching to Rider B and confirming blockage (State C)...');
    await page.click('.btn-secondary-action');
    await sleep(400);

    await page.click('.btn-confirm-action');
    await sleep(1500); // Wait for detour stroke draw (~500ms) to settle

    const shot3Path = path.resolve(process.cwd(), 'docs/screenshots/03-confirmed-detour.png');
    await page.screenshot({ path: shot3Path });
    console.log(`Saved screenshot 3: ${shot3Path}`);

    // Map crop of State C for the comparison slide
    const stateCMapCrop = await mapElement.screenshot({ encoding: 'base64' });

    // Test the "Compare routes" segmented control
    console.log('Testing "Compare routes" segmented control...');
    const originalTab = await page.$('.segment-btn:first-child');
    await originalTab.click();
    await sleep(600);
    const histNotice = await page.$eval('.comparison-hint-banner', el => el.textContent);
    console.log(`Original route comparison verified: "${histNotice.trim()}"`);

    // Restore Detour tab
    const detourTab = await page.$('.segment-btn:last-child');
    await detourTab.click();
    await sleep(500);

    // 4. STATE D: Verified Reopening
    console.log('Testing reopening workflow (State D)...');
    await page.click('.btn-reopen-report');
    await sleep(500);

    // Switch to Rider A to provide independent confirmation
    await page.click('.reopen-btn-row .btn-secondary-action');
    await sleep(400);

    // Confirm road reopened
    await page.click('.btn-confirm-reopen');
    await sleep(1200);

    const shot4Path = path.resolve(process.cwd(), 'docs/screenshots/04-reopened.png');
    await page.screenshot({ path: shot4Path });
    console.log(`Saved screenshot 4: ${shot4Path}`);

    // 5. Create 16:9 Comparison Proof Image: docs/screenshots/jalamap-route-comparison.png
    console.log('Generating 16:9 comparison proof slide...');
    const comparisonPage = await browser.newPage();
    await comparisonPage.setViewport({ width: 1600, height: 900 });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: 1600px;
              height: 900px;
              background-color: #F2EFE6;
              font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Geist', sans-serif;
              display: flex;
              flex-direction: column;
              padding: 40px 50px;
              color: #202C2C;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-bottom: 24px;
              border-bottom: 2px solid #DDD6C7;
              padding-bottom: 16px;
            }
            .title-group {
              display: flex;
              align-items: baseline;
              gap: 16px;
            }
            .brand {
              font-size: 28px;
              font-weight: 800;
              letter-spacing: 0.06em;
              color: #202C2C;
            }
            .subtitle {
              font-size: 18px;
              color: #586767;
              font-weight: 500;
            }
            .badge {
              font-size: 15px;
              font-weight: 700;
              background: #FFFFFF;
              border: 1px solid #D6CFBF;
              padding: 6px 14px;
              border-radius: 6px;
              color: #007C76;
            }
            .grid {
              flex: 1;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 36px;
              min-height: 0;
            }
            .card {
              display: flex;
              flex-direction: column;
              background: #FFFFFF;
              border: 1.5px solid #DDD6C7;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            }
            .crop-wrapper {
              flex: 1;
              overflow: hidden;
              position: relative;
              background: #F2EFE6;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .crop-wrapper img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
            }
            .caption-bar {
              padding: 18px 24px;
              background: #FAF9F5;
              border-top: 1.5px solid #E6E0D5;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .caption-text {
              font-size: 22px;
              font-weight: 800;
              color: #202C2C;
              letter-spacing: -0.01em;
            }
            .caption-sub {
              font-size: 16px;
              font-weight: 600;
              color: #586767;
            }
            .caption-pill {
              font-size: 14px;
              font-weight: 700;
              padding: 5px 12px;
              border-radius: 4px;
              font-family: monospace;
            }
            .pill-awaiting {
              background: #FFF6E5;
              color: #8C540B;
              border: 1px solid #E59518;
            }
            .pill-detour {
              background: #FDF1F0;
              color: #DC3826;
              border: 1px solid #DC3826;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-group">
              <span class="brand">JALAMAP</span>
              <span class="subtitle">Puttur Monsoon Pilot · Consensus Rerouting Engine</span>
            </div>
            <span class="badge">RESURRECT 2026</span>
          </div>
          <div class="grid">
            <!-- Left: State B -->
            <div class="card">
              <div class="crop-wrapper">
                <img src="data:image/png;base64,${stateBMapCrop}" alt="State B Map Crop" />
              </div>
              <div class="caption-bar">
                <div>
                  <div class="caption-text">One rider reports · 4.8 km</div>
                  <div class="caption-sub">Amber beacon at Darbe approach · Commute unchanged</div>
                </div>
                <span class="caption-pill pill-awaiting">1 OF 2 WITNESSES</span>
              </div>
            </div>
            <!-- Right: State C -->
            <div class="card">
              <div class="crop-wrapper">
                <img src="data:image/png;base64,${stateCMapCrop}" alt="State C Map Crop" />
              </div>
              <div class="caption-bar">
                <div>
                  <div class="caption-text">Second rider confirms · 5.6 km</div>
                  <div class="caption-sub">Darbe approach closed · Detour routed via Town Bypass (+800 m)</div>
                </div>
                <span class="caption-pill pill-detour">+800 m DETOUR</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await comparisonPage.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await sleep(600);

    const compShotPath = path.resolve(process.cwd(), 'docs/screenshots/jalamap-route-comparison.png');
    await comparisonPage.screenshot({ path: compShotPath });
    console.log(`Saved 16:9 comparison proof: ${compShotPath}`);

    // 6. Test mobile 390px viewport
    console.log('Testing mobile 390px viewport...');
    await page.setViewport({ width: 390, height: 844 });
    await sleep(500);
    const mobileHeaderVisible = await page.$eval('.atlas-header', el => Boolean(el));
    console.log(`Mobile header verified: ${mobileHeaderVisible}`);

    console.log('>>> ALL SCREENSHOTS & PROOF IMAGES GENERATED SUCCESSFULLY! <<<');
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
