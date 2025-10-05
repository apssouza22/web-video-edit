// ##################################################
// This is currently not used - WIP
// ##################################################

import { FrameService } from '../frame/frames';
import { Frame } from '../frame/frame.js';
import { fps } from '../constants.js';

/**
 * Class that handles animation logic for moveable medias
 */
export class AnimationHandler {
    /**
     * @param {FrameService} framesCollection - The collection of frames to animate
     * @param {number} startTime - The start time of the animation
     */
    constructor(framesCollection, startTime) {
        this.framesCollection = framesCollection;
        this.startTime = startTime;
    }

    /**
     * Gets a frame at the specified reference time
     * @param {number} referenceTime - The time to get the frame for
     * @returns {Frame|null} - The frame at the specified time or null if out of range
     */
    getFrame(referenceTime) {
        return this.framesCollection.getFrame(referenceTime, this.startTime);
    }

    /**
     * Gets the index of the frame at the specified reference time
     * @param {number} referenceTime - The time to get the index for
     * @returns {number} - The index of the frame at the specified time
     */
    getIndex(referenceTime) {
        return this.framesCollection.getIndex(referenceTime, this.startTime);
    }

    /**
     * Gets the time for the frame at the specified index
     * @param {number} index - The index to get the time for
     * @returns {number} - The time for the frame at the specified index
     */
    getTime(index) {
        return this.framesCollection.getTime(index, this.startTime);
    }

    /**
     * Sets the start time of the animation
     * @param {number} startTime - The new start time
     */
    setStartTime(startTime) {
        this.startTime = startTime;
    }

    /**
     * Checks if the frame at the specified index is an anchor
     * @param {number} index - The index to check
     * @returns {boolean} - True if the frame is an anchor, false otherwise
     */
    isAnchor(index) {
        return this.framesCollection.isAnchor(index);
    }

    /**
     * Sets the frame at the specified index as an anchor
     * @param {number} index - The index to set as an anchor
     */
    setAnchor(index) {
        this.framesCollection.setAnchor(index);
    }

    /**
     * Deletes the anchor at the specified reference time
     * @param {number} referenceTime - The time to delete the anchor at
     */
    deleteAnchor(referenceTime) {
        let i = this.getIndex(referenceTime);
        this.framesCollection.frames[i].anchor = false;
        let prevIndex = this.nearestAnchor(referenceTime, false);
        this.interpolate(prevIndex);
    }

    /**
     * Finds the nearest anchor to the specified time
     * @param {number} time - The time to find the nearest anchor to
     * @param {boolean} forward - If true, searches forward, otherwise searches backward
     * @returns {number} - The index of the nearest anchor or -1 if none found
     */
    nearestAnchor(time, forward) {
        if (this.getFrame(time)) {
            let i = this.getIndex(time);
            let increment = () => {
                if (forward) {
                    i++;
                } else {
                    i--;
                }
            };
            increment();
            while (i >= 0 && i < this.framesCollection.getLength()) {
                if (this.framesCollection.isAnchor(i)) {
                    return i;
                }
                increment();
            }
        }
        return -1;
    }

    /**
     * Interpolates frames around the specified index
     * @param {number} index - The index to interpolate around
     */
    interpolate(index) {
        let frame = this.framesCollection.frames[index];
        let isAnchor = this.framesCollection.isAnchor(index);
        
        // Find prev anchor
        let prevIdx = 0;
        let prevFrame = frame;
        let prevIsAnchor = false;
        let nextIdx = this.framesCollection.getLength() - 1;
        let nextFrame = frame;
        let nextIsAnchor = false;

        for (let i = index - 1; i >= 0; i--) {
            if (this.framesCollection.isAnchor(i)) {
                prevIdx = i;
                prevIsAnchor = true;
                prevFrame = this.framesCollection.frames[i];
                break;
            }
        }

        for (let i = index + 1; i < this.framesCollection.getLength(); ++i) {
            if (this.framesCollection.isAnchor(i)) {
                nextIdx = i;
                nextIsAnchor = true;
                nextFrame = this.framesCollection.frames[i];
                break;
            }
        }

        let prevRange = index - prevIdx;
        const eps = 1e-9;
        for (let i = 0; i <= prevRange; ++i) {
            let s = i / (prevRange + eps);
            this.framesCollection.frames[index - i] = this.framesCollection.interpolateFrame(prevFrame, frame, s);
        }
        
        let nextRange = nextIdx - index;
        for (let i = 0; i <= nextRange; ++i) {
            let s = i / (nextRange + eps);
            this.framesCollection.frames[index + i] = this.framesCollection.interpolateFrame(nextFrame, frame, s);
        }
        
        // Restore anchor states
        if (prevIsAnchor) {
            this.framesCollection.setAnchor(prevIdx);
        }
        if (nextIsAnchor) {
            this.framesCollection.setAnchor(nextIdx);
        }
        if (isAnchor) {
            this.framesCollection.setAnchor(index);
        }
    }

