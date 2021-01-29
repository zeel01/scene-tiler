class SceneTilerHelpers {
	/**
	 * Deletes all placeable objects in the entire scene.
	 *
	 * @static
	 * @memberof SceneTiler
	 */
	static async clearScene() {
		for (const def of SceneTiler.layers) {
			await canvas[def.layer].deleteAll();
		}
	}

	/**
	 * Calculates the scale ratio between source and target scenes
	 *
	 * @static
	 * @param {object} source      - Scene data from which objects are coming
	 * @param {object} target      - Scene data to which objects are going
	 * @return {number}            - The ratio as a decimal of the grid sizes
	 * @memberof SceneTilerHelpers
	 */
	static getScaleFactor(source, target) {
		return STEntityTranslators.calculateScaleFactor(source.grid, target.grid);
	}

	/**
	 * Determin the size and location of the tile.
	 *
	 * @static
	 * @param {object} source - The scene from which the tile is being created
	 * @param {number} x      - The X coodinate of the location where the scene was dropped
	 * @param {number} y      - The Y coodinate of the location where the scene was dropped
	 * @return {{
	 *     width: number,
	 *     height: number,
	 *     x: number,
	 *     y: number
	 * }}                       The width, height, and coordinates of the tile
	 * 
	 * @memberof SceneTilerHelpers
	 */
	static getTilePos(source, x, y) {
		const scale = this.getScaleFactor(source, canvas.scene.data);

		const  width = source.width  * scale,
		      height = source.height * scale;
		           x = x - width  / 2;
		           y = y - height / 2;

		if (!canvas.grid.hitArea.contains(x, y)) x = y = 0;

		return { width, height, ...canvas.grid.getSnappedPosition(x, y) };
	}
}


/* Macro Nonsense, WIP */

class STLayerSwitcher {
	static create() {
		canvas.scene.setFlag("scene-tiler", "layers", 
		canvas.tiles.controlled.map(t => {
				return { 
					id: t.id,
					z: t.data.z,
					active: false
				}
			}).sort((a, b) => a.z > b.z) 
		);
	}
	static async next(forward = true) {
		const layers = duplicate(
			canvas.scene.getFlag("scene-tiler", "layers")
		);

		let active = layers.findIndex(l => l.active);
		if (active < 0) 
			active = forward ? layers.length - 1 : 0;

		let next   = forward ? 
		             active + 1 < layers.length ? active + 1 : 0
				   : active - 1 > -1 ? active - 1 : layers.length - 1;

		let z      = layers.reduce((max, l) => Math.max(max, l.z), 0);
		
		await canvas.tiles.get(layers[active].id).update({
			z: layers[active].z,
			locked: false
		});
		
		layers[active].active = false;
		
		await canvas.tiles.get(layers[next].id).update({
			z: z + 1,
			locked: true
		});
		
		layers[next].active = true;
		
		await canvas.scene.setFlag("scene-tiler", "layers", layers);
	}
	static async up() {
		return this.next(true);
	}
	static async down() {
		return this.next(false);
	}
}