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
	
	this.getMeasureByDimensionDBData = function (_collection, _dim_selection, _dim, _measures, _attribute_list, _filters, callback) {
	
		logger.log ("Orchestrator::getMeasureByDimensionDBData");
	
		MongoClient.connect (config.db.uristring, function (err, db) {
		
			if (err) logger.log ("Orchestrator::getMeasureByDimensionDBData err " + err);
		
			if (!err) {


				var collection = db.collection (_collection);

				logger.log ("Orchestrator::getMeasureByDimensionDBData collection " + collection);
				
				if (collection) {	
					
					logger.log ("Orchestrator::getMeasureByDimensionDBData filters " + _filters);	
				
					//console.log(_dim_selection);
				
					var keyf_func = new Function('doc', 'return ' + decodeURI(_dim_selection));
					
					var reduce = "function( curr, result ) { ";
					
					var init = {};
					
					for (var measure in _measures) {

						var m_name = _measures [measure].split(".");
					
						if (_attribute_list != 'NA')

							reduce += "result['" + _measures [measure] + "']" + 
								" += curr."+ _measures [measure] + 
								" ? parseFloat (curr."+ _measures [measure] + ") : 0; ";

						else
		
							reduce += "result['" + _measures [measure] + "']" + 
								" += curr."+ _measures [measure] + 
								" ? parseFloat (curr."+ _measures [measure] + ") : 0; ";
						
						init [_measures [measure]] = 0;
					}
					
					reduce += "};";	
									
					collection.group (keyf_func, _filters, init, reduce, 
					
						function (err, chart_data) {
					
							if (err) logger.log ("Orchestrator::getStackedChartDBData error during group-by: " + err);
							
							var domains = {};

							for (var row_idx in chart_data) {

								for (dimidx in chart_data [row_idx]) {
						
									var is_measures = false;

									for (var measure in _measures) if (_measures [measure] == dimidx) is_measures = true;

									if (is_measures) continue;
									
									if(!domains [dimidx]) domains [dimidx] = [];
									
									domains [dimidx].push (chart_data[row_idx] [dimidx] + "");
								}
							}
							
							callback ({"result": chart_data, "domains": domains});
							
							db.close ();												
						}
					);
				}
				else 
					callback ({});
			}
		});
	}
	
	this.getStackedMeasureByDimensionDBData = function (_collection, _dim, _stacked_dim, _measures, _filters, callback) {
	
		logger.log ("Orchestrator::getStackedMeasureByDimensionDBData");
	
		MongoClient.connect (config.db.uristring, function (err, db) {
		
			if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData err " + err);
		
			if (!err) {
			
				var collection = db.collection (_collection);

				logger.log ("Orchestrator::getStackedMeasureByDimensionDBData collection " + collection);
				
				if (collection) {				
										
					logger.log ("Orchestrator::getStackedMeasureByDimensionDBData filters " + JSON.stringify (_filters));
					
					var selection = {};
					
					selection [_dim.selector] = 1;
					selection [_stacked_dim.selector] = 1;
					
					var reduce = "function( curr, result ) { ";
					
					var init = {};
					
					for (var measure in _measures) {
					
						reduce += "result.key = [curr."+_dim +",curr." + _stacked_dim + "]; "+
								  "result." + _measures [measure].name + " += curr."+ _measures [measure].selector + " ? curr."+ _measures [measure].selector +" : 0; ";
						init [_measures [measure]] = 0;
					}
					
					reduce += "};";

					logger.log ("Orchestrator::getStackedMeasureByDimensionDBData selection " + JSON.stringify (selection));
					
					collection.group (selection, _filters, init, reduce, 
					
						function (err, chart_data) {
					
							if (err) logger.log ("Orchestrator::getStackedMeasureByDimensionDBData error during group-by: " + err);
					
							logger.log ("Orchestrator::getStackedMeasureByDimensionDBData collection find ok " + JSON.stringify (chart_data));
							var selection = {};							
							selection [_dim] = 1;

							var reduce = "function( curr, result ) { ";
					
							var init = {};
				
							for (var measure in _measures) {
				
								reduce += "result." + _measures [measure].name + " += curr."+ _measures [measure].selector + " ? curr."+ _measures [measure].selector +" : 0; ";
								init [_measures [measure]] = 0;
							}
				
							reduce += "};";
							
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
	
	this.getMeasureByDimensionData = function (_res, _collection, _dimselection, _dim, _measure, _attribute_list, _filters, callback) {
	
		logger.log ("Orchestrator::getMeasureByDimensionData");
	
		this.getMeasureByDimensionDBData (_collection, _dimselection, _dim, _measure, _attribute_list, _filters, function (chart_data) {
						
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



