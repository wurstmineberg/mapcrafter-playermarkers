**Note:** this is a fork of mapcrafter-playermarkers which uses the
[Wurstmineberg Minecraft
API](https://github.com/wurstmineberg/api.wurstmineberg.de) instead of the
[MapTools](https://github.com/m0r13/MapTools) Bukkit plugin. If you're looking
for the original mapcrafter-playermarkers,
https://github.com/mapcrafter/mapcrafter-playermarkers has you covered.

# Mapcrafter playermarkers #

This is a script to show markers of players from a Minecraft server on maps
rendered with Mapcrafter.

The script is free software and available under the GPL license.

## Requirements ##

You need some things to use this script:

* A map rendered with Mapcrafter
* A working [Wurstmineberg Minecraft
  API](https://github.com/wurstmineberg/api.wurstmineberg.de) to provide the
  player data

## Installation ##

* Make sure the following endpoints of your API are working:
    * `/v2/player/<player>/info.json`
    * `/v2/player/<player>/skin/render/front/16.png`
    * `/v2/world/<world>/playerdata/all.json`
* Copy the files from the `playermarkers` directory to an accessible web
  directory.
* Now configure the `playermarkers.js` script. You need to specify the URL of
  your API. You can also turn the player movement animation off if you don't
  want it.
* The last point is that you have to include the script into your rendered map.
  Open your Mapcrafter template `index.html` file and add the following lines
  after the `<script>` section where the Mapcrafter UI is initialized:

```
<script type="text/javascript" src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
<script type="text/javascript" src="/path/to/playermarkers.js"></script>
```

* Now you can update the template of your rendered map by running `mapcrafter
  -c <configfile> -r`.

Have fun with the player markers!
