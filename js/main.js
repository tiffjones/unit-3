//anonymous function to hold all script in a local scope
(function(){

	//pseudo-global variables
	//variables for data join
    /*var attrArray = ["CO2_MTpA","Pop_pA","Crop_pA","Grass_pA","Forest_pA","Special_pA", "Urban_pA", "Misc_pA"]; */
	var attrArray = ["Crop_pA","Grass_pA","Forest_pA","Special_pA", "Urban_pA", "Misc_pA"]; 
    var attrNameArray = ["Cropland", "Grassland", "Forest", "Special Use", "Urban", "Miscellaneous"]
    var expressed = {
        x:attrArray[2], //x attribute
        y:attrArray[0], //y attribute
        color:attrArray[1] //color/size attribute
    };
    
    //run when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5 - 25, 
            height = 460;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on the Midwest
        var projection = d3.geoAlbers()
            .center([4, 39.83])
            .rotate([98.58, 1.25, -2.5]) //map doesn't look right. I need to check these settings
            .parallels([28.66, 45.24]) //set parallels for projection
            .scale(900) //scale of map
            .translate([width / 2, height / 2]); //set map to half the width and height of the svg object

        //create path generator
        var path = d3.geoPath().projection(projection);

        var mapTitle = map.append("text") //add title to container
            .attr("class", "title") //class for title
            .attr("text-anchor", "middle") //aligh text
            .attr("x", [width/2]) //set x
            .attr("y", 30) //set y
            .text("Percent of Landcover as " + attrNameArray[1]);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/LandCo2Pop2017.csv"),
            d3.json("data/States48.topojson"),
        ];
        Promise.all(promises).then(callback);

        // access data from AJAX server request
        function callback(data) {
            var csvData = data[0], // csv data is index 0 in the promise
                statesData = data[1]; // state data is index 1 in the promise
            console.log('csv Data:');
            console.log(csvData);
            console.log('topojson:');
            console.log(statesData);

            //translate states48 TopoJSON to geojson
            var states48 = topojson.feature(statesData, statesData.objects.States48).features;

            //examine the results
            console.log('geojson:');
            console.log(states48);

            /* testing if map will output as datum
            var stateTest = map
                .append("path")
                .datum(states48)
                .attr("class", "stateTest")
                .attr("d", path);  */

            //join csv data to GeoJSON enumeration units
            states48 = joinData(states48, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(states48, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);
        };
    }; //end of setMap()

    //add function to calculate the minimum and maximum values for expressed variables
    function getDataValues(csvData, expressedValue) {
        var max = d3.max(csvData, function(d) { 
            return parseFloat(d[expressedValue]); 
        });
        var min = d3.min(csvData, function(d) { 
            return parseFloat(d[expressedValue]); 
        });
        var range = max - min,
            adjustment = (range / csvData.length)

        return [min - adjustment, max + adjustment];
    };

    //function to create y scale
    function createYScale(csvData, chartHeight){
        var dataMinMax = getDataValues(csvData, expressed.y)
        return yScale = d3.scaleLinear().range([0, chartHeight]).domain([dataMinMax[1], dataMinMax[0]]);
    };

    //function to create x scale
    function createXScale(csvData, chartWidth){
        var dataMinMax =  getDataValues(csvData, expressed.x)
        return xScale = d3.scaleLinear().range([0, chartWidth]).domain([dataMinMax[0], dataMinMax[1]]);
    };

    //create axes
    function createChartAxes(chart,chartHeight,yScale,xScale){
        //add axis
        //create axis generators
        var yAxisScale = d3.axisRight().scale(yScale);
        var xAxisScale = d3.axisTop().scale(xScale);

        //place axis
        var yaxis = chart.append("g")
            .attr("class", "yaxis")
            .call(yAxisScale);
            
        var xaxis = chart.append("g")
            .attr("class", "xaxis")//format x axis
            .attr("transform", "translate(0," + chartHeight + ")")
            .call(xAxisScale);
    };

    //function to create coordinated bubble chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.5 - 25,
		    chartHeight = 460;

        //create a second svg element to hold the bubble chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a scale to place circles proportionally on the y-axis
        var yScale = createYScale(csvData,chartHeight)

        //create an x scale to place circles proportionally on the x-axis
        var xScale = createXScale(csvData, chartWidth);

        //create axes
        createChartAxes(chart,chartHeight, yScale, xScale);

        //set circles for each state
        var circles = chart.selectAll(".circles") //create an empty selection
            .data(csvData) //here we feed in our array of data
            .enter() //one of the great mysteries of the universe
            .append("circle") //inspect the HTML--holy crap, there's some circles there
            .attr("class", "circles")
            .attr("class", function (d) {
                return "bubble " + d.NAME;
            })
            .attr("cx", function (d, i) {
                return xScale(parseFloat(d[expressed.x]));
            })
            //place circles vertically on the chart
            .attr("cy", function(d){
                return yScale(parseFloat(d[expressed.y]));
            })
            .attr("fill", function(d){
                return colorScale(parseFloat(d[expressed.color]));
            })
            .attr("r", function (d) {
                var minRadius = 15
                //calculate the radius based on expressed value as circle area
                var radius = Math.pow(d[expressed.color], 0.5715) * minRadius;
                return radius;
            });
    };
    
    /* //Quantile Breaks
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#f7cbf5",
            "#d086cc",
            "#c15ed3",
            "#641372",
            "#3e0d3f"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;

        console.log(colorScale.quantiles())
    }; */
    
    //Natural Breaks
    function makeColorScale(data){
        var colorClasses = [
            "#f7cbf5",
            "#d086cc",
            "#c15ed3",
            "#641372",
            "#3e0d3f"
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed.color]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 8);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    function joinData(states48, csvData){
        //loop through csv to assign each set of csv attribute values to geojson states
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i]; //the current state
            var csvKey = csvState.NAME; //the CSV primary key

            //loop through geojson states to find correct state
            for (var a = 0; a < states48.length; a++) {
                var geojsonProps = states48[a].properties; //the current state geojson properties
                var geojsonKey = geojsonProps.NAME; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {
                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvState[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                }
            }
        }
        return states48;
    }

    function setEnumerationUnits(states48, map, path, colorScale) {
        //add States to map
        var state = map
            .selectAll(".state")
            .data(states48)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "state " + d.properties.NAME; //shows state.StateName in inspect mode for each datum
            })
            .attr("d", path)
            .style("fill", function (d) {
                //check to make sure a data value exists, if not set color to gray
			    var value = d.properties[expressed.color];            
                if(value) {            	
                    return colorScale(d.properties[expressed.color]);            
                } else {            	
                    return "#ccc";            
                }    
            });
    };
})(); //call anonymous function