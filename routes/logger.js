/*--------------------------------------------------------------------------
* Visualifico
* ver 0.1.0.0 (December 2014)
*
* created and maintained by Alfano Rosario <ro.alfano@gmail.com>
*--------------------------------------------------------------------------*/

function Logger () {

	var fs = require("fs");
	var config = require("../models/config.js");
	
	this.log = function (message) {
	
		fs.appendFile(
		
			config.files.log, 
			new Date().toJSON() + " - " +
			message + "\r\n", function (err) {
			
				if (err) console.log ("error saving in log file");
			});
	}
}

var logger = new Logger();

module.exports = logger;