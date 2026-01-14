import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL } from '../../environments/apps-script-url';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SheetsConfig {
  spreadsheetId: string;
  range: string;
  valueInputOption: string;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleSheetsService {
  // Google Apps Script Web App URL (ange din egen efter deployment)
  private appsScriptUrl = APPS_SCRIPT_URL;

  constructor(private http: HttpClient) {}

  /**
   * Spara dagsession-header när dagen startar (med tom dagslut)
   */
  saveDaySessionHeader(date: string, dayStartTime: string): Observable<any> {
    const payload = {
      type: 'daySessionHeader',
      date,
      dayStartTime,
      dayEndTime: '', // Tom dagslut initialt
    };

    // Skicka direkt till Google Apps Script
    return this.http.post<any>(this.appsScriptUrl, payload);
  }

  /**
   * Uppdatera dagsession med sluttid
   */
  updateDaySessionWithEndTime(
    date: string,
    dayStartTime: string,
    dayEndTime: string
  ): Observable<any> {
    const payload = {
      type: 'updateDaySessionEndTime',
      date,
      dayStartTime,
      dayEndTime,
    };

    // Skicka direkt till Google Apps Script
    return this.http.post<any>(this.appsScriptUrl, payload);
  }

  /**
   * Spara båtlogg (underrad)
   */
  saveBoatLogToSheets(
    boat: string,
    startTime: string,
    endTime: string,
    description: string
  ): Observable<any> {
    const payload = {
      type: 'boatLog',
      boat,
      startTime,
      endTime,
      description,
    };

    // Skicka direkt till Google Apps Script
    return this.http.post<any>(this.appsScriptUrl, payload);
  }

  /**
   * Uppdatera Google Apps Script URL
   */
  setCredentials(appsScriptUrl: string): void {
    if (appsScriptUrl && appsScriptUrl !== 'YOUR_APPS_SCRIPT_URL_HERE') {
      this.appsScriptUrl = appsScriptUrl;
    }
  }
}
