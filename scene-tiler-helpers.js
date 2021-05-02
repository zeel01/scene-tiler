class SceneTilerHelpers {
	/**
	 * Deletes all placeable objects in the entire scene.
	 *
	 * @static
	 * @memberof SceneTilerHelpers
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
	 * @param {SceneData} source      - Scene data from which objects are coming
	 * @param {SceneData} target      - Scene data to which objects are going
	 * @return {Number}               - The ratio as a decimal of the grid sizes
	 * @memberof SceneTilerHelpers
	 */
	static getScaleFactor(source, target) {
		if (source.gridUnits != target.gridUnits)
			ui.notifications.warn(game.i18n.localize("SCNTILE.notifications.warn.unmatchedUnits"));

		const distScale = 
			   STEntityTranslators.calculateScaleFactor(source.gridDistance, target.gridDistance)
		return STEntityTranslators.calculateScaleFactor(source.grid, target.grid) / distScale;
	}

	/**
	 * Determin the size and location of the tile.
	 *
	 * @static
	 * @param {SceneData} source - The scene from which the tile is being created
	 * @param {Number} x         - The X coodinate of the location where the scene was dropped
	 * @param {Number} y         - The Y coodinate of the location where the scene was dropped
	 * @return {{
	 *     width: Number,
	 *     height: Number,
	 *     x: Number,
	 *     y: Number
	 * }}                          The width, height, and coordinates of the tile
	 * 
	 * @memberof SceneTilerHelpers
	 */
	static getTilePos(source, x, y) {
		const scale = this.getScaleFactor(source, canvas.scene.data);

		const  { width, height } =
			STEntityTranslators.getScaledTileSize(source, scale);

		x = x - width  / 2;
		y = y - height / 2;

		if (!canvas.grid.hitArea.contains(x, y)) x = y = 0;

		return { width, height, ...canvas.grid.getSnappedPosition(x, y) };
	}

	/**
	 * Calculates the amount of padding in the x and y axis of the source Scene
	 *
	 * @static
	 * @param {SceneData} source  - The scene from which the padding is being calcualated
	 * @return {[Number, Number]}   The x, y padding amounts
	 * @memberof SceneTilerHelpers
	 */
	static getPadding(source) {
		const padding = source.padding, grid = source.grid;
		return [ Math.ceil(source.width  / grid * padding) * grid,
		         Math.ceil(source.height / grid * padding) * grid ]
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