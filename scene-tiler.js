/**
 * The data representing some placeable object
 * 
 * @typedef {Object<string, any>} ObjectData
 *//**
 * A set of placeable object data sorted by layer
 * @typedef {{
 *     Token?:            ObjectData[],
 *     Tile?:             ObjectData[],
 *     AmbientLight?:     ObjectData[],
 *     AmbientSound?:     ObjectData[],
 *     Note?:             ObjectData[],
 *     Wall?:             ObjectData[],
 *     MeasuredTemplate?: ObjectData[],
 *     Drawing?:          ObjectData[],
 * }} ObjectsData
 */


/**
 * Creates tiles by dragging and dropping a scene onto another scene, 
 * then populates the tile with placeables from the source scene.
 *
 * @class SceneTiler
 */
class SceneTiler {
	/**
	 * An alias for the Entity Translator class
	 *
	 * @type {typeof STEntityTranslators}
	 * @readonly
	 * @static
	 * @memberof SceneTiler
	 */
	static get Translators() { return STEntityTranslators; }

	/**
	 * An alias for the Scene Tiler Helpers class
	 *
	 * @type {typeof SceneTilerHelpers}
	 * @readonly
	 * @static
	 * @memberof SceneTiler
	 */
	static get Helpers() { return SceneTilerHelpers; }

