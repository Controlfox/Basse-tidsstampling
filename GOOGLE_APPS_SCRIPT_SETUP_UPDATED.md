# Google Apps Script Integration

## Steg 1: Skapa ett Google Apps Script

1. Öppna ditt Google Kalkylark
2. Gå till **Extensions** > **Apps Script**
3. Byt namn på projektet till något lämpligt, t.ex. "BåttidsstämplingAPI"

## Steg 2: Kopiera denna kod till script.gs

Ersätt ALL kod med detta:

```javascript
// Hantera POST-requests från appen
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();

  try {
    // Parse the JSON data from the request
    const data = JSON.parse(e.postData.contents);

    // Create array with the data
    const values = [data.boat, data.startTime, data.endTime, data.description, data.duration];

    // Append the row to the sheet
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

// Hantera GET-requests (för testning)
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      message: "Använd POST för att spara data",
    })
  ).setMimeType(ContentService.MimeType.JSON);
}
```

## Steg 3: Spara och Publicera Apps Script

1. Klicka **Save** (Ctrl+S eller Cmd+S)
2. Klicka **Deploy** (eller "Manage deployments" om det redan finns en)
3. Om du redan har en deployment, klicka på den och välj **Update**
4. Annars, klicka **New deployment**:
   - Type: **Web app**
   - Execute as: Ditt Google-konto
   - Who has access: **Anyone**
5. Klicka **Deploy**

## Steg 4: Använd URL-formatet rätt

Din webhook URL ska se ut så här:

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/usercopy
```

**VIKTIGT:** Det måste vara `/usercopy` i slutet (inte `/exec`)

## Steg 5: Testa

Gå tillbaka till appen och försök spara ett arbetspass. Det bör nu sparas i ditt Google Kalkylark!
