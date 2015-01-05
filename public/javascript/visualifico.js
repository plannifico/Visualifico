/*--------------------------------------------------------------------------
* Visualifico
* ver 0.1.0.0 (December 2014)
*
* created and maintained by Alfano Rosario <ro.alfano@gmail.com>

*--------------------------------------------------------------------------*/
function EventDispatcher () {

	this.listeners = [];
};

EventDispatcher.prototype.dispatch = function (event) {

	console.log ("EventDispatcher::dispatch " + JSON.stringify (event));
	
	this.listeners.forEach (function (listener) {
	
		console.log("listener.getId() " + listener.id);
	
		if (listener.id == event.chartid) return;
		
		listener.listener.notifyEvent (event);
	});
};

EventDispatcher.prototype.addListener = function (listener) {

	console.log ("EventDispatcher::addListener " + listener.getId ());

	this.listeners.push ({"id": listener.getId (), "listener": listener});
	
	console.log ("EventDispatcher::addListener " + this.listeners.length);
};

function VisualificoChart () {};

VisualificoChart.prototype.getId = function () {

	return this.containerId;
}

VisualificoChart.prototype.initMe = function (container_id, get_value, get_key, dispatcher, parameters, call) {

	this.url = "http://localhost:5000/";
	this.call = call; 

	this.containerId = container_id;
	
	this.currentData = {};
	
	//Parameters:
	this.h = parameters.height;
	this.w = parameters.width;
	this.collection = parameters.collection;
	this.dimension = parameters.dimension;
	this.measure = parameters.measure;	
	
	this.defaultColor = parameters.defaultColor ? parameters.defaultColor : "rgb(85, 142, 213)";
	
	this.useCategoryColors = parameters.useCategoryColors ? parameters.useCategoryColors : false;
	
	this.highlightColor = parameters.highlightColor ? parameters.highlightColor : "rgb(228,108,10)";
	
	this.selectionColor = parameters.selectionColor ? parameters.selectionColor : "rgb(31,73,125)"
	
	this.dispatcher = dispatcher;
	
	this.defaultFilters = parameters.defaultFilters;
	
	this.getKey = get_key;
	this.getValue = get_value;
	
	this.selected = [];
}

VisualificoChart.prototype.notifyEvent = function (event) {

	console.log ("VisualificoChart::notifyEvent event = " + JSON.stringify (event));
	console.log ("VisualificoChart::notifyEvent this.currentFilters " + JSON.stringify (this.currentFilters)); 
	console.log ("VisualificoChart::notifyEvent this.defaultFilters " + JSON.stringify (this.defaultFilters));
	console.log ("VisualificoChart::notifyEvent event.selected.length " + event.selected.length);
	//filter_obj [event.dimension] = 
	
	if (event.selected.length > 0) {
	
		this.currentFilters [event.dimension] = {"$in":event.selected};	
	}
	else if (this.defaultFilters [event.dimension])	{
	
		
		this.currentFilters [event.dimension] = JSON.parse( JSON.stringify( this.defaultFilters [event.dimension] ) );			
	}
	else {
	
		delete this.currentFilters [event.dimension];	
	}
	console.log ("VisualificoChart::notifyEvent this.currentFilters  " + JSON.stringify (this.currentFilters));
	
	var _this = this;
	
	this.loadData (
		{
			"top": this.currentTop, 
			"filters": this.currentFilters
		}, 
		function (response) {
		
			console.log ("VisualificoChart::notifyEvent data update " + response.feedback);
			
			_this.update();
		}
	);
}

VisualificoChart.prototype.addInteraction = function (elements) {

	var _this = this;
	var get_key = this.getKey;
	
	this.color = d3.scale.category20c();
	
	elements.on("click", function (d) {
		
		if ((_this.selected.length > 0) && (_this.selected.indexOf (get_key(d)) >= 0)) {
			
			var idx = _this.selected.indexOf (get_key(d));
			
			_this.selected.splice (idx,1);
			console.log ("_this.selected " + JSON.stringify (_this.selected));
			_this.updateSelection ();
			
		} else {				
			
			_this.selected.push (get_key(d));								
			_this.updateSelection ();					
			
		}
		console.log ("_this.selected " + JSON.stringify (_this.selected));
		
		_this.dispatcher.dispatch ({"chartid": _this.containerId, "dimension" : _this.dimension, "selected" : _this.selected});			
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
			.attr("fill", function (d,i) {return _this.returnBarColor(d)});
	});
}

