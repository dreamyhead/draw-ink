import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ZoomService {
  private zoomLevelSubject = new BehaviorSubject<number>(1);
  zoomLevel$ = this.zoomLevelSubject.asObservable();

  private saveSubject = new BehaviorSubject<boolean>(false);
  save$ = this.saveSubject.asObservable();

  setZoomLevel(level: number) {
    this.zoomLevelSubject.next(level);
  }

  setSave(state: boolean) {
    this.saveSubject.next(state);
  }
}
