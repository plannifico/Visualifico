function ScatterPlot (container_id, group, get_value, get_key, get_secondary_value, get_point_label,parameters) {

	this.group = group;
	this.containerId = container_id;
	
	this.h = parameters.height;
	this.w = parameters.width;
	
	this.getSecondaryValue = get_secondary_value;
	this.getKey = get_key;
	
	this.setDomain = function (domain) {
	
		this.domain = domain;
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
		y_scale.domain (this.domain);
		y_scale.rangeBands ([0, h - bottom_margin]);
	
		var max_label = d3.max (this.group, function(d) { return get_key(d).length; })
	
		var x_scale = d3.scale.linear ();		
		x_scale.domain ([0, d3.max (this.group, function(d) { return get_value (d); })]);
		x_scale.range ([left_margin + (max_label * label_margin_x_character), w - right_margin]);
	
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

		var circles = svg.selectAll ("circle")
			.data (this.group)
			.enter ()
			.append ("circle")
			.style("opacity", 0.75)
			.attr ("cx", function (d,i) {

				if (isNaN (get_value(d))) return - 50;

				return x_scale (get_value (d));
			})
			.attr ("cy", function (d, i) {
				
			//return y_scale(_this.domain.indexOf (d.key[0]));
				return y_scale (get_key(d)) + 13;
			})
			.attr ("r", function (d) {
			
				return 5;
			})
			.attr("fill", function (d) {
		
				return _this.setStandardColors (d);
			})
			.append ("title")
			.text(function(d) {
			
				return get_point_label (d);
			});
	}
	
	this.onkeySelected = function (keys) {
	
		console.log ("this.onkeySelected " + JSON.stringify (keys));
		var _this = this;
		
		if (keys.length == 0) {
			this.svg.selectAll ("circle")
				.data (this.group)			
				.attr ("r", function (d) {
					
					return 5;
				})
				.attr("fill", function (d) {
					
					return _this.setStandardColors (d);
				});
		
		} else {
		
			this.svg.selectAll ("circle")
				.data (this.group)			
				.attr ("r", function (d) {
					if (keys.indexOf(_this.getKey(d)) == -1)
						return 4;
					else 
						return 5;
				})
				.attr("fill", function (d) {
			
					if (keys.indexOf(_this.getKey(d)) == -1)
						return "rgb(191,191,191)";
					else
						return _this.setStandardColors (d);
				});
		}		
	}
	
	this.setStandardColors = function (d) {
	
		if (this.getSecondaryValue(d) == 1) 
			return "rgb(191,191,191)";
		if ((this.getSecondaryValue(d) > 1) && (this.getSecondaryValue(d) <= 5)) 
			return "rgb(149,179," + 215 + (this.getSecondaryValue(d)*2) +")";
		if ((this.getSecondaryValue(d) > 5) && (this.getSecondaryValue(d) <= 20))
			return "rgb(85,142," + 213 + (this.getSecondaryValue(d)*2) +")";
		if (this.getSecondaryValue(d) > 20)
			return "rgb(228,108," + 10 + (this.getSecondaryValue (d)*2) +")";
	}
}