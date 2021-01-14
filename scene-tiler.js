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
		
		for (const [layer, type] of Object.entries(this.layerNames)) {
			const entities = source[type].map(e => this.offsetCoordinates(e, type, x, y));
			await canvas[layer].createMany(entities);
		}
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