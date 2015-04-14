var dadavis = {
    version: "0.1.0"
};

dadavis.init = function(_config) {
    var config = {
        containerSelector: ".container",
        width: 500,
        height: 500,
        margin: {
            top: 20,
            right: 20,
            bottom: 50,
            left: 50
        },
        type: "bar",
        subtype: "stacked",
        labelFormatterX: null,
        axisXAngle: null,
        tickSize: 10,
        minorTickSize: 3,
        tickYCount: 5,
        axisXTickSkip: null,
        dotSize: 2,
        gutterPercent: 10,
        colors: [ "skyblue", "orange", "lime", "orangered", "violet", "yellow", "brown", "pink" ]
    };
    var cache = {
        chartWidth: 500,
        chartHeight: 500,
        data: null,
        layout: null,
        scaleX: null,
        scaleY: null,
        previousData: null,
        container: null,
        noPadding: false,
        events: d3.dispatch("hover", "hoverOut"),
        internalEvents: d3.dispatch("setHover", "hideHover")
    };
    dadavis.utils.override(_config, config);
    cache.container = d3.select(config.containerSelector);
    cache.container.html(dadavis.template.main);
    d3.select(window).on("resize", dadavis.utils.throttle(function() {
        exports.resize();
    }, 200));
    exports = {};
    exports.setConfig = function(newConfig) {
        dadavis.utils.override(newConfig, config);
        return this;
    };
    exports.resize = function() {
        cache.container.html(dadavis.template.main);
        this.render();
        return this;
    };
    exports.downloadAsPNG = function(callback) {
        dadavis.utils.convertToImage(config, cache, callback);
        return this;
    };
    exports.setHovering = function(hoverData) {
        cache.internalEvents.setHover(hoverData);
        return this;
    };
    exports.hideHovering = function() {
        cache.internalEvents.hideHover();
        return this;
    };
    exports.render = function(data) {
        if (data) {
            cache.previousData = data;
            cache.data = data;
        } else {
            cache.data = cache.previousData;
        }
        this.setConfig({
            width: cache.container.node().offsetWidth,
            height: cache.container.node().offsetHeight
        });
        cache.chartWidth = config.width - config.margin.left - config.margin.right;
        cache.chartHeight = config.height - config.margin.top - config.margin.bottom;
        if (config.type === "line") {
            cache.noPadding = true;
        }
        cache.scaleX = d3.scale.linear().range([ 0, cache.chartWidth ]);
        cache.scaleY = d3.scale.linear().range([ 0, cache.chartHeight ]);
        cache.layout = dadavis.getLayout.data.call(this, config, cache);
        cache.axesLayout = dadavis.getLayout.axes.call(this, config, cache);
        dadavis.render.chart(config, cache);
        dadavis.interaction.hovering(config, cache);
        return this;
    };
    d3.rebind(exports, cache.events, "on");
    return exports;
};

dadavis.utils = {};

dadavis.utils.override = function(_objA, _objB) {
    for (var x in _objA) {
        if (x in _objB) {
            _objB[x] = _objA[x];
        }
    }
};

dadavis.utils.computeRandomNumericArray = function(count, min, max) {
    return d3.range(count || 0).map(function(d, i) {
        return ~~(Math.random() * (max - min) + min);
    });
};

dadavis.utils.computeRandomTimeArray = function(count, dateNow) {
    var dayInMillis = 1e3 * 60 * 60 * 24;
    var dateNow = new Date().getTime() - count * dayInMillis;
    return d3.range(count || 0).map(function(d, i) {
        return dateNow + i * dayInMillis;
    });
};

dadavis.utils.getRandomNumericData = function(shapeCount, layerCount) {
    return d3.range(layerCount).map(function(d, i) {
        return {
            name: "name" + i,
            values: dadavis.utils.computeRandomNumericArray(shapeCount, 10, 100)
        };
    });
};

