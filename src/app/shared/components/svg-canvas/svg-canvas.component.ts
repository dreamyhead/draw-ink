import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, Renderer2, ViewChild } from '@angular/core';
import { KeyEventDirective } from '../../directives/key-event.directive';
import { fromEvent, merge, Observable, Subject, takeUntil, tap } from 'rxjs';
import { HomeComponent } from 'src/app/pages/home/home.component';
import { ZoomService } from '../../services/zoom.service';

type ListenersMap = {[key: string]: (event: any) => void};

@Component({
  selector: 'svg-canvas',
  templateUrl: './svg-canvas.component.html',
  styleUrls: ['./svg-canvas.component.scss']
})
export class SvgCanvasComponent implements OnDestroy {
  @Input()
  drag: boolean = false;

  @Input()
  penSize: string = '1';

  @Input()
  penColor: string = '#000000';

  @Output() 
  zoomLevelChange: EventEmitter<number> = new EventEmitter<number>();

  @ViewChild(KeyEventDirective) 
  keyEventDirective!: KeyEventDirective;

  @ViewChild('canvas', { static: false }) 
  canvasRef!: ElementRef;
  
  parentCanvas!: HTMLElement;
  canvasMode: string = 'Vector';
  transform: string = 'translate(0, 0) scale(1)';
  private canvas!: SVGSVGElement;
  private isDraw = false;
  private currentPath: SVGPathElement | null = null;
  private mouse = { x: 0, y: 0 };
  private scale: number = 1;
  private pan = { x: 0, y: 0 };
  private isPanning = false;
  private points: { x: number; y: number }[] = [];
  private parentCanvasListeners: ListenersMap = {
    mousedown: this.startPanning,
    mousemove: this.panCanvas,
    mouseup: this.stopPanning,
    wheel: this.zoomCanvas,
  }
  private canvasListeners: ListenersMap = {
    mousedown: this.startDrawing,
    mousemove: this.drawLine,
    mouseup: this.stopDrawing
  }
  private destroySubject$ = new Subject<void>();

  constructor(
    private renderer: Renderer2,
    private parent: HomeComponent,
    private zoomService: ZoomService,
    private cdr: ChangeDetectorRef 
  ) {
  }

  ngAfterViewInit() {
    this.parentCanvas = this.parent.canvasContainerRef.nativeElement as HTMLElement;
    this.canvas = this.canvasRef.nativeElement as unknown as SVGSVGElement;
    if (!this.parentCanvas || !this.canvas) {
      return;
    }
    setTimeout(() => {
      this.parent.canvasSize = `${this.canvas.width.baseVal.value}px × ${this.canvas.height.baseVal.value}px`;
    }, 0);

    merge(this.createListeners(this.parentCanvas, this.parentCanvasListeners), this.createListeners(this.canvas, this.canvasListeners))
      .pipe(takeUntil(this.destroySubject$))
      .subscribe();
    this.addDrawingListeners();
    this.zoomService.zoomLevel$
      .subscribe(level => {
        this.scale = level;
        this.updateTransform();
      });

    this.zoomService.save$
      .subscribe((state) => {
        if (!state) {
          return;
        }

        this.saveCanvas();
        this.zoomService.setSave(false);
      });  
  }

  createListeners(element: HTMLElement | SVGSVGElement, listenersMap: ListenersMap): Observable<unknown> {
    return merge(...Object.keys(listenersMap).map((listenerName) => 
            fromEvent<MouseEvent>(element, listenerName)
              .pipe(
                tap(listenersMap[listenerName].bind(this))
              )
          ))
  }

  startPanning(e: MouseEvent) {
    if (!this.drag) {
      return;
    }

    this.isPanning = true;
  }

  stopPanning() {
    if (!this.drag) {
      return;
    }
    
    this.parentCanvas!.style.cursor = 'grab';
    this.isPanning = false;
  }

  zoomCanvas(event: WheelEvent) {
    event.preventDefault();
    
    let zoomSpeed = 0.1;
  
    const newScale = this.scale + (event.deltaY > 0 ? -zoomSpeed : zoomSpeed);
    if (newScale >= 0.5 && newScale <= 1000) {
      const container = this.parentCanvas!.getBoundingClientRect();
      const containerCenterX = container.width / 2;
      const containerCenterY = container.height / 2;
      const cursorX = event.clientX - container.left - containerCenterX;
      const cursorY = event.clientY - container.top - containerCenterY;
      const scaleChange = newScale / this.scale;
  
      this.pan.x = this.pan.x * scaleChange + (cursorX - cursorX * scaleChange);
      this.pan.y = this.pan.y * scaleChange + (cursorY - cursorY * scaleChange);
  
      this.scale = newScale;
      this.zoomLevelChange.emit(Math.round(this.scale * 100));
      this.updateTransform();
    }
  }

