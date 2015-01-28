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

var clientConfiguration = {};
clientConfiguration.url = "http://localhost:5000/";

function EventDispatcher () {

	this.listeners = [];
};

EventDispatcher.prototype.dispatch = function (event) {

	//console.log ("EventDispatcher::dispatch " + JSON.stringify (event));
	
	this.listeners.forEach (function (listener) {
	
		console.log("listener.getId() " + listener.id);
	
		if (listener.id == event.chartid) return;
		
		listener.listener.notifyEvent (event);
	});
};

EventDispatcher.prototype.addListener = function (listener) {

	//console.log ("EventDispatcher::addListener " + JSON.stringify (listener));

	this.listeners.push ({"id": listener.getId (), "listener": listener});
	
	//console.log ("EventDispatcher::addListener " + this.listeners.length);
};

/*
	<<Abstract>> An object capable to load data

	Abstract Methods:
		* getURL
		* setResponse
*/
function DataLoader () {};

DataLoader.prototype.loadData = function (parameters, callback) {
	
	var _this = this;
	
	var filters = {};
	
	if (parameters.filters)
		filters = parameters.filters;
	else {
			
		filters = this.defaultFilters;	
	}
	this.currentFilters = JSON.parse( JSON.stringify(filters));
	
	this.currentTop = parameters.top;

	//console.log(encodeURI(this.dimensionSelection));

	var url = this.getURL (filters);

	if (url) {
	
		console.log ("DataLoader::loadData url = " + decodeURI(url));
	
		d3.json(url
			, function (error, data) {

		
			if (error) {
				console.log ("DataLoader::loadData error - " + error);
				return;
			}
			//console.log ("DataLoader::loadData data - " + JSON.stringify (data));
			
			_this.setResponse (data);
			
			callback ({"feedback": "ok"});			
		})
	} else
		callback ({"feedback": "error", "error": "missing parameters!"})
}

/*
	<<Abstract>> A Widget capable to manage interactions (selections)

	Abstract Methods:
		* draw
*/
function DrawableWidget () {};

DrawableWidget.prototype = new DataLoader ();

DrawableWidget.prototype.show = function (parameters) {

	var _this = this;

	this.loadData (parameters,
	
		function (response) {	
		
			if (response.feedback == "ok")
				_this.draw ();
				
			else if (response.feedback == "error")
				console.error ("DrawableWidget::show Error: " + response.error);
	});
	
	return this;
}

DrawableWidget.prototype.returnColor = function (d) {
	
	//console.log ("color (this.getKey(d)) " + this.colorScale (this.getKey(d))); 
	
	if (this.useCategoryColors) return this.colorScale (this.getKey(d));	
	
	return this.defaultColor;
}



/*<<Abstract>> A Widget capable to manage interactions (selections)*/

function InteractiveWidget () {};

InteractiveWidget.prototype = new DrawableWidget ();

InteractiveWidget.prototype.getId = function () {

	return this.containerId;
}

InteractiveWidget.prototype.notifyEvent = function (event) {

	console.log ("InteractiveWidget::notifyEvent event = " + JSON.stringify (event));
	console.log ("InteractiveWidget::notifyEvent this.currentFilters [$where] = " + JSON.stringify (this.currentFilters ["$where"]));

	//Qui errore: l'evento non ha selected ma c'e' una selezione da altri grafici
	if (event.selected.length > 0) {

		//Selected elements already exists
		for (var sel_idx in event.selection) {
			
			if ((this.currentFilters [sel_idx]) && 
				((!this.defaultFilters [sel_idx]) || this.defaultFilters [sel_idx].disabled)) {
				
				//Selected elements on the given dimension already exists
				//this.currentFilters [sel_idx] ["$in"].push (event.selection [sel_idx]);
				
				if (event.action == "added") {

					if (sel_idx == "$where") {						

						this.currentFilters ["$where"] = event.selection [sel_idx] /*+ " && " + (this.currentFilters ["$where"] ? this.currentFilters ["$where"] : "true")*/;
					}
					else {
				
						( typeof event.selection [sel_idx] === 'string' ) ?					
							this.currentFilters [sel_idx] ["$in"].push (event.selection [sel_idx]) :	
							this.currentFilters [sel_idx] ["$in"].push.apply (event.selection [sel_idx]);	

					}					
				}
				else if  (event.action == "removed") {

					if (sel_idx == "$where") {

						console.log ("InteractiveWidget::notifyEvent this.currentFilters [$where] = " + this.currentFilters ["$where"]);
						console.log ("InteractiveWidget::notifyEvent event.selection [sel_idx] = " + event.selection [sel_idx]);

						this.currentFilters ["$where"] = event.selection [sel_idx];
						
					}
					else if ( typeof event.selection [sel_idx] === 'string' ) {


						var idx = this.currentFilters [sel_idx] ["$in"].indexOf (event.selection [sel_idx]);					
						this.currentFilters [sel_idx] ["$in"].splice (idx,1);
						
					} else {

						event.selection [sel_idx].forEach (function (element) {

							var idx = this.currentFilters [sel_idx] ["$in"].indexOf (element);					
							this.currentFilters [sel_idx] ["$in"].splice (idx,1);
						});						
					}
				}
			}
			else {
				//Selected elements does not exist on the given dimension

				if (sel_idx == "$where") {
					
					this.currentFilters ["$where"] = event.selection [sel_idx];
				}
				else
					this.currentFilters [sel_idx] = ( typeof event.selection [sel_idx] === 'string' ) ? {"$in":[event.selection [sel_idx]]} : {"$in": event.selection [sel_idx]} ;	

				if (this.defaultFilters [sel_idx]) this.defaultFilters [sel_idx].disabled = true;
			}
		}
	}
	else {
		//console.log ("VisualificoChart::notifyEvent selected empty " + this.defaultFilters [sel_idx]);	
		for (var sel_idx in event.selection) {
		
			//console.log ("this.defaultFilters [sel_idx] " + this.defaultFilters [sel_idx]);		
			if (this.defaultFilters [sel_idx])	{	
				
				delete this.defaultFilters [sel_idx].disabled;
				
				//A default filter is defined on the same dimension. Set back the default filter
				this.currentFilters [sel_idx] = 
					JSON.parse( JSON.stringify( this.defaultFilters [sel_idx] ) );
				
				
			}
			else if (sel_idx == "$where")
				delete this.currentFilters ["$where"];
			else
				delete this.currentFilters [sel_idx];
		}
	}
	
	console.log ("InteractiveWidget::notifyEvent this.currentFilters  " + JSON.stringify (this.currentFilters));
	
	var _this = this;
	
	this.loadData (
		{ 
			"filters": this.currentFilters
		}, 
		function (response) {
			
			if (response.feedback == "ok")
				_this.update ();
				
			else if (response.feedback == "error")
				console.error ("InteractiveWidget::show Error: " + response.error);
			
		}
	);
}

InteractiveWidget.prototype.getSelectedKey = function (d) {

	return this.getKey (d);
}