dadavis.utils.getRandomTimeData = function(shapeCount, layerCount) {
    var dateNow = new Date().getTime();
    return d3.range(layerCount).map(function(d, i) {
        return {
            name: "name" + i,
            values: dadavis.utils.computeRandomNumericArray(shapeCount, 10, 100),
            keys: dadavis.utils.computeRandomTimeArray(shapeCount, dateNow)
        };
    });
};

dadavis.utils.throttle = function(callback, limit) {
    var wait = false;
    var timer = null;
    return function() {
        if (!wait) {
            callback.apply(this, arguments);
            wait = true;
            clearTimeout(timer);
            timer = setTimeout(function() {
                wait = false;
                callback.apply(this, arguments);
            }, limit);
        }
    };
};

dadavis.utils.convertToImage = function(config, cache, callback) {
    var clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: false
    });
    var chartNode = cache.container.node();
    var xhtml = new XMLSerializer().serializeToString(chartNode);
    var size = {
        width: chartNode.offsetWidth,
        height: chartNode.offsetHeight,
        rootFontSize: 14
    };
    var XMLString = '<svg xmlns="http://www.w3.org/2000/svg"' + ' width="' + size.width + '"' + ' height="' + size.height + '"' + ' font-size="' + size.rootFontSize + '"' + ">" + "<foreignObject>" + xhtml + "</foreignObject>" + "</svg>";
    var canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    var ctx = canvas.getContext("2d");
    var img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        var png = canvas.toDataURL("image/png");
        if (!callback) {
            var result = '<a href="' + png + '" download="converted-image">Download</a>';
            var pngContainer = document.createElement("div");
            pngContainer.id = "#png-container";
            pngContainer.innerHTML = result;
            pngContainer.querySelector("a").dispatchEvent(clickEvent);
        } else {
            callback.call(this, png);
        }
    };
    img.src = "data:image/svg+xml;base64," + btoa(XMLString);
};

dadavis.template = {};

dadavis.template.main = '<div class="chart">' + '<div class="panel">' + '<div class="hovering"></div>' + "</div>" + '<div class="axis-x"></div>' + '<div class="axis-y"></div>' + "</div>";

dadavis.getLayout = {
    data: {},
    axes: {}
};

dadavis.getLayout.data = function(config, cache) {
    var percentScaleY = cache.scaleY.copy();
    var stackedScaleY = cache.scaleY.copy();
    var paddedScaleX = cache.scaleX.copy();
    return cache.data.map(function(d, i) {
        var val = d.values;
        paddedScaleX.domain([ 0, val.length ]);
        cache.scaleX.domain([ 0, val.length - 1 ]);
        cache.scaleY.domain([ 0, d3.max(val) ]);
        var transposed = d3.transpose(cache.data.map(function(d, i) {
            return d.values;
        }));
        var previous = null;
        return val.map(function(dB, iB) {
            percentScaleY.domain([ 0, d3.sum(transposed[iB]) ]);
            stackedScaleY.domain([ 0, d3.max(transposed.map(function(d, i) {
                return d3.sum(d);
            })) ]);
            var datum = {
                value: dB,
                index: iB,
                parentData: d,
                paddedX: paddedScaleX(iB),
                x: cache.scaleX(iB),
                y: cache.chartHeight - cache.scaleY(dB),
                stackedPercentY: cache.chartHeight - percentScaleY(d3.sum(transposed[iB].slice(0, i + 1))),
                stackedY: cache.chartHeight - stackedScaleY(d3.sum(transposed[iB].slice(0, i + 1))),
                paddedW: paddedScaleX(1),
                w: cache.scaleX(1),
                h: cache.scaleY(dB),
                stackedPercentH: percentScaleY(dB),
                stackedH: stackedScaleY(dB),
                layerCount: cache.data.length,
                layerIndex: i,
                key: d.keys ? d.keys[i] : i
            };
            datum.previous = previous || datum;
            previous = datum;
            return datum;
        });
    });
};

