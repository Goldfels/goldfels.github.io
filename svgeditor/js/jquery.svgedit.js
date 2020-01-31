'use strict';

$.widget( ".svgedit", {

	_svg: null, 					       // svg image field
	_selected: null,                       // currently selected svg
	_source: null, 					       // source code of svg image
	_downloadlink: null,                   // link used to download svg
	_movement: 0,                          // what movement is the svg doing
	_offset: { x: 0, y: 0 },               // position of the selection
	_transformOffset: null,                // transformations after click
	_rectOffset: null,                     // bounding BBox after click
	MovementCode: { None: 0,               // movement codes
					Moving: 1,
					TopLeft: 2,
					TopRight: 3,
					BottomLeft: 4,
					BottomRight: 5,
					Rotate: 6,
					},

    options: {
        breadth: 250,       // panel width or height depending on where its docked
        curve:10,           // the curve of the handle
        disabled:false,     // panel shuts and won't open any more
        dock: "left",       // default to left
        hidden:false,       // panel and grab handle is hidden
        opacity: 1,         // slide in panel opacity
        open: true,         // true is open, false is closed
        peek: 10,           // how far the panel peeks into the main window
        position:10,        // percentage position of the handle, 0 = top, 50 = middle, 100 = bottom
        prompt: "",         // text to show in the grab handle
        speed: 400,         // animate speed for opening and closing in millisecs
        toOpen: "click",    // what actions open the panel
        toClose: "click"    // what actions close the panel
    },

    // one time control initialisation

    _create: function () {
		var self = this;

		this._svg = this.element;

		this._downloadlink = $('<a>', {
			style: 'display: none;',
		}).appendTo('body');

		// TODO: use d3-drag

		this._svg.mousedown(function(event) {
			self._reposition(event);
		});

		$(window).mouseup(function(event) {
			self._stopmoving();
		});

		this._svg.mousemove(function(event) {
			self._movesvg(event);
		});
    },

    // destructor called on element deletion

    _destroy: function () {
    },

    // set the control options

    _setOption: function ( key, value ) {

        var self = this;

        var handlers = {
            "breadth": function () { self.breadth( value ); },
            "curve": function () { self.curve( value ); },
            "disabled": function () { self.disabled( value ); },
            "dock": function () { self.dock( value ); },
            "hidden": function () { self.hidden( value ); },
            "opacity": function () { self.opacity( value ); },
            "open": function () { self.open( value ); },
            "peek": function () { self.peek( value ); },
            "position": function () { self.position( value ); },
            "prompt": function () { self.prompt( value ); },
            "speed": function () { self.speed( value ); },
            "toOpen": function () { self.toOpen( value ); },
            "toClose": function () { self.toClose( value ); }
        };

        if ( key in handlers ) {
            handlers[key]();
        }

        this._super( key, value ); // base handler
    },

	// add element
	
	addElement: function(element) {
		this._svg.append(element);
	},

	// change content
	// TODO: use more jQuery
	
	setContent: function(content) {
		this._svg.context.innerHTML = content.documentElement.innerHTML;
	},

	// clear everything
	// TODO: use more jQuery
	
	clear: function() {
		this._svg.context.textContent = '';
	},

	// save svg
	// TODO: use more jQuery
	
	save: function() {
		// Remove controls if present
		d3.select(this._svg.context).select('.svgcontrols').remove();

		var blob = new Blob( [ this.toString() ], { type: 'text/plain' } );

		this._downloadlink[0].href = URL.createObjectURL( blob );
		this._downloadlink[0].download = title.value + '.svg';
		this._downloadlink[0].click();
	},

	// TODO: custom width and height

	toString: function() {
		return [
			'<?xml version="1.0" encoding="UTF-8"?>\n',
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">\n',
			this._svg.context.innerHTML,
			'</svg>'
		].join( '' );
	},

    // repositions the panel in the light of css or other visual changes

    refresh: function () {

        this._reposition();
    },

    _reposition: function (event) {

		this._movement = this.MovementCode.Moving;
		var target = $(event.target).parents(".addedsvg");

		// TODO: collect them to svg-scale class

		if( $(event.target).hasClass('svg-scale-bottomright') ) {
			this._movement = this.MovementCode.BottomRight;
			this._offset.x = event.clientX;
			this._offset.y = event.clientY;
			this._transformOffset = this._getTransformations( $(this._selected).attr('transform') );
			return;
		}

		if( $(event.target).hasClass('svg-scale-bottomleft') ) {
			this._movement = this.MovementCode.BottomLeft;
			this._offset.x = event.clientX;
			this._offset.y = event.clientY;
			this._transformOffset = this._getTransformations( $(this._selected).attr('transform') );
			return;
		}

		if( $(event.target).hasClass('svg-scale-topright') ) {
			this._movement = this.MovementCode.TopRight;
			this._offset.x = event.clientX;
			this._offset.y = event.clientY;
			this._transformOffset = this._getTransformations( $(this._selected).attr('transform') );
			return;
		}

		if( $(event.target).hasClass('svg-scale-topleft') ) {
			this._movement = this.MovementCode.TopLeft;
			this._offset.x = event.clientX;
			this._offset.y = event.clientY;
			this._transformOffset = this._getTransformations( $(this._selected).attr('transform') );
			return;
		}

		if( $(event.target).hasClass('svg-rotate') ) {
			this._movement = this.MovementCode.Rotate;
			this._offset.x = event.clientX;
			this._offset.y = event.clientY;
			this._transformOffset = this._getTransformations( $(this._selected).attr('transform') );
			this._rectOffset = this._selected[0].getBoundingClientRect();

			// if image is rotated, the image will need offsetting
			var alpha = this._transformOffset.rotate * Math.PI / 180;
			var x = (this._transformOffset.scaleX * this._rectOffset.width)/2;
			var y = (this._transformOffset.scaleY * this._rectOffset.height)/2;
			var e = -Math.cos(alpha)*x + Math.sin(alpha)*y + x;
			var f = -Math.sin(alpha)*x - Math.cos(alpha)*y + y;
			this._transformOffset.translateX -= e;
			this._transformOffset.translateY -= f;

			var self = this;
			d3.select('.svgcontrols')
				.attr('transform', function() {
					return [
						'translate(', self._transformOffset.translateX, ', ', self._transformOffset.translateY, ') ',
						'rotate(', self._transformOffset.rotate, ', ', x, ', ', y, ') ',
						//'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});
			d3.select(this._selected[0])
				.attr('transform', function() {
					return [
						'translate(', self._transformOffset.translateX, ', ', self._transformOffset.translateY, ') ',
						'rotate(', self._transformOffset.rotate, ', ', x, ', ', y, ') ',
						'scale(', self._transformOffset.scaleX, ', ', self._transformOffset.scaleY, ')',
					].join('');
				});

			return;
		}

		if ( target.context.isSameNode( this._svg.context ) === false ) {

			// Getting
			var transform_text = $(target).attr('transform');
			if(transform_text == null) {
				$(target).attr("transform", function() {
					return [
						'translate(0, 0) ',
						'rotate(0) ',
						'scale(1, 1)',
					].join('');
				});
				var firstX = 0, firstY = 0;
			} else {
				var transform = this._getTransformations(transform_text);
				$(target).attr("transform", function() {
					return [
						'translate(', transform.translateX, ', ', transform.translateY, ') ',
						'rotate(', transform.rotate, ') ',
						'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});

				var firstX = transform.translateX,
					firstY = transform.translateY;
			}

			this._offset.x = parseFloat( firstX ) - event.clientX;
			this._offset.y = parseFloat( firstY ) - event.clientY;


			this._selected = target;
			this._updateSelection( target[0] );

		} else {
			this._selected = null;

			this._updateSelection(target.context);
		}
    },

	_updateSelection: function(element) {

		if ( element.isSameNode( this._svg.context ) ) {

			d3.select(this._svg.context).select('.svgcontrols').remove();
			return;

		}

		if( $(this._svg).find('.svgcontrols').length < 1) {
			var transform = this._getTransformations( $(element).attr('transform') );
			var rect = element.getBBox();
			rect.width *= transform.scaleX;
			rect.height *= transform.scaleY;
			var controls = 	d3.select(this._svg.context).append('g')
				.attr('class', 'svgcontrols')
				.attr('transform', function() {
					return [
						'translate(', transform.translateX, ', ', transform.translateY, ') ',
						'rotate(', transform.rotate, ') ',
						//'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});
			controls.append('rect')
				.attr('class', 'svgboundrect')
				.attr('x', -10)
				.attr('y', -10)
				.attr('width', rect.width + 20)
				.attr('height', rect.height + 20)
				.attr('style', 'stroke: red; fill-opacity: 0; pointer-events: none;');
			controls.append('circle')
				.attr('class', 'svg-scale-topleft')
				.attr('r', 5)
				.attr('cx', -10)
				.attr('cy', -10);
			controls.append('circle')
				.attr('class', 'svg-scale-topright')
				.attr('r', 5)
				.attr('cx', rect.width + 10)
				.attr('cy', -10);
			controls.append('circle')
				.attr('class', 'svg-scale-bottomleft')
				.attr('r', 5)
				.attr('cx', -10)
				.attr('cy', rect.height + 10);
			controls.append('circle')
				.attr('class', 'svg-scale-bottomright')
				.attr('r', 5)
				.attr('cx', rect.width + 10)
				.attr('cy', rect.height + 10);
			controls.append('circle')
				.attr('class', 'svg-rotate')
				.attr('r', 5)
				.attr('cx', rect.width/2)
				.attr('cy', rect.height + 30);
		} else {
			var transform = this._getTransformations( $(element).attr('transform') );
			var rect = element.getBBox();
			rect.width *= transform.scaleX;
			rect.height *= transform.scaleY;
			var controls = d3.select('.svgcontrols')
				.attr('transform', function() {
					return [
						'translate(', transform.translateX, ', ', transform.translateY, ') ',
						'rotate(', transform.rotate, ') ',
						//'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});
			controls.select('.svgboundrect')
				.attr('width', rect.width + 20)
				.attr('height', rect.height + 20);
			controls.select('.svg-scale-topright')
				.attr('cx', rect.width + 10);
			controls.select('.svg-scale-bottomleft')
				.attr('cy', rect.height + 10);
			controls.select('.svg-scale-bottomright')
				.attr('cx', rect.width + 10)
				.attr('cy', rect.height + 10);
			controls.select('.svg-rotate')
				.attr('cx', rect.width/2)
				.attr('cy', rect.height + 30);
		}
	},

	_movesvg: function(event) {
		if(this._movement == this.MovementCode.BottomRight) {
			var transform = this._getTransformations( this._selected.attr('transform') );
			var rect = this._selected[0].getBBox();

			// Matrix rotation, if svg is rotated
			var alpha = -transform.rotate / 180 * Math.PI;
			var x = (event.clientX - this._offset.x)*Math.cos(alpha) - (event.clientY - this._offset.y)*Math.sin(alpha);
			var y = (event.clientX - this._offset.x)*Math.sin(alpha) + (event.clientY - this._offset.y)*Math.cos(alpha);
			this._selected[0].transform.baseVal.getItem(2).setScale(
				this._transformOffset.scaleX + x/rect.width,
				this._transformOffset.scaleY + y/rect.height );

			rect.width *= transform.scaleX;
			rect.height *= transform.scaleY;

			var controls = d3.select('.svgcontrols');
			controls.select('.svgboundrect')
				.attr('width', rect.width + 20)
				.attr('height', rect.height + 20);
			controls.select('.svg-scale-topright')
				.attr('cx', rect.width + 10);
			controls.select('.svg-scale-bottomleft')
				.attr('cy', rect.height + 10);
			controls.select('.svg-scale-bottomright')
				.attr('cx', rect.width + 10)
				.attr('cy', rect.height + 10);
			controls.select('.svg-rotate')
				.attr('cx', rect.width/2)
				.attr('cy', rect.height + 30);

		} else if(this._movement == this.MovementCode.BottomLeft) {

			var rect = this._selected[0].getBBox();
			var transform = this._getTransformations( this._selected.attr('transform') );

			var alpha = -transform.rotate / 180 * Math.PI;
			var x = (event.clientX - this._offset.x)*Math.cos(alpha) - (event.clientY - this._offset.y)*Math.sin(alpha);
			var y = (event.clientX - this._offset.x)*Math.sin(alpha) + (event.clientY - this._offset.y)*Math.cos(alpha);
			this._selected[0].transform.baseVal.getItem(2).setScale(
				this._transformOffset.scaleX - x/rect.width,
				this._transformOffset.scaleY + y/rect.height );
			y = x*Math.sin(-alpha);
			x = x*Math.cos(-alpha);
			this._selected[0].transform.baseVal.getItem(0).setTranslate(this._transformOffset.translateX + x, this._transformOffset.translateY + y);
			var rect = this._selected[0].getBBox();

			rect.width *= transform.scaleX;
			rect.height *= transform.scaleY;

			var controls = d3.select('.svgcontrols')
				.attr('transform', function() {
					return [
						'translate(', transform.translateX, ', ', transform.translateY, ') ',
						'rotate(', transform.rotate, ') ',
						//'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});
			controls.select('.svgboundrect')
				.attr('width', rect.width + 20)
				.attr('height', rect.height + 20);
			controls.select('.svg-scale-topright')
				.attr('cx', rect.width + 10);
			controls.select('.svg-scale-bottomleft')
				.attr('cy', rect.height + 10);
			controls.select('.svg-scale-bottomright')
				.attr('cx', rect.width + 10)
				.attr('cy', rect.height + 10);
			controls.select('.svg-rotate')
				.attr('cx', rect.width/2)
				.attr('cy', rect.height + 30);

		} else if(this._movement == this.MovementCode.TopRight) {

			var rect = this._selected[0].getBBox();
			var transform = this._getTransformations( this._selected.attr('transform') );

			var alpha = -transform.rotate / 180 * Math.PI;
			var x = (event.clientX - this._offset.x)*Math.cos(alpha) - (event.clientY - this._offset.y)*Math.sin(alpha);
			var y = (event.clientX - this._offset.x)*Math.sin(alpha) + (event.clientY - this._offset.y)*Math.cos(alpha);
			this._selected[0].transform.baseVal.getItem(2).setScale(
				this._transformOffset.scaleX + x/rect.width,
				this._transformOffset.scaleY - y/rect.height );
			x = -y*Math.sin(-alpha);
			y = y*Math.cos(-alpha);
			this._selected[0].transform.baseVal.getItem(0).setTranslate(this._transformOffset.translateX + x, this._transformOffset.translateY + y);
			var rect = this._selected[0].getBBox();

			rect.width *= transform.scaleX;
			rect.height *= transform.scaleY;

			var controls = d3.select('.svgcontrols')
				.attr('transform', function() {
					return [
						'translate(', transform.translateX, ', ', transform.translateY, ') ',
						'rotate(', transform.rotate, ') ',
						//'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});
			controls.select('.svgboundrect')
				.attr('width', rect.width + 20)
				.attr('height', rect.height + 20);
			controls.select('.svg-scale-topright')
				.attr('cx', rect.width + 10);
			controls.select('.svg-scale-bottomleft')
				.attr('cy', rect.height + 10);
			controls.select('.svg-scale-bottomright')
				.attr('cx', rect.width + 10)
				.attr('cy', rect.height + 10);
			controls.select('.svg-rotate')
				.attr('cx', rect.width/2)
				.attr('cy', rect.height + 30);
		} else if ( this._movement == this.MovementCode.TopLeft ) {

			var rect = this._selected[0].getBBox();
			var transform = this._getTransformations( this._selected.attr('transform') );

			var alpha = -transform.rotate / 180 * Math.PI;
			var x = (event.clientX - this._offset.x)*Math.cos(alpha) - (event.clientY - this._offset.y)*Math.sin(alpha);
			var y = (event.clientX - this._offset.x)*Math.sin(alpha) + (event.clientY - this._offset.y)*Math.cos(alpha);
			this._selected[0].transform.baseVal.getItem(2).setScale(
				this._transformOffset.scaleX - x/rect.width,
				this._transformOffset.scaleY - y/rect.height );
			this._selected[0].transform.baseVal.getItem(0).setTranslate(this._transformOffset.translateX + (event.clientX - this._offset.x), this._transformOffset.translateY + (event.clientY - this._offset.y) );
			var rect = this._selected[0].getBBox();

			rect.width *= transform.scaleX;
			rect.height *= transform.scaleY;

			var controls = d3.select('.svgcontrols')
				.attr('transform', function() {
					return [
						'translate(', transform.translateX, ', ', transform.translateY, ') ',
						'rotate(', transform.rotate, ') ',
						//'scale(', transform.scaleX, ', ', transform.scaleY, ')',
					].join('');
				});
			controls.select('.svgboundrect')
				.attr('width', rect.width + 20)
				.attr('height', rect.height + 20);
			controls.select('.svg-scale-topright')
				.attr('cx', rect.width + 10);
			controls.select('.svg-scale-bottomleft')
				.attr('cy', rect.height + 10);
			controls.select('.svg-scale-bottomright')
				.attr('cx', rect.width + 10)
				.attr('cy', rect.height + 10);
			controls.select('.svg-rotate')
				.attr('cx', rect.width/2)
				.attr('cy', rect.height + 30);

		} else if ( this._movement == this.MovementCode.Rotate ) {
			var self = this;

			// TODO: optimize
			var a1 = this._rectOffset.x + (this._transformOffset.scaleX * this._rectOffset.width)/2;
			var a2 = this._rectOffset.y + (this._transformOffset.scaleY * this._rectOffset.height)/2;

			var b1 = event.clientX - a1;
			var b2 = event.clientY - a2;

			// TODO: point of rotation is inconsistent
			a1 = 0;
			a2 = 50;

			var rotate = Math.acos((a1*b1+a2*b2)/Math.sqrt((a1*a1+a2*a2)*(b1*b1+b2*b2)))*180/Math.PI;
			//var transform = this._getTransformations( this._selected.attr('transform') );

			if(b1 < 0) {
				d3.select('.svgcontrols')._groups[0][0].transform.baseVal.getItem(1).setRotate(
					rotate, (self._transformOffset.scaleX * self._rectOffset.width)/2, (self._transformOffset.scaleY * self._rectOffset.height)/2 );
				this._selected[0].transform.baseVal.getItem(1).setRotate(
					rotate, (self._transformOffset.scaleX * self._rectOffset.width)/2, (self._transformOffset.scaleY * self._rectOffset.height)/2 );
			} else {
				d3.select('.svgcontrols')._groups[0][0].transform.baseVal.getItem(1).setRotate(
					-rotate, (self._transformOffset.scaleX * self._rectOffset.width)/2, (self._transformOffset.scaleY * self._rectOffset.height)/2 );
				this._selected[0].transform.baseVal.getItem(1).setRotate(
					-rotate, (self._transformOffset.scaleX * self._rectOffset.width)/2, (self._transformOffset.scaleY * self._rectOffset.height)/2 );
			}

		}
		else if ( this._selected && this._movement != this.MovementCode.None ) {
			this._selected[0].transform.baseVal.getItem(0).setTranslate( event.clientX + this._offset.x, event.clientY + this._offset.y );
			d3.select('.svgcontrols')._groups[0][0].transform.baseVal.getItem(0).setTranslate( event.clientX + this._offset.x, event.clientY + this._offset.y );

			this._updateSelection( this._selected[0] );

		}
	},

	_stopmoving: function() {
		this._movement = this.MovementCode.None;
		if(this._selected) {
			var transform = this._getTransformations( $(this._selected).attr('transform') );
			$(this._selected).attr("transform", function() {
				return [
					'translate(', transform.translateX, ', ', transform.translateY, ') ',
					'rotate(', transform.rotate, ') ',
					'scale(', transform.scaleX, ', ', transform.scaleY, ')',
				].join('');
			});
		}
	},

	_getTransformations: function(transform) {
		// Create a dummy g for calculation purposes only. This will never
		// be appended to the DOM and will be discarded once this function
		// returns.
		var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

		// Set the transform attribute to the provided string value.
		g.setAttributeNS(null, "transform", transform);

		// consolidate the SVGTransformList containing all transformations
		// to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
		// its SVGMatrix.
		var matrix = g.transform.baseVal.consolidate().matrix;

		// Below calculations are taken and adapted from the private function
		// transform/decompose.js of D3's module d3-interpolate.
		var {a, b, c, d, e, f} = matrix;   // ES6, if this doesn't work, use below assignment
		// var a=matrix.a, b=matrix.b, c=matrix.c, d=matrix.d, e=matrix.e, f=matrix.f; // ES5
		var scaleX, scaleY, skewX;
		if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
		if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
		if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
		if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
		return {
			translateX: e,
			translateY: f,
			rotate: Math.atan2(b, a) * 180 / Math.PI,
			skewX: Math.atan(skewX) * 180 / Math.PI,
			scaleX: scaleX,
			scaleY: scaleY
		};
	},
});
