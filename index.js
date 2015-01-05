/*--------------------------------------------------------------------------
* Visualifico
* ver 0.1.0.0 (December 2014)
*
* created and maintained by Alfano Rosario <ro.alfano@gmail.com>
*--------------------------------------------------------------------------*/

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
	if (checkParameters (req)) {
		
		logger.log ("getMeasureByDimensionData: parameters ok");
		
		var filters = {};
		
		if (req.query.filters) {
		
			filters = JSON.parse(req.query.filters);
			
			logger.log ("getMeasureByDimensionData: filters_strings = " + filters);
			/*
			if ((filters_strings) && (filters_strings.length != 0)) {
			
				filters_strings.forEach (function (filter_str) {
					logger.log ("getBarChartData: filter_str = " + filter_str);
					filters.push (JSON.parse(filter_str));
					
				});
			}*/
		}
		
		o.getMeasureByDimensionData (
			res, req.query.collection, req.query.dim, req.query.measure, req.query.top ? req.query.top : -1, filters,
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

app.get('/getStackedMeasureByDimensionData', function(req, res) {

	res.setHeader('Content-Type', 'application/json');
 
	if (checkParameters (req) && req.query.stackedDim) {
		
		logger.log ("getBarChartData: parameters ok");
		
		var filters = {};
		
		if (req.query.filters) {
		
			filters = JSON.parse(req.query.filters);
			
			logger.log ("getBarChartData: filters_strings = " + filters);
			/*
			if ((filters_strings) && (filters_strings.length != 0)) {
			
				filters_strings.forEach (function (filter_str) {
					logger.log ("getBarChartData: filter_str = " + filter_str);
					filters.push (JSON.parse(filter_str));
					
				});
			}*/
		}
		
		o.getStackedMeasureByDimensionData (
			res, req.query.collection, req.query.dim, req.query.stackedDim, req.query.measure, req.query.top ? req.query.top : -1, filters,
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

app.listen(app.get('port'), function() {

	console.log("Plannifico app is running at localhost:" + app.get('port'));
});

function checkParameters (req) {

	if ((req.query.collection) && 
		 (req.query.dim) && 
		 (req.query.measure) && 
		 (
			(!req.query.top) ||
		 
			((req.query.top) &&
			(!isNaN(req.query.top)))
		
		)) return true;
	else
		return false;
}