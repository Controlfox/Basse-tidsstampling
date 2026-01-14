# Google Sheets Integration - Instruktioner

## Steg 1: Skapa ett Google Cloud-projekt

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Skapa ett nytt projekt
3. Ge det ett namn, t.ex. "Båttidsstämpling"

## Steg 2: Aktivera Google Sheets API

1. I Cloud Console, gå till "APIs & Services" > "Library"
2. Sök efter "Google Sheets API"
3. Klicka på den och sedan "Enable"

## Steg 3: Skapa API-nyckel

1. Gå till "APIs & Services" > "Credentials"
2. Klicka "Create Credentials" > "API Key"
3. Kopiera API-nyckeln

## Steg 4: Skapa ett Google Kalkylark

1. Gå till [Google Sheets](https://sheets.google.com)
2. Skapa ett nytt kalkylark
3. Döp det till något passande, t.ex. "Arbetslogg"
4. Lägg till kolumnrubriker i rad 1:
   - A1: "Båt"
   - B1: "Starttid"
   - C1: "Sluttid"
   - D1: "Beskrivning"
   - E1: "Varaktighet (min)"

## Steg 5: Hämta Kalkylark ID

1. I ditt kalkylark, kolla URL-fältet
2. Mellan `/spreadsheets/d/` och `/edit` hittar du ditt kalkylark ID
3. Kopiera denna ID

## Steg 6: Uppdatera AppComponent

1. Öppna `src/app/app.component.ts`
2. Lägg till Google Sheets-konfiguration i `ngOnInit`:

```typescript
ngOnInit(): void {
  // Sätt Google Sheets-inställningar
  this.googleSheetsService.setCredentials(
    'YOUR_API_KEY_HERE',
    'YOUR_SPREADSHEET_ID_HERE'
  );

  // ... rest av koden
}
```

Ersätt:

- `YOUR_API_KEY_HERE` med din API-nyckel från steg 3
- `YOUR_SPREADSHEET_ID_HERE` med ditt kalkylark ID från steg 5

## Steg 7: Publicera Kalkylark

1. I ditt Google Kalkylark, klicka "Share"
2. Ändra till "Anyone with the link can view" (eller "Editor" om du vill att andra kan redigera)
3. Se till att API:n har åtkomst

## VIKTIGT: Säkerhet

- **Lagra aldrig API-nycklar i version control!**
- I en produktionsmiljö, använd ett backend för att hantera API-anrop
- Överväg att använda OAuth 2.0 för användarbaskonfiguration

## Felsökning

Om du får CORS-fel:

- Google Sheets API kräver att anropet görs från en auktoriserad källa
- Du kan behöva sätta upp ett backend för att göra API-anrop
- Eller använd ett proxy-API som CORS Anywhere