function BarChart () {};

BarChart.prototype = new VisualificoChart ();

BarChart.prototype.init = function (container_id, get_value, get_key, dispatcher, parameters) {

	this.initMe (container_id, get_value, get_key, dispatcher, parameters, "getMeasureByDimensionData");
	
	var color = d3.scale.category20c();
	
	
}

BarChart.prototype.loadData = function (parameters, callback) {
	
	var _this = this;
	
	var filters = {};
	
	if (parameters.filters)
		filters = parameters.filters;
	else
		filters = this.defaultFilters;
		
	this.currentFilters = JSON.parse( JSON.stringify(filters));
	
	console.log ("loadData this.defaultFilters " + JSON.stringify (this.defaultFilters));
	console.log ("loadData this.currentFilters " + JSON.stringify (this.currentFilters));
	
	this.currentTop = parameters.top;

	if (this.collection && this.dimension && this.measure) {
	
		var url = this.url + this.call +  
			"?collection=" + this.collection +
			"&dim=" + this.dimension +
			(this.stackedDimension ? "&stackedDim=" + this.stackedDimension : "") +
			"&measure=" + this.measure +
			((parameters.top && (!isNaN(parameters.top))) ? "&top=" + parameters.top : "") +
			(this.currentFilters ? "&filters=" + JSON.stringify(filters): "{}");
	
		console.log ("BarChart::loadData url = " + url);
	
		d3.json(url
			, function (error, data) {
		
			if (error) {
				console.log ("BarChart::loadData error - " + error);
				return;
			}
			console.log ("BarChart::loadData data - " + JSON.stringify (data));
			
			_this.setResponse (data);
			
			callback ({"feedback": "ok"});			
		})
	} else
		callback ({"feedback": "error", "error": "missing parameters!"})
}

BarChart.prototype.setResponse = function (data) {

	this.oldGroup = this.group;
	this.group = data.response.result;
	this.domain = data.response.domain;
}

BarChart.prototype.addXAxis = function (x_scale) {

	var xAxis = d3.svg.axis ()
		.scale (x_scale)
		.orient ("bottom")
		.ticks (5);
		
	this.svg.append("g")
		.attr ("class","axis xaxis")
		.call (xAxis)
		.attr ("transform", "translate(0," + (this.h - this.getBottomMargin ()) + ")");
		
	console.log ("addXAxis append ok");
}

BarChart.prototype.addYAxis = function (y_scale) {

	var yAxis = d3.svg.axis ()
		.scale (y_scale)
		.orient ("left");
		
	this.svg.append("g")
		.attr ("class","axis yaxis")
		.attr ("transform", "translate(" + (this.getYAxisMargin () + this.getMaxYLabel() * 5) + ",0)")
		.call (yAxis);
}

BarChart.prototype.drawBars = function (bars) {

	var _this = this;
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel()), 
		this.getRightMargin ());
		
	var y_scale = this.getYScale (this.h, this.getBottomMargin ());

	bars.attr ("x", function (d) {
		
		return _this.getX (d, x_scale);
	})
	.attr ("y", function (d) {
	
		return _this.getY (d, y_scale);
	})
	.attr ("width", function (d) {
	
		return _this.getWidth (d, x_scale);			
	})
	.attr ("height", function (d) {
	
		return _this.getHeigth (d, y_scale);			
	})
	.attr("fill", function (d,i) {

		return _this.returnBarColor(d);
	});
	return bars;
}

BarChart.prototype.drawTextLabels = function (texts) {

	var _this = this;

	var y_scale = this.getYScale (this.h, this.getBottomMargin ());
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel ()), 
		this.getRightMargin ());
	
	texts.attr("class", "bar-text")
		.attr("x", function(d) {
			return _this.getLabelX (d, x_scale);
		})
		.attr("y", function(d) {
			return _this.getLabelY (d, y_scale);
		})
		.text(function(d) {
		
			return _this.getValue (d);
		});	
}

