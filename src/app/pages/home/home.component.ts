import { Component, ElementRef, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { ZoomService } from 'src/app/shared/services/zoom.service';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  @ViewChild('canvasContainer', { static: false }) canvasContainerRef!: ElementRef;

  name: string = 'test';
  canvasMode: string = 'Vector';
  canvasSize!: any;
  penSize: string = '1';
  penColor: string = '#000000';
  zoomLevel: number = 100;
  isCanvasDragging = false;
  isZoomSliderVisible = false;
  isFadingOut = false;
  selectedTool: string = 'pen'; 

  constructor(
    private renderer: Renderer2,
    private zoomService: ZoomService 
  ) {
  }

  choosePen(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.isCanvasDragging = false;
    this.selectedTool = 'pen';
    this.renderer.setStyle(this.canvasContainerRef.nativeElement, 'cursor', 'default');
  }

  choosePan(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.isCanvasDragging = true;
    this.renderer.setStyle(this.canvasContainerRef.nativeElement, 'cursor', 'grab');
  }

  toggleZoomSlider() {
    if (this.isZoomSliderVisible) {
      this.isFadingOut = true;

      setTimeout(() => {
        this.isZoomSliderVisible = false;
        this.isFadingOut = false; 
      }, 500);
    } else {
      this.isZoomSliderVisible = true;
    }
  }

  onZoomSliderChange(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const newZoomLevel = +input.value;
    this.updateZoomLevel(newZoomLevel);
    this.zoomService.setZoomLevel(this.zoomLevel / 100);
  }

  saveCanvas(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.zoomService.setSave(true);
  }

  updateCanvasSize(size: string) {
    this.canvasSize = size;
  }

  updateZoomLevel(level: number) {
    this.zoomLevel = level;
  }

  onPenSizeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.penSize = input.value;
  }

  onPenColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.penColor = input.value;
  }

  // chooseEraser(event: Event) {
  //   event.stopPropagation();
  //   event.preventDefault();
  //   this.isCanvasDragging = false;
  //   this.selectedTool = 'eraser';
  // }
}