InteractiveWidget.prototype.getSelection = function (d) {

	var selection = {};
	var _this = this;
	
	if (this.selectionWhere) {

		selection ["$where"] = "";

		this.selected.forEach (function (already_selected) {

			//console.log ("InteractiveWidget::getSelection already_selected: " + already_selected);
			selection ["$where"] += _this.selectionWhere.replace ("<selected>", already_selected) + " || ";
		});

		selection ["$where"] = selection ["$where"].substr(0, selection ["$where"].length - 4)

	}
	else
		selection [this.selectorAttribute] = d.selectorValue;

	//console.log ("InteractiveWidget::getSelection " + JSON.stringify(selection));

	return selection;
}

InteractiveWidget.prototype.addInteraction = function (elements) {

	
	var _this = this;
	
	//this.color = d3.scale.category20c();
	var action = "";
	
	elements.on("click", function (d) {
		
		console.log ("InteractiveWidget::addInteraction click  " + JSON.stringify (d));

		if ((_this.selected.length > 0) && (_this.selected.indexOf (_this.getSelectedKey (d)) >= 0)) {
			//The clicked element is already selected: delete the selection
			var idx = _this.selected.indexOf (_this.getSelectedKey (d));
			
			_this.selected.splice (idx,1);
			
			action = "removed";
			_this.updateSelection ();
			
			
		} else {				

			//The clicked element is not selected
			_this.selected.push (_this.getSelectedKey (d));								
			action = "added";
			_this.updateSelection ();					
			
		}
		
		_this.dispatcher.dispatch ({
			"chartid": _this.containerId, 
			"dimension" : _this.dimension, 
			"selected" : _this.selected, 
			"selection": _this.getSelection (d),
			"action": action
		});			
	})
	.on("mouseover", function() {
		
		if (_this.selected.length > 0) return;
		
		d3.select(this)
			.transition()
			.duration(250)
			.attr("fill", _this.highlightColor);
	})
	.on("mouseout", function(d,i) {
	
		if (_this.selected.length > 0) return;

		d3.select(this)
			.transition()
			.duration(250)
			.attr("fill", function (d,i) {return _this.returnColor (d)});
	});
}

InteractiveWidget.prototype.updateShapeSelection = function (shape) {

	var color = d3.scale.category20c();
	
	var _this = this;
	
	if (this.selected.length == 0) {
	
		this.svg.selectAll (shape)
			.data (this.group)
			.attr("fill", function (d) {return _this.returnColor(d, color)});	
	} else {
	
		this.svg.selectAll (shape)
			.data (this.group)
			.attr("fill", function (d,i) {

				if (_this.selected.indexOf(_this.getSelectedKey (d)) >= 0)
					return _this.selectionColor;
				else
					return "rgb(191,191,191)";
			}); 
	}	
}

/*A widget that allows to select attributes*/
function AttributeSelectiorWidget (__container_id, __get_attribute, __dispatcher, __query, __parameters)  {

	this.containerId = __container_id;
	
	this.currentData = {};
	
	//Parameters:
	this.h = __parameters.height;
	this.w = __parameters.width;
	
	this.collection = __query.collection;
	this.dimension = __query.attribute;
	this.dimensionSelection = __query.attributeSelector;
	this.defaultFilters = __query.defaultFilters;
	
	this.defaultColor = __parameters.defaultColor ? __parameters.defaultColor : "rgb(85, 142, 213)";
	this.useCategoryColors = __parameters.useCategoryColors ? __parameters.useCategoryColors : false;
	this.highlightColor = __parameters.highlightColor ? __parameters.highlightColor : "rgb(228,108,10)";
	this.selectionColor = __parameters.selectionColor ? __parameters.selectionColor : "rgb(31,73,125)";

	this.selectionWhere = __parameters.selectionWhere;
	
	this.dispatcher = __dispatcher;
	
	this.getAttribute = __get_attribute;
	this.getKey = __get_attribute;
	
	this.selected = [];

	this.call = "getAttributeValues";

	this.cols = __parameters.cols ? __parameters.cols : 5;

	this.colorScale = d3.scale.category20();
};

AttributeSelectiorWidget.prototype = new InteractiveWidget ();

AttributeSelectiorWidget.prototype.getURL = function (filters) {

	if (this.collection && this.dimension) {
	
		var url = clientConfiguration.url + this.call +  
			"?collection=" + this.collection +
			"&dim=" + this.dimension +
			"&dimselection=" + encodeURIComponent (this.dimensionSelection) +
			(this.currentFilters ? "&filters=" + encodeURIComponent (JSON.stringify(filters)): "{}");
	
		//console.log ("AttributeSelectiorWidget::getURL " + url);

		return url;
	}
}

AttributeSelectiorWidget.prototype.setResponse = function (data) {

	this.oldGroup = this.group;
	this.group = data.response.result;	

	//console.log ("AttributeSelectiorWidget::setResponse " + JSON.stringify (data.response));

	this.domain = data.response.domain;


	var rows_num = this.domain.length / this.cols;

	this.rows = [];
	this.rows [0] = [];

	var col_idx = 0, row_idx = 0;

	this.rowsMap = {};
	
	for (var idx = 0; idx < this.domain.length; idx++) {

		if (col_idx == (this.cols)) {

			//goto next row

			col_idx = 0;
			row_idx++;

			this.rows [row_idx] = [];
		}

		this.rows [row_idx] [col_idx] = this.domain [idx];

		this.rowsMap [this.domain [idx]] = {};
		this.rowsMap [this.domain [idx]].rowIdx = row_idx;
		this.rowsMap [this.domain [idx]].colIdx = col_idx;

		col_idx++;
	}

	this.rows = row_idx+1;

	this.barWidth = this.w / this.cols;
	this.barHeight = this.h / this.rows;

	/*console.log ("AttributeSelectiorWidget::setResponse this.rowsMap " + JSON.stringify (this.rowsMap));

	console.log ("AttributeSelectiorWidget::setResponse this.barWidth " + this.barWidth);
	console.log ("AttributeSelectiorWidget::setResponse this.barHeight " + this.barHeight);*/
}

AttributeSelectiorWidget.prototype.draw = function () {

	//console.log ("AttributeSelectiorWidget::draw");

	var _this = this;

	var svg = d3.select ("#" + this.containerId).append ("svg");

	this.svg = svg;

	var h = this.h;
	var w = this.w;				

	svg.attr ("width", w);
	svg.attr ("height", h);

	
	var shapes = this.addShapes ("rect");
	
	this.addInteraction (shapes);

	var texts = svg.selectAll (".selector-text")
		.data (this.group)
		.enter ()
		.append ("text");

	this.drawTextLabels (texts);

}

AttributeSelectiorWidget.prototype.getXScale = function () {
	
	var x_scale = d3.scale.ordinal ();	
	
	if ((this.domain.length > 0) && (!isNaN (this.domain)[0])) {
	
		x_scale.domain (d3.range (this.cols));		
		x_scale.rangeBands ([0, this.w]);
	}
	return x_scale;
}

AttributeSelectiorWidget.prototype.getYScale = function () {
	
	var y_scale = d3.scale.ordinal ();	
	
	if ((this.domain.length > 0) && (!isNaN (this.domain)[0])) {
	
		y_scale.domain (d3.range (this.rows));		
		y_scale.rangeBands ([0, this.h]);
	}
	return y_scale;
}

