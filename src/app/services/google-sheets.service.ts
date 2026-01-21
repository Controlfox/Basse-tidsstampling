import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL } from '../../environments/apps-script-url';
import { Observable } from 'rxjs';

const TOKEN = 'BYT_MIG_TILL_EN_LANG_SLUMP_TOKEN_BAJS';

@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  private appsScriptUrl = APPS_SCRIPT_URL;

  // Viktigt: behåll referenser så requesten inte GC:as direkt
  private pendingImgs: HTMLImageElement[] = [];

  private sendGet(params: Record<string, string>): Observable<void> {
    return new Observable<void>((observer) => {
      const url = new URL(this.appsScriptUrl);

      url.searchParams.set('token', TOKEN);
      url.searchParams.set('_ts', String(Date.now())); // cache-buster

      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v ?? '');
      }

      const fullUrl = url.toString();
      console.log('[Sheets beacon url]', fullUrl);

      // 1) Försök med fetch no-cors (skickar utan preflight, vi bryr oss inte om svaret)
      if (typeof fetch !== 'undefined') {
        fetch(fullUrl, {
          method: 'GET',
          mode: 'no-cors',
          keepalive: true,
        })
          .catch(() => {
            // Ignorera – vi kan inte läsa svar ändå
          })
          .finally(() => {
            observer.next();
            observer.complete();
          });

        return;
      }

      // 2) Fallback: Image, men vi MÅSTE hålla kvar referensen en stund
      const img = new Image();
      this.pendingImgs.push(img);

      const cleanup = () => {
        const idx = this.pendingImgs.indexOf(img);
        if (idx >= 0) this.pendingImgs.splice(idx, 1);
      };

      img.onload = cleanup;
      img.onerror = cleanup;

      img.src = fullUrl;

      setTimeout(cleanup, 10_000);

      observer.next();
      observer.complete();
    });
  }

  // --- DAY SESSION ---
  saveDaySessionHeader(date: string, dayStartTime: string): Observable<void> {
    return this.sendGet({
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
    return this.sendGet({
      type: 'updateDaySessionEndTime',
      date,
      dayStartTime,
      dayEndTime,
    });
  }

  // --- BOAT LOG (LEGACY: append on stop) ---
  saveBoatLogToSheets(
    boat: string,
    startTime: string,
    endTime: string,
    description: string
  ): Observable<void> {
    return this.sendGet({
      type: 'boatLog',
      boat,
      startTime,
      endTime,
      description,
    });
  }

  // --- BOAT LOG (RECOMMENDED: start + stop update via logId in column L) ---
  startBoatLog(
    boat: string,
    startTime: string,
    logId: string
  ): Observable<void> {
    return this.sendGet({
      type: 'boatLogStart',
      boat,
      startTime,
      logId,
    });
  }

  stopBoatLog(
    logId: string,
    endTime: string,
    description: string
  ): Observable<void> {
    return this.sendGet({
      type: 'boatLogStop',
      logId,
      endTime,
      description,
    });
  }
}