BarChart.prototype.draw = function () {
	
	var _this = this;

	var svg = d3.select ("#" + this.containerId).append ("svg");
	/*
	this.colorScale = 
		d3.scale.ordinal().domain(this.domain).range(d3.scale.category20());
*/
	this.colorScale =d3.scale.category20();
	console.log ("BarChart::draw this.domain " + JSON.stringify (this.domain));
	console.log ("BarChart::draw this.colorScale " + this.colorScale ("LAMPA"));
	
	this.svg = svg;

	var h = this.h;
	var w = this.w;				
		
	var get_key = this.getKey;
	var get_value = this.getValue;

	svg.attr ("width", w);
	svg.attr ("height", h);

	var y_scale = this.getYScale (h, this.getBottomMargin ());
	
	var x_scale = this.getXScale (
		this.getLeftMargin (this.getMaxYLabel ()), 
		this.getRightMargin ());
	
	this.addXAxis (x_scale);
	this.addYAxis (y_scale);
	
	var bars = svg.selectAll ("rect")
		.data (this.group)
		.enter ()
		.append("rect");
		
	this.drawBars (bars);
	
	this.addInteraction (bars);

	var texts = svg.selectAll(".bar-text")
		.data (this.group)
		.enter ()
		.append ("text");

	this.drawTextLabels (texts);
		
}

BarChart.prototype.update = function () {
	
	console.log ("BarChart::update");
	
	var _this = this;
	var svg = this.svg;
			
	var get_key = this.getKey;
	var get_value = this.getValue;
	
	var x_scale = this.getXScale (this.getLeftMargin (this.getMaxYLabel ()), this.getRightMargin());
	var y_scale = this.getYScale (this.h, this.getBottomMargin());

	var xAxis = d3.svg.axis().scale (x_scale).orient("bottom");
	var yAxis = d3.svg.axis().scale (y_scale).orient("left");
	
	this.svg.selectAll("g.xaxis.axis")
		.call (xAxis);
		
	this.svg.selectAll("g.yaxis.axis")
		.call (yAxis);
	
	//Mark the bars
	if (this.oldGroup) {

		svg.selectAll ("rect")
			.data (this.oldGroup)
			.classed ("toremove", true);
	}
	
	var bars = svg.selectAll ("rect")
		.data (this.group)
		.classed ("toremove", false)
		.transition ()
		.duration (700)
		.ease ("elastic")		
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
		
			return _this.getHeigth (d, y_scale);			
		});
		
	svg.selectAll ("rect.toremove")
		.data (this.oldGroup)
		.remove();	

	var bars = svg.selectAll ("rect")
		.data (this.group)
		.enter ()
		.append("rect");
		
	this.drawBars (bars);
		
	this.addInteraction (bars);
		
	svg.selectAll(".bar-text")
		.data (this.oldGroup)
		.classed ("toremove", true);
	
	svg.selectAll(".bar-text")
		.data (this.group)
		.classed ("toremove", false)
		.attr("x", function(d) {
			return _this.getLabelX (d, x_scale);
		})
		.attr("y", function(d) {
			return _this.getLabelY (d, y_scale);
		})
		.text(function(d) {
		
			return get_value (d);
		});
	
	svg.selectAll(".bar-text.toremove")
		.data (this.oldGroup)
		.remove ();
		
	var texts = svg.selectAll(".bar-text")
		.data (this.group)
		.enter ()
		.append ("text");

	this.drawTextLabels (texts);
	
	this.updateSelection ();
}
	
BarChart.prototype.returnBarColor = function (d) {
	
	//console.log ("color (this.getKey(d)) " + this.colorScale (this.getKey(d))); 
	
	if (this.useCategoryColors) return this.colorScale (this.getKey(d));	
	
	return this.defaultColor;
}
	
