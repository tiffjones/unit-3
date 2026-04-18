/* TO DO:
- figure out how to add readible names to drop down and chart title
- figure out how to update chart scale depending on variable
- fit chart title back in frame
- position dropdown menu
*/

//contain entire code into a function to make all attributes "local"
(function(){
    //move attrArray to a pseudoglobal position within main function
    //variables for data join
    var attrArray = ["CO2_MTpA","Pop_pA","Crop_pA","Grass_pA","Forest_pA","Special_pA", "Urban_pA", "Misc_pA"];
    //var attrArray = ["Crop_pA","Grass_pA","Forest_pA","Special_pA", "Urban_pA", "Misc_pA"]; 
    var attrNameArray = ["CO2", "Population Density", "Cropland", "Grassland", "Forest", "Special Use", "Urban", "Miscellaneous"]
    var expressed = attrArray[0]; //initial attribute in array
    var expressedName = attrNameArray[0];

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.5,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 70]);
    
    //run script when window loads
    window.onload = setMap();

    //make map
    function setMap(){
        // set size for map svg container
        var width = window.innerWidth * .425,
            height = 460;

        //make svg to hold map
        var map = d3.select("body") //targets body of html
            .append("svg") //adds map to svg
            .attr("class", "map") //targets map var
            .attr("width", width) //targets width var
            .attr("height", height); //targets height var
        
        //set projection
        var projection = d3.geoAlbers()
            // center coord of map (-98.58,39.83)
            .center([0,39]) //central meridian, lat (set lon to 0 to prevent distortion for conic proj, lat)
            .rotate([97,0,0]) //lon, lat, roll (center lon as first measurement, lat set to 0)
            .parallels([28.66, 45.24]) //standard parallels
            .scale([width/.75]) //factor by which distances are multiplied
            .translate([width/2, height/2]); //places map center in the center of the svg

        var path = d3.geoPath().projection(projection); //pass projection to generator

        //set Promises for all data
        var promises = [
                d3.csv("data/LandCo2Pop2017.csv"),
                d3.json("data/States48.topojson")
        ];
        Promise.all(promises).then(callback);

        function callback(data){
            var csvData = data[0], //csv as first index in promises array
                statesData = data[1]; //state data as second index
            console.log("csv Data:") //check results
            console.log(csvData);
            console.log("topojson");
            console.log(statesData);

            /*
            var mapTitle = map.append("text") //add title to container
                .attr("class", "mapTitle") //class for title
                .attr("text-anchor", "middle") //aligh text
                .attr("x", [width/2]) //set x
                .attr("y", 30) //set y
                .text("Amount of " + attrNameArray[0] + " in each State"); */

            //call graticule function
            setGraticule(map, path);
            
            //converts topojson to geojson
            var states48 = topojson.feature(statesData, statesData.objects.States48).features; //last .features pulls out feature array from each feature class
            console.log("geojson"); //check results
            console.log(states48);
            
            //reassigns states48 to include joined data, calling joinData function
            states48 = joinData(states48, csvData); //joins csv data and geojson elements
            
            //assign colorScale to scaled csv data, calling makeColorScale function
            var colorScale = makeColorScale(csvData);
            
            //call setEnumerationUnits function
            setEnumerationUnits(states48, map, path, colorScale);

            //call setChart function to add chart to map
            setChart(csvData, colorScale);

            //call createDropdown function
            createDropdown(csvData);

        }; //end of callback funciton
    }; //end of setMap

    //create dropdown menu
    function createDropdown(csvData){
        //select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //title for menu
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true") //user cannot mistakenly select it
            .text("Select Attribute"); //affordance for user on what to do

        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, csvData){
        expressed = attribute; //change expressed attribute

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        var state = d3.selectAll(".state")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        var bars = d3.selectAll(".bar")
            //sort bars
            .sort(function(a,b){
                return b[expressed]-a[expressed];
            })
            .transition()
            .delay(function(d,i){
                return i * 20
            })
            .duration(500);
            
        updateChart(bars, csvData.length, colorScale);
    }; //end of changeAttribute function

    //position, size and color bars in chart
    function updateChart(bars, n, colorScale){
        //set position of bars on teh x axis
        bars.attr("x", function(d,i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //calc height of y axis
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        //calc y axis value based on attribute values
        .attr("y", function(d,i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //assign color based on attribute values/colorScale
        .style("fill", function(d){
            var value = d[expressed];
            if(value){
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });
        var chartTitle = d3.select(".chartTitle")
            .text("Amount of " + expressed + " in each State");
    }; //end of updateChart function

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

        //array to hold values for each expressed attribute
        var domainArray = [];
        for (var i=0; i < data.length; i++){ //loop through data
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val); //add attribute values to array
        };

        //cluster data based on ckmeans clustering algorithm
        var clusters = ss.ckmeans(domainArray,5);

        //find min of each cluster
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });

        //remove first min class break value from array
        domainArray.shift();

        //bin values accordinging to Natural Breaks (pass array to scale generator)
        colorScale.domain(domainArray);

        return colorScale;

    }; //end of makeColorScale function

    function setGraticule(map, path){
        var graticule = d3.geoGraticule() //graticule generator
            .step([5,5]); //graticule every 5 degrees lon and lat

        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines()) //binds grat lines to each element created
            .enter()
            .append("path") //adds lines to svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project grat 
    }; //end of setGraticule function

    function joinData(states48, csvData){
        //loops to access linking attributes in each data set
        for (var i=0; i < csvData.length; i++){
            var csvState = csvData[i]; //access each state in csv for length of file
            var csvKey = csvState.NAME; //csv primary key (linking attribute in csv)

            for (var a=0; a < states48.length; a++){
                var geojsonProps = states48[a].properties; //access properties of current state in geojson
                var geojsonKey = geojsonProps.NAME; //linking attribute in geojson
            
                if (geojsonKey == csvKey){ //checks for match of linking attributes
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvState[attr]); //attaches numerical value from csv (parseFloat) for each attibute in attribute array to geojson element
                        geojsonProps[attr] = val;
                    }); //end of joining loop
                } //end of if statement
            } //end of inner loop
        }//end of main loop
        return states48;
    }; //end of joinData function

    function setEnumerationUnits(states48, map, path, colorScale){
        var state = map.selectAll(".state") //for each state
                .data(states48) //access geojson of states data (each state accessed individually versus as datum)
                .enter() //part of method
                .append("path") //add projection to states
                .attr("class", function(d){ //svg path coordinates attached to element's d attribute
                    return "state " + d.properties.NAME; //accesses Name attribute of each state
                })
                .attr("d", path)
                .style("fill", function(d){
                    var value = d.properties[expressed];
                    if(value) {
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
                })
                .on("mouseover", function(event,d) {
                    highlight(d.properties);
                    console.log("highlighted")//check if it's working
                })
                .on("mouseout", function(event,d) {
                    dehighlight(d.properties)
                    console.log("dehighlighted");
                });

        // descriptor for each state path
        var desc = state.append("desc")
            .text('{"stroke": "#17012f", "stroke-width": "1px"}');

    }; //end of setEnumerationUnits function

    //create chart
    function setChart(csvData, colorScale){ //pass csv data and colorScale to chart to match map

        //svg to hold chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create bars for attribute values for each state
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed];
            })
            .attr("class", function(d){
                return "bar " + d.NAME;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(event,d) {
                highlight(d)
                console.log("chart highlight");
            })
            .on("mouseout", function(event,d) {
                dehighlight(d)
                console.log("chart dehighlight");
            });
        
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        var chartTitle = chart.append("text")
            .attr("text-anchor", "middle") //align text
            .attr("x", [(chartWidth)/2]) //set x
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Amount of " + attrNameArray[0] + " in each State");

        var yAxis = d3.axisLeft()
            .scale(yScale);

        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);

        /*
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.NAME;
            })
            .attr("x", function(d,i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
            }); */
    }; //end of setChart function

    function highlight (props) {
    //update stroke color and width of state when selected
    var selected = d3.selectAll("." + props.NAME)
        .raise()
        .style("stroke", "yellow")
        .style("stroke-width", "2")
        setLabel(props);
    };

    function dehighlight(props) {
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
            
            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        
        d3.select("infolabel")
            .remove();
    };

    function setLabel(props){
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.NAME + "_label")
            .html(labelAttribute);

        var stateName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

})(); //call main function