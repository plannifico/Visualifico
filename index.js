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

var express = require('express');

var app = express();

var Orchestrator = require('./routes/Orchestrator.js');

var logger = require("./routes/logger.js");

var o = new Orchestrator ();

app.set ('port', (process.env.PORT || 5000));
app.use (express.static(__dirname + '/public'));

// Set our default template engine to "jade"
app.set('view engine', 'jade');

app.get('/', function(request, response) {

	response.sendfile(__dirname + '/public/home.html');
});

app.get('/getMeasureByDimensionData', function(req, res) {

	res.setHeader('Content-Type', 'application/json');
/*	
	 logger.log (req.query.collection);
	 logger.log (req.query.dim);
	 logger.log (req.query.measure);
	 logger.log (req.query.top);
	 logger.log (req.query.filters);
*/	 
	if (checkParameters (req)  && req.query.measure) {
		
		logger.log ("getMeasureByDimensionData: parameters ok");
		
		var filters = {};
		
		if (req.query.filters) {
		
			filters = JSON.parse(decodeURI(req.query.filters));
			
			logger.log ("getMeasureByDimensionData: filters_strings = " + filters);
			
		}
		var measure = JSON.parse(req.query.measure);
		
		var measures = measure.measures ? measure.measures : measure;
	
		o.getMeasureByDimensionData (
			res, req.query.collection, req.query.dimselection, req.query.dim, measures, req.query.attributelist ? req.query.attributelist : "NA", filters,

			function (response) {

				res.json (response);
			});

					
	}
	else
		res.json ({
			"response": {},
			"domain": [],
			"error": "wrong parameters"});
		
});

app.get('/getAttributeValues', function(req, res) {

	res.setHeader('Content-Type', 'application/json');
 
	if (checkParameters (req)) {
		
		logger.log ("getAttributeValues: parameters ok");
		
		var filters = {};
		
		if (req.query.filters) {
		
			filters = JSON.parse(req.query.filters);
			
			logger.log ("getAttributeValues: filters_strings = " + filters);
			
		}
		
		
		o.getAttributeValues (
			res, req.query.collection, req.query.dimselection, req.query.dim, filters,
			function (response) {
				res.json (response);
			});			
	}
	else
		res.json ({
			"response": {},
			"domain": [],
			"error": "getAttributeValues - wrong parameters"});
		
});
/*
app.get('/getStackedMeasureByDimensionData', function(req, res) {

	res.setHeader('Content-Type', 'application/json');
 
	if (checkParameters (req) && req.query.stackedDim) {
		
		logger.log ("getBarChartData: parameters ok");
		
		var filters = {};
		
		if (req.query.filters) {
		
			filters = JSON.parse(req.query.filters);
			
			logger.log ("getBarChartData: filters_strings = " + filters);

		}
		
		var measure = JSON.parse(req.query.measure);
		
		var measures = measure.measures ? measure.measures : measure;
		
		o.getStackedMeasureByDimensionData (
			res, req.query.collection, req.query.dim, req.query.stackedDim, measures, req.query.top ? req.query.top : -1, filters,
			function (response) {
				res.json (response);
			});			
	}
	else
		res.json ({
			"response": {},
			"domain": [],
			"error": "wrong parameters"});
		
});*/

app.listen(app.get('port'), function() {

	console.log("Plannifico app is running at localhost:" + app.get('port'));
});

function checkParameters (req) {

	console.log(JSON.stringify (req.query));

	if 	((req.query.collection) && 
		 (req.query.dimselection) && 
		 (req.query.dim)) return true;
	else
		return false;
}
