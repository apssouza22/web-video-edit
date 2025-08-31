/**
 * PinchHandler class handles pinch, zoom, and rotation gestures across browsers.
 * It provides unified handling for both Safari-specific gesture events and standard wheel events.
 */
export class PinchHandler {

    /**
     * Creates a new PinchHandler instance
     * 
     * @param {HTMLElement} element - The DOM element to attach the handler to
     * @param {Function} callback - Callback function that receives scale and rotation values
     * @param {Object} context - The context in which the callback will be executed
     */
    constructor(element, callback, context) {
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
     * 
     * @param {WheelEvent} e - The wheel event
     */
    wheel(e) {
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
            let rot = -delta * 0.1;
            this.callback.call(this.context, 0, rot);
        }
    }

    /**
     * Handles gesture start events for Safari
     * 
     * @param {GestureEvent} e - The gesture event
     */
    gesturestart(e) {
        this.gesturing = true;
        e.preventDefault();
        this.gestureStartRotation = e.rotation;
        this.gestureStartScale = e.scale;
    }

    /**
     * Handles gesture change events for Safari
     * 
     * @param {GestureEvent} e - The gesture event
     */
    gesturechange(e) {
        e.preventDefault();
        e.stopPropagation();
        let rotation = e.rotation - this.gestureStartRotation;
        let scale = e.scale / this.gestureStartScale;
        this.gestureStartRotation = e.rotation;
        this.gestureStartScale = e.scale;
        this.callback.call(this.context, scale, rotation);
    }

    /**
     * Handles gesture end events for Safari
     * 
     * @param {GestureEvent} e - The gesture event
     */
    gestureend(e) {
        this.gesturing = false;
        e.preventDefault();
    }

    /**
     * Sets up all event listeners
     */
    setupEventListeners() {
        // Safari gesture events
        this.element.addEventListener('gesturestart', this.gesturestart);
        this.element.addEventListener('gesturechange', this.gesturechange);
        this.element.addEventListener('gestureend', this.gestureend);

        // Standard wheel events for other browsers
        this.element.addEventListener('wheel', this.wheel, {
            passive: false
        });
    }

    /**
     * Removes all event listeners
     */
    destroy() {
        this.element.removeEventListener('gesturestart', this.gesturestart);
        this.element.removeEventListener('gesturechange', this.gesturechange);
        this.element.removeEventListener('gestureend', this.gestureend);
        this.element.removeEventListener('wheel', this.wheel);
    }

    /**
     * Checks if the handler is currently processing a gesture
     * 
     * @returns {boolean} True if a gesture is in progress
     */
    isGesturing() {
        return this.gesturing;
    }
}
