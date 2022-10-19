/**
 * A set of placeable object data sorted by layer
 * @typedef {{
 *     Token?:            TokenData[],
 *     Tile?:             TileData[],
 *     AmbientLight?:     AmbientLightData[],
 *     AmbientSound?:     AmbientSoundData[],
 *     Note?:             NoteData[],
 *     Wall?:             WallData[],
 *     MeasuredTemplate?: MeasuredTemplateData[],
 *     Drawing?:          DrawingData[],
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
			"drawings"   : { layer: "drawings"   , type: "drawings"  , className: "Drawing"          , translator: this.Translators.translatePointWidth.bind(this.Translators)      },
			"walls"      : { layer: "walls"      , type: "walls"     , className: "Wall"             , translator: this.Translators.translateWall.bind(this.Translators)            },
			"templates"  : { layer: "templates"  , type: "templates" , className: "MeasuredTemplate" , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"notes"      : { layer: "notes"      , type: "notes"     , className: "Note"             , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"tokens"     : { layer: "tokens"     , type: "tokens"    , className: "Token"            , translator: this.Translators.translatePointWidthGrids.bind(this.Translators) },
			"sounds"     : { layer: "sounds"     , type: "sounds"    , className: "AmbientSound"     , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"lights"     : { layer: "lighting"   , type: "lights"    , className: "AmbientLight"     , translator: this.Translators.translatePoint.bind(this.Translators)           },
			"tiles"      : { layer: "background" , type: "tiles"     , className: "Tile"             , translator: this.Translators.translatePointWidth.bind(this.Translators)      }
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
	 * Creates a tile from a scene at at an optionally specified
	 * location and rotations. The scene tile can be created empty
	 * for later deployment, or it can be populated immediately.
	 *
	 * The default position is the center of the scene. The default rotation is 0.
	 *
	 * @static
	 * @param  {Scene}    scene              - The scene to create a tile from
	 * @param  {object}  [options]           - An object of optional parameters
	 * @param  {Number}  [options.x]         - The x position of the scene tile
	 * @param  {Number}  [options.y]         - The y position of the scene tile
	 * @param  {Number}  [options.rotation]  - The rotational angle of the scene, 0 is not rotated at all
	 * @param  {Boolean} [options.populate]  - If true, the tile will be populated immediately
	 * @param  {Boolean} [options.centered]  - If true, the tile position is shifted to be relative to the center of the tile
	 * @return {Promise<TileDocument>}         The tile document for the new scene tile
	 * @memberof SceneTiler
	 */
	static async create(scene, { x, y, rotation, populate, centered } = {}) {
		const tiles = await this.createTile(
			scene, scene.uuid, 
			x ?? game.canvas.scene.width  / 2,
			y ?? game.canvas.scene.height / 2,
			rotation ?? 0,
			centered ?? false,
			populate ?? false
		);
		const tile  = tiles[0];

		if (populate) await this.deploySceneTile(tile);

		return tile;
	}


	/**
	 * Populates a tile with placeables from a scene.
	 *
	 * @static
	 * @param {TileDocument}     tile  - A Scene Tiler tile.
	 * @return {Promise<TileDocument>}   The tile that was updated
	 * @memberof SceneTiler
	 */
	static async populate(tile) {
		return await this.setTileState(tile, true);
	}

	
	/**
	 * Clears the tile of all placeables.
	 *
	 * @static
	 * @param {TileDocument}     tile  - A Scene Tiler tile.
	 * @return {Promise<TileDocument>}   The tile that was updated
	 * @memberof SceneTiler
	 */
	static async clear(tile) {
		return await this.setTileState(tile, false);
	}

	
	/**
	 * Set the populated/cleared state of a tile.
	 *
	 * If state is true, populates the tile.
	 * If state is false, clears the tile.
	 *
	 * @static
	 * @param {TileDocument}     tile  - A Scene Tiler tile.
	 * @param {Boolean}          state - Whether to populate or clear the tile
	 * @return {Promise<TileDocument>}   The tile that was updated
	 * @memberof SceneTiler
	 */
	static async setTileState(tile, state) {
		if (tile.flags["scene-tiler"]?.scene)
			return await tile.update({ locked: state });
		else {
			const message = game.i18n.localize("scene-tiler.notifications.warn.notaSceneTile");
			console.warn(message);
			ui.notifications.warn(message);
		}
	}


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
	static async dropCanvasData(canvas, { id, type, uuid, x, y }) {
		if (type != "Scene") return;
		
		const source = await fromUuid(uuid);
		
		if (!source) { 
			console.debug(game.i18n.localize("SCNTILE.console.debug.sceneNotFound"));
			return;
		}
		
		return this.createTile(source, uuid, x, y);
	}

	/**
	 * Handles the preUpdateTile Hook
	 *
	 * If the update is a lock/unlock, check if if the scene is being locked. 
	 * If the update is width/height prevent the change if it's an ST tile.
	 *
	 * If the scene is being locked, deploy the scene tile, otherwise clear it
	 *
	 * @static
	 * @param {TileDocument} tileDoc  - The data from the tile that is being update
	 * @param {Object} update         - The data that is being updated
	 * @return {void}                   Return early if this is not a lock/unlock update
	 * @memberof SceneTiler
	 */
	static async preUpdateTile(tileDoc, update) {
		if ( typeof update?.locked == "undefined" &&
			 typeof update?.width  == "undefined" &&
			 typeof update?.height == "undefined" ||
			 !tileDoc?.flags["scene-tiler"]?.scene ) return;

		if (update.width || update.height) {
			update.width = undefined;
			update.height = undefined;
			ui.notifications.warn(game.i18n.localize("SCNTILE.notifications.warn.noResize"));
		}

		if (update.locked) this.deploySceneTile(tileDoc);
		else               this.clearSceneTile(tileDoc);
	}

	/**
	 * Creates objects in the current scene based on objects in the source scene.
	 *
	 * Get the UUID from flags, if it doesn't exist return.
	 * Then get the data from the source, and place the objects from it if it exists
	 *
	 * @static
	 * @param {TileData} data - The data from the tile that is being update
	 * @return {Promise<void>}    Return early if the UUID doesn't retrieve a source scene 
	 * @memberof SceneTiler
	 */
	static async deploySceneTile(data) {
		const uuid = data.flags["scene-tiler"]?.scene;
		if (!uuid) return;
			
		const source = await fromUuid(uuid);
		if (source) await this.placeAllFromSceneAt(source, data);
	}

	/**
	 * Delete objects associated with this scene tile
	  *
	 * Cycle through all layers and delete entities that were created by this tile,
	 * then set the flag for entities to null
	 *
	 * @static
	 * @param {TileData} data - The data from the tile that is being update
	 * @memberof SceneTiler
	 */
	static async clearSceneTile(data) {
		const flags = data.flags["scene-tiler"];
		if (!flags?.entities) return;

		for (const def of this.layers) {
			const entities = flags.entities[def.type];
			if (!entities) continue;
			await canvas.scene.deleteEmbeddedDocuments(def.className, entities); 
		}
		await canvas.tiles.get(data._id).document.update({ "flags.scene-tiler.entities": null }); 
	}

	/**
	 * Creates a tile on the scene to be used as a controller for the Scene Tiler functionality.
	 *
	 * This tile is created using the bacground image of the source scene, or a blank image if non provided.
	 * The dimensions of the tile are then scaled to compensate for differences in scene grid size,
	 * and then the position of the tile is adjusted to account for a change in size.
	 *
	 * @static
	 * @param {Scene} source            - The scene from which this tile is created, and from which data will be pulled
	 * @param {String} uuid             - The UUID of the source scene.
	 * @param {Number} x                - The X coodinate of the location where the scene was dropped
	 * @param {Number} y                - The Y coodinate of the location where the scene was dropped
	 * @param {Number} [rotation=0]     - The rotation of the tile
	 * @param {Boolean} [centered=true] - If true, the tile position is shifted to be relative to the center of the tile
	 * @param {Number} [locked=false]   - Whether or not to create the tile in a locked state. Only do this if the tile is being deployed immediately.
	 * @return {Promise<TileDocument>}    The data of the tile that was created
	 * @memberof SceneTiler
	 */
	static async createTile(source, uuid, x, y, rotation = 0, centered = true, locked = false) {
		return await canvas.scene.createEmbeddedDocuments("Tile", [{
			img: source.background.src || "modules/scene-tiler/_Blank.png",
			flags: { "scene-tiler": { scene: uuid } },
			rotation, locked,
			...this.Helpers.getTilePos(source, x, y, centered)
		}]);
	}

	/**
	 * Creates objects in the target scene by duplicating objects from the source scene,
	 * and translating their position, scale, and angle to match a tile.
	 *
	 * @static
	 * @param {Scene} source       - The data of the source scene
	 * @param {TileData} tileData  - The data of the background tile in the target scene
	 * @return {void}                Return early if a handler of the preCreatePlaceableObjects hook reponds with a false
	 * @memberof SceneTiler
	 */
	static async placeAllFromSceneAt(source, tileData) {
		const objects = this.getObjects(source, tileData);

		if (Hooks.call("preCreatePlaceableObjects", canvas.scene, objects, {}, game.userId) === false) return;

		const createdObjects = await this.createObjects(objects);

		const flagData = this.getObjectIds(createdObjects);
		
		await canvas.tiles.get(tileData._id).document.update({ "flags.scene-tiler.entities": flagData });
		
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

			let created = [];
			try {
				created = await canvas.scene.createEmbeddedDocuments(def.className, objects[def.className]) || [];
			}
			catch (e) { 
				console.error(e);
			}

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
			ids[def.type] = objects[def.className].map(e => e.id);
		}
		return ids;
	}

	/**
	 * Gets a set of prepared object data
	 *
	 * @static
	 * @param {Scene} source     - The data of the scene from which to obtain the object data
	 * @param {TileData} tile    - The data of the tile onto which to map the objects
	 * @return {ObjectsData}       The data of the objects
	 * @memberof SceneTiler
	 */
	static getObjects(source, tile) {
		const objects = {};
		const [px, py] = this.Helpers.getPadding(source);

		/** @type {Number} The ratio of grid size between source and target scenes */
		const scale = this.Helpers.getScaleFactor(source, canvas.scene);

		for (const def of this.layers) {
			const entities = this.prepareObjects(source, def.type, tile, scale, px, py);
			if (def.type == "tiles") this.getForegroundTile(entities, source, tile, scale);
			if (entities.length) objects[def.className] = entities;
		}
		return objects;
	}

	/**
	 * Creates the data for an additional tile representing the foreground image
	 * set on the source scene. This tile matches the sizer and position of the 
	 * background tile, but is `overhead: true` with an occlusion mode of `0`.
	 *
	 * The z-index of this new tile is one less than the lowest overhead tile on the scene,
	 * ensuring that all other overhead tiles apepar above it.
	 *
	 * @static
	 * @param {Array<TileData>} tiles         - All the other tiles in the scene
	 * @param {Scene} source                  - The data of the scene from which to obtain the object data
	 * @param {TileData} tile                 - The data of the tile onto which to map the tile
	 * @param {Number} scale                  - The ratio of grid size between source and target scenes
	 * @return {void}                           Returns early if no foreground image is set on source
	 * @memberof SceneTiler
	 */
	static getForegroundTile(tiles, source, tile, scale) {
		// If there isn't a foreground image, do nothing.
		if (!source.foreground) return;

		/** @type {number} The lowest z value of any overhead tile */
		const minZ = tiles
			.filter(tile => tile.overhead)
			.reduce((min, tile) => tile.z < min ? tile.z : min, Number.MAX_VALUE);

		// The primary data of the new tile
		const foreground = {
			img: source.foreground.src,
			overhead: true,
			occlusion: { mode: 0 },      // Mode 0 is no occlusion, this tile is always visible
			x: tile.x, y: tile.y,
			z: minZ - 1,
			rotation: tile.rotation,
			width: tile.width,
			height: tile.height
		}
		
		// Add this new tile data to the array of tiles in order to include it in the batch
		tiles.push(foreground);
	}

	/**
	 * Prepares the data of an object, translated, rotated, and scaled to fit the target scene and tile
	 *
	 * @static
	 * @param {Scene} source                 - The data of the scene from which to obtain the object data
	 * @param {String} type                   - The type name of the object
	 * @param {TileData} tile                 - The data of the tile onto which to map the objects
	 * @param {[Number, Number, Number]} spxy - The scalefactor and padding x, and padding y of the source 
	 * @return {DocumentData[]}                 The set of prepared object data
	 * @memberof SceneTiler
	 */
	static prepareObjects(source, type, tile, ...spxy) {
		return source[type].map(entity => {
			if (type == this.layerDefs.tiles.type) entity.z += tile.z;

			return this.translateEntity(entity.toObject(), type, tile, ...spxy);
		});
	}

	/**
	 * Dispatches translation tasks for the apprpriate handlers depending on
	 * entity type.
	 * 
	 * Also calculates the center point cx, cy of the tile in order to pass it along.
	 *
	 * @static
	 * @param {Document} entity - The entity of the object being translated
	 * @param {String} type     - The entity type of the entity
	 * @param {Tile} tile       - The tile used as a positional reference point
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @param {Number} px       - The amount of scene padding in the X axis
	 * @param {Number} py       - The amount of scene padding in the Y axis
	 * @return {Entity}         - The original entity, now modified
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
	 * @param {Document} entity - The entity of the object being translated
	 * @param {String} type     - The entity type of the entity
	 * @param {Tile} tile       - The tile used as a positional reference point
	 * @param {Number} cx       - The center X coordinate of the tile, used for rotation
	 * @param {Number} cy       - The center Y coordinate of the tile, used for rotation
	 * @param {Number} scale    - The ratio of grid size between source and target scenes
	 * @param {Number} px       - The amount of scene padding in the X axis
	 * @param {Number} py       - The amount of scene padding in the Y axis
	 * @return {Entity}         - The original entity, now modified
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