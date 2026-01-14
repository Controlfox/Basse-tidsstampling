import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TimeLogService,
  TimeLog,
  DaySession,
} from './services/time-log.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [TimeLogService, GoogleSheetsService],
  host: { ngSkipHydration: 'true' },
})
export class AppComponent implements OnInit {
  title = 'Basse-tidsstampling';

  boats: string[] = ['Båt 1', 'Båt 2', 'Båt 3', 'Båt 4'];
  selectedBoat: string = '';
  workDescription: string = '';
  timeLogs$: Observable<TimeLog[]>;
  currentLog$: Observable<TimeLog | null>;
  daySession$: Observable<DaySession | null>;
  isLogging: boolean = false;
  elapsedTime: string = '00:00:00';

  // Day session properties
  showDayStartModal: boolean = false;
  showDayEndModal: boolean = false;
  selectedDayStartTime: string = '08:00';
  selectedDayEndTime: string = '17:00';
  timeSlots: string[] = [];

  private timerInterval: any;

  constructor(
    private timeLogService: TimeLogService,
    private googleSheetsService: GoogleSheetsService
  ) {
    this.timeLogs$ = this.timeLogService.getTimeLogs();
    this.currentLog$ = this.timeLogService.getCurrentLog();
    this.daySession$ = this.timeLogService.getDaySession();
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    // Sätt Google Apps Script webhook URL här
    // OBS: URL-formatet måste vara /exec (inte /usercopy)
    this.googleSheetsService.setCredentials(
      'https://script.google.com/macros/s/AKfycbzNkgNjDa7ewJQo8YDb8atM1BW6P9eJXX3U5pTCiRP8COL4ZRRLYip5I5KUzKOZJwl4XQ/exec'
    );

    this.currentLog$.subscribe((log) => {
      this.isLogging = !!log;
      if (log) {
        this.startTimer(log);
      } else {
        this.stopTimer();
      }
    });
  }

  startLogging(): void {
    if (this.selectedBoat) {
      this.timeLogService.startTimeLog(this.selectedBoat);
      this.workDescription = '';
    }
  }

  stopLogging(): void {
    if (this.workDescription.trim()) {
      this.timeLogService.stopTimeLog(this.workDescription);
      this.selectedBoat = '';
      this.workDescription = '';
    } else {
      alert('Vänligen ange en kort beskrivning av arbetet');
    }
  }

  private startTimer(log: TimeLog): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const now = new Date().getTime();
      const start = log.startTime.getTime();
      const elapsed = now - start;
      this.elapsedTime = this.formatTime(elapsed);
    }, 1000);
  }

  // Generate time slots in 15-minute intervals
  private generateTimeSlots(): void {
    this.timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(
          minute
        ).padStart(2, '0')}`;
        this.timeSlots.push(timeString);
      }
    }
  }

  // Start day session
  startDaySession(): void {
    const [hours, minutes] = this.selectedDayStartTime.split(':').map(Number);
    const dayStart = new Date();
    dayStart.setHours(hours, minutes, 0, 0);

    this.timeLogService.startDaySession(dayStart);
    this.showDayStartModal = false;
  }

  // End day session
  endDaySession(): void {
    const [hours, minutes] = this.selectedDayEndTime.split(':').map(Number);
    const dayEnd = new Date();
    dayEnd.setHours(hours, minutes, 0, 0);

    this.timeLogService.endDaySession(dayEnd);
    // Spara dagsession till Google Sheets
    this.timeLogService.saveDaySessionToSheets().subscribe({
      next: () => {
        console.log('Dagsession sparad');
        this.showDayEndModal = false;
      },
      error: () => {
        console.error('Fel vid sparande av dagsession');
        this.showDayEndModal = false;
      },
    });
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.elapsedTime = '00:00:00';
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}:${String(seconds).padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
