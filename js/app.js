(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

$(document).ready(function () {
	var WIDTH = $(window).width();
	var HEIGHT = $(window).height() - $(".top-bar").outerHeight();


	$("#canvas").width(WIDTH);
	$("#canvas").height(HEIGHT);

	// The fabric canvas offers us an easy way to throw up some circles, and drag and drop them by default
	var canvas = new fabric.Canvas("canvas");
	canvas.setWidth(WIDTH);
	canvas.setHeight(HEIGHT);

	// We use a second canvas underneath the fabric canvas to render the field lines
	// The field line rendering method can then access the raw graphics context of this canvas
	// and draw the many lines more efficiently.
	var renderCanvas = $("#canvas").clone();
	renderCanvas.attr("id", "renderCanvas");
	$(".canvas-container").prepend(renderCanvas);
	var context = $("#renderCanvas").get(0).getContext("2d");

	var cs = new CoordinateSystem(WIDTH, HEIGHT);
	cs.calculateTransformation();

	var sim = new SimulationManager(cs, canvas, context);
});

var CoordinateSystem = function () {
	function CoordinateSystem(realWidth, realHeight) {
		_classCallCheck(this, CoordinateSystem);

		this.realWidth = realWidth;
		this.realHeight = realHeight;

		this.maxX = 10;
		this.minX = -10;
		this.maxY = 10;
		this.minY = -10;
	}

	_createClass(CoordinateSystem, [{
		key: "autoSetFromWidth",
		value: function autoSetFromWidth(width) {
			// Sets left, top, width, and height such that the resultant coordinate system has the origin in the middle of the screen,
			// the desired width given, and a height determined from the width such that the aspect ratio is 1:1

			this.minX = -width / 2;
			this.maxX = width / 2;

			var h = width / this.realWidth * this.realHeight;

			this.maxy = h / 2;
			this.miny = -h / 2;
		}
	}, {
		key: "calculateTransformation",
		value: function calculateTransformation() {
			var left = this.minX;
			var top = this.maxY;
			var width = this.maxX - this.minX;
			var height = -(this.maxY - this.minY);

			var tx = (0 - left) / width * this.realWidth;
			var ty = (0 - top) / height * this.realHeight;

			var sx = 1 / width * this.realWidth;
			var sy = 1 / height * this.realHeight;

			this.transform = { sx: sx, sy: sy, tx: tx, ty: ty };
		}
	}, {
		key: "coordToPixels",
		value: function coordToPixels(p) {
			return [this.transform.tx + this.transform.sx * p[0], this.transform.ty + this.transform.sy * p[1]];
		}
	}, {
		key: "pixelsToCoord",
		value: function pixelsToCoord(p) {
			return [-1.0 * this.transform.tx / this.transform.sx + 1.0 / this.transform.sx * p[0], -1.0 * this.transform.ty / this.transform.sy + 1.0 / this.transform.sy * p[1]];
		}
	}, {
		key: "inBounds",
		value: function inBounds(p) {
			return p[0] > this.minX && p[0] < this.maxX && p[1] > this.minY && p[1] < this.maxY;
		}
	}, {
		key: "inRealBounds",
		value: function inRealBounds(p) {
			return p[0] > 0 && p[0] < this.realWidth && p[1] > 0 && p[1] < this.realHeight;
		}
	}]);

	return CoordinateSystem;
}();

var rk4 = require('ode-rk4');
var jm = require('justmath');

var PointCharge = function PointCharge(point, value) {
	_classCallCheck(this, PointCharge);

	this.point = point; // in simulation coordinate system (m)
	this.value = value; // Coulumbs
};

var SimulationManager = function () {
	function SimulationManager(coordinates, canvas, renderContext) {
		var _this = this;

		_classCallCheck(this, SimulationManager);

		this.cs = coordinates;
		this.canvas = canvas;
		this.renderContext = renderContext;
		this.charges = [];

		this.canvas.on("mouse:down", function (info) {
			if (!info.e.ctrlKey) return;
			var p = [info.e.offsetX, info.e.offsetY];
			var ap = _this.cs.pixelsToCoord(p);
			var c = new PointCharge(new (Function.prototype.bind.apply(jm.Vec2, [null].concat(_toConsumableArray(ap))))(), 1);
			var g = _this.drawCharge(c);
			c.graphics = g;
			_this.charges.push(c);
			_this.renderField();
		});
		this.canvas.on("object:modified", function (info) {
			var p = [info.target.left, info.target.top];
			var ap = _this.cs.pixelsToCoord(p);
			var c = _this.charges.find(function (x) {
				return x.graphics == info.target;
			});
			c.point = new (Function.prototype.bind.apply(jm.Vec2, [null].concat(_toConsumableArray(ap))))();
			_this.renderField();
		});
		$(canvas.wrapperEl).on('mousewheel', function (e) {
			var target = canvas.findTarget(e);
			var delta = e.originalEvent.wheelDelta;
			if (target) {
				var c = _this.charges.find(function (x) {
					return x.graphics == target;
				});
				c.value = delta > 0 ? c.value + 0.4 : c.value - 0.4;
				_this.renderField();
				c.graphics.remove();
				c.graphics = _this.drawCharge(c);
			}
		});
	}

	_createClass(SimulationManager, [{
		key: "drawCharge",
		value: function drawCharge(c) {
			var p = this.cs.coordToPixels([c.point.getX(), c.point.getY()]);
			var c = new fabric.Circle({
				originX: "center",
				originY: "center",
				left: p[0],
				top: p[1],
				stroke: "black",
				fill: c.value < 0 ? "blue" : "red",
				radius: Math.max(15 * Math.sqrt(Math.abs(c.value)), 8),
				hasControls: false
			});
			this.canvas.add(c);
			return c;
		}
	}, {
		key: "calcField",
		value: function calcField(point) {
			var sum = new jm.Vec2(0, 0);
			var highComponents = false;
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this.charges[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var charge = _step.value;

					var toPoint = point.clone().sub(charge.point);
					var magSq = toPoint.magSq();
					var contrib = toPoint.norm().scale(charge.value / magSq);
					sum.add(contrib);
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			return sum;
		}
	}, {
		key: "clearField",
		value: function clearField() {
			this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);
		}
	}, {
		key: "renderField",
		value: function renderField() {
			this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);

			var gridStep = (this.cs.maxX - this.cs.minX) / 80;
			var maxLength = gridStep * 0.8;

			var vec = new jm.Vec2(0, 0);
			var longest = new jm.Vec2(0.1, 0.1);

			var cx = this.cs.minX;
			while (cx < this.cs.maxX) {
				var cy = this.cs.minY;
				while (cy < this.cs.maxY) {

					vec.set(cx, cy);

					var dists = this.charges.map(function (x) {
						return vec.distSq(x.point);
					});

					var field = this.calcField(vec);
					if (field.magSq() > maxLength * maxLength) field.norm().scale(maxLength);
					var stepped = vec.clone().add(field);

					var start = this.cs.coordToPixels([cx, cy]);
					var end = this.cs.coordToPixels([stepped.getX(), stepped.getY()]);

					this.renderContext.beginPath();
					this.renderContext.moveTo(start[0], start[1]);
					this.renderContext.lineTo(end[0], end[1]);
					this.renderContext.stroke();

					cy += gridStep;
				}
				cx += gridStep;
			}
		}
	}, {
		key: "renderFieldLines",
		value: function renderFieldLines() {
			var _this2 = this;

			// Unit vectors in evenly spaced directions
			var directions = [0, 1, 2, 3, 4, 5].map(function (k) {
				return new jm.Vec2(Math.cos(2 * Math.PI * k / 6), Math.sin(2 * Math.PI * k / 6));
			});

			this.renderContext.clearRect(0, 0, this.cs.realWidth, this.cs.realHeight);

			var allNegative = true;
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = this.charges[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var charge = _step2.value;

					if (charge.value > 0) allNegative = false;
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}

			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = this.charges[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var charge = _step3.value;


					//if (!allNegative && charge.value < 0) continue;
					var isNegative = charge.value < 0;

					var _iteratorNormalCompletion4 = true;
					var _didIteratorError4 = false;
					var _iteratorError4 = undefined;

					try {
						for (var _iterator4 = directions[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
							var dir = _step4.value;


							var start = dir.clone().scale(0.1).add(charge.point);

							var vec = new jm.Vec2(0, 0);
							var currentField;

							var solver = rk4([start.getX(), start.getY()], function (drdt, r, t) {
								vec.set(r[0], r[1]);
								currentField = _this2.calcField(vec);
								drdt[0] = currentField.getX() * (isNegative ? -1 : 1);
								drdt[1] = currentField.getY() * (isNegative ? -1 : 1);
							}, 0, 0.01);

							var as = this.cs.coordToPixels([start.getX(), start.getY()]);

							this.renderContext.beginPath();
							this.renderContext.moveTo(as[0], as[1]);

							var counter = 0;
							var ap;
							var fp = new fabric.Point(0, 0);
							while (true) {
								solver.step();
								ap = this.cs.coordToPixels(solver.y);
								if (counter == 10) {
									if (!this.cs.inRealBounds(ap)) break;
									this.renderContext.lineTo(ap[0], ap[1]);
									counter = 0;
								}

								fp.setXY.apply(fp, _toConsumableArray(ap));
								if (this.charges.find(function (x) {
									return x.graphics.containsPoint(fp);
								})) break;

								// if (currentField.getX() < 0.1 || currentField.getY() < 0.1) {
								// 	if (currentField.magSq() < 0.05) {
								// 		break;
								// 	}
								// }

								counter += 1;
							}

							this.renderContext.stroke();

							// var start = dir.clone().scale(0.1).add(charge.point);
							//
							// var vec = new jm.Vec2(0, 0);
							// var currentField;
							//
							// var step = (start.getX() - charge.point.getX() > 0) ? 0.001 : -0.001;
							// var solver = rk4([start.getY()], (dydx, y, x) => {
							// 	vec.set(x, y);
							// 	currentField = this.calcField(vec);
							// 	dydx[0] = currentField.getY() / currentField.getX();
							// }, start.getX(), step);
							//
							// var as = this.cs.coordToPixels([start.getX(), start.getY()]);
							//
							// this.renderContext.beginPath();
							// this.renderContext.moveTo(as[0], as[1]);
							//
							// var counter = 0;
							// var ap;
							// while (true) {
							// 	solver.step();
							// 	if (counter == 10) {
							// 		ap = this.cs.coordToPixels([solver.t, solver.y[0]]);
							// 		if (!this.cs.inRealBounds(ap)) break;
							// 		this.renderContext.lineTo(ap[0], ap[1]);
							// 		counter = 0;
							// 	}
							// 	counter += 1;
							// }
							//
							// console.log(solver);
							// this.renderContext.stroke();
						}
					} catch (err) {
						_didIteratorError4 = true;
						_iteratorError4 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion4 && _iterator4.return) {
								_iterator4.return();
							}
						} finally {
							if (_didIteratorError4) {
								throw _iteratorError4;
							}
						}
					}
				}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}
		}
	}]);

	return SimulationManager;
}();
},{"justmath":2,"ode-rk4":3}],2:[function(require,module,exports){
/*
Copyright 2013 Daniel Wirtz <dcode@dcode.io>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @license JustMath.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/JustMath.js for details
 */
(function(global, Math) {
    "use strict";
    
    // What is done here is to lend the core math from the environments Math module. By doing so, it's possible to
    // replace some or all of the core ops by our own implementations if needed. Additionally some convenience
    // functions are introduced to easily work with, like sq() or cot(), and Vec2 is exposed on top of the
    // namespace. Nice side-effect: Even catchier documentation by being able to refer to what's basically just core
    // Math.
    
    /**
     * „Nope, just Math.“
     * @exports JustMath
     * @namespace
     * @expose
     */
    var JustMath = {};
    
    // Constants
    
    /**
     * Represents the ratio of the circumference of a circle to its diameter, specified by the constant, π.
     * @type {number}
     * @const
     * @expose
     */
    JustMath.PI = Math.PI;
    
    /**
     * Respresents the square root of 2.
     * @type {number}
     * @const
     * @expose
     */
    JustMath.SQRT2 = Math.SQRT2;
    
    /**
     * Respresents the square root of 1/2.
     * @type {number}
     * @const
     * @expose
     */
    JustMath.SQRT1_2 = Math.SQRT1_2;
    
    // Functions
    
    /**
     * Calculates the absolute of the specified number.
     * @function
     * @param {number} n Number
     * @return {number} Absolute value
     * @expose
     */
    JustMath.abs = Math.abs;
    
    /**
     * Returns the lesser of the two specified numbers.
     * @function
     * @param {number} n Number
     * @param {number} m Number
     * @return {number} The lesser of the two specified numbers
     * @expose
     */
    JustMath.min = Math.min;
    
    /**
     * Returns the biffer of the two specified numbers.
     * @function
     * @param {number} n Number
     * @param {number} m Number
     * @return {number} The bigger of the two specified numbers
     * @expose
     */
    JustMath.max = Math.max;
    
    /**
     * Floors the specified number.
     * @function
     * @param {number} n Number
     * @return {number} Floored value
     * @expose
     */
    JustMath.floor = Math.floor;
    
    /**
     * Ceils the specified number.
     * @function
     * @param {number} n Number
     * @return {number} Ceiled value
     * @expose
     */
    JustMath.ceil = Math.ceil;
    
    /**
     * Rounds the specified number.
     * @function
     * @param {number} n Number
     * @return {number} Rounded value
     * @expose
     */
    JustMath.round = Math.round;
    
    /**
     * Calculates the square root of the specified number.
     * @function
     * @param {number} n Number
     * @return {number} Square root of the specified number
     * @expose
     */
    JustMath.sqrt = Math.sqrt;
    
    /**
     * Calculates the square of the specified number.
     * @function
     * @param {number} n Number
     * @return {number} The square of the specified number
     * @expose
     */
    JustMath.sq = function(n) { return n*n; };
    
    /**
     * Calculates the specified number raised to the specified power.
     * @function
     * @param {number} n Number
     * @param {number} p Power
     * @return {number} The specified number raised to the specified power
     * @expose
     */
    JustMath.pow = Math.pow;
    
    /**
     * Calculates the sine of the specified angle.
     * @function
     * @param {number} a Angle
     * @return {number} Sine of the specified angle
     * @expose
     */
    JustMath.sin = Math.sin;
    
    /**
     * Calculates the cosine of the specified angle.
     * @function
     * @param {number} a Angle
     * @return {number} Cosine of the specified angle
     * @expose
     */
    JustMath.cos = Math.cos;
    
    /**
     * Calculates the tangent of the specified angle.
     * @function
     * @param {number} a Angle
     * @return {number} Tangent of the specified angle
     * @expose
     */
    JustMath.tan = Math.tan;
    
    /**
     * Calculates the cotangent of the specified angle.
     * @function
     * @param {number} a Angle
     * @return {number} Cotangent of the specified angle
     * @expose
     */
    JustMath.cot = function(a) { return 1/JustMath.tan(a); };
    
    /**
     * Calculates the angle whose sine is the specified number.
     * @function
     * @param {number} n Number
     * @return {number} The angle whose sine is the specified number
     * @expose
     */
    JustMath.asin = Math.asin;
    
    /**
     * Calculates the angle whose cosine is the specified number.
     * @function
     * @param {number} n Number
     * @return {number} The angle whose cosine is the specified number
     * @expose
     */
    JustMath.acos = Math.acos;
    
    /**
     * Calculates the angle whose tangent is the specified number.
     * @function
     * @param {number} n Number
     * @return {number} The angle whose tangent is the specified number
     * @expose
     */
    JustMath.atan = Math.atan;
    
    /**
     * Calculates the angle whose tangent is the quotient of the two specified values.
     * @function
     * @param {number} y Value
     * @param {number} x Value
     * @return {number} The angle whose tangent is the quotient of the two specified values
     * @expose
     */
    JustMath.atan2 = Math.atan2;
    
    /**
     * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
     * @function
     * @return {number} Pseudo-random number between 0 (inclusive) and 1 (exclusive)
     * @expose
     */
    JustMath.random = Math.random;
    
    /**
     * Constructs a new Vec2.
     * @exports JustMath.Vec2
     * @class Represents a two dimensional vector. Vector operations always affect the initial Vec2 instance and return
     * the instance itself for chaining. So use {@link JustMath.Vec2#clone} where necessary. This is done to
     * reduce the allocation footprint slightly.
     * @param {JustMath.Vec2|number} vOrX Other Vec2 to copy or X coordinate
     * @param {number=} y Y coordinate if vOrX is X coordinate
     * @constructor
     */
    var Vec2 = function Vec2(vOrX, y) {
        
        /**
         * X coordinate.
         * @type {number}
         * @expose
         */
        this.x = 0;
    
        /**
         * Y coordinate.
         * @type {number}
         * @expose
         */
        this.y = 0;
    
        if (arguments.length == 1) {
            this.x = vOrX.x;
            this.y = vOrX.y;
        } else if (arguments.length == 2) {
            this.x = vOrX;
            this.y = y;
        }
    };
    
    /**
     * Clones this Vec2.
     * @return {JustMath.Vec2} Cloned Vec2
     * @expose
     */
    Vec2.prototype.clone = function() {
        return new Vec2(this);
    };
    
    /**
     * Copies this Vec2. This is an alias of {@link JustMath.Vec2#clone}.
     * @function
     * @return {JustMath.Vec2} Copied Vec2
     * @expose
     */
    Vec2.prototype.copy = Vec2.prototype.clone;
    
    /**
     * Gets the X coordinate of this Vec2.
     * @return {number} X coordinate
     * @expose
     */
    Vec2.prototype.getX = function() {
        return this.x;
    };
    
    /**
     * Gets the Y coordinate of this Vec2.
     * @return {number} Y coordinate
     * @expose
     */
    Vec2.prototype.getY = function() {
        return this.y;
    };
    
    /**
     * Gets the coordinate payload of this Vec2.
     * @return {{x: number, y: number}} Coordinate payload
     * @expose
     */
    Vec2.prototype.getXY = function() {
        return {
            "x": this.x,
            "y": this.y
        };
    };
    
    /**
     * Sets the coordinates of this Vec2.
     * @param {JustMath.Vec2|number} vOrX Other Vec2 or X coordinate
     * @param {number=} y Y coordinate if vOrX is X coordinate
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.set = function(vOrX, y) {
        if (arguments.length == 1) {
            if (typeof vOrX != 'object') {
                throw("Not an object: "+vOrX);
            }
            this.x = vOrX.x;
            this.y = vOrX.y;
        } else {
            this.x = vOrX;
            this.y = y;
        }
        return this;
    };
    
    /**
     * Adds a value to this Vec2.
     * @param {JustMath.Vec2|number} vOrX Other Vec2 or X coordinate
     * @param {number=} y Y coordinate if vOrX is X coordinate
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.add = function(vOrX, y) {
        if (arguments.length == 1) {
            this.x += vOrX.x;
            this.y += vOrX.y;
        } else {
            this.x += vOrX;
            this.y += y;
        }
        return this;
    };
    
    /**
     * Subtracts a value from this Vec2.
     * @param {JustMath.Vec2|number} vOrX Other Vec2 or X coordinate
     * @param {number=} y Y coordinate if vOrX is X coordinate
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.sub = function(vOrX, y) {
        if (arguments.length == 1) {
            this.x -= vOrX.x;
            this.y -= vOrX.y;
        } else {
            this.x -= vOrX;
            this.y -= y;
        }
        return this;
    };
    
    /**
     * Inverts this Vec2.
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.inv = function() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    };
    
    /**
     * Makes this Vec2 an orthogonal of itself by setting x=-y and y=x.
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.ort = function() {
        return this.set(-this.y, this.x);
    };
    
    /**
     * Scales this Vec2 by a factor.
     * @param {number} factor Scaling factor
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.scale = function(factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    };
    
    /**
     * Calculates the dot product of this and another Vec2.
     * @param {JustMath.Vec2} b Other Vec2
     * @return {number} Dot product
     * @expose
     */
    Vec2.prototype.dot = function(b) {
        return this.x * b.x + this.y * b.y;
    };
    
    /**
     * Normalizes this Vec2.
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.norm = function() {
        var l = JustMath.sqrt(this.dot(this));
        if (l != 0) {
            this.x = this.x / l;
            this.y = this.y / l;
        }
        return this;
    };
    
    /**
     * Calculates the squared distance between this and another Vec2.
     * @param {JustMath.Vec2} b Other Vec2
     * @return {number} Squared distance
     * @expose
     */
    Vec2.prototype.distSq = function(b) {
        var dx = this.x - b.x;
        var dy = this.y - b.y;
        return dx * dx + dy * dy;
    };
    
    /**
     * Calculates the distance between this and another Vec2.
     * This operation requires a call to {@link JustMath.sqrt}.
     * @param {JustMath.Vec2} b Other Vec2
     * @return {number} Distance
     * @expose
     */
    Vec2.prototype.dist = function(b) {
        return JustMath.sqrt(this.distSq(b));
    };
    
    /**
     * Calculates the direction of this Vec2.
     * This operation requires a call to {@link JustMath.atan2}.
     * @return {number} Direction in radians
     * @expose
     */
    Vec2.prototype.dir = function() {
        return JustMath.atan2(this.y, this.x);
    };
    
    /**
     * Calculates the squared magnitude of this Vec2.
     * @return {number} Squared magnitude
     * @expose
     */
    Vec2.prototype.magSq = function() {
        return this.dot(this);
    };
    
    /**
     * Calculates the magnitude of this Vec2.
     * This operation requires a call to {@link JustMath.sqrt}.
     * @return {number} Magnitude
     * @expose
     */
    Vec2.prototype.mag = function() {
        return JustMath.sqrt(this.magSq());
    };
    
    /**
     * Rotates this Vec2 by the given angle.
     * This operation requires a call to {@link JustMath.sin} and {@link JustMath.cos}.
     * @param {number} theta Rotation angle in radians
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.rotate = function(theta) {
        var sin = JustMath.sin(theta);
        var cos = JustMath.cos(theta);
        var x = this.x * cos - this.y * sin;
        this.y = this.x * sin + this.y * cos;
        this.x = x;
        return this;
    };
    
    /**
     * Projects this Vec2 on another Vec2.
     * @param {JustMath.Vec2} b Other Vec2
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.project = function(b) {
        return this.set(b.clone().scale(this.dot(b) / b.dot(b)));
    };
    
    /**
     * Rejects this Vec2 from another Vec2.
     * @param {JustMath.Vec2} b Other Vec2
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.reject = function(b) {
        return this.sub(this.clone().project(b));
    };
    
    /**
     * Reflects this Vec2 from another Vec2.
     * @param {JustMath.Vec2} n Vector to reflect from
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.reflect = function(n) {
        n = n.clone().norm();
        return this.set(n.scale(2*this.dot(n)).sub(this));
    };
    
    /**
     * Reflects this Vec2 from another Vec2 and scales the projected and reflected component by the given factors.
     * @param {JustMath.Vec2} n Vector to reflect from
     * @param {number} projectFactor Projected component factor
     * @param {number} rejectFactor Rejected component factor
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.reflectAndScale = function(n, projectFactor, rejectFactor) {
        var p = n.clone().norm() // Projection direction
            , r = n.clone().ort().norm(); // Rejection direction
        return this.set(p.scale(this.dot(p)*projectFactor).add(r.scale(-this.dot(r)*rejectFactor)));
    };
    
    /**
     * Interpolates the point between this and another point (in that direction) at the given percentage.
     * @param {JustMath.Vec2} p Other point
     * @param {number} percent Percentage
     * @return {JustMath.Vec2} This Vec2
     * @expose
     */
    Vec2.prototype.lerp = function(p, percent) {
        return this.add(p.clone().sub(this).scale(percent));
    };
    
    /**
     * Tests if this Vec2 is contained in the rectangle created between p1 and p2.
     * @param {JustMath.Vec2} p1
     * @param {JustMath.Vec2} p2
     * @return {boolean} true if contained, else false
     * @expose
     */
    Vec2.prototype.inRect = function(p1, p2) {
        return ((p1.x <= this.x && this.x <= p2.x) || (p1.x >= this.x && this.x >= p2.x)) &&
            ((p1.y <= this.y && this.y <= p2.y) || (p1.y >= this.y && this.y >= p2.y));
    };
    
    /**
     * Tests if this Vec2 equals another Vec2.
     * @param {JustMath.Vec2} b Other Vec2
     * @return {boolean} true if equal, false otherwise
     * @expose
     */
    Vec2.prototype.equals = function (b) {
        if (!b || !(b instanceof Vec2)) return false;
        return this.x == b.x && this.y == b.y;
    };
    
    /**
     * Gets a string representation of this Vec2.
     * @return {string} String representation as of "Vec2(x/y)"
     * @expose
     */
    Vec2.prototype.toString = function () {
        return "Vec2("+this.x+"/"+this.y+")";
    };
    
    /**
     * Calculates the determinant of the matrix [v1,v2].
     * @param {JustMath.Vec2} v1 Vector 1
     * @param {JustMath.Vec2} v2 Vector 2
     * @return {number} Determinant of the matrix [v1,v2]
     * @expose
     */
    Vec2.det = function(v1, v2) {
        return v1.x*v2.y - v2.x*v1.y;
    };

    /**
     * @alias JustMath.Vec2
     * @expose
     **/
    JustMath.Vec2 = Vec2;
    
    // Enable module loading if available
    if (typeof module != 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = JustMath;
    } else if (typeof define != 'undefined' && define["amd"]) { // AMD
        define([], function() { return JustMath; });
    } else { // Shim
        if (typeof global["dcodeIO"] == "undefined") {
            /** @expose */
            global["dcodeIO"] = {};
        }
        /** @expose */
        global["dcodeIO"]["JustMath"] = JustMath;
    }
    
})(this, Math);

},{}],3:[function(require,module,exports){
'use strict'

module.exports = IntegratorFactory

var Integrator = function Integrator( y0, deriv, t, dt ) {
  // Bind variables to this:
  this.deriv = deriv
  this.y = y0
  this.n = this.y.length
  this.dt = dt
  this.t = t

  // Create a scratch array into which we compute the derivative:
  this._ctor = this.y.constructor

  this._w = new this._ctor( this.n )
  this._k1 = new this._ctor( this.n )
  this._k2 = new this._ctor( this.n )
  this._k3 = new this._ctor( this.n )
  this._k4 = new this._ctor( this.n )
}

Integrator.prototype.step = function() {

  this.deriv( this._k1, this.y, this.t )

  for(var i=0; i<this.n; i++) {
    this._w[i] = this.y[i] + this._k1[i] * this.dt * 0.5
  }

  this.deriv( this._k2, this._w, this.t + this.dt * 0.5 )

  for(var i=0; i<this.n; i++) {
    this._w[i] = this.y[i] + this._k2[i] * this.dt * 0.5
  }

  this.deriv( this._k3, this._w, this.t + this.dt * 0.5 )

  for(var i=0; i<this.n; i++) {
    this._w[i] = this.y[i] + this._k3[i] * this.dt
  }

  this.deriv( this._k4, this._w, this.t + this.dt)


  var dto6 = this.dt / 6.0
  for(var i=0; i<this.n; i++) {
    this.y[i] += dto6 * ( this._k1[i] + 2*this._k2[i] + 2*this._k3[i] + this._k4[i] )
  }

  this.t += this.dt
  return this
}

Integrator.prototype.steps = function( n ) {
  for(var step=0; step<n; step++) {
    this.step()
  }
  return this
}

function IntegratorFactory( y0, deriv, t, dt ) {
  return new Integrator( y0, deriv, t, dt )
}


},{}]},{},[1]);