dadavis.getLayout.axes = function(config, cache) {
    var scaleY = cache.scaleY.copy();
    var percentScaleY = cache.scaleY.copy();
    var stackedScaleY = cache.scaleY.copy();
    var transposed = d3.transpose(cache.data.map(function(d) {
        return d.values;
    }));
    var domainMax = d3.max(cache.data.map(function(d) {
        return d3.max(d.values);
    }));
    scaleY.domain([ domainMax, 0 ]);
    var stackedDomainMax = d3.max(transposed.map(function(d) {
        return d3.sum(d);
    }));
    stackedScaleY.domain([ stackedDomainMax, 0 ]);
    var percentDomainMax = d3.max(transposed.map(function(d) {
        return d3.sum(d);
    }));
    percentScaleY.domain([ percentDomainMax, 0 ]);
    return d3.range(config.tickYCount).map(function(d, i) {
        var value = i * domainMax / (config.tickYCount - 1);
        return {
            label: value,
            stackedLabel: i * stackedDomainMax / (config.tickYCount - 1),
            labelY: scaleY(value)
        };
    });
};

dadavis.getAttr = {
    bar: {},
    line: {},
    point: {},
    axis: {}
};

dadavis.getAttr.bar.simple = function(config, cache) {
    return {
        x: function(d, i) {
            return d.paddedX + d.paddedW / 2;
        },
        y: function(d, i) {
            return d.y + d.h / 2;
        },
        width: function(d, i) {
            var gutterW = d.paddedW / 100 * config.gutterPercent;
            return d.paddedW - gutterW;
        },
        height: function(d, i) {
            return d.h;
        }
    };
};

dadavis.getAttr.bar.grouped = function(config, cache) {
    return {
        x: function(d, i, j) {
            var gutterW = d.paddedW / d.layerCount / 100 * config.gutterPercent;
            var groupedW = d.paddedW / d.layerCount - gutterW;
            return d.paddedX + j * groupedW + groupedW / 2 + d.layerCount * gutterW / 2;
        },
        y: function(d, i) {
            return d.y + d.h / 2;
        },
        width: function(d, i) {
            var gutterW = d.paddedW / d.layerCount / 100 * gutterPercent;
            return d.paddedW / d.layerCount - gutterW;
        },
        height: function(d, i) {
            return d.h;
        }
    };
};

dadavis.getAttr.bar.percent = function(config, cache) {
    return {
        x: function(d, i) {
            return d.paddedX + d.paddedW / 2;
        },
        y: function(d, i) {
            return d.stackedPercentY + d.stackedPercentH / 2;
        },
        width: function(d, i) {
            var gutterW = d.paddedW / 100 * config.gutterPercent;
            return d.paddedW - gutterW;
        },
        height: function(d, i) {
            return d.stackedPercentH;
        }
    };
};

dadavis.getAttr.bar.stacked = function(config, cache) {
    return {
        x: function(d, i) {
            return d.paddedX + d.paddedW / 2;
        },
        y: function(d, i) {
            return d.stackedY + d.stackedH / 2;
        },
        width: function(d, i) {
            var gutterW = d.paddedW / 100 * config.gutterPercent;
            return d.paddedW - gutterW;
        },
        height: function(d, i) {
            return d.stackedH;
        }
    };
};

dadavis.getAttr.point.stacked = function(config, cache) {
    return {
        cx: function(d, i) {
            if (cache.noPadding) {
                return d.x;
            } else {
                return d.paddedX + d.paddedW / 2;
            }
        },
        cy: function(d, i) {
            return d.stackedY;
        }
    };
};

dadavis.getAttr.line.simple = function(config, cache) {
    return cache.layout.map(function(d, i) {
        return d3.merge(d.map(function(dB, iB) {
            return [ dB.x, dB.y ];
        }));
    });
};

dadavis.getAttr.line.stacked = function(config, cache) {
    return cache.layout.map(function(d, i) {
        return d3.merge(d.map(function(dB, iB) {
            return [ dB.x, dB.stackedY ];
        }));
    });
};

