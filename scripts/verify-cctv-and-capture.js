import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const CHROME_PATH = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
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

async function main() {
  const server = await startServer();
  const userDataDir = path.join(os.tmpdir(), 'jalamap-cctv-test-' + Date.now());

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

  const passedChecks = [];
  const recordCheck = (name, ok, details = '') => {
    console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${name} ${details ? `(${details})` : ''}`);
    if (!ok) throw new Error(`Check failed: ${name}`);
    passedChecks.push(name);
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Step A: Start Kallare-Kombettu journey (4.8 km)
    console.log('\n--- Step A: Initial Commute State ---');
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(600);

    const initialRouteText = await page.$eval('.map-route-card', (el) => el.textContent);
    recordCheck('Step A: Initial route is 4.8 km via Darbe', initialRouteText.includes('4.8 km via Darbe'));

    // Step B: Rider A reports blockage on Darbe West Approach
    console.log('\n--- Step B: Rider A Reports Darbe Blockage ---');
    await page.click('.btn-primary-action');
    await sleep(600);

    const statusHeading = await page.$eval('.status-heading', (el) => el.textContent.trim());
    recordCheck('Step B: Status updates to "Waiting for a second rider"', statusHeading === 'Waiting for a second rider');

    const timelineCount = await page.$eval('.timeline-count', (el) => el.textContent.trim());
    recordCheck('Step B: Rider count is 1 of 2 required', timelineCount.startsWith('1 of 2 required'));

    // Check Road camera section appears
    const cameraSection = await page.$('.sheet-camera-section');
    recordCheck('Road camera section appears in incident sheet', !!cameraSection);

    const cameraCardText = await page.$eval('.sheet-camera-section', (el) => el.textContent);
    recordCheck('Camera section shows CAM-01', cameraCardText.includes('CAM-01'));
    recordCheck('Camera section shows Darbe West Approach', cameraCardText.includes('Darbe West Approach'));
    recordCheck('Camera section shows capture time 08:12 IST', cameraCardText.includes('08:12 IST'));
    recordCheck('Camera section shows time delta (2 minutes before report)', cameraCardText.includes('2 minutes before the report'));

    // Step C: Open CAM-01, review frame, attach observation
    console.log('\n--- Step C: Review Camera Frame & Attach Observation ---');
    await page.click('.btn-review-camera');
    await sleep(600);

    const reviewModal = await page.$('.camera-review-card');
    recordCheck('Camera review panel opens inside workspace', !!reviewModal);

    // Verify modal content
    const modalTitle = await page.$eval('.camera-review-title', (el) => el.textContent.trim());
    recordCheck('Modal displays road title: Darbe West Approach (Main Rd)', modalTitle.includes('Darbe West Approach'));

    const modalDir = await page.$eval('.camera-review-dir', (el) => el.textContent.trim());
    recordCheck('Modal displays viewing direction: Facing East towards Darbe Junction', modalDir.includes('Facing East'));

    const temporalText = await page.$eval('.camera-temporal-block', (el) => el.textContent);
    recordCheck('Temporal block displays Rider report 08:14 IST', temporalText.includes('08:14 IST'));
    recordCheck('Temporal block displays Frame captured 08:12 IST', temporalText.includes('08:12 IST'));
    recordCheck('Temporal block displays 2 minutes before the report', temporalText.includes('2 minutes before the report'));

    // Verify directional camera marker on map
    const cameraMarker = await page.$('.camera-marker-layer');
    recordCheck('Directional camera marker exists on map', !!cameraMarker);

    // Verify "Attach observation" is initially disabled
    const attachBtnDisabled = await page.$eval('.btn-attach-observation', (el) => el.disabled);
    recordCheck('"Attach observation" button initially disabled before selecting an option', attachBtnDisabled === true);

    // Select "Water visible on the road"
    console.log('Selecting "Water visible on the road"...');
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.decision-option-label'));
      const waterLabel = labels.find((l) => l.textContent.includes('Water visible on the road'));
      if (waterLabel) {
        const input = waterLabel.querySelector('input');
        if (input) input.click();
      }
    });
    await sleep(300);

    const attachBtnEnabled = await page.$eval('.btn-attach-observation', (el) => !el.disabled);
    recordCheck('"Attach observation" button becomes enabled', attachBtnEnabled === true);

    // Click "Attach observation"
    console.log('Clicking "Attach observation"...');
    await page.click('.btn-attach-observation');
    await sleep(600);

    const attachBanner = await page.$eval('.attached-status-banner', (el) => el.textContent);
    recordCheck('Observation attached status confirmed in review panel', attachBanner.includes('Observation recorded'));

    // Step D: Verify Step D requirements
    console.log('\n--- Step D: Verify Consensus Independence (1 Rider + 1 Camera) ---');
    const timelineCountAfterAttach = await page.$eval('.timeline-count', (el) => el.textContent.trim());
    recordCheck('Rider count remains 1 of 2 required (+ 1 camera review)', timelineCountAfterAttach.includes('1 of 2 required') && timelineCountAfterAttach.includes('1 camera review'));

    const statusAfterAttach = await page.$eval('.status-heading', (el) => el.textContent.trim());
    recordCheck('Status remains "Waiting for a second rider"', statusAfterAttach === 'Waiting for a second rider');

    const routeAfterAttach = await page.$eval('.map-route-card', (el) => el.textContent);
    recordCheck('Original route remains active (4.8 km)', routeAfterAttach.includes('4.8 km via Darbe'));

    // Verify distinct camera observation in timeline
    const cameraTimelineItem = await page.$('.timeline-camera-item');
    recordCheck('Distinct Camera observation entry present in timeline', !!cameraTimelineItem);

    const cameraItemText = await page.$eval('.timeline-camera-item', (el) => el.textContent);
    recordCheck('Camera timeline item contains CAM-01 and "Water visible on the road"', cameraItemText.includes('CAM-01') && cameraItemText.includes('Water visible on the road'));

    // Step 6: CAPTURE PPT SCREENSHOT (docs/screenshots/05-cctv-evidence.png)
    console.log('\n--- Capturing PPT Screenshot: docs/screenshots/05-cctv-evidence.png ---');
    const screenshotDir = path.resolve(process.cwd(), 'docs/screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, '05-cctv-evidence.png');

    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Screenshot captured successfully at: ${screenshotPath}`);
    recordCheck('PPT Screenshot 05-cctv-evidence.png captured at 1440x900', fs.existsSync(screenshotPath));

    // Test duplicate attachment prevention
    console.log('\n--- Testing Duplicate Attachment Prevention ---');
    await page.click('.btn-attach-observation');
    await sleep(300);
    const cameraTimelineCount = await page.$$eval('.timeline-camera-item', (els) => els.length);
    recordCheck('Repeated attachment does not duplicate review in timeline (count = 1)', cameraTimelineCount === 1);

    // Step E: Switch to Rider B and confirm blockage
    console.log('\n--- Step E: Switch to Rider B and Confirm Blockage ---');
    // Close modal first
    await page.click('.camera-review-close-btn');
    await sleep(300);

    // Switch to Rider B
    await page.click('.btn-secondary-action');
    await sleep(300);

    // Confirm blockage as Rider B
    await page.click('.btn-confirm-action');
    await sleep(1200);

    const confirmedHeading = await page.$eval('.status-heading', (el) => el.textContent.trim());
    recordCheck('Consensus achieved: Road closed · Detour active', confirmedHeading.includes('Road closed'));

    const detourRouteText = await page.$eval('.map-route-card', (el) => el.textContent);
    recordCheck('Routing engine computes detour: 5.6 km (+800 m)', detourRouteText.includes('5.6 km') && detourRouteText.includes('+800 m'));

    // Step F: Reopen camera observation after rerouting
    console.log('\n--- Step F: Reopen Camera Observation After Rerouting ---');
    await page.click('.timeline-camera-item');
    await sleep(600);

    const reopenedModal = await page.$('.camera-review-card');
    recordCheck('Camera observation reopens exact review panel from timeline', !!reopenedModal);

    const reopenedChoice = await page.$eval('.decision-option-label.selected', (el) => el.textContent.trim());
    recordCheck('Reopened review retains selected observation: "Water visible on the road"', reopenedChoice.includes('Water visible on the road'));

    const reopenedTime = await page.$eval('.camera-temporal-block', (el) => el.textContent);
    recordCheck('Reopened review retains exact timestamp 08:12 IST', reopenedTime.includes('08:12 IST'));

    // Close review
    await page.click('.camera-review-close-btn');
    await sleep(300);

    // Test Reopening Consensus Independence
    console.log('\n--- Testing Reopening Consensus Independence ---');
    await page.click('.btn-reopen-report');
    await sleep(400);

    const reopenBadge = await page.$eval('.reopen-badge', (el) => el.textContent.trim());
    recordCheck('Reopening requires independent riders (1 of 2)', reopenBadge.includes('1 of 2'));

    // Test Road without Camera Coverage (seg_kallare_mukwe)
    console.log('\n--- Testing Road Without Camera Coverage ---');
    await page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('path.interactive-road'));
      const el = paths.find((p) => p.getAttribute('aria-label')?.includes('Mukwe'));
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await sleep(400);

    // Report blockage on Mukwe
    await page.click('.btn-primary-action');
    await sleep(400);

    const noCamText = await page.$eval('.camera-none-text', (el) => el.textContent.trim());
    recordCheck('Road without camera displays: "No camera covers this stretch."', noCamText === 'No camera covers this stretch.');

    // Test Stale Camera Frame (CAM-02 on seg_darbe_bannur)
    console.log('\n--- Testing Stale Camera Frame (>10m window) ---');
    await page.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('path.interactive-road'));
      const el = paths.find((p) => p.getAttribute('aria-label')?.includes('Bannur Arterial'));
      if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await sleep(400);

    // Report blockage on Darbe-Bannur
    await page.click('.btn-primary-action');
    await sleep(400);

    const staleMsg = await page.$eval('.camera-unmatched-msg', (el) => el.textContent.trim());
    recordCheck('Stale camera frame displays: "No frame close to the report time"', staleMsg === 'No frame close to the report time');

    const staleSub = await page.$eval('.camera-unmatched-sub', (el) => el.textContent.trim());
    recordCheck('Stale camera displays capture time 07:45 IST and delta (29 min before report)', staleSub.includes('07:45 IST') && staleSub.includes('29 min'));

    // Test Persistence and Reset
    console.log('\n--- Testing LocalStorage Persistence & Reset ---');
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(600);

    // Check reset demo
    await page.click('.demo-reset-btn');
    await sleep(600);

    const resetRouteText = await page.$eval('.map-route-card', (el) => el.textContent);
    recordCheck('Demo reset restores initial 4.8 km route', resetRouteText.includes('4.8 km via Darbe'));

    const clearStatus = await page.$eval('.sheet-state-block', (el) => el.textContent);
    recordCheck('Demo reset clears observations and camera reviews', clearStatus.includes('No blockage reported'));

    console.log('\n========================================');
    console.log(`ALL ${passedChecks.length} CHECKS PASSED PERFECTLY!`);
    console.log('========================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