AttributeSelectiorWidget.prototype.getX = function (d, scale) {

	return scale (this.rowsMap [this.getAttribute (d)].colIdx);
}

AttributeSelectiorWidget.prototype.getY = function (d, scale) {

	/*console.log ("AttributeSelectiorWidget.getY " + this.getAttribute (d));
	console.log ("AttributeSelectiorWidget.getY " + this.rowsMap [this.getAttribute (d)].rowIdx);
	console.log ("AttributeSelectiorWidget.getY " + scale (this.rowsMap [this.getAttribute (d)].rowIdx));
	*/
	return scale (this.rowsMap [this.getAttribute (d)].rowIdx);
}

AttributeSelectiorWidget.prototype.getWidth = function (d, scale) {

	return this.barWidth;
}

AttributeSelectiorWidget.prototype.getHeight = function (d, scale) {

	return this.barHeight;
}

AttributeSelectiorWidget.prototype.addShapes = function () {

	var new_bars = this.svg.selectAll ("rect")
		.data (this.group)
		.enter ()		
		.append ("rect")
		;

	var _this = this;

	var x_scale = this.getXScale ();		
	var y_scale = this.getYScale ();

	var bars = this.drawShapes (new_bars);
	
	bars.transition ().delay(200).ease ("elastic")
		.attr ("x", function (d) {

			return _this.getX (d, x_scale);
		})
		.attr ("y", function (d) {

			return _this.getY (d, y_scale);
		})	
		.attr ("width", function (d) {
	
			return _this.getWidth (d, x_scale);			
		})
		.attr ("height", function (d) {
			
			return _this.getHeight (d, y_scale);			
		});
	
	
	return bars;
}

AttributeSelectiorWidget.prototype.drawShapes = function (shapes) {

	var _this = this;
	
	var x_scale = this.getXScale ();		
	var y_scale = this.getYScale ();

	shapes
		.attr("fill", function (d,i) {

			return _this.returnColor (d);
		})/*
		.append("svg:title")
		.text(function (d,i) {

			return _this.getToolTip (d);
		})*/;
		
	return shapes;
}

AttributeSelectiorWidget.prototype.drawTextLabels = function (texts) {

	var _this = this;

	var y_scale = this.getYScale ();
	
	var x_scale = this.getXScale ();
	
	texts.attr("class", "selector-text")
	.attr("text-anchor", "middle")
		.attr("x", function(d) {

			return _this.getX (d, x_scale) + (_this.getWidth (d, x_scale)/2);
		})
		.attr("y", function(d) {
		
			return _this.getY (d, y_scale) + (_this.getHeight (d, y_scale)/2);
		})
		.text (function (d) {
		
			return _this.getAttribute (d);
		});	
}

AttributeSelectiorWidget.prototype.updateSelection = function () {

	this.updateShapeSelection ("rect");
}

/*<<Abstract>> A basic Visualifico Chart*/
function VisualificoChart () {};

VisualificoChart.prototype = new InteractiveWidget ();



VisualificoChart.prototype.initChart = function (container_id, get_value, get_key, dispatcher, query, parameters, call) {

	this.url = "http://localhost:5000/";
	this.call = call; 

	this.containerId = container_id;
	
	this.currentData = {};
	
	//Parameters:
	this.h = parameters.height;
	this.w = parameters.width;
	
	this.collection = query.collection;
	this.dimension = query.dimension;
	this.dimensionSelection = query.dimensionSelection;
	this.measure = query.measure;	
	this.defaultFilters = query.defaultFilters;
	
	this.defaultColor = parameters.defaultColor ? parameters.defaultColor : "rgb(85, 142, 213)";
	
	this.useCategoryColors = parameters.useCategoryColors ? parameters.useCategoryColors : false;
	
	this.showXAxisLabel = parameters.showXAxisLabel ? parameters.showXAxisLabel : false;
	
	this.highlightColor = parameters.highlightColor ? parameters.highlightColor : "rgb(228,108,10)";
	
	this.selectionColor = parameters.selectionColor ? parameters.selectionColor : "rgb(31,73,125)";
	
	this.numberOfXTicks = parameters.numberOfXTicks ? parameters.numberOfXTicks : 5;
	
	this.numberOfYTicks = parameters.numberOfYTicks ? parameters.numberOfYTicks : 5;

	this.selectorAttribute = parameters.selectorAttribute ? parameters.selectorAttribute : query.dimension;
	this.selectionWhere = parameters.selectionWhere;
	this.listSelector = parameters.listSelector ? parameters.listSelector : false;
	
	this.xLabel = ((parameters.xLabel) ? parameters.xLabel : "");
	this.yLabel = ((parameters.yLabel) ? parameters.yLabel : "");

	this.rotateXLabels = ((parameters.rotateXLabels) ? parameters.rotateXLabels : 0);

	this.showXGridlines = parameters.showXGridlines ? parameters.showXGridlines : false;
	this.showYGridlines = parameters.showYGridlines ? parameters.showYGridlines : false;
	
	this.dispatcher = dispatcher;
	
	this.getKey = get_key;
	this.getValue = get_value;
	
	this.getDataLabel = this.getValue;
	
	this.selected = [];

	this.colorScale = d3.scale.category20();
}

VisualificoChart.prototype.getTopMargin = function () {

	return 10;
}

VisualificoChart.prototype.getBottomMargin = function () {
	
	var get_key = this.getKey;

	return this.rotateXLabels ? d3.max (this.group, function (d) { return get_key(d).length * 6; }) : 30;
}

VisualificoChart.prototype.getMaxYLabel = function () {

	/*var get_key = this.getKey;
	return d3.max (this.group, function (d) { return get_key(d).length; });*/
	return 0;
}

VisualificoChart.prototype.getLeftMargin = function (max_y_label) {

	return 85 + (max_y_label * 4);
}

VisualificoChart.prototype.getRightMargin = function () {
	
	return ((this.legendDataset) ? 30 : 10);
}

VisualificoChart.prototype.getYAxisMargin = function () {

	return 40;
}

VisualificoChart.prototype.getURL = function (filters) {

	if (this.collection && this.dimension && this.measure) {
	
		var url = this.url + this.call +  
			"?collection=" + this.collection +
			"&dimselection=" + encodeURIComponent (this.dimensionSelection) +
			"&dim=" + this.dimension +
			(this.stackedDimension ? "&stackedDim=" + this.stackedDimension : "") +
			"&measure=" + this.measure +
			(this.currentFilters ? "&filters=" + encodeURIComponent (JSON.stringify(filters)): "{}");
	
		return url;
	}
}

VisualificoChart.prototype.setResponse = function (data) {

	this.oldGroup = this.group;
	this.group = data.response.result;
	this.domain = data.response.domains [this.dimension];
}