    /**
     * Updates the frame at the specified reference time with the provided changes
     * @param {Object} change - The changes to apply
     * @param {number} referenceTime - The time to apply the changes at
     * @param {number} width - The width of the element
     * @param {number} height - The height of the element
     */
    update(change, referenceTime, width, height) {
        let f = this.getFrame(referenceTime);
        if (!f) {
            return;
        }
        
        let index = this.getIndex(referenceTime);
        
        if (change.scale) {
            const oldScale = f.scale;
            const newScale = f.scale * change.scale;
            let deltaX = ((width * oldScale) - (width * newScale)) / 2;
            let deltaY = ((height * oldScale) - (height * newScale)) / 2;
            this.framesCollection.frames[index].x = f.x + deltaX;
            this.framesCollection.frames[index].y = f.y + deltaY;
            this.framesCollection.frames[index].scale = newScale;
            this.interpolate(index);
            this.setAnchor(index);
        }
        
        if (change.x) {
            this.framesCollection.frames[index].x = change.x;
            this.interpolate(index);
            this.setAnchor(index);
        }
        
        if (change.y) {
            this.framesCollection.frames[index].y = change.y;
            this.interpolate(index);
            this.setAnchor(index);
        }
        
        if (change.rotation) {
            this.framesCollection.frames[index].rotation = f.rotation + change.rotation;
            this.interpolate(index);
            this.setAnchor(index);
        }
    }

    /**
     * Render anchor points in the timeline for animated medias
     *
     * @param {AbstractMedia} layer - The media whose anchors to render
     * @param {number} y_coord - The y coordinate to render at
     * @param {number} baseWidth - The width of the media track
     * @param {number} scale - The time to pixel scale
     */
    #renderAnchors(layer, y_coord, baseWidth, scale) {
        let width = 4 * baseWidth;
        for (let i = 0; i < layer.framesCollection.getLength(); ++i) {
            if (layer.is_anchor(i)) {
                let anchor_x = layer.start_time + 1000 * (i / fps);
                this.timelineCtx.fillStyle = `rgb(171, 228, 253)`;
                this.timelineCtx.fillRect(scale * anchor_x, y_coord - width / 2, 3, width);
            }
        }
    }

    is_anchor(index) {
        return this.framesCollection.isAnchor(index);
    }
    /**
     * Adjusts the total time of the animation
     * @param {number} diff - The difference in time to adjust by
     */
    adjustTotalTime(diff, totalTimeInSeconds) {
        let newTotalTime = totalTimeInSeconds + diff;
        const numFrames = Math.floor((newTotalTime / 1000) * fps - this.framesCollection.getLength());
        
        if (numFrames > 0) {
            for (let i = 0; i < numFrames; ++i) {
                let f = new Frame(null, 0, 0, 1, 0, false);
                this.framesCollection.push(f);
            }
        } else if (numFrames < 0) {
            // prevent overflow
            this.framesCollection.slice(this.framesCollection.getLength() + numFrames + 1, 1 - numFrames);
        }
        
        const lastFrameTime = this.getTime(this.framesCollection.getLength() - 1);
        const prevAnchor = this.nearestAnchor(lastFrameTime, false);
        
        if (prevAnchor >= 0) {
            this.interpolate(prevAnchor);
        } else {
            this.interpolate(0);
        }
        
        return newTotalTime;
    }
}