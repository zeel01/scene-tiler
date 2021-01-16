class STEntityTranslators {
	static translate(ox, oy, x, y) {
		return [x + ox, y + oy];
	}
	static translatePoint(ox, oy, x, y, cx, cy, angle) {
		let [nx, ny] = this.translate(ox, oy, x, y);
		if (angle) [nx, ny] = this.rotate(cx, cy, nx, ny, angle);

		return [nx, ny];
	}
	static translatePointWidth(ox, oy, x, y, cx, cy, angle, w, h) {
		const mx = x + w / 2, my = y + h / 2;
		const [nx, ny] = this.translatePoint(ox, oy, mx, my, cx, cy, angle);

		return [nx - w / 2, ny - h / 2];
	}
	static translatePointWidthGrids(ox, oy, x, y, cx, cy, angle, w, h) {
		const pw = w * canvas.scene.data.grid;
		const ph = h * canvas.scene.data.grid;

		return this.translatePointWidth(ox, oy, x, y, cx, cy, angle, pw, ph);
	}

	static translateWall(ox, oy, cx, cy, angle, c) {
		const d = [];

		for (let i = 0; i < c.length; i += 2) {
			let x = c[i], y = c[i+1];
			[x, y] = this.translatePoint(ox, oy, x, y, cx, cy, angle);
			d.push(x);
			d.push(y);
		}

		return d;
	}

	static translateTemplate(...args) { return this.translatePoint(...args); }

	static rotate(cx, cy, x, y, angle) {
		let radians = (Math.PI / 180) * angle,
			cos = Math.cos(radians),
			sin = Math.sin(radians),
			nx = (cos * (x - cx)) - (sin * (y - cy)) + cx,
			ny = (cos * (y - cy)) + (sin * (x - cx)) + cy;
		return [nx, ny];
	}
}