/*
Visualifico 0.0.1 - document-based and dynamic schemas Visual Analytics
Copyright (C) 2015  Rosario Alfano

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function Logger () {

	var fs = require("fs");
	var config = require("../models/config.js");
	
	this.log = function (message) {
	
		fs.appendFile(
		
			config.directories.log + "/" + config.files.log, 
			new Date().toJSON() + " - " +
			message + "\r\n", function (err) {
			
				if (err) console.log ("error saving in log file");
			});
	}
}

var logger = new Logger();

module.exports = logger;