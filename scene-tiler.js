class SceneTiler {
	static get layerNames() {
		return {
			"tokens": "tokens",
			"tiles": "tiles",
			"lighting": "lights",
			"sounds": "sounds",
			"notes": "notes",
			"walls": "walls",
			"templates": "templates",
			"drawings": "drawings"
		}
	}
	static async copyScene(name) {
		console.debug(`Copying: ${name}`);
		const source = game.scenes.find(s => s.name == name);

		if (!source) { 
			console.debug("Source scene not found.");
			return;
		}

		for (const [layer, type] of Object.entries(this.layerNames)) {
			await canvas[layer].createMany(source.data[type]);
		}
	}
	static async clearScene() {
		for (const [layer, type] of Object.entries(this.layerNames)) {
			await canvas[layer].deleteAll();
		}
	}

	static async dropCanvasData(canvas, { id, type, x, y }) {
		if (type != "Scene") return;
		const source = duplicate(await fromUuid(`${type}.${id}`));
		
		if (!source) { 
			console.debug("Source scene not found.");
			return;
		}
		
		return this.createTile(source, x, y);
	}
	static async updateTile(scene, tileData, update, options, id) {
		if (typeof update?.locked == "undefined") return;
		if (update.locked) {
			const id = tileData.flags["scene-tiler"]?.scene;
			if (!id) return;
			const source = duplicate(await fromUuid(`Scene.${id}`));

			await this.placeAllFromSceneAt(source, tileData.x, tileData.y, tileData._id);
			await this.updateTileFlags(tileData, source);
		}
		else {
			for (const [layer, type] of Object.entries(this.layerNames)) {
				await canvas[layer].deleteMany(tileData.flags["scene-tiler"].entities[type]);
			}
			await canvas.tiles.get(id).update({ "flags.scene-tiler.entities": null }); 
		}
	}

	static async createTile(source, x, y) {
		const data = {
			img: source.img,
			type: "Tile",
			tileSize: canvas.scene.data.grid,
			x, y,
			flags: {
				"scene-tiler": { scene: source._id }
			}
		}
		const event = { shiftKey: false, altKey: false};

		return await canvas.tiles._onDropTileData(event, data);
	}
	static async placeAllFromSceneAt(source, x, y, id) {
		const flagData = {};
		for (const [layer, type] of Object.entries(this.layerNames)) {
			const entities = source[type].map(e => this.offsetCoordinates(e, type, x, y));

			const created = await canvas[layer].createMany(entities);

			const ids = created.map(e => e._id);
			flagData[type] = ids;
		}
		
		await canvas.tiles.get(id).update({ "flags.scene-tiler.entities": flagData });
	}
	static offsetCoordinates(entity, type, x, y) {
		if (type == "walls") {
			entity.c[0] += x;
			entity.c[1] += y;
			entity.c[2] += x;
			entity.c[3] += y;
		}
		else {
			entity.x += x;
			entity.y += y;
		}

		return entity;
	}
}

Hooks.on("dropCanvasData", (...args) => SceneTiler.dropCanvasData(...args));
Hooks.on("updateTile", (...args) => SceneTiler.updateTile(...args));