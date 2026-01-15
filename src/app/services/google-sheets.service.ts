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
   * Skickar data som GET-beacon via <img>.
   * Ingen CORS, funkar från statisk site.
   * Fire-and-forget: frontend kan inte läsa svar/status.
   */
  private sendBeacon(params: Record<string, string>): Observable<void> {
    return new Observable<void>((observer) => {
      const url = new URL(this.appsScriptUrl);

      // Lägg till token + cachebuster
      url.searchParams.set('token', TOKEN);
      url.searchParams.set('_ts', String(Date.now()));

      Object.entries(params).forEach(([k, v]) => {
        url.searchParams.set(k, v ?? '');
      });

      const img = new Image();

      // Vi “lyckas” oavsett (CORS-fritt). Om du vill kan du logga onerror.
      img.onload = () => {
        observer.next();
        observer.complete();
      };
      img.onerror = () => {
        // Även om onerror triggar kan requesten ibland ha nått fram ändå,
        // men vi signalerar fel för att du ska se det i konsolen.
        observer.error(new Error('Beacon failed to load'));
      };

      img.src = url.toString();
    });
  }

  saveDaySessionHeader(date: string, dayStartTime: string): Observable<void> {
    return this.sendBeacon({
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
    return this.sendBeacon({
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
    return this.sendBeacon({
      type: 'boatLog',
      boat,
      startTime,
      endTime,
      description,
    });
  }
}
