# Google Apps Script Integration - Enklare lösning

## Steg 1: Skapa ett Google Apps Script

1. Öppna ditt Google Kalkylark
2. Gå till **Extensions** > **Apps Script**
3. Byt namn på projektet till något lämpligt, t.ex. "BåttidsstämplingAPI"

## Steg 2: Kopiera denna kod till script.gs

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();

  try {
    // Hämta parametrarna från requestet
    const data = JSON.parse(e.postData.contents);

    // Lägg till data i raden
    const values = [data.boat, data.startTime, data.endTime, data.description, data.duration];

    // Lägg till rad i kalkylbladet
    sheet.appendRow(values);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Data sparad",
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Steg 3: Publicera Apps Script

1. Klicka **Deploy** > **New deployment**
2. Välj Type: **Web app**
3. Fyll i:
   - Description: "BåttidsstämplingAPI"
   - Execute as: Ditt Google-konto
   - Who has access: **Anyone**
4. Klicka **Deploy**
5. Kopiera webbadressen (URL) som visas

## Steg 4: Uppdatera appen

Uppdatera `src/app/app.component.ts` och ändra:

```typescript
ngOnInit(): void {
  this.googleSheetsService.setCredentials(
    'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercopy',  // Lim in din Apps Script URL här
    ''  // Denna behövs inte längre
  );
  // ... rest
}
```

## Steg 5: Uppdatera Google Sheets Service

Uppdatera `src/app/services/google-sheets.service.ts` för att använda Apps Script webhook.
