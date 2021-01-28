class SceneTilerHelpers {
	/**
	 * Deletes all placeable objects in the entire scene.
	 *
	 * @static
	 * @memberof SceneTiler
	 */
	static async clearScene() {
		for (const def of Object.values(this.layerDefs)) {
			await canvas[def.layer].deleteAll();
		}
	}
}