/*--------------------------------------------------------------------------
* Visualifico
* ver 0.1.0.0 (December 2014)
*
* created and maintained by Alfano Rosario <ro.alfano@gmail.com>
*--------------------------------------------------------------------------*/

var MongoClient = require('mongodb').MongoClient;
var config = require("../models/config.js");
var logger = require("./logger.js");
var fs = require("fs");
var crossfilter = require("crossfilter");

module.exports = function Orchestrator () {
	
	
	
	this.getMeasureByDimensionDBData = function (_collection, _dim, _measure, _filters, callback) {
	
		logger.log ("Orchestrator::getMeasureByDimensionDBData");
	
		MongoClient.connect (config.db.uristring, function (err, db) {
		
			if (err) logger.log ("Orchestrator::getMeasureByDimensionDBData err " + err);
		
			if (!err) {
			
				var collection = db.collection (_collection);

				logger.log ("Orchestrator::getMeasureByDimensionDBData collection " + collection);
				
				if (collection) {	
					
					logger.log ("Orchestrator::getMeasureByDimensionDBData filters " + JSON.stringify (_filters));
					
					var selection = {};
					
					selection [_dim] = 1;
					
					var reduce = "function( curr, result ) {result.measure += curr. "+ _measure +";};"
										
					collection.group (selection, _filters, {"measure":0}, reduce, 
					
						function (err, chart_data) {
					
							if (err) logger.log ("Orchestrator::getStackedChartDBData error during group-by: " + err);					
								
							collection.distinct (_dim,_filters, function (err, domain) {
							
								if (err) logger.log ("Orchestrator::getStackedChartDBData error during domain collection: " + err);
														
								callback ({"result": chart_data, "domain": domain});
								db.close ();								
								
							});							
																					
						}
					);
				}
				else 
					callback ({});
			}
		});
	}
	
	this.getStackedMeasureByDimensionDBData = function (_collection, _dim, _stacked_dim, _measure, _filters, callback) {
	
		logger.log ("Orchestrator::getStackedMeasureByDimensionDBData");
	
		MongoClient.connect (config.db.uristring, function (err, db) {
		
			if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData err " + err);
		
			if (!err) {
			
				var collection = db.collection (_collection);

				logger.log ("Orchestrator::getStackedMeasureByDimensionDBData collection " + collection);
				
				if (collection) {				
										
					logger.log ("Orchestrator::getStackedMeasureByDimensionDBData filters " + JSON.stringify (_filters));
									
					/*var selection = [];
					
					selection.push (_dim);
					selection.push (_stacked_dim);
					*/
					
					var selection = {};
					
					selection [_dim] = 1;
					selection [_stacked_dim] = 1;
					
					var reduce = "function( curr, result ) {result.key=[result."+ _dim +",result." + _stacked_dim + "];result.measure += curr. "+ _measure +";};"
										
					collection.group (selection, _filters, {"measure":0}, reduce, 
					
						function (err, chart_data) {
					
							if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData error during group-by: " + err);
					
							//logger.log ("Orchestrator::getStackedMeasureByDimensionDBData collection find ok " + JSON.stringify (chart_data));
							var selection = {};							
							selection [_dim] = 1;
							
							var reduce = "function( curr, result ) {result.measure += curr. "+ _measure +";};";

							collection.group (selection, _filters, {"measure":0}, reduce,
							
								function (err, group_by_dim_data) {
					
									if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData error during group-by: " + err);
								
									collection.distinct (_dim,_filters, function (err, domain) {
									
										if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData error during domain collection: " + err);
									
										collection.distinct (_stacked_dim, _filters, function (err, stacked_domain) {
									
											if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData error during domain collection: " + err);
									
											callback ({"result": chart_data, "groupByDim": group_by_dim_data, "domain": domain, "stackedDomain": stacked_domain});
											db.close ();
										
										});
									
									});
								
								}
							);							
						}
					);
				}
				else 
					callback ({});
			}
		});
	}
	
	this.getMeasureByDimensionData = function (_res, _collection, _dim, _measure, _top, _filters, callback) {
	
		logger.log ("Orchestrator::getMeasureByDimensionData");
	
		this.getMeasureByDimensionDBData (_collection, _dim, _measure, _filters, function (chart_data) {
						
			callback ({
				"response": chart_data
			});
		});
	}
	
	this.getStackedMeasureByDimensionData = function (_res, _collection, _dim, _stacked_dim, _measure, _top, _filters, callback) {
	
		logger.log ("Orchestrator::getStackedMeasureByDimensionData");
	
		this.getStackedMeasureByDimensionDBData (_collection, _dim, _stacked_dim, _measure, _filters, function (chart_data) {
			
			callback ({
				"response": chart_data
			});
		});
	}
}