dadavis.getAttr.line.area = function(config, cache) {
    return cache.layout.map(function(d, i) {
        var line = d.map(function(dB, iB) {
            return [ dB.x, dB.stackedY ];
        });
        var previousLine = null;
        if (i === 0) {
            previousLine = d.map(function(dB, iB) {
                return [ dB.x, cache.chartHeight ];
            }).reverse();
        } else {
            previousLine = cache.layout[i - 1].map(function(dB, iB) {
                return [ dB.x, dB.stackedY ];
            }).reverse();
        }
        return d3.merge(line.concat(previousLine));
    });
};

dadavis.getAttr.axis.labelX = function(config, cache) {
    var labelAttr = {};
    if (config.axisXAngle < 0) {
        labelAttr = {
            left: function(d, i) {
                if (cache.noPadding) {
                    return d.index * d.w - this.offsetWidth + "px";
                } else {
                    return d.index * d.paddedW + d.paddedW / 2 - this.offsetWidth + "px";
                }
            },
            "transform-origin": "100%",
            transform: "rotate(" + config.axisXAngle + "deg)"
        };
    } else if (config.axisXAngle > 0) {
        labelAttr = {
            left: function(d, i) {
                if (cache.noPadding) {
                    return d.index * d.w + "px";
                } else {
                    return d.index * d.paddedW + d.paddedW / 2 + "px";
                }
            },
            "transform-origin": "0%",
            transform: "rotate(" + config.axisXAngle + "deg)"
        };
    } else {
        labelAttr = {
            left: function(d, i) {
                if (cache.noPadding) {
                    return d.index * d.w - this.offsetWidth / 2 + "px";
                } else {
                    return d.index * d.paddedW + d.paddedW / 2 - this.offsetWidth / 2 + "px";
                }
            }
        };
    }
    labelAttr.display = function(d, i) {
        return i % (cache.axisXTickSkipAuto || config.axisXTickSkip) ? "none" : "block";
    };
    labelAttr.top = config.tickSize + "px";
    return labelAttr;
};

dadavis.getAttr.axis.tickX = function(config, cache) {
    return {
        left: function(d, i) {
            if (cache.noPadding) {
                return d.index * d.w - this.offsetWidth + "px";
            } else {
                return d.index * d.paddedW + d.paddedW / 2 - this.offsetWidth + "px";
            }
        },
        width: 1 + "px",
        height: function(d, i) {
            return (i % (cache.axisXTickSkipAuto || config.axisXTickSkip) ? config.minorTickSize : config.tickSize) + "px";
        }
    };
};

dadavis.getAttr.axis.labelY = function(config, cache) {
    return {
        position: "absolute",
        left: function(d, i) {
            var labelW = this.offsetWidth;
            return config.margin.left - labelW - config.tickSize + "px";
        },
        top: function(d, i) {
            var labelH = this.offsetHeight;
            return d.labelY - labelH / 2 + "px";
        }
    };
};

dadavis.getAttr.axis.tickY = function(config, cache) {
    return {
        width: config.tickSize + "px",
        height: 1 + "px",
        position: "absolute",
        left: config.margin.left - config.tickSize + "px",
        top: function(d, i) {
            return d.labelY + "px";
        }
    };
};

dadavis.interaction = {};

dadavis.interaction.hovering = function(config, cache) {
    var hoveringContainer = cache.container.select(".hovering").style({
        width: cache.chartWidth + "px",
        height: cache.chartHeight + "px",
        position: "absolute",
        opacity: 0
    }).on("mousemove", function() {
        var mouse = d3.mouse(this);
        var x = cache.layout[0].map(function(d, i) {
            return d.x;
        });
        var idxUnderMouse = d3.bisect(x, mouse[0] - cache.layout[0][0].w / 2);
        setHovering(idxUnderMouse);
        cache.events.hover({
            mouse: mouse,
            x: x,
            idx: idxUnderMouse
        });
    }).on("mouseenter", function() {
        hoveringContainer.style({
            opacity: 1
        });
    }).on("mouseout", function() {
        hoveringContainer.style({
            opacity: 0
        });
        cache.events.hoverOut();
    });
    var hoverLine = dadavis.interaction.hoverLine(config, cache);
    var tooltip = dadavis.interaction.tooltip(config, cache);
    cache.internalEvents.on("setHover", function(hoverData) {
        setHovering(hoverData.idx);
    });
    cache.internalEvents.on("hideHover", function(hoverData) {
        hoveringContainer.style({
            opacity: 0
        });
    });
    var setHovering = function(idxUnderMouse) {
        var dataUnderMouse = cache.layout[0][idxUnderMouse];
        var tooltipsData = cache.layout.map(function(d, i) {
            return d[idxUnderMouse];
        });
        hoveringContainer.style({
            opacity: 1
        });
        hoverLine(dataUnderMouse);
        tooltip(tooltipsData);
    };
};

