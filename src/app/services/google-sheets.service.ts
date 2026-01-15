import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL } from '../../environments/apps-script-url';
import { Observable } from 'rxjs';

const TOKEN = 'BYT_MIG_TILL_EN_LANG_SLUMP_TOKEN_BAJS';

@Injectable({
  providedIn: 'root',
})
export class GoogleSheetsService {
  private appsScriptUrl = APPS_SCRIPT_URL;

  /**
   * Fire-and-forget till Apps Script utan CORS-problem.
   * Vi kan inte läsa svar eller HTTP-status från browsern, så vi complete:ar alltid.
   */
  private sendFireAndForget(params: Record<string, string>): Observable<void> {
    return new Observable<void>((observer) => {
      const url = new URL(this.appsScriptUrl);

      url.searchParams.set('token', TOKEN);
      url.searchParams.set('_ts', String(Date.now())); // cache-buster

      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v ?? '');
      }

      const fullUrl = url.toString();

      try {
        // 1) Försök med sendBeacon (POST, response ignoreras)
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const ok = navigator.sendBeacon(fullUrl);
          // ok säger bara om den köades, inte att den sparades i Sheets
          observer.next();
          observer.complete();
          return;
        }

        // 2) Fallback: fetch no-cors (GET). Response kan inte läsas, men requesten skickas.
        if (typeof fetch !== 'undefined') {
          fetch(fullUrl, { method: 'GET', mode: 'no-cors', keepalive: true })
            .catch(() => {
              // Ignorera – vi kan ändå inte veta säkert i statisk miljö
            })
            .finally(() => {
              observer.next();
              observer.complete();
            });
          return;
        }

        // 3) Sista fallback: Image (utan onerror/onload för att inte få "Beacon failed to load")
        const img = new Image();
        img.src = fullUrl;

        observer.next();
        observer.complete();
      } catch {
        // Även här: complete för att inte spamma fel – statisk site kan inte verifiera svar
        observer.next();
        observer.complete();
      }
    });
  }

  saveDaySessionHeader(date: string, dayStartTime: string): Observable<void> {
    return this.sendFireAndForget({
      type: 'daySessionHeader',
      date,
      dayStartTime,
      dayEndTime: '',
    });
  }

  updateDaySessionWithEndTime(
    date: string,
    dayStartTime: string,
    dayEndTime: string
  ): Observable<void> {
    return this.sendFireAndForget({
      type: 'updateDaySessionEndTime',
      date,
      dayStartTime,
      dayEndTime,
    });
  }

  saveBoatLogToSheets(
    boat: string,
    startTime: string,
    endTime: string,
    description: string
  ): Observable<void> {
    return this.sendFireAndForget({
      type: 'boatLog',
      boat,
      startTime,
      endTime,
      description,
    });
  }
}
