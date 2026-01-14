import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { GoogleSheetsService } from './google-sheets.service';

export interface TimeLog {
  id?: string;
  boat: string;
  startTime: Date;
  endTime?: Date;
  description?: string;
  completed: boolean;
}

export interface DaySession {
  date: string;
  dayStartTime: Date;
  dayEndTime?: Date;
  timeLogs: TimeLog[];
}

@Injectable({
  providedIn: 'root',
})
export class TimeLogService {
  private timeLogs$ = new BehaviorSubject<TimeLog[]>([]);
  private currentLog$ = new BehaviorSubject<TimeLog | null>(null);
  private daySession$ = new BehaviorSubject<DaySession | null>(null);
  private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private googleSheetsService: GoogleSheetsService
  ) {
    this.loadTimeLogs();
    this.loadDaySession();
  }

  // Get all time logs
  getTimeLogs(): Observable<TimeLog[]> {
    return this.timeLogs$.asObservable();
  }

  // Get current active log
  getCurrentLog(): Observable<TimeLog | null> {
    return this.currentLog$.asObservable();
  }

  // Get day session
  getDaySession(): Observable<DaySession | null> {
    return this.daySession$.asObservable();
  }

  // Start a new day session
  startDaySession(dayStartTime: Date): void {
    const today = new Date().toISOString().split('T')[0];
    const daySession: DaySession = {
      date: today,
      dayStartTime,
      timeLogs: [],
    };
    this.daySession$.next(daySession);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentDaySession', JSON.stringify(daySession));
    }

    // Spara dagsession-raden omedelbar när dagen startar
    this.saveDaySessionHeaderToSheets(dayStartTime);
  }

  // End day session
  endDaySession(dayEndTime: Date): void {
    const currentSession = this.daySession$.value;
    if (currentSession) {
      currentSession.dayEndTime = dayEndTime;
      this.daySession$.next(currentSession);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(
          'currentDaySession',
          JSON.stringify(currentSession)
        );
      }
    }
  }

  // Check if day session is active
  isDaySessionActive(): boolean {
    return this.daySession$.value !== null;
  }

  // Start a new time log
  startTimeLog(boat: string): void {
    const newLog: TimeLog = {
      id: Date.now().toString(),
      boat,
      startTime: new Date(),
      completed: false,
    };
    this.currentLog$.next(newLog);
  }

  // Stop current time log and save to storage
  stopTimeLog(description: string): void {
    const currentLog = this.currentLog$.value;
    if (currentLog) {
      currentLog.endTime = new Date();
      currentLog.description = description;
      currentLog.completed = true;

      const logs = this.timeLogs$.value;
      logs.push(currentLog);
      this.timeLogs$.next(logs);

      // Spara endast i webbläsare
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('timeLogs', JSON.stringify(logs));
      }
      this.currentLog$.next(null);

      // Save to Google Sheets
      this.saveToGoogleSheets(currentLog);
    }
  }

  // Save to Google Sheets
  private saveToGoogleSheets(log: TimeLog): void {
    if (!log.endTime) return;

    const startTimeStr =
      log.startTime?.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
      }) || '';
    const endTimeStr =
      log.endTime?.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
      }) || '';

    this.googleSheetsService
      .saveBoatLogToSheets(
        log.boat,
        startTimeStr,
        endTimeStr,
        log.description || ''
      )
      .subscribe({
        next: (response) => {
          console.log('Båtlogg sparad till Google Sheets:', response);
        },
        error: (error) => {
          console.error('Fel vid sparande till Google Sheets:', error);
        },
      });
  }

  // Save day session header to Google Sheets when day starts
  private saveDaySessionHeaderToSheets(dayStartTime: Date): void {
    const date = new Date().toISOString().split('T')[0];
    const dayStartTimeStr = dayStartTime.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.googleSheetsService
      .saveDaySessionHeader(date, dayStartTimeStr)
      .subscribe({
        next: (response) => {
          console.log('Dagsession-header sparad till Google Sheets:', response);
        },
        error: (error) => {
          console.error('Fel vid sparande av dagsession-header:', error);
        },
      });
  }

  // Save day session to Google Sheets (update with end time)
  saveDaySessionToSheets(): Observable<any> {
    const daySession = this.daySession$.value;
    if (!daySession || !daySession.dayEndTime) {
      return new Observable((observer) => observer.complete());
    }

    const dayStartTimeStr =
      daySession.dayStartTime?.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
      }) || '';
    const dayEndTimeStr =
      daySession.dayEndTime?.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
      }) || '';

    console.log('Sending to Google Sheets:');
    console.log('  Date:', daySession.date);
    console.log('  DayStartTime:', dayStartTimeStr);
    console.log('  DayEndTime:', dayEndTimeStr);

    return new Observable((observer) => {
      this.googleSheetsService
        .updateDaySessionWithEndTime(
          daySession.date,
          dayStartTimeStr,
          dayEndTimeStr
        )
        .subscribe({
          next: (response) => {
            console.log('Dagsession uppdaterad med sluttid:', response);
            // Rensa sessionen efter att den sparats
            this.daySession$.next(null);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.removeItem('currentDaySession');
            }
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('Fel vid sparande av dagsession:', error);
            // Rensa även vid fel
            this.daySession$.next(null);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.removeItem('currentDaySession');
            }
            observer.error(error);
          },
        });
    });
  }

  // Calculate duration in minutes
  private calculateDuration(log: TimeLog): number {
    if (log.endTime && log.startTime) {
      return Math.round(
        (log.endTime.getTime() - log.startTime.getTime()) / 60000
      );
    }
    return 0;
  }

  // Load from local storage
  private loadTimeLogs(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Hoppa över på servern
    }

    const stored = localStorage.getItem('timeLogs');
    if (stored) {
      const logs = JSON.parse(stored).map((log: any) => ({
        ...log,
        startTime: new Date(log.startTime),
        endTime: log.endTime ? new Date(log.endTime) : undefined,
      }));
      this.timeLogs$.next(logs);
    }
  }

  // Load day session from storage
  private loadDaySession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const stored = localStorage.getItem('currentDaySession');
    if (stored) {
      const session = JSON.parse(stored);
      session.dayStartTime = new Date(session.dayStartTime);
      if (session.dayEndTime) {
        session.dayEndTime = new Date(session.dayEndTime);
      }

      // Kontrollera om det är samma dag
      const today = new Date().toISOString().split('T')[0];
      if (session.date === today) {
        this.daySession$.next(session);
      } else {
        // Andra dag - radera gammal session
        localStorage.removeItem('currentDaySession');
      }
    }
  }
}
