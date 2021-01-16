/**
 * A static class of coordinate translation and rotation methods.
 *
 * @class STEntityTranslators
 */
class STEntityTranslators {
	/**
	 * Translate a point x, y to a new point using the offset ox, oy
	 *
	 * @static
	 * @param {number} ox       - The offset X coordinate
	 * @param {number} oy       - The offset Y coordinate
	 * @param {number} x        - The pre-translation X coordinate
	 * @param {number} y        - The pre-translation Y coordinate
	 * @return {[number, number]} The translated point 
	 * @memberof STEntityTranslators
	 */
	static translate(ox, oy, x, y) {
		return [x + ox, y + oy];
	}

	/**
	 * Translate the point x, y from offset, and rotate around the point cy, cy
	 *
	 * @static
	 * @param {number} ox       - The offset X coordinate
	 * @param {number} oy       - The offset Y coordinate
	 * @param {number} x        - The pre-translation X coordinate
	 * @param {number} y        - The pre-translation Y coordinate
	 * @param {number} cx       - The X cordinate of the rotation center
	 * @param {number} cy       - The Y coordinate of the rotation center
	 * @param {number} angle    - The angle of the rotation
	 * @return {[number, number]} The translated and rotated point
	 * @memberof STEntityTranslators
	 */
	static translatePoint(ox, oy, x, y, cx, cy, angle) {
		let [nx, ny] = this.translate(ox, oy, x, y);
		if (angle) [nx, ny] = this.rotate(cx, cy, nx, ny, angle);

		return [nx, ny];
	}

	/**
	 * Translates the point x, y which is at the upper left hand corner
	 * of an object based on the offset ox, oy and rotates that point around
	 * the point cy, cy.
	 *
	 * First, determin the center point of the object, then translate the center point.
	 * Finally, calculate the new corner point.
	 *
	 * @static
	 * @param {number} ox       - The offset X coordinate
	 * @param {number} oy       - The offset Y coordinate
	 * @param {number} x        - The pre-translation X coordinate
	 * @param {number} y        - The pre-translation Y coordinate
	 * @param {number} cx       - The X cordinate of the rotation center
	 * @param {number} cy       - The Y coordinate of the rotation center
	 * @param {number} angle    - The angle of the rotation
	 * @param {number} w        - The width of the object
	 * @param {number} h        - The height of the object
	 * @return {[number, number]} The translated and rotated point
	 * @memberof STEntityTranslators
	 */
	static translatePointWidth(ox, oy, x, y, cx, cy, angle, w, h) {
		/** @type {number} Middle X coordinate */
		const mx = x + w / 2;

		/** @type {number} Middle Y coordinate */
		const my = y + h / 2;

		const [nx, ny] = this.translatePoint(ox, oy, mx, my, cx, cy, angle);

		return [nx - w / 2, ny - h / 2];
	}

	/**
	 * Does the same as translatePointWidth, but accepts the w and h
	 * parameters as a number of grid squares. This must be converted to
	 * real width/height by multiplication by the scene grid size.
	 *
	 * @static
	 * @param {number} ox       - The offset X coordinate
	 * @param {number} oy       - The offset Y coordinate
	 * @param {number} x        - The pre-translation X coordinate
	 * @param {number} y        - The pre-translation Y coordinate
	 * @param {number} cx       - The X cordinate of the rotation center
	 * @param {number} cy       - The Y coordinate of the rotation center
	 * @param {number} angle    - The angle of the rotation
	 * @param {number} w        - The width of the object
	 * @param {number} h        - The height of the object
	 * @return {[number, number]} The translated and rotated point
	 * @memberof STEntityTranslators
	 */
	static translatePointWidthGrids(ox, oy, x, y, cx, cy, angle, w, h) {
		/** @type {number} The true width */
		const pw = w * canvas.scene.data.grid;

		/** @type {number} The true height */
		const ph = h * canvas.scene.data.grid;

		return this.translatePointWidth(ox, oy, x, y, cx, cy, angle, pw, ph);
	}

	/**
	 * Translates all points contained in a Wall's coordinate array c.
	 * Each pair of values is translated and rotated as a point, 
	 * then placed in a new array d. The new array is returned.
	 *
	 * @static
	 * @param {number} ox       - The offset X coordinate
	 * @param {number} oy       - The offset Y coordinate
	 * @param {number} cx       - The X cordinate of the rotation center
	 * @param {number} cy       - The Y coordinate of the rotation center
	 * @param {number} angle    - The angle of the rotation
	 * @param {number[]} c      - The array of wall point coordinates
	 * @return {number[]}       - The translated array of coordinates
	 * @memberof STEntityTranslators
	 */
	static translateWall(ox, oy, cx, cy, angle, c) {
		/** @type {number[]} An array to store the translated coordinates in as they are calcualted */
		const d = [];

		for (let i = 0; i < c.length; i += 2) {
			let x = c[i], y = c[i+1];
			[x, y] = this.translatePoint(ox, oy, x, y, cx, cy, angle);
			d.push(x);
			d.push(y);
		}

		return d;
	}
	
	/**
	 * Translates the coordinates of a measured template.
	 * @todo This still needs to be implemented.
	 * @param  {...any} args 
	 */
	static translateTemplate(...args) { return this.translatePoint(...args); }


	/**
	 * Rotates the point x, y around the point cx, cy by the given angle.
	 *
	 * @static
	 * @param {number} x        - The pre-rotation X coordinate
	 * @param {number} y        - The pre-rotation Y coordinate
	 * @param {number} cx       - The X cordinate of the rotation center
	 * @param {number} cy       - The Y coordinate of the rotation center
	 * @param {number} angle    - The angle of the rotation
	 * @return {[number, number]} The rotated point
	 * @memberof STEntityTranslators
	 */
	static rotate(cx, cy, x, y, angle) {
		let radians = (Math.PI / 180) * angle,
			cos = Math.cos(radians),
			sin = Math.sin(radians),
			nx = (cos * (x - cx)) - (sin * (y - cy)) + cx,
			ny = (cos * (y - cy)) + (sin * (x - cx)) + cy;
		return [nx, ny];
	}
}