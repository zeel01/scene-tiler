class SceneTilerHelpers {
	/**
	 * Deletes all placeable objects in the entire scene.
	 *
	 * @static
	 * @memberof SceneTiler
	 */
	static async clearScene() {
		for (const def of Object.values(SceneTiler.layerDefs)) {
			await canvas[def.layer].deleteAll();
		}
	}
}

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