	/** 
	 * @typedef {Object} LayerDef
	 * @property {String} layer        - The name of the canvas layer for this entity type
	 * @property {String} type         - The name of the type of this entity
	 * @property {String} className    - The Class name of this Entity subclass
	 * @property {Function} translator - A function that can handle translating the position of this entity
	 *//**
	 *
	 * A mapping of layer, type, and class names for each canvas layer, plus translation functions.
	 *
	 * @type {Object<string, LayerDef>}
	 * @readonly
	 * @static
	 * @memberof SceneTiler
	 */
	static get layerDefs() {
		return {
			"tokens"   : { layer: "tokens"    , type: "tokens"    , className: "Token"            , translator: this.Translators.translatePointWidthGrids.bind(this.Translators) },
			"tiles"    : { layer: "tiles"     , type: "tiles"     , className: "Tile"             , translator: this.Translators.translatePointWidth.bind(this.Translators)      },
			"lights"   : { layer: "lighting"  , type: "lights"    , className: "AmbientLight"     , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"sounds"   : { layer: "sounds"    , type: "sounds"    , className: "AmbientSound"     , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"notes"    : { layer: "notes"     , type: "notes"     , className: "Note"             , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"walls"    : { layer: "walls"     , type: "walls"     , className: "Wall"             , translator: this.Translators.translateWall.bind(this.Translators)            },
			"templates": { layer: "templates" , type: "templates" , className: "MeasuredTemplate" , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"drawings" : { layer: "drawings"  , type: "drawings"  , className: "Drawing"          , translator: this.Translators.translatePointWidth.bind(this.Translators)      }
		}
	}

	/**
	 * The layerDefs as an array
	 *
	 * @type {LayerDef[]}
	 * @readonly
	 * @static
	 * @memberof SceneTiler
	 */
	static get layers() { return Object.values(this.layerDefs); }

	/**
	 * @typedef  {Object} dropData - A set of data generated when dropping something onto the scene
	 * @property {String} id       - The ID of the entity that was dropped
	 * @property {String} type     - The type of entity that was dropped
	 * @property {String} pack     - If from a compendium, the name of the pack
	 * @property {Number} x        - The X coodinate of the location where the scene was dropped
	 * @property {Number} y        - The Y coodinate of the location where the scene was dropped
	 *//**
	 *
	 * Handles the dropCanvasData Hook
	 *
	 * If the data is a scene, determin the UUID of it, and retrieve its data.
	 * Then, create a tile from that data. 
	 *
	 * @static
	 * @param {Object} canvas    - The PIXI canvas
	 * @param {dropData} options - Options assocaiated with this data drop
	 * @return {Object|void}       The created tile, or returns early if not dropping  a Scene or if the source isn't found
	 * @memberof SceneTiler
	 */
	static async dropCanvasData(canvas, { id, type, pack, x, y }) {
		if (type != "Scene") return;
		
		let uuid = "";
		if (pack) uuid = `Compendium.${pack}.${id}`;
		else      uuid = `${type}.${id}`;
	
		const source = duplicate(await fromUuid(uuid));
		
		if (!source) { 
			console.debug(game.i18n.localize("SCNTILE.console.debug.sceneNotFound"));
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
	 * @param {Object} scene        - The scene in which the tile is being updated
	 * @param {ObjectData} tileData - The data from the tile that is being update
	 * @param {Object} update       - The data that is being updated
	 * @return {void}                 Return early if this is not a lock/unlock update
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
	 * @param {ObjectData} data - The data from the tile that is being update
	 * @return {Promise<void>}    Return early if the UUID doesn't retrieve a source scene 
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
	 * @param {ObjectData} data - The data from the tile that is being update
	 * @memberof SceneTiler
	 */
	static async clearSceneTile(data) {
		for (const def of this.layers) {
			const entities = data.flags["scene-tiler"].entities[def.type];
			if (!entities) continue;
			await canvas[def.layer].deleteMany(entities);
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
	 * @param {Object} source - The scene from which this tile is created, and from which data will be pulled
	 * @param {String} uuid   - The UUID of the source scene.
	 * @param {Number} x      - The X coodinate of the location where the scene was dropped
	 * @param {Number} y      - The Y coodinate of the location where the scene was dropped
	 * @return {ObjectData}     The data of the tile that was created
	 * @memberof SceneTiler
	 */
	static async createTile(source, uuid, x, y) {
		return await canvas.scene.createEmbeddedEntity("Tile", {
			img: source.img || "modules/scene-tiler/_Blank.png",
			flags: { 
				"scene-tiler": { scene: uuid }
			},
			...this.Helpers.getTilePos(source, x, y)
		});
	}

	/**
	 * Creates objects in the target scene by duplicating objects from the source scene,
	 * and translating their position, scale, and angle to match a tile.
	 *
	 * @static
	 * @param {Object} source       - The data of the source scene
	 * @param {ObjectData} tileData - The data of the background tile in the target scene
	 * @return {void}                 Return early if a handler of the preCreatePlaceableObjects hook reponds with a false
	 * @memberof SceneTiler
	 */
	static async placeAllFromSceneAt(source, tileData) {
		const objects = this.getObjects(source, tileData);

		if (Hooks.call("preCreatePlaceableObjects", canvas.scene, objects, {}, game.userId) === false) return;

		const createdObjects = await this.createObjects(objects);

		const flagData = this.getObjectIds(createdObjects);
		
		await canvas.tiles.get(tileData._id).update({ "flags.scene-tiler.entities": flagData });
		
		Hooks.callAll("createPlaceableObjects", canvas.scene, createdObjects, {}, game.userId);
	}

	/**
	 * Create all of the objects from the data given.
	 *
	 * Creating objects on multiple layers, on each layer if there are objects
	 * in the data create them, maintaining a list of all created object data.
	 *
	 * @static
	 * @param {ObjectsData} objects - The data for objects to create
	 * @return {ObjectsData}          The data of objects that have been created
	 * @memberof SceneTiler
	 */
	static async createObjects(objects) {
		const createdObjects = {};
		for (const def of this.layers) {
			if (!objects[def.className]) continue;

			let created = await canvas[def.layer].createMany(objects[def.className]) || [];
			if (!Array.isArray(created)) created = [created];

			if (created.length) createdObjects[def.className] = created;
		}
		return createdObjects;
	}

	/**
	 * Strips out just the IDs of a set of objects
	 *
	 * @static
	 * @param {ObjectsData} objects - The data for objects to get the IDs of
	 * @return {Object}               The IDs of all the objects sorted by layer
	 * @memberof SceneTiler
	 */
	static getObjectIds(objects) {
		const ids = {};
		for (const def of this.layers) {
			if (!objects[def.className]) continue;
			ids[def.type] = objects[def.className].map(e => e._id);
		}
		return ids;
	}

	/**
	 * Gets a set of prepared object data
	 *
	 * @static
	 * @param {Object} source     - The data of the scene from which to obtain the object data
	 * @param {ObjectData} tile   - The data of the tile onto which to map the objects
	 * @return {ObjectsData}        The data of the objects
	 * @memberof SceneTiler
	 */
	static getObjects(source, tile) {
		const objects = {};
		const [px, py] = this.Helpers.getPadding(source);

		/** @type {Number} The ratio of grid size between source and target scenes */
		const scale = this.Helpers.getScaleFactor(source, canvas.scene.data);

		for (const def of this.layers) {
			const entities = this.prepareObjects(source, def.type, tile, scale, px, py);
			if (entities.length) objects[def.className] = entities;
		}
		return objects;
	}

	/**
	 * Prepares the data of an object, translated, rotated, and scaled to fit the target scene and tile
	 *
	 * @static
	 * @param {Object} source                 - The data of the scene from which to obtain the object data
	 * @param {String} type                   - The type name of the object
	 * @param {ObjectData} tile               - The data of the tile onto which to map the objects
	 * @param {[Number, Number, Number]} spxy - The scalefactor and padding x, and padding y of the source 
	 * @return {ObjectData[]}                   The set of prepared object data
	 * @memberof SceneTiler
	 */
	static prepareObjects(source, type, tile, ...spxy) {
		return source[type].map(entity => {
			if (type == this.layerDefs.tiles.type) entity.z += tile.z;

			return this.translateEntity(entity, type, tile, ...spxy);
		});
	}

	/**
	 * Dispatches translation tasks for the apprpriate handlers depending on
	 * entity type.
	 * 
	 * Also calculates the center point cx, cy of the tile in order to pass it along.
	 *
	 * @static
	 * @param {Entity} entity - The entity of the object being translated
	 * @param {String} type   - The entity type of the entity
	 * @param {Tile} tile     - The tile used as a positional reference point
	 * @param {Number} scale  - The ratio of grid size between source and target scenes
	 * @param {Number} px     - The amount of scene padding in the X axis
	 * @param {Number} py     - The amount of scene padding in the Y axis
	 * @return {Entity}       - The original entity, now modified
	 * @memberof SceneTiler
	 */
	static translateEntity(entity, type, tile, scale, px, py) {
		/** @type {Number} The X coordinate of the center of the tile */
		const cx = tile.x + tile.width / 2;

		/** @type {Number} The Y coordinate of the center of the tile */
		const cy = tile.y + tile.height / 2;

		if (type == this.layerDefs.walls.type)
			return this.wallTranslate(entity, tile, cx, cy, scale, px, py);

		return this.standardTranslate(entity, type, tile, cx, cy, scale, px, py);
	}

	/**
	 * Handles dispatching the translation rutine for "normal" obejcts.
	 * 
	 * This includes objects with a single x, y location, and optionally width/height.
	 *
	 * @static
	 * @param {Entity} entity - The entity of the object being translated
	 * @param {String} type   - The entity type of the entity
	 * @param {Tile} tile     - The tile used as a positional reference point
	 * @param {Number} cx     - The center X coordinate of the tile, used for rotation
	 * @param {Number} cy     - The center Y coordinate of the tile, used for rotation
	 * @param {Number} scale  - The ratio of grid size between source and target scenes
	 * @param {Number} px     - The amount of scene padding in the X axis
	 * @param {Number} py     - The amount of scene padding in the Y axis
	 * @return {Entity}       - The original entity, now modified
	 * @memberof SceneTiler
	 */
	static standardTranslate(entity, type, tile, cx, cy, scale, px, py) {
		const [x, y, w, h] = this.layers.find(d => d.type == type)
			.translator( tile.x, tile.y, entity.x, entity.y, cx, cy,
				tile.rotation, scale, px, py, entity.width, entity.height );
		
		if (typeof entity.rotation != "undefined")
			entity.rotation += tile.rotation;
		if (typeof entity.direction != "undefined")
			entity.direction += tile.rotation;

		entity.x = x;
		entity.y = y;

		if (w) {
			entity.width  = w;
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
	 * @param {Number} cx     - The center X coordinate of the tile, used for rotation
	 * @param {Number} cy     - The center Y coordinate of the tile, used for rotation
	 * @param {Number} scale  - The ratio of grid size between source and target scenes
	 * @param {Number} px     - The amount of scene padding in the X axis
	 * @param {Number} py     - The amount of scene padding in the Y axis
	 * @return {Entity}       - The original entity, now modified
	 * @memberof SceneTiler
	 */
	static wallTranslate(entity, tile, cx, cy, scale, px, py) {
		const d = this.layerDefs.walls
			.translator( tile.x, tile.y, cx, cy,
				tile.rotation, scale, px, py, entity.c );
		entity.c = d;
		return entity;
	}
}

Hooks.on("dropCanvasData", (...args) => SceneTiler.dropCanvasData(...args));
Hooks.on("preUpdateTile", (...args) => SceneTiler.preUpdateTile(...args));