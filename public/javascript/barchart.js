/*--------------------------------------------------------------------------
* Visualifico
* ver 0.1.0.0 (December 2014)
*
* created and maintained by Alfano Rosario <ro.alfano@gmail.com>
*--------------------------------------------------------------------------*/

function BarChart (container_id, get_value, get_key, click_listener, parameters) {

	this.url = "http://localhost:5000/";
	this.call = "getBarChartData"; 

	this.containerId = container_id;
	
	this.currentData = {};
	
	this.h = parameters.height;
	this.w = parameters.width;
	
	this.getKey = get_key;
	this.getValue = get_value;
	
	this.clickListener = click_listener;
	this.selected = [];
	
	this.loadData = function (parameters, callback) {
	
		var _this = this;
	
		if (parameters.collection && parameters.dimension && parameters.measure) {
		
			var url = this.url + this.call +  
				"?collection=" + parameters.collection +
				"&dim=" + parameters.dimension +
				"&measure=" + parameters.measure +
				((parameters.top && (!isNaN(parameters.top))) ? "&top=" + parameters.top : "");
				
			console.log ("url " + url);
		
			d3.json(url
				, function (error, data) {
			
				if (error) {
					console.log ("BarChart::loadData error - " + error);
					return;
				}
				
				console.log ("BarChart::loadData " + JSON.stringify (data));
			
				_this.group = data.response;
				_this.domain = data.domain;
				
				callback ({"feedback": "ok"});			
			})
		} else
			callback ({"feedback": "error", "error": "missing parameters!"})
	}
		
    this.draw = function () {
	
		var _this = this;

		console.log (this.containerId);

		var svg = d3.select ("#" + this.containerId).append("svg");

		this.svg = svg;

		var h = this.h;
		var w = this.w;

		var bottom_margin = 20;
		var left_margin = 85;
		var label_margin_x_character = 4;
		var right_margin = 20;
		var y_axis_margin = 50;

		svg.attr ("width", w);
		svg.attr ("height", h);

		var y_scale = d3.scale.ordinal ();	

		console.log ("this.domain " + _this.domain);
		y_scale.domain (_this.domain);		
		y_scale.rangeBands ([0, h - bottom_margin]);

		var max_label = d3.max (this.group, function (d) { return get_key(d).length; })
		var l_padding = left_margin + (max_label * label_margin_x_character);

		console.log ("max value " + d3.max (this.group, function(d) { return get_value (d); }));
		var x_scale = d3.scale.linear ();		
		x_scale.domain ([0, d3.max (this.group, function(d) { return get_value (d); })]);
		x_scale.range ([l_padding, w - right_margin]);

		var xAxis = d3.svg.axis ()
			.scale(x_scale)
			.orient ("bottom")
			.ticks(5);
			
		svg.append("g")
			.attr ("class","axis xaxis")
			.call(xAxis)
			.attr("transform", "translate(0," + (h - bottom_margin) + ")");

		var yAxis = d3.svg.axis ()
			.scale(y_scale)
			.orient ("left");
			
		svg.append("g")
			.attr ("class","axis")
			.attr("transform", "translate(" + (y_axis_margin + max_label * 5) + ",0)")
			.call(yAxis);

		var bars = svg.selectAll ("rect")
			.data (this.group)
			.enter ()
			.append("rect")
			.attr ("x", l_padding)
			.attr ("y", function (d) {
			
				return y_scale (get_key (d)) + 5;
			})
			.attr ("width", function (d) {
			
				return x_scale (get_value (d));
			})
			.attr ("height", ((h - bottom_margin) / this.domain.length) - 7)
			.attr("fill", function (d,i) {

				return _this.returnStdColor();
			})
			.on("click", function (d) {
				
				if ((_this.selected.length > 0) && (_this.selected.indexOf (get_key(d)) >= 0)) {
					
					var idx = _this.selected.indexOf (get_key(d));
					
					_this.selected.splice (idx,1);
					console.log ("_this.selected " + JSON.stringify (_this.selected));
					_this.updateSelection ();
					
				} else {				
					
					_this.selected.push (get_key(d));					
					
					_this.updateSelection ();					
					
				}
				_this.clickListener (_this.selected);
				
			})
			.on("mouseover", function() {
				if (_this.selected.length > 0) return;
				d3.select(this)
					.attr("fill", "orange");
			})
			.on("mouseout", function(d,i) {
				if (_this.selected.length > 0) return;
				d3.select(this)
					.transition()
					.duration(250)
					.attr("fill", function (d,i) {return _this.returnStdColor()});
			});
			
		svg.selectAll(".bar-text")
			.data (this.group)
			.enter ()
			.append ("text")
			.attr("class", "bar-text")
			.attr("x", l_padding + 10)
			.attr("y", function(d) {
				return y_scale (get_key (d)) + 17;
			})
			.text(function(d) {
			
				return get_value (d);
			});
	}
	
	this.returnStdColor = function () {
	
		return "rgb(85, 142, 213)";
	}
	
	this.updateSelection = function () {
	
		var _this = this;
		
		if (this.selected.length == 0) {
		
			this.svg.selectAll ("rect")
				.data (this.group)
				.attr("fill", _this.returnStdColor());	
		} else {
		
			this.svg.selectAll ("rect")
				.data (this.group)
				.attr("fill", function (d,i) {
				
					if (_this.selected.indexOf(_this.getKey (d)) >= 0)
						return "rgb(31,73,125)";
					else
						return "rgb(191,191,191)";
				});
		}	
	}

}