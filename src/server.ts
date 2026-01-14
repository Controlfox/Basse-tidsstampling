import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Middleware för att parse JSON
app.use(express.json());

/**
 * API endpoint för att spara tidlogg till Google Sheets via Apps Script
 */
app.post('/api/save-to-sheets', async (req, res): Promise<void> => {
  try {
    const { appsScriptUrl, ...dataToSend } = req.body;

    if (!appsScriptUrl || appsScriptUrl === 'YOUR_APPS_SCRIPT_URL_HERE') {
      res.status(400).json({ error: 'Google Apps Script URL not configured' });
      return;
    }

    console.log('Forwarding to Google Apps Script:', appsScriptUrl);
    console.log('Data type:', dataToSend.type);
    console.log('Data being sent:', JSON.stringify(dataToSend));

    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    });

    const responseText = await response.text();
    console.log('Raw Response from Apps Script:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(
        'Failed to parse JSON response. Received:',
        responseText.substring(0, 200)
      );
      throw new Error(
        `Google Apps Script returned invalid response. Make sure the URL is correct and the script is deployed as a web app. Received: ${responseText.substring(
          0,
          100
        )}...`
      );
    }

    console.log('Google Apps Script Response:', { status: response.ok, data });

    if (!response.ok) {
      throw new Error((data as any).error || 'Failed to save to Google Sheets');
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error saving to Google Sheets:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