BarChart.prototype.updateSelection = function () {

	var color = d3.scale.category20c();
	
	var _this = this;
	
	if (this.selected.length == 0) {
	
		this.svg.selectAll ("rect")
			.data (this.group)
			.attr("fill", function (d) {return _this.returnBarColor(d, color)});	
	} else {
	
		this.svg.selectAll ("rect")
			.data (this.group)
			.attr("fill", function (d,i) {
			
				if (_this.selected.indexOf(_this.getKey (d)) >= 0)
					return _this.selectionColor;
				else
					return "rgb(191,191,191)";
			});
	}	
}



/*
A BarChart that shows an ordinal dimension on the y axis and a measure on the 
x axis
*/
function VerticalCategoryBarChart () {}

VerticalCategoryBarChart.prototype = new BarChart();

VerticalCategoryBarChart.prototype.getYScale = function (h, bottom_margin) {
	
	var y_scale = d3.scale.ordinal ();	

	//console.log ("this.domain " + this.domain);
	
	if ((this.domain.length > 0) && (!isNaN (this.domain)[0])) {
	
		y_scale.domain (this.domain);		
		y_scale.rangeBands ([0, h - bottom_margin]);
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

VerticalCategoryBarChart.prototype.getBottomMargin = function () {

	return 20;
}

VerticalCategoryBarChart.prototype.getMaxYLabel = function () {

	var get_key = this.getKey;
	
	//console.log ("getMaxYLabel " + d3.max (this.group, function (d) { return get_key(d).length; }));

	return d3.max (this.group, function (d) { return get_key(d).length; });
}

VerticalCategoryBarChart.prototype.getLeftMargin = function (max_y_label) {

	return 100 + ((max_y_label > 20) ? (max_y_label * 4) : (max_y_label * 7));
}

VerticalCategoryBarChart.prototype.getRightMargin = function () {

	return 20;
}

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
	
	return this.getY (d, y_scale) + 17;
}	

/*
A BarChart that shows an ordinal dimension on the x axis and a measure on the 
y axis
*/
function HorizontalCategoryBarChart () {}

HorizontalCategoryBarChart.prototype = new BarChart();

HorizontalCategoryBarChart.prototype.getYScale = function (h, bottom_margin) {
	
	var get_value = this.getValue;
	var y_scale = d3.scale.linear ();
	y_scale.domain ([0, d3.max (this.group, function (d) { return get_value (d); })]);
	y_scale.range ([h - bottom_margin, 0]);
	
	return y_scale;
}

HorizontalCategoryBarChart.prototype.getXScale = function (l_padding, right_margin) {
	
	var x_scale = d3.scale.ordinal ();	

	//console.log ("HorizontalCategoryBarChart this.domain " + this.domain);
	
	if ((this.domain.length > 0) /*&& (!isNaN (this.domain)[0])*/) {
	
		x_scale.domain (this.domain);		
		x_scale.rangeBands ([l_padding, this.w - right_margin],0.25);
	}
	return x_scale;
}

HorizontalCategoryBarChart.prototype.getBottomMargin = function () {

	return 20;
}

HorizontalCategoryBarChart.prototype.getMaxYLabel = function () {

	/*var get_key = this.getKey;
	return d3.max (this.group, function (d) { return get_key(d).length; });*/
	return 0;
}

HorizontalCategoryBarChart.prototype.getLeftMargin = function (max_y_label) {

	return 85 + (max_y_label * 4);
}

HorizontalCategoryBarChart.prototype.getRightMargin = function () {

	return 20;
}

HorizontalCategoryBarChart.prototype.getYAxisMargin = function () {

	return 50;
}

HorizontalCategoryBarChart.prototype.getY = function (d, y_scale) {		
	
	var get_value = this.getValue;
	
	//console.log ("HorizontalCategoryBarChart::getY " + y_scale (get_value (d)));
	
	return y_scale (get_value (d));
}	

HorizontalCategoryBarChart.prototype.getX = function (d, x_scale) {
	
	var get_key = this.getKey;	
	return x_scale (get_key (d));
}

HorizontalCategoryBarChart.prototype.getWidth = function (d, x_scale) {
	
	return (this.w - this.getRightMargin () - this.getLeftMargin (0)) / (this.domain.length + 1);
}	

HorizontalCategoryBarChart.prototype.getHeigth = function (d, y_scale) {

	var get_value = this.getValue;
	
	//console.log ("HorizontalCategoryBarChart::getY " + y_scale (0) - y_scale (get_value (d)));
	
	return y_scale (0) - y_scale (get_value (d));
}

HorizontalCategoryBarChart.prototype.getLabelX = function (d, x_scale) {

	return x_scale (this.getKey (d)) + x_scale.rangeBand() / 2;
}	

HorizontalCategoryBarChart.prototype.getLabelY = function (d, y_scale) {
	
	return y_scale (this.getValue (d)) + 20;
}	

/*
A StackedBarChart that shows an ordinal dimension on the x axis and a measure on the 
y axis
*/
function StackedBarChart () {};

StackedBarChart.prototype = new HorizontalCategoryBarChart ();

StackedBarChart.prototype.setResponse = function (data) {

	console.log ("StackedBarChart::setResponse data = " + JSON.stringify (data));
	var _this = this;
	
	this.oldGroup = this.group;
	this.group = data.response.result;
	this.domain = data.response.domain;
	
	this.oldGroupByDim = this.groupByDim;
	
	console.log ("StackedBarChart::setResponse data.groupByDim = " + JSON.stringify (data.response.groupByDim));
	
	this.groupByDim = data.response.groupByDim;
	this.stackedDomain = data.response.stackedDomain;
	
	this.lastYByDim = {};	
	this.lastTextYByDim = {};
	
	this.domain.forEach (function (dim) {

		_this.lastYByDim [dim] = 0;
		_this.lastTextYByDim [dim] = 0;
		
	});
}

StackedBarChart.prototype.init = function (container_id, get_value, get_key, get_stacked_key, get_stacked_keys_domain, dispatcher, parameters) {

	this.initMe (container_id, get_value, get_key, dispatcher, parameters, "getStackedMeasureByDimensionData");
	
	if (!parameters.stackedDimension) console.log ("StackedBarChart::init error: missing stackedDimension");	
	if (!get_stacked_key) console.log ("StackedBarChart::init error: missing get_stacked_keys");
	if (!parameters.get_stacked_keys_domain) console.log ("StackedBarChart::init error: missing get_stacked_keys_domain");
	
	this.stackedDimension = parameters.stackedDimension;
	this.getStackedKey = get_stacked_key;
	this.getStackedKeysDomain = parameters.get_stacked_keys_domain;	
}

StackedBarChart.prototype.getYScale = function (h, bottom_margin) {
	
	var get_value = this.getValue;
	var y_scale = d3.scale.linear ();
	//console.log ("getYScale " + JSON.stringify (this.groupByDim));
	y_scale.domain ([0, d3.max (this.groupByDim, function (d) { /*console.log ("getYScale " + JSON.stringify (d)); */return get_value (d); })]);
	y_scale.range ([h - bottom_margin, 0]);
	
	return y_scale;
}


StackedBarChart.prototype.getY = function (d, y_scale) {		
	
	var get_value = this.getValue;
	
	var to_return = y_scale (get_value (d) + this.lastYByDim [d [this.dimension]]);
	
	this.lastYByDim [d [this.dimension]] += get_value (d);
	
	//console.log ("StackedBarChart::getY to_return = " + to_return);
	
	return to_return;
}	

StackedBarChart.prototype.returnBarColor = function (d) {
		
	//console.log ("color (this.getKey(d)) " + this.getStackedKey); 
	
	if (this.useCategoryColors) return this.colorScale (this.getStackedKey(d));	
	
	return this.defaultColor;
}

StackedBarChart.prototype.getLabelY = function (d, y_scale) {

	var y_scale = this.getYScale (this.h, this.getBottomMargin ());

	var bar_height = this.getHeigth(d, y_scale);

	if (bar_height < 10) return 9999;

	var to_return = y_scale (this.getValue (d) + this.lastTextYByDim [d [this.dimension]]);
	
	this.lastTextYByDim [d [this.dimension]] += this.getValue (d);
	
	return to_return + (bar_height / 2);
}