dadavis.interaction.tooltip = function(config, cache) {
    return function(tooltipsData) {
        var hoveringContainer = cache.container.select(".hovering");
        var tooltip = hoveringContainer.selectAll(".tooltip").data(tooltipsData);
        tooltip.enter().append("div").attr({
            "class": "tooltip"
        }).style({
            position: "absolute",
            "pointer-events": "none"
        });
        tooltip.html(function(d, i) {
            return d.value;
        }).style({
            left: function(d, i) {
                return (config.type === "bar" ? d.paddedX + d.paddedW / 2 : d.x) + "px";
            },
            top: function(d, i) {
                var y = d.stackedY;
                if (config.subtype === "simple") {
                    y = d.y;
                } else if (config.subtype === "percent") {
                    y = d.stackedPercentY;
                }
                return y + "px";
            },
            "background-color": function(d, i) {
                return config.colors[i];
            }
        });
        tooltip.exit().remove();
    };
};

dadavis.interaction.hoverLine = function(config, cache) {
    var hoverLine = cache.container.select(".hovering").append("div").attr({
        "class": "hover-line"
    }).style({
        position: "absolute",
        width: "1px",
        height: cache.chartHeight + "px",
        left: config.margin.left + "px",
        "pointer-events": "none"
    });
    return function(dataUnderMouse) {
        var hoverLineX = config.type === "bar" ? dataUnderMouse.paddedX + dataUnderMouse.paddedW / 2 : dataUnderMouse.x;
        hoverLine.style({
            left: hoverLineX + "px"
        });
    };
};

dadavis.render = {};

dadavis.render.chart = function(config, cache) {
    var chartContainer = cache.container.select(".chart").style({
        position: "absolute"
    });
    var panelContainer = chartContainer.select(".panel").style({
        position: "absolute",
        left: config.margin.left + "px",
        top: config.margin.top + "px"
    });
    var params = {
        width: config.width,
        height: config.height,
        type: Two.Types.svg
    };
    var two = new Two(params).appendTo(panelContainer.node());
    var panel = two.makeGroup();
    var shapeAttr = dadavis.getAttr[config.type][config.subtype](config, cache);
    console.time("rendering");
    if (config.type === "line") {
        cache.layout.forEach(function(d, i) {
            var curve = two.makePolygon.apply(two, shapeAttr[i].concat([ true ]));
            if (config.subtype === "area") {
                curve.fill = config.colors[i];
            } else {
                curve.fill = "transparent";
            }
            curve.stroke = config.colors[i];
            var layer = two.makeGroup(curve);
            panel.add(layer);
        });
    } else {
        cache.layout.forEach(function(d, i) {
            var layer = two.makeGroup();
            d.forEach(function(dB, iB) {
                var layout = d[iB];
                var x = shapeAttr.x(layout, iB, i);
                var y = shapeAttr.y(layout, iB, i);
                var width = shapeAttr.width(layout, iB, i);
                var height = shapeAttr.height(layout, iB, i);
                var rect = two.makeRectangle(x, y, width, height);
                rect.fill = config.colors[i];
                layer.add(rect);
            });
            panel.add(layer);
        });
    }
    console.timeEnd("rendering");
    console.time("update");
    two.update();
    console.timeEnd("update");
    cache.container.select(".axis-x").call(function() {
        dadavis.render.axisX.call(this, config, cache);
    });
    cache.container.select(".axis-y").call(function() {
        dadavis.render.axisY.call(this, config, cache);
    });
};

