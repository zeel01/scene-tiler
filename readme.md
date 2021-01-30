![](https://img.shields.io/badge/Foundry-v0.7.9-informational)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fscene-tiler&colorB=4aa94a)
![Latest Release Download Count](https://img.shields.io/github/downloads/zeel01/scene-tiler/latest/scene-tiler.zip) 

Creates tiles by dragging and dropping a scene onto another scene, then populates the tile with placeables from the source scene.

You can drag a scene from the sidebar or from a compendium onto the canvas, once you do a tile with the background image of the source scene will appear. You can move and rotate this tile to position it as desired.

Once the tile is in place, click the lock button on the Tile HUD. When the tile locks, all the objects from the source scene, including Tokens, Tiles, Walls, Lights, etc. will appear on top of the tile. If you need to adjust the tile position, simply unlock it which will clear all the objects from it, reposition it, and lock it again.

When you drop a scene onto another scene, the tile will automatically be scaled so that the grid distance and size of the source and target scene match. For example, if you have a scene with a 200px grid, and drop it onto one with a 100px grid, the tile will be resized to a grid size of 100px so that the grid spaces match. Likewise, if you have a scene with 5ft. squares, and place it into a scene with 10ft. squares, the tile will be scaled accordingly.

This module can be used to assemble scenes from smaller bulding blocks, to spawn encounters, to place large vehicles like ships, or drop unique lighting setups into new scenes.