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

@Injectable({ providedIn: 'root' })
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
    this.loadCurrentLog(); // <-- NYTT: återuppta aktiv logg efter reload/mobil
  }

  getTimeLogs(): Observable<TimeLog[]> {
    return this.timeLogs$.asObservable();
  }

  getCurrentLog(): Observable<TimeLog | null> {
    return this.currentLog$.asObservable();
  }

  getDaySession(): Observable<DaySession | null> {
    return this.daySession$.asObservable();
  }

  // --- Day session ---
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

    this.saveDaySessionHeaderToSheets(dayStartTime);
  }

  endDaySession(dayEndTime: Date): void {
    const currentSession = this.daySession$.value;
    if (!currentSession) return;

    currentSession.dayEndTime = dayEndTime;
    this.daySession$.next(currentSession);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentDaySession', JSON.stringify(currentSession));
    }
  }

  isDaySessionActive(): boolean {
    return this.daySession$.value !== null;
  }

  // --- Time log START ---
  startTimeLog(boat: string): void {
    const newLog: TimeLog = {
      id: Date.now().toString(), // logId
      boat,
      startTime: new Date(),
      completed: false,
    };

    this.currentLog$.next(newLog);
    this.saveCurrentLog(newLog);

    // Skriv START direkt till Sheets så sessionen finns även om mobilen stänger sidan
    const startTimeStr = newLog.startTime.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.googleSheetsService
      .startBoatLog(newLog.boat, startTimeStr, newLog.id!)
      .subscribe({
        next: () => console.log('Båtlogg START skickad'),
        error: (e) => console.error('Fel vid båtlogg START:', e),
      });
  }

  // --- Time log STOP ---
  stopTimeLog(description: string): void {
    const currentLog = this.currentLog$.value;
    if (!currentLog) return;

    currentLog.endTime = new Date();
    currentLog.description = description;
    currentLog.completed = true;

    const logs = this.timeLogs$.value;
    logs.push(currentLog);
    this.timeLogs$.next(logs);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('timeLogs', JSON.stringify(logs));
    }

    // Uppdatera samma rad i Sheets via logId i kolumn L
    const endTimeStr = currentLog.endTime.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.googleSheetsService
      .stopBoatLog(currentLog.id!, endTimeStr, currentLog.description || '')
      .subscribe({
        next: () => console.log('Båtlogg STOP skickad'),
        error: (e) => console.error('Fel vid båtlogg STOP:', e),
      });

    // Rensa aktiv logg lokalt (så den inte återupptas)
    this.currentLog$.next(null);
    this.saveCurrentLog(null);
  }

  // --- Day session: header ---
  private saveDaySessionHeaderToSheets(dayStartTime: Date): void {
    const date = new Date().toISOString().split('T')[0];
    const dayStartTimeStr = dayStartTime.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.googleSheetsService
      .saveDaySessionHeader(date, dayStartTimeStr)
      .subscribe({
        next: () => console.log('Dagsession-header skickad'),
        error: (e) => console.error('Fel vid dagsession-header:', e),
      });
  }

  // --- Day session: end time update ---
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

    return new Observable((observer) => {
      this.googleSheetsService
        .updateDaySessionWithEndTime(
          daySession.date,
          dayStartTimeStr,
          dayEndTimeStr
        )
        .subscribe({
          next: () => {
            console.log('Dagsession uppdaterad med sluttid');

            // Rekommendation: rensa bara vid lyckat svar
            this.daySession$.next(null);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.removeItem('currentDaySession');
            }

            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            console.error('Fel vid sparande av dagsession:', error);
            // OBS: behåll sessionen vid fel så användaren kan prova igen
            observer.error(error);
          },
        });
    });
  }

  // --- Local storage: current log (NYTT) ---
  private saveCurrentLog(log: TimeLog | null): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (log) {
      localStorage.setItem('currentLog', JSON.stringify(log));
    } else {
      localStorage.removeItem('currentLog');
    }
  }

  private loadCurrentLog(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const stored = localStorage.getItem('currentLog');
    if (!stored) return;

    const raw = JSON.parse(stored);

    const restored: TimeLog = {
      ...raw,
      startTime: new Date(raw.startTime),
      endTime: raw.endTime ? new Date(raw.endTime) : undefined,
    };

    // Återuppta bara om den inte är "completed"
    if (!restored.completed) {
      this.currentLog$.next(restored);
    } else {
      localStorage.removeItem('currentLog');
    }
  }

  // --- Local storage: time logs ---
  private loadTimeLogs(): void {
    if (!isPlatformBrowser(this.platformId)) return;

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

  // --- Local storage: day session ---
  private loadDaySession(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const stored = localStorage.getItem('currentDaySession');
    if (stored) {
      const session = JSON.parse(stored);
      session.dayStartTime = new Date(session.dayStartTime);
      if (session.dayEndTime) session.dayEndTime = new Date(session.dayEndTime);

      const today = new Date().toISOString().split('T')[0];
      if (session.date === today) {
        this.daySession$.next(session);
      } else {
        localStorage.removeItem('currentDaySession');
      }
    }
  }
}
