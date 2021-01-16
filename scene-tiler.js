class EntityTranslators {
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

class SceneTiler {
	static get layerDefs() {
		return {
			"tokens"   : { layer: "tokens"    , type: "tokens"    , translator: EntityTranslators.translatePointWidthGrids.bind(EntityTranslators) },
			"tiles"    : { layer: "tiles"     , type: "tiles"     , translator: EntityTranslators.translatePointWidth.bind(EntityTranslators)      },
			"lighting" : { layer: "lighting"  , type: "lights"    , translator: EntityTranslators.translatePoint.bind(EntityTranslators)           },
			"sounds"   : { layer: "sounds"    , type: "sounds"    , translator: EntityTranslators.translatePoint.bind(EntityTranslators)           },
			"notes"    : { layer: "notes"     , type: "notes"     , translator: EntityTranslators.translatePoint.bind(EntityTranslators)           },
			"walls"    : { layer: "walls"     , type: "walls"     , translator: EntityTranslators.translateWall.bind(EntityTranslators)            },
			"templates": { layer: "templates" , type: "templates" , translator: EntityTranslators.translateTemplate.bind(EntityTranslators)        },
			"drawings" : { layer: "drawings"  , type: "drawings"  , translator: EntityTranslators.translatePointWidth.bind(EntityTranslators)      }
		}
	}
	static async copyScene(name) {
		console.debug(`Copying: ${name}`);
		const source = game.scenes.find(s => s.name == name);

		if (!source) { 
			console.debug("Source scene not found.");
			return;
		}

		for (const def of Object.values(this.layerDefs)) {
			await canvas[def.layer].createMany(source.data[def.type]);
		}
	}
	static async clearScene() {
		for (const def of Object.values(this.layerDefs)) {
			await canvas[def.layer].deleteAll();
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
	static async updateTile(scene, tileData, update, options) {
		if (typeof update?.locked == "undefined") return;
		const id = tileData.flags["scene-tiler"]?.scene;

		if (update.locked) {
			if (!id) return;
			const source = duplicate(await fromUuid(`Scene.${id}`));

			await this.placeAllFromSceneAt(source, tileData);
		}
		else {
			for (const def of Object.values(this.layerDefs)) {
				await canvas[def.layer].deleteMany(tileData.flags["scene-tiler"].entities[def.type]);
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
	static async placeAllFromSceneAt(source, tileData) {
		const flagData = {};
		for (const def of Object.values(this.layerDefs)) {
			const entities = source[def.type].map(e => this.translateEntity(e, def.type, tileData));

			let created = await canvas[def.layer].createMany(entities) || [];
			if (!Array.isArray(created)) created = [created];

			const ids = created.map(e => e._id);
			flagData[def.type] = ids;
		}
		
		await canvas.tiles.get(tileData._id).update({ "flags.scene-tiler.entities": flagData });
	}
	static translateEntity(entity, type, tile) {
		const cx = tile.x + tile.width / 2;
		const cy = tile.y + tile.height / 2;

		if (type == this.layerDefs.walls.type)
			return this.wallTranslate(entity, tile, cx, cy);

		if (type == this.layerDefs.templates.type)
			return this.templateTranslate(entity, tile, cx, cy);

		return this.standardTranslate(entity, type, tile, cx, cy);
	}

	static standardTranslate(entity, type, tile, cx, cy) {
		const [x, y] = Object.values(this.layerDefs)
			.find(d => d.type == type)
			.translator(
				tile.x, tile.y,
				entity.x, entity.y,
				cx, cy,
				tile.rotation,
				entity.width, entity.height
			);
		entity.rotation += tile.rotation;
		entity.x = x;
		entity.y = y;

		return entity;
	}
	static wallTranslate(entity, tile, cx, cy) {
		const d = this.layerDefs.walls
			.translator(
				tile.x, tile.y,
				cx, cy,
				tile.rotation,
				entity.c
			)
		entity.c = d;

		return entity;
	}
	static templateTranslate(entity, tile, cx, cy) {
		const [x, y] = this.layerDefs.templates
			.translator(
				tile.x, tile.y,
				entity.x, entity.y,
				cx, cy,
				tile.rotation,
			)
		entity.x = x;
		entity.y = y;

		return entity;
	}
}

Hooks.on("dropCanvasData", (...args) => SceneTiler.dropCanvasData(...args));
Hooks.on("updateTile", (...args) => SceneTiler.updateTile(...args));