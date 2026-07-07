# Basse Tidsstämpling

En webb-app för tidsstämpling av arbete på båtar och vid terminalen. All data sparas automatiskt till ett Google Kalkylark.

## Så här används appen

### 1. Starta dagen
Tryck **Starta dag** och välj din ankomsttid. En ny rad för dagsessionen skapas i kalkylarket.

### 2. Logga ett arbetspass
1. Välj vilken båt (eller plats) du ska arbeta på i listan.
2. Tryck **Starta** — klockan börjar ticka.
3. När passet är klart: fyll i en kort beskrivning av arbetet och tryck **Stoppa**.

### 3. Ändra tider i efterhand
Tryck **Ändra tider** på ett pågående pass för att justera start- och sluttid (t.ex. om du glömde stämpla in i tid).

### 4. Logga lunch
Tryck **Lunch** för att registrera en 30-minuters lunchpaus. Lunchen dras automatiskt från dagens totala arbetstid.

### 5. Avsluta dagen
Tryck **Avsluta dag** och välj din sluttid. Kalkylarket uppdateras med total arbetstid (exklusive lunch).

---

## Sätta upp en egen instans

### Förutsättningar
- Node.js 18+
- Ett Google-konto med tillgång till Google Apps Script och Google Kalkylark

### 1. Konfigurera Google Apps Script
1. Skapa ett nytt Google Kalkylark.
2. Öppna **Tillägg → Apps Script** och klistra in koden från [apps-script-exempel](src/environments/apps-script-url.example.ts) (se notering nedan om var du hittar rätt kod).
3. Ersätt `YOUR_SPREADSHEET_ID_HERE` med ditt kalkylarks ID och `YOUR_LONG_RANDOM_TOKEN_HERE` med ett långt slumpmässigt token.
4. Driftsätt scriptet som webbapp (**Driftsätt → Ny driftsättning → Webbapp**, åtkomst: Alla).
5. Kopiera URL:en till driftsättningen.

### 2. Konfigurera appen
Kopiera miljöfilen och fyll i dina värden:
```bash
cp src/environments/apps-script-url.example.ts src/environments/apps-script-url.ts
```
Öppna `src/environments/apps-script-url.ts` och ersätt platshållarna med din riktiga URL och ditt token.

### 3. Kör lokalt
```bash
npm install
npm start
```
Öppna `http://localhost:4200` i webbläsaren.

### 4. Bygg för produktion
```bash
npm run build
```