VisualificoChart.prototype.drawLegend = function () {

	//console.log ("BarChart::drawLegend " + JSON.stringify (this.legendDataset));

	var _this = this;

	var legend = this.svg.append("g")
		.attr("class", "legend")
		.attr("x", this.w - 85)
		.attr("y", 25)
		.attr("height", 100)
		.attr("width", 100);
		
	legend.selectAll('rect')
		.data (this.legendDataset)
		.enter()
		.append("rect")
		.attr("class", "legend-box")
		.attr("x", this.w - 85)
		.attr("y", function(d, i){ return (i *  20) + 10;})
		.attr("width", 10)
		.attr("height", 10)
		.style("fill", function(d) { 
		
			 return _this.colorScale (d [_this.stackedDimension]);	
		});
		
	legend.selectAll('text')
		.data (this.legendDataset)
		.enter()
		.append("text")
		.attr("class", "legend-label")
		.attr("x", this.w - 70)
		.attr("y", function(d, i){ return (i *  20) + 20;})
		.text (function(d) { 
		
			 return d [_this.stackedDimension];	
		});
}

VisualificoChart.prototype.updateLegend = function () {

//	console.log ("VisualificoChart::updateLegend");
	
	this.svg.selectAll (".legend-label")
		.remove();

	this.svg.selectAll ("text.legend-label")
		.remove();
		
	this.svg.selectAll ("rect.legend-box")
		.remove();

	this.drawLegend();
}

VisualificoChart.prototype.addXAxis = function (x_scale) {


	var xAxis = d3.svg.axis ()
		.scale (x_scale)
		.orient ("bottom")
		.ticks (this.numberOfXTicks);
		
	var xaxis = this.svg.append("g")
		.attr ("class","axis xaxis")
		.call (xAxis)
		.attr ("transform", "translate(0," + (this.h - this.getBottomMargin () + 5) + ")");
	
	this.xLabelsRotation (xaxis);

	if (this.showXGridlines) this.drawXGridlines (x_scale);
		
	//console.log ("addXAxis append ok");
}

VisualificoChart.prototype.drawXGridlines = function (x_scale) {

	var make_x_axis = function () {        

		return d3.svg.axis()
			.scale(x_scale)
			.orient("bottom")
			.ticks(5);
	};

	this.svg.append("g")
		.attr("class", "grid")
		.attr("transform", "translate(0," + this.h + ")")
		.call(make_x_axis()
		    .tickSize(-this.h, 0, 0)
		    .tickFormat("")
		);
}

VisualificoChart.prototype.xLabelsRotation = function (xaxis) {
	var _this = this;
	
	if (this.rotateXLabels) {		

		xaxis	
			.selectAll("text")  
			.style("text-anchor", "end")
			.attr("dx", "-.5em")
			.attr("dy", ".15em")
			.attr("transform", function(d) {

				return "rotate(" + _this.rotateXLabels + ")" + " translate(-5,-5)"; 
			});
	}
}


VisualificoChart.prototype.addYAxis = function (y_scale) {

	var yAxis = d3.svg.axis ()
		.scale (y_scale)
		.orient ("left")
		.ticks (this.numberOfYTicks);
		
	this.svg.append("g")
		.attr ("class","axis yaxis")
		.attr ("transform", "translate(" + (this.getYAxisMargin () + this.getMaxYLabel() * 5) + ",0)")
		.call (yAxis);

	if (this.showYGridlines) this.drawYGridlines (y_scale);
}

VisualificoChart.prototype.drawYGridlines = function (y_scale) {

	var make_y_axis = function () {        

		return d3.svg.axis()
			.scale(y_scale)
			.orient("left")
			.ticks(5)
	};

	this.svg.append("g")
		.attr("class", "grid")
		.call(make_y_axis()
		    .tickSize(-this.w, 0, 0)
		    .tickFormat("")
		);
}	


VisualificoChart.prototype.drawAxisLabels = function () {

	var legend = this.svg.append("g")
		.attr("class", "x-axis-label")
		.attr("x", (this.w / 2) - 100)
		.attr("y", this.getBottomMargin ())
		.attr("height", 50)
		.attr("width", 200);
		
	legend
		.append("text")
		.attr("class", "x-axis-label-text")
		//.attr("x", (this.w - this.getRightMargin () - this.getLeftMargin (0))/2)
		.attr("x", 5)
		.attr("y", this.h - (this.getBottomMargin () / 2) + 5)
		.text (this.xLabel);
	
}

VisualificoChart.prototype.getToolTip = function (d) {


	return this.dimension + " = " + this.getKey (d) + ", " + JSON.parse(this.measure).measures[0] + " = " + this.getValue (d);
}

VisualificoChart.prototype.drawChartTextLabels = function (prefix, texts) {

	var _this = this;

	var y_scale = this.getYScale ();
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel ()), 
		this.getRightMargin ());
	
	texts.attr("class", prefix + "-text")
		.attr("x", function(d) {

			return _this.getLabelX (d, x_scale);
		})
		.attr("y", function(d) {
		
			return _this.getLabelY (d, y_scale);
		})
		.text(function(d) {
		
			return _this.getDataLabel (d);
		});	
}

VisualificoChart.prototype.drawChart = function (shape, class_prefix) {
	
	var _this = this;

	var svg = d3.select ("#" + this.containerId).append ("svg");
	
	this.svg = svg;			

	svg.attr ("width", this.w);
	svg.attr ("height", this.h);

	var y_scale = this.getYScale ();
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel ()), 
		this.getRightMargin ());
	
	this.addXAxis (x_scale);
	this.addYAxis (y_scale);
	
	var shapes = this.addShapes (shape);
	
	var texts = svg.selectAll ("." + class_prefix + "-text")
		.data (this.group)
		.enter ()
		.append ("text");

	this.drawTextLabels (texts);
	
	if (this.showXAxisLabel) this.drawAxisLabels (texts);
	
	if (this.legendDataset)
		this.drawLegend ();

	return shapes;		
}

