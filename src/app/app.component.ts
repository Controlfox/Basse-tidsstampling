import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TimeLogService,
  TimeLog,
  DaySession,
} from './services/time-log.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  host: { ngSkipHydration: 'true' },
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Basse-tidsstampling';

  boats: string[] = [
    'M/S EMELIE',
    'M/S EMELIE II',
    'M/S GRIM',
    'E/S LISEN',
    'M/S VIDSKÄR',
    'M/S SJÖFRAKT',
    'E/S LOTTEN',
    'M/S QUEEN',
    'M/S OLLIVER',
    'M/S KÄRRAN',
    'Terminalen',
    'Lastbilar',
  ];

  selectedBoat: string = '';
  workDescription: string = '';

  timeLogs$: Observable<TimeLog[]>;
  currentLog$: Observable<TimeLog | null>;
  daySession$: Observable<DaySession | null>;

  isLogging: boolean = false;
  elapsedTime: string = '00:00:00';

  showDayStartModal: boolean = false;
  showDayEndModal: boolean = false;
  selectedDayStartTime: string = '08:00';
  selectedDayEndTime: string = '17:00';
  timeSlots: string[] = [];

  private timerInterval: any;
  private subscriptions = new Subscription();

  constructor(private timeLogService: TimeLogService) {
    this.timeLogs$ = this.timeLogService.getTimeLogs();
    this.currentLog$ = this.timeLogService.getCurrentLog();
    this.daySession$ = this.timeLogService.getDaySession();
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    const sub = this.currentLog$.subscribe((log) => {
      this.isLogging = !!log;

      if (log) {
        // <-- viktigt: synka dropdownen med aktiv logg även efter reload
        this.selectedBoat = log.boat;

        this.startTimer(log);
      } else {
        this.stopTimer();
        this.selectedBoat = '';
        this.workDescription = '';
      }
    });

    this.subscriptions.add(sub);
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
      // rensning sker i subscription när currentLog blir null
    } else {
      alert('Vänligen ange en kort beskrivning av arbetet');
    }
  }

  private startTimer(log: TimeLog): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    // robust om startTime råkar vara string någonstans
    const start = new Date(log.startTime).getTime();

    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      this.elapsedTime = this.formatTime(elapsed);
    }, 1000);
  }

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

  startDaySession(): void {
    const [hours, minutes] = this.selectedDayStartTime.split(':').map(Number);
    const dayStart = new Date();
    dayStart.setHours(hours, minutes, 0, 0);

    this.timeLogService.startDaySession(dayStart);
    this.showDayStartModal = false;
  }

  endDaySession(): void {
    const [hours, minutes] = this.selectedDayEndTime.split(':').map(Number);
    const dayEnd = new Date();
    dayEnd.setHours(hours, minutes, 0, 0);

    this.timeLogService.endDaySession(dayEnd);

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
      this.timerInterval = null;
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
    this.subscriptions.unsubscribe();
    this.stopTimer();
  }
}
