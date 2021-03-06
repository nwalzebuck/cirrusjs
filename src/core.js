var cirrus = {version: '0.1.1'};

cirrus.init = function(initialConfig){

    var config = {
        container: '.container',
        width: 'auto',
        height: 'auto',
        margin: {top: 20, right: 20, bottom: 50, left: 50},
        type: 'bar',
        subtype: 'stacked',
        labelFormatterX: function(d){ return d; },
        tooltipFormatter: function(d){ return d.value; },
        axisXAngle: null,
        tickSize: 15,
        minorTickSize: 10,
        fringeSize: 8,
        tickYCount: 5,
        axisXTickSkip: 'auto',
        continuousXAxis: false,
        gutterPercent: 10,
        renderer: 'svg',
        scaleType: 'time',
        keyX: 'x',
        keyY: 'y',
        outerPadding: 0,
        showFringe: false,
        showAxes: true,
        showXGrid: false,
        showYGrid: false,
        showLegend: false,
        autoTypeThreshold: 30,
        chartTitle: null,
        axisXTitle: null,
        axisYTitle: null,
        colorList: cirrus.utils.defaultColors
    };

    var _config = {
        chartWidth: 500,
        chartHeight: 500,
        data: null,
        visibleData: null,
        shapeLayout: null,
        scaleX: null,
        scaleY: null,
        axesLayout: {},
        legendLayout: {},
        fringeLayout: {},
        previousData: null,
        container: null,
        noPadding: false,
        dataLayersToHide: [],
        events: d3.dispatch('hover', 'hoverOut', 'legendClick'),
        internalEvents: d3.dispatch('setHover', 'hideHover', 'resize', 'legendClick')
    };

    var exports = {};

    exports.initialize = cirrus.utils.once(function(config, _config){
        this.setConfig(initialConfig);

        _config.container = d3.select(config.container);
        _config.container.html(cirrus.template.main);

        d3.select(window).on('resize.namespace' + ~~(Math.random()*1000), cirrus.utils.throttle(function(){
            _config.internalEvents.resize();
        }, 200));

        var that = this;
        _config.internalEvents.on('resize', function(){
            that.resize();
        });
        _config.internalEvents.on('legendClick', function(toHide){
            _config.dataLayersToHide = toHide;
            that.render();
        });
    });

    exports.setConfig = function(newConfig){
        cirrus.utils.override(newConfig, config);
        return this;
    };

    exports.getConfig = function(){
        return config;
    };

    exports._getConfig = function(){
        return _config;
    };

    exports.resize = function(){
        this.render();
        return this;
    };

    exports.downloadAsPNG = function(callback){
        cirrus.utils.convertToImage(config, _config, callback);
        return this;
    };

    exports.setHovering = function(hoverData){
        _config.internalEvents.setHover(hoverData);
        return this;
    };

    exports.hideHovering = function(){
        _config.internalEvents.hideHover();
        return this;
    };

    exports.render = function(data){

        if(!cirrus.data.validate(config, _config, data)){
            console.error('Invalid data', data);
            return this;
        }

        this.initialize.call(this, config, _config);
        cirrus.automatic.config.call(this, config, _config);

        _config.scaleX = cirrus.scale.x(config, _config);
        _config.scaleY = cirrus.scale.y(config, _config);

        _config.shapeLayout = cirrus.layout.shape(config, _config);
        _config.axesLayout.x = cirrus.layout.axes.x(config, _config);
        _config.axesLayout.y = cirrus.layout.axes.y(config, _config);
        _config.legendLayout = cirrus.layout.legend(config, _config);

        //_config.fringeLayout.y = cirrus.layout.fringes.y(config, _config);
        //console.log(_config.fringeLayout.y);

        cirrus.component.chart(config, _config);
        cirrus.component.shapes(config, _config);
        cirrus.component.axisX(config, _config);
        cirrus.component.axisY(config, _config);
        cirrus.component.title(config, _config);
        cirrus.component.legend(config, _config);
        cirrus.interaction.hovering(config, _config);

        return this;
    };

    d3.rebind(exports, _config.events, "on");

    return exports;
};
