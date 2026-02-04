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

  // Modal för att ändra tider på aktiv logg
  showEditBoatTimesModal: boolean = false;

  selectedBoatStartTime: string = '00:00';
  selectedBoatEndTime: string = ''; // tom = pågår

  selectedDayStartTime: string = '00:00';
  selectedDayEndTime: string = '00:00';
  timeSlots: string[] = [];

  // ✅ NYTT: lunch-status (för lila default + bekräftelse)
  lunchTaken: boolean = false;

  private timerInterval: any;
  private subscriptions = new Subscription();

  constructor(private timeLogService: TimeLogService) {
    this.timeLogs$ = this.timeLogService.getTimeLogs();
    this.currentLog$ = this.timeLogService.getCurrentLog();
    this.daySession$ = this.timeLogService.getDaySession();
    this.generateTimeSlots();

    const nextQ = this.getNextQuarterHHmm(new Date());
    this.selectedDayStartTime = nextQ;
    this.selectedDayEndTime = nextQ;
    this.selectedBoatStartTime = nextQ;
    this.selectedBoatEndTime = '';

    // ✅ Lunch-status kan ligga kvar vid reload (valfritt men brukar vara önskat)
    try {
      const stored = localStorage.getItem('lunchTaken');
      this.lunchTaken = stored === 'true';
    } catch (_) {}
  }

  ngOnInit(): void {
    const sub = this.currentLog$.subscribe((log) => {
      this.isLogging = !!log;

      if (log) {
        this.selectedBoat = log.boat;
        this.workDescription = log.description || '';

        // (dessa values används om du öppnar edit och vill ha loggens tider)
        this.selectedBoatStartTime = this.formatHHmm(new Date(log.startTime));
        this.selectedBoatEndTime = log.endTime
          ? this.formatHHmm(new Date(log.endTime))
          : '';

        this.startTimer(log);
      } else {
        this.stopTimer();
        this.selectedBoat = '';
        this.workDescription = '';

        const nextQ = this.getNextQuarterHHmm(new Date());
        this.selectedBoatStartTime = nextQ;
        this.selectedBoatEndTime = '';
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
    } else {
      alert('Vänligen ange en kort beskrivning av arbetet');
    }
  }

  onWorkDescriptionChange(value: string): void {
    this.workDescription = value;
    this.timeLogService.updateCurrentDescriptionDraft(value);
  }

  // ✅ Öppna “Ändra tider”:
  // - starttid: loggens starttid om den finns, annars närmsta kvart
  // - sluttid: om loggens endTime finns => visa den, annars default = närmsta kvart (men valfritt)
  openEditBoatTimes(log: TimeLog | null): void {
    const nextQ = this.getNextQuarterHHmm(new Date());

    if (log) {
      // start: loggens start
      this.selectedBoatStartTime = log.startTime
        ? this.formatHHmm(new Date(log.startTime))
        : nextQ;

      // end: om loggen har endTime => visa den, annars förifyll med närmsta kvart
      // (om du hellre vill ha tom som default, byt nextQ till '')
      this.selectedBoatEndTime = log.endTime
        ? this.formatHHmm(new Date(log.endTime))
        : nextQ;
    } else {
      this.selectedBoatStartTime = nextQ;
      this.selectedBoatEndTime = nextQ;
    }

    this.showEditBoatTimesModal = true;
  }

  saveBoatTimes(): void {
    this.timeLogService
      .editActiveBoatTimes(this.selectedBoatStartTime, this.selectedBoatEndTime)
      .subscribe({
        next: () => {
          this.showEditBoatTimesModal = false;
        },
        error: (e) => {
          console.error('Fel vid ändring av tider:', e);
          alert('Kunde inte spara tiderna. Prova igen.');
        },
      });
  }

  // används av HTML istället för showDayStartModal = true
  openDayStartModal(): void {
    this.selectedDayStartTime = this.getNextQuarterHHmm(new Date());
    this.showDayStartModal = true;
  }

  // används av HTML istället för showDayEndModal = true
  openDayEndModal(): void {
    this.selectedDayEndTime = this.getNextQuarterHHmm(new Date());
    this.showDayEndModal = true;
  }

  startDaySession(): void {
    this.lunchTaken = false;
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

  // ✅ Lunch-knapp:
  // - före klick: dov lila
  // - efter klick: spara lunch, visa bekräftelse + knappen blir "som nu"
  addLunch(): void {
    if (this.isLogging) {
      alert('Stoppa aktivt moment innan du loggar lunch.');
      return;
    }
    if (this.lunchTaken) return;

    this.timeLogService.addLunchBreak();

    this.lunchTaken = true;
    try {
      localStorage.setItem('lunchTaken', 'true');
    } catch (_) {}
  }

  private startTimer(log: TimeLog): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const start = new Date(log.startTime).getTime();

    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      this.elapsedTime = this.formatTime(elapsed);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.elapsedTime = '00:00:00';
    }
  }

  private generateTimeSlots(): void {
    this.timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        this.timeSlots.push(
          `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        );
      }
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0',
    )}:${String(seconds).padStart(2, '0')}`;
  }

  private formatHHmm(d: Date): string {
    return d.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // närmsta kvart FRAMÅT (ceil)
  private getNextQuarterHHmm(date: Date): string {
    const d = new Date(date);
    d.setSeconds(0, 0);

    const m = d.getMinutes();
    const next = Math.ceil(m / 15) * 15;

    if (next === 60) {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0);
    } else {
      d.setMinutes(next);
    }

    return this.formatHHmm(d);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopTimer();
  }
}