VisualificoChart.prototype.updateChart = function (shape, prefix) {
	
	var _this = this;
	var svg = this.svg;
			
	var get_key = this.getKey;
	var get_value = this.getValue;
	
	var x_scale = this.getXScale (this.getLeftMargin (this.getMaxYLabel ()), this.getRightMargin());
	var y_scale = this.getYScale ();

	var xaxis = d3.svg.axis().scale (x_scale).orient("bottom");
	var yAxis = d3.svg.axis().scale (y_scale).orient("left");
	
	xaxis = this.svg.selectAll("g.xaxis.axis")
		.call (xaxis);
		
	this.svg.selectAll("g.yaxis.axis")
		.call (yAxis);
	
	
	this.xLabelsRotation (xaxis);

	
	//Mark the shapes to remove
	if (this.oldGroup) {

		var to_remove = svg.selectAll (shape)
			.data (this.oldGroup)
			.classed ("toremove", true);
	
		to_remove
		.attr ("x", function (d) {
		
			//console.log ("toremove " + JSON.stringify (d));
			//return _this.getX (d, x_scale);
		});	
	}	
	
	//Select the shapes to keep and update
	var shapes_to_update = svg.selectAll (shape)
		.data (this.group)
		.attr ("class", "");
		//.classed ("toremove", function (d){console.log("assignign to remove " + JSON.stringify (d)); return false;});

	//removed the marked shapes
	var to_remove = svg.selectAll (shape + ".toremove");
		//.data (this.oldGroup);		
		
	to_remove
		.attr ("x", function (d) {
		
			//console.log ("removing.... " + JSON.stringify (d));
			//return _this.getX (d, x_scale);
		});	
			
	//Abstract method implemented by specific shapes chart
	this.updateShapesCoordinates (shapes_to_update);
	
	//removed the marked shapes
	var to_remove = svg.selectAll (shape + ".toremove")
		.data (this.oldGroup);		
		
	to_remove
		.attr ("x", function (d) {
		
			//console.log ("removing.... " + JSON.stringify (d));
			//return _this.getX (d, x_scale);
		});	
		
	svg.selectAll (shape + ".toremove")
		.data (this.oldGroup)	
		.remove();	
	
	var shapes = this.addShapes (shape);
	
	this.addInteraction (shapes);
	
	svg.selectAll("." + prefix + "-text")
		.data (this.oldGroup)
		.classed ("toremove", true);
	
	svg.selectAll("." + prefix + "-text")
		.data (this.group)
		.classed ("toremove", false)
		.attr("x", function(d) {
			return _this.getLabelX (d, x_scale);
		})
		.attr("y", function(d) {
			return _this.getLabelY (d, y_scale);
		})
		.text(function(d) {
		
			return _this.getDataLabel(d);
		});
	
	svg.selectAll("." + prefix + "-text.toremove")
		.data (this.oldGroup)
		.remove ();
		
	var texts = svg.selectAll("." + prefix + "-text")
		.data (this.group)
		.enter ()
		.append ("text");
	
	this.drawTextLabels (texts);
	
	this.updateSelection ();
	
	if (this.legendDataset) this.updateLegend();
}

/*A LineChart*/
function LineChart (container_id, get_value, get_key, dispatcher, query, parameters) {

	this.init (container_id, get_value, get_key, dispatcher, query, parameters);

	this.pointSize = parameters.pointSize ? parameters.pointSize : 5;

	return this;
};

LineChart.prototype = new VisualificoChart ();

LineChart.prototype.init = function (container_id, get_value, get_key, dispatcher, query, parameters) {

	this.initChart (container_id, get_value, get_key, dispatcher, query, parameters, "getMeasureByDimensionData");
}

LineChart.prototype.addShapes = function (shape) {

	var new_lines = this.svg.append (shape);

	var _this = this;
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ());
		
	var y_scale = this.getYScale ();

	var lineFunc = d3.svg.line()
		.x(function(d) {
			return x_scale (_this.getKey (d));
		})
		.y(function(d) {
			return y_scale (_this.getValue (d));
		})
		.interpolate('linear');

	new_lines
		.attr('d', lineFunc(this.lineData))
		.attr('stroke', this.returnColor())
		.attr('stroke-width', 2)
		.attr('fill', 'none');

	var points = this.svg.selectAll ("circle")
		.data (this.group)
		.enter ()
		.append ("circle")
		.attr("fill", function (d,i) {

			return _this.returnColor(d);
		})		
		.attr ("cx", function (d) {
					
			return _this.getX (d, x_scale);
		})
		.attr ("cy", function (d) {
		
			return _this.getY (d, y_scale);
		})	
		.attr ("r", function (d) {
			
			return _this.pointSize;	
		})

	points		
		.append("svg:title")
		.text(function (d,i) {

			return _this.getToolTip (d);
		});
	
	return points;
}

LineChart.prototype.updateShapesCoordinates = function (shapes_to_update) {

	var _this = this;
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ()
	);
		
	var y_scale = this.getYScale ();

		
	shapes_to_update
		.attr ("x", function (d) {
		
			//console.log ("updateShapesCoordinates " + JSON.stringify (d));
			return _this.getX (d, x_scale);
		})
		.attr ("y", function (d) {
		
			//console.log ("y = " + _this.getY (d, y_scale));
			return _this.getY (d, y_scale);
		});
		
	return shapes_to_update;
}

LineChart.prototype.drawTextLabels = function (texts) {
	
	this.drawChartTextLabels ("line", texts);
}

LineChart.prototype.draw = function () {
	
	var points = this.drawChart ("svg:path", "line");	
	this.addInteraction (points);
}


LineChart.prototype.update = function () {
	
	console.log ("LineChart::update");
	
	this.updateChart ("svg:path", "line");		
}
	
LineChart.prototype.updateSelection = function () {

	this.updateShapeSelection ("circle");
}

LineChart.prototype.getYScale = function () {
	
	var get_value = this.getValue;
	var y_scale = d3.scale.linear ();

	y_scale.domain ([0, d3.max (this.group, function (d) { return get_value (d); })]);
	y_scale.range ([this.h - this.getBottomMargin (), this.getTopMargin ()]);
	
	return y_scale;
}

LineChart.prototype.getXScale = function (l_padding, right_margin) {
	
	var x_scale = d3.scale.ordinal ();	

	if ((this.domain.length > 0) /*&& (!isNaN (this.domain)[0])*/) {
	
		x_scale.domain (this.domain);		
		x_scale.rangePoints ([this.getLeftMargin (0), this.w - this.getRightMargin ()]);
	}
	return x_scale;
}

LineChart.prototype.getY = function (d, y_scale) {		
	
	var get_value = this.getValue;	
	return y_scale (get_value (d));
}	

LineChart.prototype.getX = function (d, x_scale) {
	
	var get_key = this.getKey;	
	return x_scale (this.getKey (d));
}


LineChart.prototype.getLabelX = function (d, x_scale) {

	return x_scale (this.getKey (d));
}	

LineChart.prototype.getLabelY = function (d, y_scale) {
	
	return y_scale (this.getValue (d)) + 15;
	
	
}	

LineChart.prototype.setResponse = function (data) {

	this.oldGroup = this.group;
	this.group = data.response.result;	


	console.log ("AttributeSelectiorWidget::setResponse " + JSON.stringify (data.response));

	this.domain = data.response.domains [this.dimension];

	this.lineData = this.group;
	/*console.log ("AttributeSelectiorWidget::setResponse this.rowsMap " + JSON.stringify (this.rowsMap));

	console.log ("AttributeSelectiorWidget::setResponse this.barWidth " + this.barWidth);
	console.log ("AttributeSelectiorWidget::setResponse this.barHeight " + this.barHeight);*/
}

/*A Chart based on a draw of a shape (E.g. Bars, Bubbles)*/
function ShapeChart () {};

ShapeChart.prototype = new VisualificoChart ();

ShapeChart.prototype.drawShapes = function (shapes) {

	var _this = this;
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ());
		
	var y_scale = this.getYScale ();

	shapes
		.attr("fill", function (d,i) {

			return _this.returnColor(d);
		})
		.append("svg:title")
		.text(function (d,i) {

			return _this.getToolTip (d);
		});

	

		
	return shapes;
}


/*A ShapeChart that draws shape as bars*/
function BarChart () {};

BarChart.prototype = new ShapeChart ();

BarChart.prototype.init = function (container_id, get_value, get_key, dispatcher, query, parameters) {

	this.initChart (container_id, get_value, get_key, dispatcher, query, parameters, "getMeasureByDimensionData");
}

