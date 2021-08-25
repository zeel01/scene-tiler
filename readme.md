![](https://img.shields.io/badge/Foundry-v0.8.9-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fscene-tiler&colorB=4aa94a)
![Latest Release Download Count](https://img.shields.io/github/downloads/zeel01/scene-tiler/latest/scene-tiler.zip)

## Video Demo:

[![Scene Tiler video demo](https://img.youtube.com/vi/OtI9QOsZFa8/0.jpg)](https://www.youtube.com/watch?v=OtI9QOsZFa8)
## Scene Tiler

Creates tiles by dragging and dropping a scene onto another scene, then populates the tile with placeables from the source scene.

<img src="scene-tiler_004.gif" width="600" alt="Scene Tiler example">

You can drag a scene from the sidebar or from a compendium onto the canvas, once you do a tile with the background image of the source scene will appear. You can move and rotate this tile to position it as desired.

Once the tile is in place, click the lock button on the Tile HUD. When the tile locks, all the objects from the source scene, including Tokens, Tiles, Walls, Lights, etc. will appear on top of the tile. If you need to adjust the tile position, simply unlock it which will clear all the objects from it, reposition it, and lock it again.

When you drop a scene onto another scene, the tile will automatically be scaled so that the grid distance and size of the source and target scene match. For example, if you have a scene with a 200px grid, and drop it onto one with a 100px grid, the tile will be resized to a grid size of 100px so that the grid spaces match. Likewise, if you have a scene with 5ft. squares, and place it into a scene with 10ft. squares, the tile will be scaled accordingly.

This module can be used to assemble scenes from smaller bulding blocks, to spawn encounters, to place large vehicles like ships, or drop unique lighting setups into new scenes.

## API

Scene Tiler exposes an API on the global `SceneTiler` object. Most of the API is pseudo-public, meaning that while it's fine to access it externally, there is not a guarantee of stability.

The one method that should remain as stable as possible, and also the only method that most applications are likely to need is `SceneTiler.create` which creates a new scene tile from a source scene.

### `create(scene, { x, y, rotation, populate })`

This method accepts two parameters, the first is a `Scene` object for the scene that is being turned into a tile. The second is an object with optional parameters.

When coordinates are omitted, the tile will be placed in the center of the scene. When rotation is omitted, the tile will be placed with rotation 0. When populate is `false` or omitted, the tile will be created with no objects.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| scene | `Scene` | The scene that is being turned into a tile. |
| x | `Number` | The x position of the center of the tile in the scene. |
| y | `Number` | The y position of the center of the tile in the scene. |
| rotation | `Number` | The rotation of the tile in the scene. |
| populate | `Boolean` | Whether or not to populate the tile with the objects from the source scene. |
| centered | `Boolean` | If true, the tile position is shifted to be relative to the center of the tile. |

#### Example

```js
await SceneTiler.create(game.scenes.getName("Tile Source Test"), { populate: true, rotation: 45 })
```

Creates a tile from "Tile Source Test" at the center of the scene, rotated 45 degrees, and instantly populates it.