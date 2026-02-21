const fs = require('fs');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getServiceAccount = () => {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const raw = fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8');
    return JSON.parse(raw);
  }

  throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE');
};

const isEnabled = () => {
  return Boolean(process.env.GOOGLE_SHEET_ID && (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_FILE));
};

const appendRegistrationRow = async (registration) => {
  if (!isEnabled()) {
    return { skipped: true, reason: 'Google Sheets not configured.' };
  }

  const credentials = getServiceAccount();
  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const values = [[
    new Date().toISOString(),
    registration.name,
    registration.roll,
    registration.section,
    registration.department,
    registration.email,
    registration.phone || '',
    registration.tshirt_size || '',
    registration.payment_method,
    registration.transaction_id,
    registration.payment_time,
    registration.screenshot || '',
    registration.status,
  ]];

  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName + '!A:M',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
};

module.exports = { appendRegistrationRow };
