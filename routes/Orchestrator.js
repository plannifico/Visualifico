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

var MongoClient = require('mongodb').MongoClient;
var config = require("../models/config.js");
var logger = require("./logger.js");

module.exports = function Orchestrator () {	
	
	this.getMeasureByDimensionDBData = function (_collection, _dim, _measures, _filters, callback) {
	
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
					
					var reduce = "function( curr, result ) { ";
					
					var init = {};
					
					for (var measure in _measures) {
					
						reduce += "result." + _measures [measure] + " += curr."+ _measures [measure] + "; ";
						init [_measures [measure]] = 0;
					}
					
					reduce += "};";	
					
					logger.log ("Orchestrator::getStackedChartDBData reduce: " + reduce);	
					
					collection.group (selection, _filters, init, reduce, 
					
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
					
					var selection = {};
					
					selection [_dim] = 1;
					selection [_stacked_dim] = 1;
					
					var reduce = "function( curr, result ) {result.key=[result." + _dim + ",result." + _stacked_dim + "];result." + _measure + " += curr. "+ _measure +";};"
					var init = {};
					init [_measure] = 0;
					
					collection.group (selection, _filters, init, reduce, 
					
						function (err, chart_data) {
					
							if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData error during group-by: " + err);
					
							//logger.log ("Orchestrator::getStackedMeasureByDimensionDBData collection find ok " + JSON.stringify (chart_data));
							var selection = {};							
							selection [_dim] = 1;
							
							var reduce = "function( curr, result ) {result." + _measure + " += curr. "+ _measure +";};";
							var init = {};
							init [_measure] = 0;
							collection.group (selection, _filters, init, reduce,
							
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