dadavis.render.bar = function(config, cache) {
    var shapes = this.selectAll(".shape").data(function(d, i) {
        return d;
    });
    shapes.enter().append("rect").attr({
        "class": function(d, i) {
            return "shape layer" + d.layerIndex + " index" + d.index;
        }
    }).attr(dadavis.getAttr[config.type][config.subtype](config, cache)).style({
        opacity: 0
    });
    shapes.transition().attr(dadavis.getAttr[config.type][config.subtype](config, cache)).style({
        opacity: 1
    });
    shapes.exit().remove();
};

dadavis.render.line = function(config, cache) {
    var lines = this.selectAll(".line").data(function(d, i) {
        return d;
    });
    lines.enter().append("path").classed("line", true).attr(dadavis.getAttr[config.type][config.subtype](config, cache)).style({
        opacity: 0
    });
    lines.transition().attr(dadavis.getAttr[config.type][config.subtype](config, cache)).style({
        opacity: 1
    });
    lines.exit().remove();
    var shapes = this.selectAll(".shape").data(function(d, i) {
        return d;
    });
    shapes.enter().append("circle").classed("shape", true).attr(dadavis.getAttr["point"][config.subtype](config, cache)).attr({
        r: config.dotSize
    }).style({
        opacity: 0
    });
    shapes.transition().attr(dadavis.getAttr["point"][config.subtype](config, cache)).style({
        opacity: 1
    });
    shapes.exit().remove();
};

dadavis.render.axisX = function(config, cache) {
    this.style({
        width: cache.chartWidth + "px",
        height: config.margin.bottom + "px",
        position: "absolute",
        top: cache.chartHeight + config.margin.top + "px",
        left: config.margin.left + "px",
        "border-top": "1px solid black"
    });
    var labelsX = this.selectAll("div.label").data(cache.layout[0]);
    labelsX.enter().append("div").classed("label", true).style({
        position: "absolute"
    });
    labelsX.html(function(d, i) {
        var key = d.parentData.keys ? d.parentData.keys[i] : i;
        if (config.labelFormatterX) {
            return config.labelFormatterX(key, i);
        } else {
            return key;
        }
    }).style(dadavis.getAttr.axis.labelX(config, cache));
    if (config.axisXTickSkip === "auto") {
        var widestLabel = d3.max(labelsX[0].map(function(d) {
            return d.offsetWidth;
        }));
        cache.axisXTickSkipAuto = Math.ceil(cache.layout[0].length / ~~(cache.chartWidth / widestLabel));
    }
    labelsX.style(dadavis.getAttr.axis.labelX(config, cache));
    labelsX.exit().remove();
    var ticksX = this.selectAll("div.tick").data(cache.layout[0]);
    ticksX.enter().append("div").classed("tick", true).style({
        position: "absolute"
    }).style({
        "background-color": "black"
    });
    ticksX.style(dadavis.getAttr.axis.tickX(config, cache));
    ticksX.exit().remove();
};

dadavis.render.axisY = function(config, cache) {
    this.style({
        width: config.margin.left + "px",
        height: cache.chartHeight + "px",
        position: "absolute",
        top: config.margin.top + "px",
        left: 0 + "px",
        "border-right": "1px solid black"
    });
    var labelsY = this.selectAll("div.label").data(cache.axesLayout);
    labelsY.enter().append("div").classed("label", true);
    labelsY.html(function(d, i) {
        if (config.subtype === "simple") {
            return d.label;
        } else {
            return d.stackedLabel;
        }
    }).style(dadavis.getAttr.axis.labelY(config, cache));
    labelsY.exit().remove();
    var ticksY = this.selectAll("div.tick").data(cache.axesLayout);
    ticksY.enter().append("div").classed("tick", true).style({
        "background-color": "black"
    });
    ticksY.style(dadavis.getAttr.axis.tickY(config, cache));
    ticksY.exit().remove();
};

if (typeof define === "function" && define.amd) {
    define(dadavis);
} else if (typeof module === "object" && module.exports) {
    var d3 = require("d3");
    module.exports = dadavis;
}