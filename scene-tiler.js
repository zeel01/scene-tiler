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

	/**
	 * @typedef  {object} dropData - A set of data generated when dropping something onto the scene
	 * @property {string} id       - The ID of the entity that was dropped
	 * @property {string} type     - The type of entity that was dropped
	 * @property {string} pack     - If from a compendium, the name of the pack
	 * @property {number} x        - The X coodinate of the location where the scene was dropped
	 * @property {number} y        - The Y coodinate of the location where the scene was dropped
	 *//**
	 *
	 * Handles the dropCanvasData Hook
	 *
	 * If the data is a scene, determin the UUID of it, and retrieve its data.
	 * Then, create a tile from that data. 
	 *
	 * @static
	 * @param {object} canvas
	 * @param {dropData} options
	 * @return {*} 
	 * @memberof SceneTiler
	 */
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

	/**
	 * Handles the preUpdateTile Hook
	 *
	 * If the update is a lock/unlock, check if if the scene is being locked. Otherwise return.
	 *
	 * If the scene is being locked, deploy the scene tile, otherwise clear it
	 *
	 * @static
	 * @param {object} scene    - The scene in which the tile is being updated
	 * @param {object} tileData - The data from the tile that is being update
	 * @param {object} update   - The data that is being updated
	 * @return {void}             Return early if this is not a lock/unlock update
	 * @memberof SceneTiler
	 */
	static async preUpdateTile(scene, tileData, update) {
		if (typeof update?.locked == "undefined") return;
		if (update.locked) this.deploySceneTile(tileData);
		else               this.clearSceneTile(tileData);
	}

	/**
	 * Creates objects in the current scene based on objects in the source scene.
	 *
	 * Get the UUID from flags, if it doesn't exist return.
	 * Then get the data from the source, and place the objects from it if it exists
	 *
	 * @static
	 * @param {object} data    - The data from the tile that is being update
	 * @return {Promise<void>}   Return early if the UUID doesn't retrieve a source scene 
	 * @memberof SceneTiler
	 */
	static async deploySceneTile(data) {
		const uuid = data.flags["scene-tiler"]?.scene;
		if (!uuid) return;

		const source = duplicate(await fromUuid(uuid));
		if (source) await this.placeAllFromSceneAt(source, data);
	}

	/**
	 * Delete objects associated with this scene tile
	  *
	 * Cycle through all layers and delete entities that were created by this tile,
	 * then set the flag for entities to null
	 *
	 * @static
	 * @param {object} data    - The data from the tile that is being update
	 * @memberof SceneTiler
	 */
	static async clearSceneTile(data) {
		for (const def of Object.values(this.layerDefs)) {
			await canvas[def.layer].deleteMany(data.flags["scene-tiler"].entities[def.type]);
		}
		await canvas.tiles.get(data._id).update({ "flags.scene-tiler.entities": null }); 
	}

	/**
	 * Creates a tile on the scene to be used as a controller for the Scene Tiler functionality.
	 *
	 * This tile is created using the bacground image of the source scene, or a blank image if non provided.
	 * The dimensions of the tile are then scaled to compensate for differences in scene grid size,
	 * and then the position of the tile is adjusted to account for a change in size.
	 *
	 * @static
	 * @param {object} source - The scene from which this tile is created, and from which data will be pulled
	 * @param {string} uuid   - The UUID of the source scene.
	 * @param {number} x      - The X coodinate of the location where the scene was dropped
	 * @param {number} y      - The Y coodinate of the location where the scene was dropped
	 * @return {object}         The data of the tile that was created
	 * @memberof SceneTiler
	 */
	static async createTile(source, uuid, x, y) {
		return await canvas.scene.createEmbeddedEntity("Tile", {
			img: source.img || "modules/scene-tiler/_Blank.png",
			flags: { 
				"scene-tiler": { scene: uuid }
			},
			...this.getTilePos(source, x, y)
		});
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
	 * @memberof SceneTiler
	 */
	static getTilePos(source, x, y) {
		const scale = this.TRNS.getScaleFactor(source.grid, canvas.scene.data.grid);

		const  width = source.width  * scale,
		      height = source.height * scale;
		           x = x - width  / 2;
		           y = y - height / 2;

		if (!canvas.grid.hitArea.contains(x, y)) x = y = 0;

		return { width, height, ...canvas.grid.getSnappedPosition(x, y) };
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
				if (entity.flags["token-attacher"]) TA = true;
				if (def.type == this.layerDefs.tiles.type) entity.z += tileData.z;

				return this.translateEntity(entity, def.type, tileData, scale, px, py)
			});
			

			let created = await canvas[def.layer].createMany(entities) || [];
			if (!Array.isArray(created)) created = [created];

			createdItems[def.className] = created;

			const ids = created.map(e => e._id);
			flagData[def.type] = ids;
		}
		
		await canvas.tiles.get(tileData._id).update({ "flags.scene-tiler.entities": flagData });
		
		Hooks.callAll("createPlaceableObjects", canvas.scene, createdItems, {}, game.userId);
		//if (window.tokenAttacher && TA) await tokenAttacher.regenerateLinks(createdItems);
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
Hooks.on("preUpdateTile", (...args) => SceneTiler.preUpdateTile(...args));