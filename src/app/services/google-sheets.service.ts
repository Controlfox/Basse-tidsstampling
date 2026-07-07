import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN } from '../../environments/apps-script-url';
import { Observable } from 'rxjs';

const TOKEN = APPS_SCRIPT_TOKEN;

@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  private appsScriptUrl = APPS_SCRIPT_URL;

  // Serialiserar alla requests så att t.ex. boatLogStop aldrig hinner
  // ifatt boatLogStart på samma logId.
  private requestChain: Promise<void> = Promise.resolve();

  private sendGet(params: Record<string, string>): Observable<void> {
    return new Observable<void>((observer) => {
      this.requestChain = this.requestChain
        .catch(() => {}) // tidigare fel ska inte blockera kön
        .then(() => this.runRequest(params, observer));
    });
  }

  private async runRequest(
    params: Record<string, string>,
    observer: { next: (v: void) => void; error: (e: any) => void; complete: () => void },
  ): Promise<void> {
    const maxAttempts = 3;
    let lastErr: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.doFetch(params, attempt);
        observer.next();
        observer.complete();
        return;
      } catch (err: any) {
        lastErr = err;
        // Retrya inte på application-fel (server svarade success:false)
        // — det är inte transient, retry hjälper inte.
        if (err && err.isApplicationError) break;
        if (attempt < maxAttempts) {
          const delay = 1500 * attempt;
          console.warn(
            `[Sheets retry] ${params['type']} attempt ${attempt} failed, retrying in ${delay}ms:`,
            err && err.message,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    console.error('[Sheets error]', params['type'], lastErr);
    observer.error(lastErr);
  }

  private doFetch(params: Record<string, string>, attempt: number): Promise<void> {
    const url = new URL(this.appsScriptUrl);
    url.searchParams.set('token', TOKEN);
    url.searchParams.set('_ts', String(Date.now()));

    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v ?? '');
    }

    const fullUrl = url.toString();
    console.log(`[Sheets request${attempt > 1 ? ` retry#${attempt}` : ''}]`, params['type'], fullUrl);

    if (typeof fetch === 'undefined') {
      return Promise.resolve();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    return fetch(fullUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    })
      .then(async (res) => {
        const text = await res.text();
        let body: any = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch (_) {
          body = { raw: text };
        }
        console.log('[Sheets response]', params['type'], res.status, body);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} from Apps Script`);
        }

        if (body && body.success === false) {
          const err: any = new Error(
            body.error || 'Apps Script returned success=false',
          );
          err.isApplicationError = true;
          throw err;
        }
      })
      .finally(() => clearTimeout(timeoutId));
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
    dayEndTime: string,
  ): Observable<void> {
    return this.sendGet({
      type: 'updateDaySessionEndTime',
      date,
      dayStartTime,
      dayEndTime,
    });
  }

  // --- BOAT LOG (start + stop update via logId in column L) ---
  startBoatLog(
    boat: string,
    startTime: string,
    logId: string,
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
    description: string,
  ): Observable<void> {
    return this.sendGet({
      type: 'boatLogStop',
      logId,
      endTime,
      description,
    });
  }

  // --- NEW: Update times for an existing log row ---
  updateBoatLogTimes(
    logId: string,
    startTime: string,
    endTime: string,
  ): Observable<void> {
    return this.sendGet({
      type: 'boatLogUpdateTimes',
      logId,
      startTime, // D
      endTime, // E ('' = pågår)
    });
  }
}
