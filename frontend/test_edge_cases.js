const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  // Edge Case 1: Missing Stream 3
  console.log(`\n--- Edge Case 1: Missing Stream 3 ---`);
  let page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Click 'Execute Multimodal Inference' directly without uploading a file
  console.log('Running Inference without uploading CSV...');
  let buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Execute Multimodal Inference')) {
      await btn.click();
      break;
    }
  }
  await page.waitForSelector('text/Risk Score:', { timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: '../verification_logs/phase_12_edge_1_missing_stream3.png' });
  await page.close();

  // Edge Case 2: Bad Upload (malformed CSV)
  console.log(`\n--- Edge Case 2: Bad Upload ---`);
  page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  fs.writeFileSync('bad_upload.csv', 'bad,csv,data\n1,2');
  const inputUploadHandle = await page.$('input[type=file]');
  await inputUploadHandle.uploadFile('bad_upload.csv');
  
  // Should show Upload Failed
  await page.waitForSelector('text/Upload Failed', { timeout: 10000 });
  await page.screenshot({ path: '../verification_logs/phase_12_edge_2_bad_upload.png' });
  await page.close();

  // Edge Case 3: Malformed ECG Payload
  console.log(`\n--- Edge Case 3: Malformed ECG ---`);
  page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    if (interceptedRequest.url().includes('/api/v1/predict') && interceptedRequest.method() === 'POST') {
      const badPayload = {
        patient_id: "edge_case_3",
        ecg: [[0.0]], // Invalid shape
        vitals: {
          anchor_age: 65.0, gender: 1.0, Creatinine: 1.1, Glucose: 100.0,
          Potassium: 4.0, Sodium: 139.0, HR: 82.0, SBP: 135.0,
          DBP: 80.0, RR: 16.0, O2: 98.0
        }
      };
      interceptedRequest.continue({
        method: 'POST',
        postData: JSON.stringify(badPayload),
        headers: {
          ...interceptedRequest.headers(),
          'Content-Type': 'application/json'
        }
      });
    } else {
      interceptedRequest.continue();
    }
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Execute Multimodal Inference')) {
      await btn.click();
      break;
    }
  }
  
  // Wait for error banner
  await page.waitForSelector('.bg-red-900\\/30', { timeout: 10000 });
  await page.screenshot({ path: '../verification_logs/phase_12_edge_3_malformed_ecg.png' });
  await page.close();
  
  // Edge Case 4: Supabase Failure
  console.log(`\n--- Edge Case 4: Supabase Failure ---`);
  page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    // If the request is to supabase, block it? Wait, we intercept /predict and the backend calls supabase.
    // The backend uses supabase. If we want to simulate a supabase failure, we'd have to scramble the backend's env.
    // Let's just simulate the /predict endpoint returning 500.
    if (interceptedRequest.url().includes('/api/v1/predict') && interceptedRequest.method() === 'POST') {
      interceptedRequest.respond({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: "Database connection failed" })
      });
    } else {
      interceptedRequest.continue();
    }
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Execute Multimodal Inference')) {
      await btn.click();
      break;
    }
  }
  await page.waitForSelector('.bg-red-900\\/30', { timeout: 10000 });
  await page.screenshot({ path: '../verification_logs/phase_12_edge_4_supabase_failure.png' });
  await page.close();

  await browser.close();
  console.log('Edge cases test complete!');
})();
