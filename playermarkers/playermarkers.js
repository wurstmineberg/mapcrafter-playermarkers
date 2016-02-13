/**
 * Copyright 2013-2014 Moritz Hilscher
 * Copyright 2014-2016 Max Dominik Weber ("Fenhl")
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var isDev = /^([0-9a-z]+\.)?dev\.([0-9a-z]+\.)?wurstmineberg\.de$/.test(location.hostname);
var host = isDev ? 'dev.wurstmineberg.de' : 'wurstmineberg.de';

var INTERVAL = 15 * 1000; // API receives new data every 45 seconds
var ANIMATED = true;

// The Wurstmineberg API to pull player positions from. By default, this uses
// data from the Wurstmineberg server. Don't forget the trailing slash.
var API_PATH = 'https://api.' + host + '/';
var IMG_SIZE_FACTOR = 1.0;
var IMG_PATH = API_PATH + 'v2/player/{wmbID}/skin/render/front/' + 16 * IMG_SIZE_FACTOR + '.png';
var WORLD = 'wurstmineberg';
var BED_IMG = 'https://assets.' + host + '/img/grid/bed.png';

function PlayerMarker(ui, wmbID, world, pos, health, food, saturation, xp, bed) {
	this.ui = ui;

	this.username = wmbID;
	this.displayName = wmbID;
	this.world = world;
	this.active = true;

	this.marker = L.marker(this.ui.mcToLatLng(pos.x, pos.z, pos.y), {
		title: this.username,
		icon: L.icon({
			iconUrl: IMG_PATH.replace("{wmbID}", wmbID),
			iconSize: [16 * IMG_SIZE_FACTOR, 32 * IMG_SIZE_FACTOR],
		}),
	});
	this.marker.bindPopup('<h1>' + wmbID + '</h1><p>position: ' + Math.floor(pos.x) + ' ' + Math.floor(pos.y) + ' ' + Math.floor(pos.z) + '<br />health: ' + health + ' (' + health / 2 + ' hearts)<br />food: ' + food + ' (saturation: ' + saturation + ')<br />xp level: ' + Math.floor(xp) + '</p>', {offset: [0, -16]});
	this.marker.addTo(this.ui.lmap);

	if(bed != null) {
		this.bedMarker = L.marker(this.ui.mcToLatLng(bed.x, bed.z, bed.y), {
			title: this.username + ' bed spawn',
			icon: L.icon({
				iconUrl: BED_IMG,
				iconSize: [16, 16],
			}),
		});
		this.bedMarker.bindPopup('<h1>' + wmbID + ' bed spawn</h1><p>position: ' + Math.floor(bed.x) + ' ' + Math.floor(bed.y) + ' ' + Math.floor(bed.z) + '</p>', {offset: [0, -8]});
		this.bedMarker.addTo(this.ui.lmap);
	}

	this.moveCounter = 0;
	this.start = null;
	this.destination = pos;
}

PlayerMarker.prototype.setActive = function(active) {
	if(active == this.active)
		return;
	this.active = active;
	if(active)
		this.marker.addTo(this.ui.lmap);
	else
		this.ui.lmap.removeLayer(this.marker);
};

PlayerMarker.prototype.move = function(destination) {
	if(!ANIMATED) {
		this.destination = destination;
		var d = destination;
		this.marker.setLatLng(this.ui.mcToLatLng(d.x, d.z, d.y));
		return;
	}

	if(this.start != null) {
		var d = this.destination;
		this.marker.setLatLng(this.ui.mcToLatLng(d.x, d.z, d.y));
	}

	this.start = this.destination;
	this.destination = destination;

	var counter = this.moveCounter + 1;
	this.moveCounter++;

	var steps = INTERVAL / 1000 * 10;
	var step = steps;
	var time = (INTERVAL * 0.75) / step;

	var self = this;
	var animate = function() {
		if(counter < self.moveCounter) {
			return;
		}

		var latlng1 = self.ui.mcToLatLng(self.start.x, self.start.z, self.start.y);
		var latlng2 = self.ui.mcToLatLng(self.destination.x, self.destination.z, self.destination.y);

		var latDiff = latlng2.lat - latlng1.lat;
		var lngDiff = latlng2.lng - latlng1.lng;

		var lat = latlng2.lat - latDiff*(step/steps);
		var lng = latlng2.lng - lngDiff*(step/steps);
		self.marker.setLatLng(new L.LatLng(lat, lng));

		step--;
		if(step <= 0) {
			self.start = null;
			return;
		}
		window.setTimeout(animate, time);
	}

	this.timeout = window.setTimeout(animate, time);
};

PlayerMarker.prototype.updateData = function(pos, health, food, saturation, xp, bed) {
	this.marker.bindPopup('<h1><a href="https://' + host + '/people/' + this.username + '">' + this.displayName + '</a></h1><p>position: ' + Math.floor(pos.x) + ' ' + Math.floor(pos.y) + ' ' + Math.floor(pos.z) + '<br />health: ' + health + ' (' + health / 2 + ' hearts)<br />food: ' + food + ' (saturation: ' + saturation + ')<br />xp level: ' + Math.floor(xp) + '</p>', {offset: [0, -16]});

	if(bed != null) {
		this.bedMarker.setLatLng(this.ui.mcToLatLng(bed.x, bed.z, bed.y));
		this.bedMarker.bindPopup('<h1><a href="https://' + host + '/people/' + this.username + '">' + this.displayName + '</a> bed spawn</h1><p>position: ' + Math.floor(bed.x) + ' ' + Math.floor(bed.y) + ' ' + Math.floor(bed.z) + '</p>', {offset: [0, -8]});
	}
}

MapPlayerMarkerHandler.prototype = new BaseHandler();

function MapPlayerMarkerHandler() {
	this.players = {};

	this.currentWorld = "";
	this.documentTitle = document.title;
}

MapPlayerMarkerHandler.prototype.create = function() {
	ui = this.ui;

	var handler = function(self) {
		return function() {
			$.getJSON(API_PATH + 'v2/world/' + WORLD + '/playerdata/all.json', function(data) { self.updatePlayers(data); });
		};
	}(this);

	window.setTimeout(handler, 500);
	window.setInterval(handler, INTERVAL);
};

MapPlayerMarkerHandler.prototype.onMapChange = function(name, rotation) {
	this.currentWorld = this.ui.getMapConfig(name).worldName;

	var globalPlayersOnline = 0;
	var worldPlayersOnline = 0;
	for(var name in this.players) {
		var player = this.players[name];
		player.setActive(player.world == this.currentWorld);
		globalPlayersOnline++;
		if(player.active) {
			worldPlayersOnline++;
			if(!ANIMATED)
				player.move(player.destination);
		}
	}

	document.title = "(" + worldPlayersOnline + "/" + globalPlayersOnline + ") " + this.documentTitle;
};

MapPlayerMarkerHandler.prototype.updatePlayers = function(data) {
	if(!data)
		return;

	var _this = this;
	var globalPlayersOnline = [];
	var worldPlayersOnline = 0;
	var players = this.players;
	var currentWorld = this.currentWorld;
	$.each(data, function(wmbID, playerData) {
		var pos = {
			x: playerData.Pos[0],
			y: playerData.Pos[1],
			z: playerData.Pos[2]
		};
		var bed = null;
		if('SpawnX' in playerData) {
			bed = {
				x: playerData.SpawnX,
				y: playerData.SpawnY,
				z: playerData.SpawnZ
			}
		}

		var player;
		var world = WORLD;
		if(playerData.Dimension == 1) {
			world = WORLD + '_end';
		}
		if(playerData.Dimension == -1) {
			world = WORLD + '_nether';
		}

		if(wmbID in players) {
			player = players[wmbID];
		} else {
			// get display name from API
			$.getJSON(API_PATH + 'v2/player/' + wmbID + '/info.json', function(playerInfo) {
				if ('name' in playerInfo) {
					_this.updateName(wmbID, playerInfo.name);
				}
			});
			player = new PlayerMarker(ui, wmbID, world, pos, playerData.Health, playerData.foodLevel, playerData.foodSaturationLevel, playerData.XpLevel, bed);
			players[wmbID] = player;
		}

		player.setActive(world == currentWorld);

		if(player.active) {
			worldPlayersOnline++;
			player.move(pos);
			player.updateData(pos, playerData.Health, playerData.foodLevel, playerData.foodSaturationLevel, playerData.XpLevel, bed);
		}
		globalPlayersOnline.push(wmbID);
	});

	for(var wmbID in this.players) {
		if(globalPlayersOnline.indexOf(wmbID) == -1) {
			this.players[wmbID].setActive(false);
			delete this.players[wmbID];
		}
	}

	document.title = "(" + worldPlayersOnline + "/" + globalPlayersOnline.length + ") " + this.documentTitle;
};

MapPlayerMarkerHandler.prototype.updateName = function(wmbID, displayName) {
	this.players[wmbID].displayName = displayName;
}

$(window).ready(function() {
	Mapcrafter.addHandler(new MapPlayerMarkerHandler());
});
