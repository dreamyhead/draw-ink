import { Directive, ElementRef, HostListener } from '@angular/core';
import { ZoomService } from '../services/zoom.service';

@Directive({
  selector: '[appKeyEvent]'
})
export class KeyEventDirective {
  private actions: SVGPathElement[] = [];
  private redoStack: SVGPathElement[] = [];

  constructor(
    private el: ElementRef,
    private zoomService: ZoomService,
  ) {}

  @HostListener('document:keydown', ['$event'])
  handleUndoRedo(event: KeyboardEvent) {
    if (event.ctrlKey && event.code === 'KeyZ') {
      this.undo(event);
    }
    if (event.ctrlKey && event.code === 'KeyY') {
      this.redo(event);
    }
    if (event.ctrlKey && event.code === 'KeyS') {
      this.save(event);
    }
  }

  undo(event: Event) {
    event.preventDefault();
    const lastAction = this.actions.pop();
    if (lastAction) {
      this.el.nativeElement.removeChild(lastAction);
      this.redoStack.push(lastAction); 
    }
  }

  redo(event: Event) {
    event.preventDefault();
    const lastRedoAction = this.redoStack.pop();
    if (lastRedoAction) {
      this.el.nativeElement.appendChild(lastRedoAction);
      this.actions.push(lastRedoAction);
    }
  }

  save(event: Event) {
    event.preventDefault();
    this.zoomService.setSave(true);
  }

  addAction(action: SVGPathElement) {
    this.actions.push(action);
    this.redoStack = [];
  }
}
