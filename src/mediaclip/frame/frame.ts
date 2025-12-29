import { VideoData, FrameTransform } from './types';
import { imageBitmapToImageData } from "@/common/video-to-image";

/**
 * Represents a single frame with transformation properties
 */
export class Frame implements FrameTransform {
    public x: number;
    public y: number;
    public scale: number;
    public rotation: number;
    public anchor: boolean;
    public videoData: VideoData;
    public index: number;

    /**
     * Creates a new Frame instance
     */
    constructor(
        frame: VideoData = null,
        x: number = 0,
        y: number = 0,
        scale: number = 1,
        rotation: number = 0,
        anchor: boolean = false,
        index: number
    ) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.rotation = rotation;
        this.anchor = anchor;
        this.videoData = frame;
        this.index = index;
    }

    /**
     * Creates a Frame from a Float32Array (for backward compatibility)
     */
    static fromArray(array: Float32Array, frame: VideoData = null): Frame {
        return new Frame(
            frame,
            array[0] || 0,    // x
            array[1] || 0,    // y
            array[2] || 1,    // scale
            array[3] || 0,    // rotation
            Boolean(array[4]), // anchor
            0
        );
    }


    /**
     * Creates a copy of this frame
     */
    clone(): Frame {
        return new Frame(
            this.videoData,
            this.x,
            this.y,
            this.scale,
            this.rotation,
            this.anchor,
            this.index
        );
    }

    /**
     * Linear interpolation between this frame and another frame
     */
    interpolate(other: Frame, weight: number): Frame {
        if (weight > 1) weight = 1;
        if (weight < 0) weight = 0;

        return new Frame(
            this.videoData,   // Frame reference stays with the base frameObject
            this.#lerp(this.x, other.x, weight),
            this.#lerp(this.y, other.y, weight),
            this.#lerp(this.scale, other.scale, weight),
            this.#lerp(this.rotation, other.rotation, weight),
            this.anchor, // Anchor property doesn't interpolate
            this.index
        );
    }

    /**
     * Linear interpolation helper
     */
    #lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /**
     * String representation for debugging
     */
    toString(): string {
        return `Frame(x=${this.x}, y=${this.y}, scale=${this.scale}, rotation=${this.rotation}, anchor=${this.anchor})`;
    }
}
