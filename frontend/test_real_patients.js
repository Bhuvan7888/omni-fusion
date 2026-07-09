const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Running Flow for Patient ${i} ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    // Enable request interception
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().includes('/api/v1/predict') && interceptedRequest.method() === 'POST') {
        // Read the actual payload
        const payloadData = JSON.parse(fs.readFileSync(path.join(__dirname, `test_data/patient_${i}_payload.json`), 'utf-8'));
        
        // The UI might have attached an upload_session_id. We need to preserve it.
        const originalBody = JSON.parse(interceptedRequest.postData() || '{}');
        if (originalBody.upload_session_id) {
          payloadData.upload_session_id = originalBody.upload_session_id;
        }

        console.log(`Intercepted /predict, injecting payload for patient ${i}`);
        interceptedRequest.continue({
          method: 'POST',
          postData: JSON.stringify(payloadData),
          headers: {
            ...interceptedRequest.headers(),
            'Content-Type': 'application/json'
          }
        });
      } else {
        interceptedRequest.continue();
      }
    });

    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    console.log('Uploading CSV...');
    const inputUploadHandle = await page.$('input[type=file]');
    await inputUploadHandle.uploadFile(path.join(__dirname, `test_data/historical_patient_${i}.csv`));

    // Wait for the upload success message
    await page.waitForSelector('text/Upload Complete', { timeout: 10000 });
    console.log('Upload complete.');

    console.log('Running Inference...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Execute Multimodal Inference')) {
        await btn.click();
        break;
      }
    }

    console.log('Waiting for results...');
    await page.waitForSelector('text/Risk Score:', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Taking screenshot of Dashboard...');
    await page.screenshot({ path: `../verification_logs/phase_12_patient_${i}_dashboard.png`, fullPage: true });

    console.log('Navigating to History view...');
    await page.goto('http://localhost:3000/history', { waitUntil: 'networkidle2' });
    
    await page.waitForSelector('table', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Taking screenshot of History...');
    await page.screenshot({ path: `../verification_logs/phase_12_patient_${i}_history.png`, fullPage: true });

    await page.close();
  }

  await browser.close();
  console.log('Real patient test complete!');
})();
