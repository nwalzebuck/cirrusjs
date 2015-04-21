var dadavis = {version: '0.1.1'};

dadavis.init = function(_config){

    var config = {
        containerSelector: '.container',
        width: 500,
        height: 500,
        margin: {top: 20, right: 20, bottom: 50, left: 50},
        type: 'bar',
        subtype: 'stacked',
        labelFormatterX: null,
        axisXAngle: null,
        tickSize: 10,
        minorTickSize: 3,
        tickYCount: 5,
        axisXTickSkip: 'auto',
        dotSize: 2,
        gutterPercent: 10,
        colors: ['skyblue', 'orange', 'lime', 'orangered', 'violet', 'yellow', 'brown', 'pink'],
        renderer: 'svg',
        scaleType: 'time',
        keyX: 'x',
        keyY: 'y',
        outerPadding: 0,
        showFringe: false
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
        events: d3.dispatch('hover', 'hoverOut'),
        internalEvents: d3.dispatch('setHover', 'hideHover', 'resize')
    };

    (function initialize(config, cache){
        dadavis.utils.override(_config, config);

        d3.select(window).on('resize.namespace' + ~~(Math.random()*1000), dadavis.utils.throttle(function(){
            cache.internalEvents.resize();
        }, 200));

    })(config, cache);

    function initContainers(config, cache){
        cache.container = d3.select(config.containerSelector);
        cache.container.html(dadavis.template.main);

        var that = this;
        cache.internalEvents.on('resize', function(){
            that.resize();
        });
    }

    function computeAutomaticConfig(config, cache){
        this.setConfig({
            width: cache.container.node().offsetWidth,
            height: cache.container.node().offsetHeight
        });
    }

    function validateData(_data){
        if(_data && typeof _data === 'object'){
            var isNotNull = false;
            _data.forEach(function(d){
                isNotNull = isNotNull || !!d.values.length;
            });

            if(isNotNull){
                cache.previousData = _data;
                cache.data = _data;
                return true
            }
        }

        if(cache.previousData){
            cache.data = cache.previousData;
            return true;
        }

        return false;
    }

    function computeCache(config, cache, data){
        cache.chartWidth = config.width - config.margin.left - config.margin.right;
        cache.chartHeight = config.height - config.margin.top - config.margin.bottom;

        if(config.type === 'line'){
            cache.noPadding = true;
        }
    }

    exports = {};

    exports.setConfig = function(newConfig){
        dadavis.utils.override(newConfig, config);
        return this;
    };

    exports.resize = function(){
        cache.container.html(dadavis.template.main);
        this.render();
        return this;
    };

    exports.downloadAsPNG = function(callback){
        dadavis.utils.convertToImage(config, cache, callback);
        return this;
    };

    exports.setHovering = function(hoverData){
        cache.internalEvents.setHover(hoverData);
        return this;
    };

    exports.hideHovering = function(){
        cache.internalEvents.hideHover();
        return this;
    };

    exports.render = function(data){

        if(!validateData(data)){
            console.error('Invalid data', data);
            return this;
        }
        initContainers.call(this, config, cache);
        computeAutomaticConfig.call(this, config, cache);
        computeCache.call(this, config, cache, data);

        cache.scaleX = dadavis.scale.x(config, cache);
        cache.scaleY = dadavis.scale.y(config, cache);

        cache.layout = dadavis.layout.data(config, cache);
        cache.axesLayout = dadavis.layout.axes(config, cache);

        dadavis.component.chart(config, cache);
        dadavis.component.axisX(config, cache);
        dadavis.component.axisY(config, cache);
        dadavis.interaction.hovering(config, cache);

        return this;
    };

    d3.rebind(exports, cache.events, "on");

    return exports;
};
