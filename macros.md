## Multi-Layer - Floors and Levels
This set of macros allows the user to define a set of layers, each is a Scene-Tiler tile. Then, the user can cycle through those layers, having only one active at a time.

To set this up, place the tiles on the scene, and use the up/down arrow controls on the tiles to ensure that they all have a different Z index (the simple way to do this, is each time you drop a tile, hit the up on it before dropping the next).

Next, place the tiles over eachother as desired. Then drag the selection box over them to select them all. Now run the first macro:

### Create Layers
This will store the layers data in the scene flags. You can only have one stack of layers per scene.

```js
canvas.scene.setFlag("scene-tiler", "layers", 
	canvas.tiles.controlled.map(t => {
		return { 
			id: t.id,
			z: t.data.z,
			active: false
		}
	}).sort((a, b) => a.z > b.z) 
);
```

### Up A Layer
This macro will activate the next layer above the current layer, or the bottom layer if the current layer is the top.

```js
(async () => {
	const layers = duplicate(
		canvas.scene.getFlag("scene-tiler", "layers")
	);

	let active = layers.findIndex(l => l.active);
	if (active < 0) 
		active = layers.length - 1;
	let next   = active + 1 < layers.length ? active + 1 : 0;
	let z      = layers.reduce((max, l) => Math.max(max, l.z), 0);
	
	await canvas.tiles.get(layers[active].id).update({
		z: layers[active].z,
		locked: false
	});
	
	layers[active].active = false;
	
	await canvas.tiles.get(layers[next].id).update({
		z: z + 1,
		locked: true
	});
	
	layers[next].active = true;
	
	await canvas.scene.setFlag("scene-tiler", "layers", layers);
})()
```

### Down A Layer
Activates the next layer down, cycling to the top after reaching the bottom.

```js
(async () => {
	const layers = duplicate(
		canvas.scene.getFlag("scene-tiler", "layers")
	);

	let active = layers.findIndex(l => l.active);
	if (active < 0) 
		active = 0;
	let next   = active - 1 > -1 ? active - 1 : layers.length - 1;
	let z      = layers.reduce((max, l) => Math.max(max, l.z), 0);
	
	await canvas.tiles.get(layers[active].id).update({
		z: layers[active].z,
		locked: false
	});
	
	layers[active].active = false;
	
	await canvas.tiles.get(layers[next].id).update({
		z: z + 1,
		locked: true
	});
	
	layers[next].active = true;
	
	await canvas.scene.setFlag("scene-tiler", "layers", layers);
})()
```