BarChart.prototype.addShapes = function (shape) {

	var new_bars = this.svg.selectAll (shape)
		.data (this.group)
		.enter ()		
		.append (shape)
		;

	var _this = this;
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ());
		
	var y_scale = this.getYScale ();

	var bars = this.drawShapes (new_bars);
	
	bars.transition ().delay(200).ease ("elastic")
		.attr ("x", function (d) {
		
			return _this.getX (d, x_scale);
		})
		.attr ("y", function (d) {
			//console.log ("_this.getY (d, y_scale) " + _this.getY (d, y_scale));
			return _this.getY (d, y_scale);
		})	
		.attr ("width", function (d) {
	
			return _this.getWidth (d, x_scale);			
		})
		.attr ("height", function (d) {
			
			return _this.getHeigth (d, y_scale);			
		});
	
	
	return bars;
}

BarChart.prototype.updateShapesCoordinates = function (shapes_to_update) {

	var _this = this;
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ()
	);
		
	var y_scale = this.getYScale ();
		
	shapes_to_update
		.attr ("x", function (d) {
		
			//console.log ("updateShapesCoordinates " + JSON.stringify (d));
			return _this.getX (d, x_scale);
		})
		.attr ("y", function (d) {
		
			//console.log ("y = " + _this.getY (d, y_scale));
			return _this.getY (d, y_scale);
		})
		.attr ("width", function (d) {
		
			return _this.getWidth (d, x_scale);			
		})
		.attr ("height", function (d) {
			//console.log ("height " + _this.getHeigth (d, y_scale));
			return _this.getHeigth (d, y_scale);			
		});
		
	return shapes_to_update;
}

BarChart.prototype.drawTextLabels = function (texts) {
	
	this.drawChartTextLabels ("bar", texts);
}

BarChart.prototype.draw = function () {
	
	var shapes = this.drawChart ("rect", "bar");	
	this.addInteraction (shapes);
}


BarChart.prototype.update = function () {
	
	console.log ("BarChart::update");
	
	this.updateChart ("rect", "bar");		
}
	
BarChart.prototype.updateSelection = function () {

	this.updateShapeSelection ("rect");
}

/*
A BarChart that shows an ordinal dimension on the y axis and a measure on the 
x axis
*/
function VerticalCategoryBarChart (container_id, get_value, get_key, dispatcher, query, parameters) {

	this.init (container_id, get_value, get_key, dispatcher, query, parameters);

	this.xLabel = ((this.xLabel == "") ? JSON.parse(query.measure).measures[0] : this.xLabel);
	
	return this;
}

VerticalCategoryBarChart.prototype = new BarChart();

VerticalCategoryBarChart.prototype.getYScale = function () {
	
	var y_scale = d3.scale.ordinal ();	
	
	if ((this.domain.length > 0) && (!isNaN (this.domain)[0])) {
	
		y_scale.domain (this.domain);		
		y_scale.rangeBands ([0, this.h - this.getBottomMargin()]);
	}
	return y_scale;
}

VerticalCategoryBarChart.prototype.getXScale = function (l_padding, right_margin) {

	var get_value = this.getValue;
	
	var x_scale = d3.scale.linear ();

	x_scale.domain ([0, d3.max (this.group, function (d) { return get_value (d); })]);
	x_scale.range ([l_padding, this.w - right_margin]);
	
	return x_scale;
}
/*
VerticalCategoryBarChart.prototype.getTopMargin = function () {

	return 10;
}

VerticalCategoryBarChart.prototype.getBottomMargin = function () {

	return 40;
}*/

VerticalCategoryBarChart.prototype.getMaxYLabel = function () {

	var get_key = this.getKey;
	
	//console.log ("getMaxYLabel " + d3.max (this.group, function (d) { return get_key(d).length; }));

	return d3.max (this.group, function (d) { return get_key(d).length; });
}

VerticalCategoryBarChart.prototype.getLeftMargin = function (max_y_label) {

	return 100 + ((max_y_label > 20) ? (max_y_label * 4) : (max_y_label * 7));
}
/*
VerticalCategoryBarChart.prototype.getRightMargin = function () {

	return 20;
}
*/
VerticalCategoryBarChart.prototype.getYAxisMargin = function () {

	return 50;
}

VerticalCategoryBarChart.prototype.getY = function (d, y_scale) {
	
	var get_key = this.getKey;
	return y_scale (get_key (d)) + 5;
}	

VerticalCategoryBarChart.prototype.getX = function (d, x_scale) {
	
	return this.getLeftMargin (this.getMaxYLabel ());
}

VerticalCategoryBarChart.prototype.getWidth = function (d, x_scale) {

	var get_value = this.getValue;
	
	//console.log ("get_value (d) " + get_value (d));
	//console.log ("x_scale (get_value (d) " + x_scale (get_value (d)));
	
	return x_scale (get_value (d)) - this.getLeftMargin (this.getMaxYLabel());
}	

VerticalCategoryBarChart.prototype.getHeigth = function (d, x_scale) {
	
	return ((this.h - this.getBottomMargin ()) / this.domain.length) - 7;
}	

VerticalCategoryBarChart.prototype.getLabelX = function (d, x_scale) {

	//return this.getLeftMargin (this.getMaxYLabel ()) + 10;
	return x_scale (this.getValue (d)) - 30;
}	

VerticalCategoryBarChart.prototype.getLabelY = function (d, y_scale) {
	
	return this.getY (d, y_scale) + (this.getHeigth (d) / 2);
	
}	

/*
A BarChart that shows an ordinal dimension on the x axis and a measure on the 
y axis
*/
function HorizontalCategoryBarChart (container_id, get_value, get_key, dispatcher, query, parameters) {
	
	this.init (container_id, get_value, get_key, dispatcher, query, parameters);
		
	this.xLabel = ((this.xLabel == "") ? query.dimension : this.xLabel);
	
	return this;
}

HorizontalCategoryBarChart.prototype = new BarChart();

HorizontalCategoryBarChart.prototype.getYScale = function () {
	
	var get_value = this.getValue;
	var y_scale = d3.scale.linear ();
	y_scale.domain ([0, d3.max (this.group, function (d) { return get_value (d); })]);
	y_scale.range ([this.h - this.getBottomMargin (), this.getTopMargin ()]);
	
	return y_scale;
}

HorizontalCategoryBarChart.prototype.getXScale = function (l_padding, right_margin) {
	
	var x_scale = d3.scale.ordinal ();	

	//console.log ("HorizontalCategoryBarChart this.domain " + this.domain);
	
	if ((this.domain.length > 0) /*&& (!isNaN (this.domain)[0])*/) {
	
		x_scale.domain (this.domain);		
		//x_scale.rangeRoundBands ([l_padding, this.w - right_margin]);
		x_scale.rangeRoundBands ([this.getLeftMargin (0), this.w - this.getRightMargin ()], 0.5, 1);
	}
	return x_scale;
}

HorizontalCategoryBarChart.prototype.getY = function (d, y_scale) {		
	
	var get_value = this.getValue;
	
	//console.log ("HorizontalCategoryBarChart::getY " + y_scale (get_value (d)));
	
	return y_scale (get_value (d));
}	

