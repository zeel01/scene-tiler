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
	 * @param {Number} ox       - The offset X coordinate
	 * @param {Number} oy       - The offset Y coordinate
	 * @param {Number} x        - The pre-translation X coordinate
	 * @param {Number} y        - The pre-translation Y coordinate
	 * @return {[Number, Number]} The translated point 
	 * @memberof STEntityTranslators
	 */
	static translate(ox, oy, x, y) {
		return [x + ox, y + oy];
	}

	/**
	 * Scale point x, y to match a new grid size.
	 *
	 * @static
	 * @param {Number} x        - The pre-scaling X coordinate
	 * @param {Number} y        - The pre-scaling Y coordinate
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @return {[Number, Number]} The scaled coordinate
	 * @memberof STEntityTranslators
	 */
	static scale(x, y, scale) {
		return [x * scale, y * scale];
	}

	/**
	 * Translate the point x, y from offset, scale by the factor, 
	 * and rotate around the point cy, cy
	 *
	 * @static
	 * @param {Number} ox       - The offset X coordinate
	 * @param {Number} oy       - The offset Y coordinate
	 * @param {Number} x        - The pre-translation X coordinate
	 * @param {Number} y        - The pre-translation Y coordinate
	 * @param {Number} cx       - The X cordinate of the rotation center
	 * @param {Number} cy       - The Y coordinate of the rotation center
	 * @param {Number} angle    - The angle of the rotation
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @param {Number} px       - The amount of scene padding in the X axis
	 * @param {Number} py       - The amount of scene padding in the Y axis	 
	 * @return {[Number, Number]} The translated and rotated point
	 * @memberof STEntityTranslators
	 */
	static translatePoint(ox, oy, x, y, cx, cy, angle, scale, px, py) {
		if (px)         [x, y] = this.translate(-px, -py, x, y);
		if (scale != 1) [x, y] = this.scale(x, y, scale);
		                [x, y] = this.translate(ox, oy, x, y);
		if (angle)      [x, y] = this.rotate(cx, cy, x, y, angle);

		return [x, y];
	}

	/**
	 * Translates the point x, y which is at the upper left hand corner
	 * of an object based on the offset ox, oy and scales by the provided factor
	 * then rotates that point around the point cy, cy.
	 *
	 * First, determin the center point of the object, then translate and scale 
	 * the center point. Finally, calculate the new corner point.
	 *
	 * @static
	 * @param {Number} ox       - The offset X coordinate
	 * @param {Number} oy       - The offset Y coordinate
	 * @param {Number} x        - The pre-translation X coordinate
	 * @param {Number} y        - The pre-translation Y coordinate
	 * @param {Number} cx       - The X cordinate of the rotation center
	 * @param {Number} cy       - The Y coordinate of the rotation center
	 * @param {Number} angle    - The angle of the rotation
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @param {Number} px       - The amount of scene padding in the X axis
	 * @param {Number} py       - The amount of scene padding in the Y axis	 
	 * @param {Number} w        - The width of the object
	 * @param {Number} h        - The height of the object
	 * @return {[Number, Number]} The translated and rotated point
	 * @memberof STEntityTranslators
	 */
	static translatePointWidth(ox, oy, x, y, cx, cy, angle, scale, px, py, w, h) {
		/** @type {Number} Middle X coordinate */
		const mx = x + w / 2;

		/** @type {Number} Middle Y coordinate */
		const my = y + h / 2;

		[x, y] = this.translatePoint(ox, oy, mx, my, cx, cy, angle, scale, px, py);
		
		if (scale != 1) [w, h] = this.scale(w, h, scale);

		return [x - w / 2, y - h / 2 , w, h];
	}

	/**
	 * Does the same as translatePointWidth, but accepts the w and h
	 * parameters as a number of grid squares. This must be converted to
	 * real width/height by scaling by the scene grid size.
	 *
	 * @static
	 * @param {Number} ox       - The offset X coordinate
	 * @param {Number} oy       - The offset Y coordinate
	 * @param {Number} x        - The pre-translation X coordinate
	 * @param {Number} y        - The pre-translation Y coordinate
	 * @param {Number} cx       - The X cordinate of the rotation center
	 * @param {Number} cy       - The Y coordinate of the rotation center
	 * @param {Number} angle    - The angle of the rotation
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @param {Number} px       - The amount of scene padding in the X axis
	 * @param {Number} py       - The amount of scene padding in the Y axis	 
	 * @param {Number} w        - The width of the object
	 * @param {Number} h        - The height of the object
	 * @return {[Number, Number]} The translated and rotated point
	 * @memberof STEntityTranslators
	 */
	static translatePointWidthGrids(ox, oy, x, y, cx, cy, angle, scale, px, py, w, h) {
		let grid = canvas.scene.data.grid;
		if (scale != 1) grid = grid / scale; 

		[w, h] = this.scale(w, h, grid);
		
		[x, y] = this.translatePointWidth(ox, oy, x, y, cx, cy, angle, scale, px, py, w, h);
		
		return [x, y]; 
	}

	/**
	 * Translates all points contained in a Wall's coordinate array c.
	 * Each pair of values is translated and rotated as a point, 
	 * then placed in a new array d. The new array is returned.
	 *
	 * @static
	 * @param {Number} ox       - The offset X coordinate
	 * @param {Number} oy       - The offset Y coordinate
	 * @param {Number} cx       - The X cordinate of the rotation center
	 * @param {Number} cy       - The Y coordinate of the rotation center
	 * @param {Number} angle    - The angle of the rotation
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @param {Number} px       - The amount of scene padding in the X axis
	 * @param {Number} py       - The amount of scene padding in the Y axis	 
	 * @param {Number[]} c      - The array of wall point coordinates
	 * @return {Number[]}       - The translated array of coordinates
	 * @memberof STEntityTranslators
	 */
	static translateWall(ox, oy, cx, cy, angle, scale, px, py, c) {
		/** @type {Number[]} An array to store the translated coordinates in as they are calcualted */
		const d = [];

		for (let i = 0; i < c.length; i += 2) {
			let x = c[i], y = c[i+1];
			[x, y] = this.translatePoint(ox, oy, x, y, cx, cy, angle, scale, px, py);
			d.push(x);
			d.push(y);
		}

		return d;
	}

	/**
	 * Rotates the point x, y around the point cx, cy by the given angle.
	 *
	 * @static
	 * @param {Number} x        - The pre-rotation X coordinate
	 * @param {Number} y        - The pre-rotation Y coordinate
	 * @param {Number} cx       - The X cordinate of the rotation center
	 * @param {Number} cy       - The Y coordinate of the rotation center
	 * @param {Number} angle    - The angle of the rotation
	 * @return {[Number, Number]} The rotated point
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

	/**
	 * Calculates the scale ratio between source and destination
	 *
	 * @static
	 * @param {Number} source      - Grid size of source scene
	 * @param {Number} destination - Grid size of destination scene
	 * @return {Number}            - The ratio as a decimal of the grid sizes
	 * @memberof STEntityTranslators
	 */
	static calculateScaleFactor(source, destination) {
		return destination / source;
	}

	/**
	 * Calculates the width and height of a tile matching the dimensions
	 * of the source scene, when scales to the destination scene.
	 *
	 * @static
	 * @param {SceneData} source - The scene from which the tile is being created
	 * @param {Number} scale     - The ratio of grid size between source and target scenes
	 * @return {{
	 *	   width: number, 
	 *	   height: number, 
	 }} 
	 * @memberof STEntityTranslators
	 */
	static getScaledTileSize(source, scale) {
		return {
			width: source.width  * scale,
			height: source.height * scale
		}
	}
}