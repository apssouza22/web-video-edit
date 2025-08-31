/**
 * Represents a single frame with transformation properties
 */
export class Frame {
    /**
     * Creates a new Frame instance
     * @param {*} frame - Optional frame data/reference (default: null)
     * @param {number} x - X position (default: 0)
     * @param {number} y - Y position (default: 0)
     * @param {number} scale - Scale factor (default: 1)
     * @param {number} rotation - Rotation in radians (default: 0)
     * @param {boolean} anchor - Whether this frame is an anchor frame (default: false)
     */
    constructor(frame = null, x = 0, y = 0, scale = 1, rotation = 0, anchor = false) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.rotation = rotation;
        this.anchor = anchor;
        this.frame = frame;
    }


    /**
     * Creates a Frame from a Float32Array (for backward compatibility)
     * @param {Float32Array} array - Array with [x, y, scale, rotation, anchor]
     * @param {*} frame - Optional frame data
     * @returns {Frame}
     */
    static fromArray(array, frame = null) {
        return new Frame(
            frame,
            array[0] || 0,    // x
            array[1] || 0,    // y
            array[2] || 1,    // scale
            array[3] || 0,    // rotation
            Boolean(array[4]), // anchor
        );
    }

    /**
     * Converts Frame to Float32Array (for backward compatibility)
     * @returns {Float32Array}
     */
    toArray() {
        const array = new Float32Array(5);
        array[0] = this.x;
        array[1] = this.y;
        array[2] = this.scale;
        array[3] = this.rotation;
        array[4] = this.anchor ? 1 : 0;
        return array;
    }

    /**
     * Creates a copy of this frame
     * @returns {Frame}
     */
    clone() {
        return new Frame(
            this.frame,
            this.x,
            this.y,
            this.scale,
            this.rotation,
            this.anchor,
        );
    }

    /**
     * Linear interpolation between this frame and another frame
     * @param {Frame} other - The other frame to interpolate with
     * @param {number} weight - Interpolation weight (0-1)
     * @returns {Frame}
     */
    interpolate(other, weight) {
        if (weight > 1) weight = 1;
        if (weight < 0) weight = 0;

        return new Frame(
            this.frame,   // Frame reference stays with the base frame
            this.#lerp(this.x, other.x, weight),
            this.#lerp(this.y, other.y, weight),
            this.#lerp(this.scale, other.scale, weight),
            this.#lerp(this.rotation, other.rotation, weight),
            this.anchor, // Anchor property doesn't interpolate
        );
    }

    /**
     * Linear interpolation helper
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number}
     */
    #lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * String representation for debugging
     * @returns {string}
     */
    toString() {
        return `Frame(x=${this.x}, y=${this.y}, scale=${this.scale}, rotation=${this.rotation}, anchor=${this.anchor})`;
    }
}
