import { fps } from '../constants.js';
import { AdjustTimeHandler } from './adjust-time.js';

export class FrameCollection {
    /**
     * @type {Array<Float32Array>}
     * @description frames = [x, y, scale, rotation, anchor]
     * @param {number} x - x position
     * @param {number} y - y position
     * @param {number} scale - scale
     * @param {number} rotation - rotation
     * @param {boolean} anchor - is this frame an anchor
     */
    frames = [];
    totalTimeInSeconds = 0
    startTime = 0

    /**
     *
     * @param {number} milSeconds
     * @param startTime
     * @param flexibleLayer
     */
    constructor(milSeconds, startTime, flexibleLayer = true) {
        this.start_time = startTime
        this.totalTimeInMilSeconds = milSeconds
        this.totalTimeInSeconds = milSeconds / 1000
        this.timeAdjustHandler =  new AdjustTimeHandler(this);
        if (flexibleLayer) {
            this.initializeFrames();
        }
    }
    
    adjustTotalTime(diff) {
        this.timeAdjustHandler.adjust(diff)
    }

    getTotalTimeInMilSec(){
        return this.totalTimeInMilSeconds
    }

    initializeFrames() {
        for (let i = 0; i < this.totalTimeInSeconds * fps; ++i) {
            // x, y, scale, rot, anchor(bool)
            let f = new Float32Array(5);
            f[2] = 1; // scale
            this.frames.push(f);
        }
        this.frames[0][4] = 1; // set first frame as anchor
    }

    getLength() {
        return this.frames.length
    }

    push(f) {
        this.frames.push(f);
    }

    /**
     * 
     * @param {number} start 
     * @param {number} deleteCount 
     */
    slice(start, deleteCount) {
        this.frames.splice(start, deleteCount);
    }

    setAnchor(index) {
        this.frames[index][4] = 1;
    }

    isAnchor(index) {
        return this.frames[index][4];
    }


    getFrame(referenceTime, startTime) {
        this.startTime = startTime
        let index = this.getIndex(referenceTime, startTime);
        if (index < 0 || index >= this.frames.length) {
            return null;
        }
        let currentFrame = new Float32Array(this.frames[index]);
        
        if (index + 1 < this.frames.length) {
            const currentFrameTime = referenceTime - this.getTime(index, startTime);
            const nextFrameTime = this.getTime(index + 1, startTime) - referenceTime;
            let interpolationFactor = nextFrameTime / (currentFrameTime + nextFrameTime);
            let nextFrame = this.frames[index + 1];
            currentFrame = this.interpolateFrame(currentFrame, nextFrame, interpolationFactor);
        }
        return currentFrame;
    }

    /**
     * Gets the index of the frame at the specified reference time
     * @param {number} currentTime - The time to get the index for
     * @param {number} startTime - The start time of the layer
     * @returns {number} - The index of the frame at the specified time
     */
    getIndex(currentTime, startTime) {
        let time = currentTime - startTime;
        return  Math.floor(time / 1000 * fps);
    }

    getTime(index, startTime) {
        return (index / fps * 1000) + startTime;
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Interpolates between two frames
     * Get a frame at a specific time might fall between two existing frames in the collection. 
     * Rather than simply jumping to the nearest frame (which would create jerky animations),
     * this function creates a blended transition
     * 
     * @param {Float32Array} f0 - first frame
     * @param {Float32Array} f1 - second frame
     * @param {number} weight - A value between 0 and 1 that represents the position between the frames
     * @returns {Float32Array} - interpolated frame
     */
    interpolateFrame(f0, f1, weight) {
        if (weight > 1) {
            weight = 1;
        }
        if (weight < 0) {
            weight = 0;
        }
        let f = new Float32Array(5);
        // Using lerp function for each property
        f[0] = this.lerp(f0[0], f1[0], weight); // x position
        f[1] = this.lerp(f0[1], f1[1], weight); // y position
        f[2] = this.lerp(f0[2], f1[2], weight); // scale
        f[3] = this.lerp(f0[3], f1[3], weight); // rotation
        return f;
    }

}