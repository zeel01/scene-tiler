class SceneTiler {
	/**
	 * An alias for the Entity Translator class
	 *
	 * @type {typeof STEntityTranslators}
	 * @readonly
	 * @static
	 * @memberof SceneTiler
	 */
	static get TRNS() { return STEntityTranslators; }
	static get layerDefs() {
		return {
			"tokens"   : { layer: "tokens"    , type: "tokens"    , className: "Token"            , translator: this.TRNS.translatePointWidthGrids.bind(this.TRNS) },
			"tiles"    : { layer: "tiles"     , type: "tiles"     , className: "Tile"             , translator: this.TRNS.translatePointWidth.bind(this.TRNS)      },
			"lights"   : { layer: "lighting"  , type: "lights"    , className: "AmbientLight"     , translator: this.TRNS.translatePoint.bind(this.TRNS)           },
			"sounds"   : { layer: "sounds"    , type: "sounds"    , className: "AmbientSound"     , translator: this.TRNS.translatePoint.bind(this.TRNS)           },
			"notes"    : { layer: "notes"     , type: "notes"     , className: "Note"             , translator: this.TRNS.translatePoint.bind(this.TRNS)           },
			"walls"    : { layer: "walls"     , type: "walls"     , className: "Wall"             , translator: this.TRNS.translateWall.bind(this.TRNS)            },
			"templates": { layer: "templates" , type: "templates" , className: "MeasuredTemplate" , translator: this.TRNS.translatePoint.bind(this.TRNS)           },
			"drawings" : { layer: "drawings"  , type: "drawings"  , className: "Drawing"          , translator: this.TRNS.translatePointWidth.bind(this.TRNS)      }
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

	static async dropCanvasData(canvas, { id, type, pack, x, y }) {
		if (type != "Scene") return;
		
		let uuid = "";
		if (pack) uuid = `Compendium.${pack}.${id}`;
		else      uuid = `${type}.${id}`;
	
		const source = duplicate(await fromUuid(uuid));
		
		if (!source) { 
			console.debug("Source scene not found.");
			return;
		}
		
		return this.createTile(source, uuid, x, y);
	}
	static async updateTile(scene, tileData, update, options) {
		if (typeof update?.locked == "undefined") return;
		const uuid = tileData.flags["scene-tiler"]?.scene;

		if (update.locked) {
			if (!uuid) return;
			const source = duplicate(await fromUuid(uuid));

			await this.placeAllFromSceneAt(source, tileData);
		}
		else {
			for (const def of Object.values(this.layerDefs)) {
				await canvas[def.layer].deleteMany(tileData.flags["scene-tiler"].entities[def.type]);
			}
			await canvas.tiles.get(tileData._id).update({ "flags.scene-tiler.entities": null }); 
		}
	}

	static async createTile(source, uuid, x, y) {
		const scale = this.TRNS.getScaleFactor(source.grid, canvas.scene.data.grid);
		
		const data = {
			img: source.img || "modules/scene-tiler/_Blank.png",
			type: "Tile",
			tileSize: canvas.scene.data.grid,
			x, y,
			flags: {
				"scene-tiler": { scene: uuid } 
			}
		}

		const event = { shiftKey: false, altKey: false};
		const tile  = await canvas.tiles._onDropTileData(event, data);

		const  width = source.width  * scale,
		      height = source.height * scale;
		           x = (x - width  / 2);
		           y = (y - height / 2);

		await tile.update({	width, height, x, y });

		return tile;
	}
	static async placeAllFromSceneAt(source, tileData) {
		const flagData = {};
		const createdItems = {};
		
		const padding = source.padding, grid = source.grid;
		const px = Math.ceil(source.width / grid * padding) * grid;
		const py = Math.ceil(source.height / grid * padding) * grid;

		/** @type {number} The ratio of grid size between source and target scenes */
		const scale = this.TRNS.getScaleFactor(grid, canvas.scene.data.grid);

		let TA = false;

		for (const def of Object.values(this.layerDefs)) {
			const entities = source[def.type].map(entity => {
				if (entity.data.flags["token-attacher"]) TA = true;

				return this.translateEntity(entity, def.type, tileData, scale, px, py)
			});
			

			let created = await canvas[def.layer].createMany(entities) || [];
			if (!Array.isArray(created)) created = [created];

			createdItems[def.className] = created;

			const ids = created.map(e => e._id);
			flagData[def.type] = ids;
		}
		
		await canvas.tiles.get(tileData._id).update({ "flags.scene-tiler.entities": flagData });
		if (window.tokenAttacher && TA) await tokenAttacher.regenerateLinks(createdItems);
	}

	/**
	 * Dispatches translation tasks for the apprpriate handlers depending on
	 * entity type.
	 * 
	 * Also calculates the center point cx, cy of the tile in order to pass it along.
	 *
	 * @static
	 * @param {Entity} entity - The entity of the object being translated
	 * @param {string} type   - The entity type of the entity
	 * @param {Tile} tile     - The tile used as a positional reference point
	 * @param {number} scale  - The ratio of grid size between source and target scenes
	 * @param {number} px     - The amount of scene padding in the X axis
	 * @param {number} py     - The amount of scene padding in the Y axis
	 * @return {Entity}       - The original entity, now modified
	 * @memberof SceneTiler
	 */
	static translateEntity(entity, type, tile, scale, px, py) {
		/** @type {number} The X coordinate of the center of the tile */
		const cx = tile.x + tile.width / 2;

		/** @type {number} The Y coordinate of the center of the tile */
		const cy = tile.y + tile.height / 2;

		if (type == this.layerDefs.walls.type)
			return this.wallTranslate(entity, tile, cx, cy, scale, px, py);

		//if (type == this.layerDefs.templates.type)
		//	return this.templateTranslate(entity, tile, cx, cy, scale);

		return this.standardTranslate(entity, type, tile, cx, cy, scale, px, py);
	}

	/**
	 * Handles dispatching the translation rutine for "normal" obejcts.
	 * 
	 * This includes objects with a single x, y location, and optionally width/height.
	 *
	 * @static
	 * @param {Entity} entity - The entity of the object being translated
	 * @param {string} type   - The entity type of the entity
	 * @param {Tile} tile     - The tile used as a positional reference point
	 * @param {number} cx     - The center X coordinate of the tile, used for rotation
	 * @param {number} cy     - The center Y coordinate of the tile, used for rotation
	 * @param {number} scale  - The ratio of grid size between source and target scenes
	 * @param {number} px     - The amount of scene padding in the X axis
	 * @param {number} py     - The amount of scene padding in the Y axis
	 * @return {Entity}       - The original entity, now modified
	 * @memberof SceneTiler
	 */
	static standardTranslate(entity, type, tile, cx, cy, scale, px, py) {
		const [x, y, w, h] = Object.values(this.layerDefs)
			.find(d => d.type == type)
			.translator(
				tile.x, tile.y,
				entity.x, entity.y,
				cx, cy,
				tile.rotation, scale, px, py,
				entity.width, entity.height
			);
		
		if (typeof entity.rotation != "undefined")
			entity.rotation += tile.rotation;
		if (typeof entity.direction != "undefined")
			entity.direction += tile.rotation;

		entity.x = x;
		entity.y = y;

		if (w) {
			entity.width = w;
			entity.height = h;
		}

		return entity;
	}
	/**
	 * Handles dispatching the translation rutine for Wall objects.
	 * 
	 * @static
	 * @param {Entity} entity - The entity of the object being translated
	 * @param {Tile} tile     - The tile used as a positional reference point
	 * @param {number} cx     - The center X coordinate of the tile, used for rotation
	 * @param {number} cy     - The center Y coordinate of the tile, used for rotation
	 * @param {number} scale  - The ratio of grid size between source and target scenes
	 * @param {number} px     - The amount of scene padding in the X axis
	 * @param {number} py     - The amount of scene padding in the Y axis
	 * @return {Entity}       - The original entity, now modified
	 * @memberof SceneTiler
	 */
	static wallTranslate(entity, tile, cx, cy, scale, px, py) {
		const d = this.layerDefs.walls
			.translator(
				tile.x, tile.y,
				cx, cy,
				tile.rotation, scale, px, py,
				entity.c
			)
		entity.c = d;

		return entity;
	}
}

Hooks.on("dropCanvasData", (...args) => SceneTiler.dropCanvasData(...args));
Hooks.on("updateTile", (...args) => SceneTiler.updateTile(...args));