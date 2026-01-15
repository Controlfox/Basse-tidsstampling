import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL } from '../../environments/apps-script-url';
import { Observable } from 'rxjs';

const TOKEN = 'BYT_MIG_TILL_EN_LANG_SLUMP_TOKEN_BAJS';

@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  private appsScriptUrl = APPS_SCRIPT_URL;

  private fireAndForget(payload: Record<string, string>): Observable<void> {
    return new Observable<void>((observer) => {
      const data = { ...payload, token: TOKEN };

      try {
        // 1) POST via sendBeacon (CORS-fritt att SKICKA; vi läser inget svar)
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(data)], {
            type: 'application/json',
          });
          navigator.sendBeacon(this.appsScriptUrl, blob);
          observer.next();
          observer.complete();
          return;
        }

        // 2) Fallback: GET via Image (querystring)
        const url = new URL(this.appsScriptUrl);
        url.searchParams.set('_ts', String(Date.now()));
        Object.entries(data).forEach(([k, v]) =>
          url.searchParams.set(k, v ?? '')
        );

        const img = new Image();
        img.src = url.toString();

        observer.next();
        observer.complete();
      } catch {
        observer.next();
        observer.complete();
      }
    });
  }

  saveDaySessionHeader(date: string, dayStartTime: string): Observable<void> {
    return this.fireAndForget({
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
    return this.fireAndForget({
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
    return this.fireAndForget({
      type: 'boatLog',
      boat,
      startTime,
      endTime,
      description,
    });
  }
}
