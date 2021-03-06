
function ProportionalSymbol(elementId) {

    this.divId = elementId;
    this.divSelector = '#' + elementId;

    this.drawMap = function() {

        var map = this;
        var el = document.getElementById(map.divId);

        // Ohio Map Dimensions: 960x1200 (width x height)
        // Use this to scale the map up/down depending on
        // size of map container.
        map.height = el.clientHeight;
        map.width = (960 / 1200) * map.height;
        console.log('Making map size: ' + map.width + 'x' + map.height);

        // For more on map projections, see:
        // https://github.com/mbostock/d3/wiki/Geo-Projections
        map.projection = d3.geo.conicConformal();
        map.path = d3.geo.path().projection(map.projection);

        map.svg = d3.select(map.divSelector).append('svg')
            .attr('width', map.width)
            .attr('height', map.height);

        map.bg = map.svg.append('g');
        // use color brewer Spectral colors
        map.fg = map.svg.append('g').attr('class', 'Spectral');

        // scaling factor for unemployment rate -> circle radius
        map.SCALE = 100;

        map.loadData().then(function() {
            map.drawOhio();
            map.drawDots();
        });
    };

    this.drawDots = function() {
        var map = this;

        var extent = d3.extent(map.data['unemployment'], function(d, i) {
            return d.rate;
        }).reverse();
        // reverse so higher numbers are red in the Spectral theme!

        var scale = d3.scale.quantize()
            .domain(extent)
            .range(d3.range(9).map(function(i) {
                return 'q' + i + '-' + 9;
            }));

        map.fg.selectAll('circle')
            .data(map.data['unemployment'])
            .enter().append('circle')
            .attr('r', function(d, i) {
                var r = (d.rate * map.SCALE).toFixed(2);
                return r;
            })
            .attr('transform', function(d) {
                var id = '#county_' + d.county_id.substr(2);
                var county = d3.select(id).data()[0];
                var centroid = d3.geo.centroid(county);
                return "translate(" + map.projection(centroid) + ")";
            })
            .attr('class', function(d, i) {
                return 'dot ' + scale(d.rate);
            })
            .on('mouseover', function(d, i) {
                map.handleHover(d, i);
            });
    };

    this.handleHover = function(d, i) {
        var id = '#county_' + d.county_id.substr(2);
        var county = d3.select(id).data()[0];

        var rate = (d.rate * 100).toFixed(2);
        d3.select('#countyname').html(county.properties['COUNTY_NAM']);
        d3.select('#unemploymentval').html(rate);
    };

    this.drawOhio = function() {
        this.drawState();
        this.drawCounties();
    };
    this.drawState = function() {
        var map = this;
        // Since we picked the conicConformal projection, we need to also
        // rotate the map so our map doesn't look funky.
        var centroid = d3.geo.centroid(map.data['state'].features[0]);
        var r = [centroid[0] * -1, centroid[1] * -1];
        // Start the projection from defaults (looking at Ohio)
        map.projection.scale(1).translate([0, 0]).rotate(r);
        var b = map.path.bounds(map.data['state']),
            s = 0.95 / Math.max((b[1][0] - b[0][0]) / map.width, (b[1][1] - b[0][1]) / map.height),
            t = [(map.width - s * (b[1][0] + b[0][0])) / 2, (map.height - s * (b[1][1] + b[0][1])) / 2];
        map.projection.scale(s).translate(t);

        map.fg.selectAll('path')
            .data(map.data['state'].features)
            .enter().append('path')
            .attr('class', 'state')
            .attr('d', map.path);
    };
    this.drawCounties = function() {
        var map = this;
        map.bg.selectAll('path')
            .data(map.data['counties'].features)
            .enter().append('path')
            .attr('id', function(d) {
                return 'county_' + d.properties['FIPS_CODE'];
            })
            .attr('class', 'county')
            .attr('d', map.path);
    };

    this.loadData = function() {
        var deferred = $.Deferred();
        var map = this;
        map.data = {};
        // We need three files...
        map.loadStateData().then(function(state) {
            map.data['state'] = state;
            map.loadCountyData().then(function(counties) {
                map.data['counties'] = counties;
                map.loadUnemploymentData().then(function(unemployment) {
                    map.data['unemployment'] = unemployment;
                    // got all three, now we can resolve this one
                    deferred.resolve();
                });
            });
        });
        return deferred.promise();
    };
    this.loadStateData = function() {
        var deferred = $.Deferred();
        d3.json('maps/state.oh.json', function(error, response) {
            deferred.resolve(response);
        });
        return deferred.promise();
    };
    this.loadCountyData = function() {
        var deferred = $.Deferred();
        d3.json('maps/county.oh.json', function(error, response) {
            deferred.resolve(response);
        });
        return deferred.promise();
    };
    this.loadUnemploymentData = function() {
        var deferred = $.Deferred();
        d3.tsv('data/unemployment.oh.tsv', function(error, response) {
            deferred.resolve(response);
        });
        return deferred.promise();
    };
}; // OhioMap
