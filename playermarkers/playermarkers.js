/**
 * Copyright 2013-2014 Moritz Hilscher
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

var INTERVAL = 5 * 1000;
var ANIMATED = true;

var JSON_PATH = "/path/to/players.json";
var IMG_PATH = "/path/to/player.php?username={username}";
var IMG_SIZE_FACTOR = 1.0;
var BED_IMG = "/path/to/bed.png";

function PlayerMarker(ui, username, world, pos, health, food, saturation, xp, bed) {
	this.ui = ui;

	this.username = username;
	this.world = world;
	this.active = true;

	this.marker = L.marker(this.ui.mcToLatLng(pos.x, pos.z, pos.y), {
		title: this.username,
		icon: L.icon({
			iconUrl: IMG_PATH.replace("{username}", username),
			iconSize: [16 * IMG_SIZE_FACTOR, 32 * IMG_SIZE_FACTOR],
		}),
	});
	this.marker.bindPopup('<h1>' + username + '</h1><p>position: ' + Math.floor(pos.x) + ' ' + Math.floor(pos.y) + ' ' + Math.floor(pos.z) + '<br />health: ' + health + ' (' + health / 2 + ' hearts)<br />food: ' + food + ' (saturation: ' + saturation + ')<br />xp level: ' + Math.floor(xp) + '</p>', {offset: [0, -16]});
	this.marker.addTo(this.ui.lmap);

	if(bed != null) {
		this.bedMarker = L.marker(this.ui.mcToLatLng(bed.x, bed.z, bed.y), {
			title: this.username + ' bed spawn',
			icon: L.icon({
				iconUrl: BED_IMG,
				iconSize: [16, 16],
			}),
		});
		this.bedMarker.bindPopup('<h1>' + username + ' bed spawn</h1><p>position: ' + Math.floor(bed.x) + ' ' + Math.floor(bed.y) + ' ' + Math.floor(bed.z) + '</p>', {offset: [0, -8]});
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
	this.marker.bindPopup('<h1>' + this.username + '</h1><p>position: ' + Math.floor(pos.x) + ' ' + Math.floor(pos.y) + ' ' + Math.floor(pos.z) + '<br />health: ' + health + ' (' + health / 2 + ' hearts)<br />food: ' + food + ' (saturation: ' + saturation + ')<br />xp level: ' + Math.floor(xp) + '</p>', {offset: [0, -16]});

	if(bed != null) {
		this.bedMarker.setLatLng(this.ui.mcToLatLng(bed.x, bed.z, bed.y));
		this.bedMarker.bindPopup('<h1>' + this.username + ' bed spawn</h1><p>position: ' + Math.floor(bed.x) + ' ' + Math.floor(bed.y) + ' ' + Math.floor(bed.z) + '</p>'. {offset: [0, -8]});
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
			$.getJSON(JSON_PATH, function(data) { self.updatePlayers(data); });
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

	var globalPlayersOnline = [];
	var worldPlayersOnline = 0;
	for(var i = 0; i < data["players"].length; i++) {
		var user = data["players"][i];
		var username = user.username;
		var pos = {x: user.x, z: user.z, y: user.y};
		var bed = null;
		if(user.bed !== null) {
			bed = {x: user.bed[0], y: user.bed[1], z: user.bed[2]};
		}

		var player;

		if(user.username in this.players) {
			player = this.players[username];
		} else {
			player = new PlayerMarker(ui, username, user.world, pos, user.health, user.food, user.saturation, user.level, bed);
			this.players[username] = player;
		}

		player.setActive(user.world == this.currentWorld);

		if(player.active) {
			worldPlayersOnline++;
			player.move(pos);
			player.updateData(pos, user.health, user.food, user.saturation, user.level, bed);
		}
		globalPlayersOnline.push(username);
	}

	for(var name in this.players) {
		if(globalPlayersOnline.indexOf(name) == -1) {
			this.players[name].setActive(false);
			delete this.players[name];
		}
	}

	document.title = "(" + worldPlayersOnline + "/" + globalPlayersOnline.length + ") " + this.documentTitle;
};

$(window).ready(function() {
	Mapcrafter.addHandler(new MapPlayerMarkerHandler());
});
