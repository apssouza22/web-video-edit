// Safari-specific gesture event interface (not part of standard DOM types)
interface GestureEvent extends Event {
  rotation: number;
  scale: number;
}

type PinchCallback = (scale: number, rotation: number) => void;

/**
 * PinchHandler class handles pinch, zoom, and rotation gestures across browsers.
 * It provides unified handling for both Safari-specific gesture events and standard wheel events.
 */
export class PinchHandler {
    private element: HTMLElement;
    private callback: PinchCallback;
    private context: any;
    private gesturing: boolean;
    private gestureStartRotation: number;
    private gestureStartScale: number;

    /**
     * Creates a new PinchHandler instance
     */
    constructor(element: HTMLElement, callback: PinchCallback, context: any) {
        this.element = element;
        this.callback = callback;
        this.context = context;
        this.gesturing = false;
        this.gestureStartRotation = 0;
        this.gestureStartScale = 0;

        this.wheel = this.wheel.bind(this);
        this.gesturestart = this.gesturestart.bind(this);
        this.gesturechange = this.gesturechange.bind(this);
        this.gestureend = this.gestureend.bind(this);
    }

    /**
     * Handles wheel events
     */
    wheel(e: WheelEvent): void {
        if (e.ctrlKey || e.shiftKey) {
            e.preventDefault();
            let delta = e.deltaY;
            if (!Math.abs(delta) && e.deltaX != 0) {
                delta = e.deltaX * 0.5;
            }
            let scale = 1;
            scale -= delta * 0.01;
            // Your zoom/scale factor
            this.callback.call(this.context, scale, 0);
            return;
        }
        if (e.altKey) {
            let delta = e.deltaY;
            if (!Math.abs(delta) && e.deltaX != 0) {
                delta = e.deltaX * 0.5;
            }
            const rot = -delta * 0.1;
            this.callback.call(this.context, 0, rot);
        }
    }

    /**
     * Handles gesture start events for Safari
     */
    gesturestart(e: GestureEvent): void {
        this.gesturing = true;
        e.preventDefault();
        this.gestureStartRotation = e.rotation;
        this.gestureStartScale = e.scale;
    }

    /**
     * Handles gesture change events for Safari
     */
    gesturechange(e: GestureEvent): void {
        e.preventDefault();
        e.stopPropagation();
        const rotation = e.rotation - this.gestureStartRotation;
        const scale = e.scale / this.gestureStartScale;
        this.gestureStartRotation = e.rotation;
        this.gestureStartScale = e.scale;
        this.callback.call(this.context, scale, rotation);
    }

    /**
     * Handles gesture end events for Safari
     */
    gestureend(e: GestureEvent): void {
        this.gesturing = false;
        e.preventDefault();
    }

    /**
     * Sets up all event listeners
     */
    setupEventListeners(): void {
        // Safari gesture events
        this.element.addEventListener('gesturestart', this.gesturestart as EventListener);
        this.element.addEventListener('gesturechange', this.gesturechange as EventListener);
        this.element.addEventListener('gestureend', this.gestureend as EventListener);

        // Standard wheel events for other browsers
        this.element.addEventListener('wheel', this.wheel, {
            passive: false
        });
    }

    /**
     * Removes all event listeners
     */
    destroy(): void {
        this.element.removeEventListener('gesturestart', this.gesturestart as EventListener);
        this.element.removeEventListener('gesturechange', this.gesturechange as EventListener);
        this.element.removeEventListener('gestureend', this.gestureend as EventListener);
        this.element.removeEventListener('wheel', this.wheel);
    }

    /**
     * Checks if the handler is currently processing a gesture
     */
    isGesturing(): boolean {
        return this.gesturing;
    }
}