HorizontalCategoryBarChart.prototype.getX = function (d, x_scale) {
	
	var get_key = this.getKey;	
	return x_scale (this.getKey (d)) + (x_scale.rangeBand() / 2) - (this.getWidth (d, x_scale) / 2);
}

HorizontalCategoryBarChart.prototype.getWidth = function (d, x_scale) {

	/*console.log ("HorizontalCategoryBarChart::getWidth this.w " + this.w);
	console.log ("HorizontalCategoryBarChart::getWidth this.getRightMargin () " + this.getRightMargin ());
	console.log ("HorizontalCategoryBarChart::getWidth this.getLeftMargin (0) " + this.getLeftMargin (0));*/
	return (this.w - this.getRightMargin () - this.getLeftMargin (0)) / (this.domain.length * 1.4);
}	

HorizontalCategoryBarChart.prototype.getHeigth = function (d, y_scale) {

	var get_value = this.getValue;
	
	//console.log ("HorizontalCategoryBarChart::getY " + (y_scale (0) - y_scale (get_value (d))));
	
	return y_scale (0) - y_scale (get_value (d));
}

HorizontalCategoryBarChart.prototype.getLabelX = function (d, x_scale) {

	return x_scale (this.getKey (d)) + (x_scale.rangeBand() / 2) - (((this.getValue (d) + "")).length * 2);
}	

HorizontalCategoryBarChart.prototype.getLabelY = function (d, y_scale) {
	
	if (this.getHeigth (d, y_scale) > 20)
		return y_scale (this.getValue (d)) + 15;
	else 
		return 9999;
	
}	

/*
A StackedBarChart that shows an ordinal dimension on the x axis and a measure on the 
y axis
*/
function StackedBarChart (container_id, get_value, get_key, get_stacked_key, dispatcher, query, parameters) {
	
	this.initChart (container_id, get_value, get_key, dispatcher, query, parameters, "getStackedMeasureByDimensionData");

	this.xLabel = ((this.xLabel == "") ? query.dimension : this.xLabel);
	
	if (!parameters.stackedDimension) console.log ("StackedBarChart::init error: missing stackedDimension");	
	if (!get_stacked_key) console.log ("StackedBarChart::init error: missing get_stacked_keys");
	
	this.stackedDimension = query.stackedDimension;
	this.getStackedKey = get_stacked_key;
	
	return this;
};
/*
StackedBarChart.prototype = Object.create(HorizontalCategoryBarChart.prototype);
StackedBarChart.prototype.constructor = StackedBarChart;

StackedBarChart.prototype.setResponse = function (data) {

//	console.log ("StackedBarChart::setResponse data = " + JSON.stringify (data));
	var _this = this;
	
	this.oldGroup = this.group;
	this.group = data.response.result;
	this.domain = data.response.domain;
	
	this.oldGroupByDim = this.groupByDim;
	
	//console.log ("StackedBarChart::setResponse data.groupByDim = " + JSON.stringify (data.response.groupByDim));
	
	this.groupByDim = data.response.groupByDim;
	this.stackedDomain = data.response.stackedDomain;
	
	this.lastYByDim = {};	
	this.lastTextYByDim = {};
	
	//console.log ("this.lastYByDim " + JSON.stringify (this.lastYByDim));
	
	this.domain.forEach (function (dim) {

		_this.lastYByDim [dim] = 0;
		_this.lastTextYByDim [dim] = 0;
		
	});
	
	var sd = this.stackedDomain;
	
	this.legendDataset = [];
	
	for (var key_idx in sd) {

		var legend_item = {};
		legend_item [this.stackedDimension] = sd [key_idx];
		this.legendDataset.push (legend_item);
	}
	
	//console.log ("StackedBarChart::init this.legendDataset = " + JSON.stringify (this.legendDataset));
}

StackedBarChart.prototype.getYScale = function () {
	
	var get_value = this.getValue;
	var y_scale = d3.scale.linear ();
	
	y_scale.domain ([0, d3.max (this.groupByDim, function (d) { return get_value (d); })]);
	y_scale.range ([this.h - this.getBottomMargin (), this.getTopMargin ()]);
	
	return y_scale;
}

StackedBarChart.prototype.getY = function (d, y_scale) {		
	
	var get_value = this.getValue;
	var to_return = y_scale (get_value (d) + this.lastYByDim [d [this.dimension]]);
	
	//Save the last Y in order to sum it to the next stacked bar:
	this.lastYByDim [d [this.dimension]] += get_value (d);
	
	//console.log ("to_return " + to_return);
	return to_return;
}	

StackedBarChart.prototype.returnColor = function (d) {
		
	if (this.useCategoryColors) return this.colorScale (this.getStackedKey(d));	
	
	return this.defaultColor;
}

StackedBarChart.prototype.getLabelY = function (d, y_scale) {

	var y_scale = this.getYScale ();

	var bar_height = this.getHeigth (d, y_scale);

	if (bar_height < 10) return 9999;

	var to_return = y_scale (this.getValue (d) + this.lastTextYByDim [d [this.dimension]]);
	
	this.lastTextYByDim [d [this.dimension]] += this.getValue (d);
	
	return to_return + (bar_height / 2);
}

StackedBarChart.prototype.getSelectedKey = function (d) {

	return this.getKey (d) + ";" + this.getStackedKey (d);
}

StackedBarChart.prototype.getSelection = function (d) {

	var selection = {};
	
	selection [this.dimension] = this.getKey (d);
	selection [this.stackedDimension] = this.getStackedKey(d);
	
	return selection;
}
*/

/*A ShapeChart that draws shape as circles*/
function BubbleChart () {};
BubbleChart.prototype = new ShapeChart ();

BubbleChart.prototype.init = function (container_id, get_value, get_key, dispatcher, query, parameters) {

	this.initChart (container_id, get_value, get_key, dispatcher, query, parameters, "getMeasureByDimensionData");
	
	this.maxBubbleSize = (parameters.maxBubbleSize) ?  parameters.maxBubbleSize : 20;
}

BubbleChart.prototype.addShapes = function (shape) {

	var new_bubbles = this.svg.selectAll (shape)
		.data (this.group)
		.enter ()
		.append (shape);
		
	var _this = this;
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ());
		
	var y_scale = this.getYScale ();
	var b_scale = this.getBubbleScale ();
	
	var bubbles = this.drawShapes (new_bubbles)
		.attr ("cx", function (d) {
		
			return _this.getX (d, x_scale);
		})
		.attr ("cy", function (d) {
		
			return _this.getY (d, y_scale);
		})	
		.attr ("r", function (d) {
			
			return b_scale(_this.getBubbleValue (d));	
		});
		
	var texts = this.svg.selectAll ("." + "bubble" + "-text")
		.data (this.group)
		.enter ()
		.append ("text");

	this.drawTextLabels (texts);
	
	/*
	if (this.legendDataset)
		this.drawLegend ();		
		*/
	return bubbles;
}

