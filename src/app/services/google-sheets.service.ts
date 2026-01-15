import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL } from '../../environments/apps-script-url';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoogleSheetsService {
  // Google Apps Script Web App URL
  private appsScriptUrl = APPS_SCRIPT_URL;

  constructor(private http: HttpClient) {}

  /**
   * Spara dagsession-header när dagen startar (med tom dagslut)
   * Skickas som x-www-form-urlencoded för att undvika CORS preflight.
   */
  saveDaySessionHeader(date: string, dayStartTime: string): Observable<any> {
    const body = new HttpParams()
      .set('type', 'daySessionHeader')
      .set('date', date)
      .set('dayStartTime', dayStartTime)
      .set('dayEndTime', '');

    // responseType: 'text' -> funkar oavsett om Apps Script svarar med text eller JSON
    return this.http.post(this.appsScriptUrl, body, { responseType: 'text' });
  }

  /**
   * Uppdatera dagsession med sluttid
   * Skickas som x-www-form-urlencoded för att undvika CORS preflight.
   */
  updateDaySessionWithEndTime(
    date: string,
    dayStartTime: string,
    dayEndTime: string
  ): Observable<any> {
    const body = new HttpParams()
      .set('type', 'updateDaySessionEndTime')
      .set('date', date)
      .set('dayStartTime', dayStartTime)
      .set('dayEndTime', dayEndTime);

    return this.http.post(this.appsScriptUrl, body, { responseType: 'text' });
  }

  /**
   * Spara båtlogg (underrad)
   * Skickas som x-www-form-urlencoded för att undvika CORS preflight.
   */
  saveBoatLogToSheets(
    boat: string,
    startTime: string,
    endTime: string,
    description: string
  ): Observable<any> {
    const body = new HttpParams()
      .set('type', 'boatLog')
      .set('boat', boat)
      .set('startTime', startTime)
      .set('endTime', endTime)
      .set('description', description);

    return this.http.post(this.appsScriptUrl, body, { responseType: 'text' });
  }

  /**
   * Uppdatera Google Apps Script URL (valfritt)
   */
  setCredentials(appsScriptUrl: string): void {
    if (appsScriptUrl && !appsScriptUrl.includes('YOUR_APPS_SCRIPT_URL_HERE')) {
      this.appsScriptUrl = appsScriptUrl;
    }
  }
}