  panCanvas(e: MouseEvent) {
    if (!this.drag) {
      return;
    }

    if (!this.isPanning) return;

    this.renderer.setStyle(this.parentCanvas, 'cursor', 'grabbing');
    this.pan.x += e.movementX; 
    this.pan.y += e.movementY;

    this.updateTransform();
  }

  updateTransform() {
    this.transform = `translate(${this.pan.x}, ${this.pan.y}) scale(${this.scale})`;    
    this.renderer.setAttribute(this.canvas, 'transform', this.transform);
  }

  startDrawing(e: MouseEvent) {
    if (this.drag) {
      return;
    }

    const point = this.canvas.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
  
    const ctm = this.canvas.getScreenCTM();
    const transformedPoint = point.matrixTransform(ctm!.inverse());
  
    this.mouse.x = transformedPoint.x;
    this.mouse.y = transformedPoint.y;
    this.isDraw = true;
  
    this.points.push({ x: this.mouse.x, y: this.mouse.y });
  
    this.currentPath = this.renderer.createElement("path", "svg");
    this.renderer.setAttribute(this.currentPath, "d", `M${this.mouse.x},${this.mouse.y}`);
    this.renderer.setAttribute(this.currentPath, "stroke", this.penColor);
    this.renderer.setAttribute(this.currentPath, "stroke-width", this.penSize);
    this.renderer.setAttribute(this.currentPath, "stroke-linecap", "round");
    this.renderer.setAttribute(this.currentPath, "stroke-linejoin", "round");
    this.renderer.setAttribute(this.currentPath, "fill", "none");
    this.renderer.appendChild(this.canvas, this.currentPath);
    this.keyEventDirective.addAction(this.currentPath as SVGPathElement);
  }

  drawLine(e: MouseEvent) {
    if (this.drag || !this.isDraw || !this.currentPath) return;
  
    const pt = this.canvas.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
  
    const ctm = this.canvas.getScreenCTM();
    const transformedPt = pt.matrixTransform(ctm!.inverse());
  
    const newX = transformedPt.x;
    const newY = transformedPt.y;

    this.points.push({ x: newX, y: newY });
  
    const previousX = this.mouse.x;
    const previousY = this.mouse.y;
  
    const midX = (previousX + newX) / 2;
    const midY = (previousY + newY) / 2;
  
    const d = this.currentPath.getAttribute("d");
    this.renderer.setAttribute(this.currentPath, "d", `${d} Q${previousX},${previousY},${midX},${midY}`);
  
    this.mouse.x = newX;
    this.mouse.y = newY;
  }
  
  stopDrawing() {
    if (this.drag) {
      return;
    }
  
    this.isDraw = false;
    this.optimizePath();
  
    this.points = [];
    this.removeDrawingListeners();
  }
  
  private optimizePath() {
    if (this.points.length === 0) return;
  
    const optimizedPoints: { x: number; y: number }[] = [];
    const distanceThreshold = 1;
  
    optimizedPoints.push(this.points[0]);
  
    for (let i = 1; i < this.points.length; i++) {
      const dx = this.points[i].x - optimizedPoints[optimizedPoints.length - 1].x;
      const dy = this.points[i].y - optimizedPoints[optimizedPoints.length - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
  
      if (distance >= distanceThreshold) {
        optimizedPoints.push(this.points[i]);
      }
    }
  
    if (this.currentPath) {
      let d = `M${optimizedPoints[0].x},${optimizedPoints[0].y}`;
  
      if (optimizedPoints.length === 1) {
        d += ` L${optimizedPoints[0].x},${optimizedPoints[0].y}`;
      } else {
        for (let i = 1; i < optimizedPoints.length; i++) {
          const previousPoint = optimizedPoints[i - 1];
          const currentPoint = optimizedPoints[i];
    
          const midX = (previousPoint.x + currentPoint.x) / 2;
          const midY = (previousPoint.y + currentPoint.y) / 2;
    
          d += ` Q${previousPoint.x},${previousPoint.y},${midX},${midY}`;
        }  
      }

      this.renderer.setAttribute(this.currentPath, "d", d);
    }
  }
  
  saveCanvas() {
    this.canvas.removeAttribute('transform');
    const svgData = new XMLSerializer().serializeToString(this.canvas);
    this.canvas.setAttribute('transform', this.transform); 
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private addDrawingListeners() {
    document.addEventListener('mousemove', this.drawLine.bind(this));
    document.addEventListener('mouseup', this.stopDrawing.bind(this));
  }

  private removeDrawingListeners() {
    document.removeEventListener('mousemove', this.drawLine.bind(this));
    document.removeEventListener('mouseup', this.stopDrawing.bind(this));
  }

  ngOnDestroy() {
    this.destroySubject$.next();
  }
}