BubbleChart.prototype.updateShapesCoordinates = function (shapes_to_update) {

	var _this = this;
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ());
	
	var y_scale = this.getYScale ();
	var b_scale = this.getBubbleScale ();
	
	shapes_to_update
		.attr ("cx", function (d) {
		
			return _this.getX (d, x_scale);
		})
		.attr ("cy", function (d) {
		
			return _this.getY (d, y_scale);
		})	
		.attr ("r", function (d) {
			
			return b_scale (_this.getBubbleValue (d));	
		});
		
	
	return shapes_to_update;
}


BubbleChart.prototype.getToolTip = function (d) {
	
	return this.bubbleAttributeLabel + " = " + this.getKey (d) + ", " + 
		this.xLabel + " = " + this.getXValue (d).toFixed(2) + ", " +
		this.yLabel + " = " + this.getYValue (d).toFixed(2) + ", " +
		this.bubbleSizeLabel + " = " + (this.getBubbleValue (d) ? this.getBubbleValue (d).toFixed(2) : 0);
}

BubbleChart.prototype.drawTextLabels = function (texts) {

	this.drawChartTextLabels ("bubble", texts);
}

BubbleChart.prototype.draw = function () {
	
	var shapes = this.drawChart ("circle", "bubble");	
	this.addInteraction (shapes);
}


BubbleChart.prototype.update = function () {
	
	console.log ("BubbleChart::update");
	
	this.updateChart ("circle", "bubble");		
}
	
BubbleChart.prototype.updateSelection = function () {

	this.updateShapeSelection ("circle");
}

/*A Bubble chart that shows x measures*/
function xDBubbleChart (container_id, get_key, get_x_value, get_y_value, get_bubble_value, dispatcher, query, parameters) {
	
	this.init (container_id, get_x_value, get_key, dispatcher, query, parameters);
	console.log ("xDBubbleChart this.xLabel " + this.xLabel);
	this.xLabel = ((this.xLabel == "") ? query.dimension : this.xLabel);
		
	this.bubbleSizeLabel = parameters.bubbleSizeLabel ? parameters.bubbleSizeLabel : "";
	this.bubbleAttributeLabel = parameters.bubbleAttributeLabel ? parameters.bubbleAttributeLabel : "";
	
	this.getXValue = get_x_value;
	this.getYValue = get_y_value;
	this.getBubbleValue = get_bubble_value;
	
	this.getDataLabel = this.getKey;
	
	return this;
}

xDBubbleChart.prototype = new BubbleChart ();

xDBubbleChart.prototype.getYScale = function () {
	
	var _this = this;
	
	var y_scale = d3.scale.linear ();
	
	y_scale.domain ([0, d3.max (this.group, function (d) { return (_this.getYValue (d)); })]);
	y_scale.range ([this.h - this.getBottomMargin (), this.getTopMargin () + (_this.maxBubbleSize)]);
	
	return y_scale;
}

xDBubbleChart.prototype.getXScale = function (l_padding, right_margin) {
	
	var _this = this;
	var x_scale = d3.scale.linear ();
	
	x_scale.domain ([0, d3.max (this.group, function (d) { return _this.getXValue (d) + _this.maxBubbleSize + 50})]);
	x_scale.range ([this.getLeftMargin(this.getMaxYLabel()),this.w - this.getRightMargin()]);
	
	return x_scale;
}

xDBubbleChart.prototype.getBubbleScale = function () {
	
	var _this = this;
	var b_scale = d3.scale.linear ();
	
	b_scale.domain ([0, d3.max (this.group, function (d) {  return _this.getBubbleValue (d); })]);
	b_scale.range ([5, _this.maxBubbleSize]);
	
	return b_scale;
}

xDBubbleChart.prototype.getY = function (d, y_scale) {		
	
	var get_value = this.getYValue;
	var b_scale = this.getBubbleScale ();

	/*console.log("d " + JSON.stringify (d));
	console.log("get_value (d) " + get_value (d));
	console.log("y_scale (get_value (d)) " + y_scale (get_value (d)));
	*/
		
	return y_scale (get_value (d));
}	

xDBubbleChart.prototype.getX = function (d, x_scale) {
	
	var get_key = this.getXValue;	
	return x_scale (get_key (d));
}

xDBubbleChart.prototype.getLabelX = function (d, x_scale) {

	var b_scale = this.getBubbleScale ();
	
	return x_scale (this.getXValue (d)) + b_scale(this.getBubbleValue (d));
}	

xDBubbleChart.prototype.getLabelY = function (d, y_scale) {
	
	var b_scale = this.getBubbleScale ();
	
	return y_scale (this.getYValue (d)) + b_scale(this.getBubbleValue (d));
	
}	

/*A Bubble chart that shows category on Y Axis*/
function VerticalCategoryBubbleChart (container_id, get_key, get_x_value, get_y_category, get_bubble_value, dispatcher, query, parameters) {

	//console.log ("VerticalCategoryBubbleChart " + JSON.stringify (parameters));

	this.init (container_id, get_x_value, get_key, dispatcher, query, parameters);

	this.xLabel = ((this.xLabel == "") ? query.dimension : this.xLabel);
		
	this.bubbleSizeLabel = parameters.bubbleSizeLabel ? parameters.bubbleSizeLabel : "";
	this.bubbleAttributeLabel = parameters.bubbleAttributeLabel ? parameters.bubbleAttributeLabel : "";
	this.bubbleAttribute = parameters.bubbleAttribute;

	if (!parameters.bubbleAttribute) console.error ("VerticalCategoryBubbleChart: missing parameter - bubbleAttribute")
	
	this.getXValue = get_x_value;
	this.getYValue = get_y_category;
	this.getBubbleValue = get_bubble_value;
	
	this.getDataLabel = this.getKey;
	
	return this;
}

VerticalCategoryBubbleChart.prototype = Object.create(xDBubbleChart.prototype);
VerticalCategoryBubbleChart.prototype.constructor = xDBubbleChart;

VerticalCategoryBubbleChart.prototype.getYScale = function () {
	
	var y_scale = d3.scale.ordinal ();	
	
	if ((this.domain.length > 0) && (!isNaN (this.domain)[0])) {
	
		y_scale.domain (this.domain);		
		y_scale.rangePoints ([this.h - this.getBottomMargin (), this.getTopMargin ()],1);
	}
	return y_scale;
}

VerticalCategoryBubbleChart.prototype.getToolTip = function (d) {
	
	return this.bubbleAttributeLabel + " = " + this.getKey (d) + ", " + 
		this.xLabel + " = " + this.getXValue (d).toFixed(2) + ", " +
		this.yLabel + " = " + this.getYValue (d) + ", " +
		this.bubbleSizeLabel + " = " + (this.getBubbleValue (d) ? this.getBubbleValue (d).toFixed(2) : 0);
}

VerticalCategoryBubbleChart.prototype.getLeftMargin = function (max_y_label) {

	return 100 + ((max_y_label > 20) ? (max_y_label * 4) : (max_y_label * 7));
}

VerticalCategoryBubbleChart.prototype.getMaxYLabel = function () {

	var get_key = this.getYValue;
	
	//console.log ("getMaxYLabel " + d3.max (this.group, function (d) { return get_key(d).length; }));

	return d3.max (this.group, function (d) { return get_key(d).length; });
}


