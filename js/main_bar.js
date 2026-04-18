/* TO DO:
- add axis labels to chart
- figure out how to update chart scale depending on variable
- fix dynamic label - units don't update
- update text next to dropdown menu to reflect selection
- how to add menu and supplemental text into a side panel
- how to overlay a texture for C02 over/under the choropleth map so you can see how 
  C02 emissions and landuse types relate
- provide re-express for results by region (midwest, northeast, etc?)
- add supplemental info
*/

//contain entire code into a function to make all attributes "local"
(function(){
    //variables in CSV
    var attrArray = ["CO2_MTpA","Crop_pA","Grass_pA","Forest_pA","Special_pA", "Urban_pA", "Misc_pA"];
    //var attrNameArray = ["CO2", "Population", "Cropland", "Grassland", "Forest", "Special Use", "Urban", "Miscellaneous"];
    //var attrUnitArray = ["metric tons per acre", "People per acre", "per acre", "per acre", "per acre", "per acre", "per acre", "per acre"];
    
    //access to attributes, readable name and units
    var attrInfoArray = [{
        attr:"CO2_MTpA",
        label:"CO2",
        unit:"metric tons per acre"
    },
    {
        attr:"Crop_pA",
        label:"Cropland",
        unit:"percent"
    },
    {
        attr:"Grass_pA",
        label:"Grassland",
        unit:"percent"
    },
    {
        attr:"Forest_pA",
        label:"Forest Land",
        unit:"percent"
    },
    {
        attr:"Special_pA",
        label:"Special Land",
        unit:"percent"
    },
    {
        attr:"Urban_pA",
        label:"Urban Land",
        unit:"percent"
    },
        {
        attr:"Misc_pA",
        label:"Misc Land",
        unit:"percent"
    }]

    var expressed = attrInfoArray[0]; //initial attribute in array
    //console.log("expressed.label");
    //console.log(expressed.label);

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.45,
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
        .domain([0, 110]);
    
    //run script when window loads
    window.onload = setMap();

    //make map
    function setMap(){
        // set size for map svg container
        var width = window.innerWidth * .5,
            height = 460;

        //make svg to hold map
        var map = d3.select(".container") //targets body of html
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
            .scale([width/.8]) //factor by which distances are multiplied
            .translate([width/2, height/2]); //places map center in the center of the svg

        //apply projection to paths
        var path = d3.geoPath().projection(projection); //pass projection to generator

        //set Promises for all data
        var promises = [
                d3.csv("data/LandCo2Pop2017.csv"),
                d3.json("data/States48.topojson")
        ];
        Promise.all(promises).then(callback);

        //access all data
        function callback(data){
            var csvData = data[0], //csv as first index in promises array
                statesData = data[1]; //state data as second index
            console.log("csv Data:", csvData) //check results
            console.log("topojson", statesData);
            
            //converts topojson to geojson
            var states48 = topojson.feature(statesData, statesData.objects.States48).features; //last .features pulls out feature array from each feature class
            console.log("geojson", states48); //check results
            
            //reassigns states48 to include joined data, calling joinData function
            states48 = joinData(states48, csvData); //joins csv data and geojson elements
            
            //assign colorScale to scaled csv data, calling makeColorScale function
            var colorScale = makeColorScale(csvData);

            //call graticule function
            //setGraticule(map, path);
            
            createTitle(); //call function to add main title

            //call setEnumerationUnits function
            setEnumerationUnits(states48, map, path, colorScale);
            
            createDropdown(csvData); //call createDropdown function

            setChart(csvData, colorScale); //call function to generate chart


        }; //end of callback funciton
    }; //end of setMap

    //create main title for page
    function createTitle(){
        mainTitle = d3.select(".panel")
            .append("h1")
            .attr("class", "head")
            .text("Between Land and Air");

        mainSubhead = d3.select(".panel")
            .append("h3")
            .attr("class", "subhead")
            .text("A Comparison of Landuse and CO\u2082 Emissions across the Continental U.S.");
    };
    
    //create text to reflect menu selection / map and chart visualization
    function createMenuText(){
        
        var panelTitle = d3.select(".panel")
            .append("h4")
            .attr("class", "menuTitle")
            .text("Amount of " + expressed.label + " per acre in each State");
    };
    
    //create dropdown menu
    function createDropdown(csvData){
        //select element
        var dropdown = d3.select(".panel")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData);
                console.log("dropdown this.value", this.value); //this.value = attr name in csv
            });

        //create initial text for dropdown menu (affordance)
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true") //user cannot mistakenly select it
            .text("Select Attribute"); //affordance for user on what to do

        //adds attributes to menu for user selection
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrInfoArray)//access readible names
            .enter()
            .append("option")
            .attr("value", function(d){ return d.attr })
            .text(function(d){ return d.label });        

        //call to add text next to dropdown menu
        createMenuText();
    };

    //Natural Breaks - handles skewed data with large outliers
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
            var val = parseFloat(data[i][expressed.attr]);
            domainArray.push(val); //add attribute values to array
        };

        //cluster data based on ckmeans clustering algorithm
        var clusters = ss.ckmeans(domainArray,5);

        //find min value of each cluster
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });

        //remove first min class break value from array
        domainArray.shift();

        //bin values accordinging to Natural Breaks (pass array to scale generator)
        colorScale.domain(domainArray);

        return colorScale;

    }; //end of makeColorScale function

    /*function setGraticule(map, path){
        var graticule = d3.geoGraticule() //graticule generator
            .step([5,5]); //graticule every 5 degrees lon and lat

        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines()) //binds grat lines to each element created
            .enter()
            .append("path") //adds lines to svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project grat 
    }; //end of setGraticule function */

    //join csv and shapefile data
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

    //style map and activate highlight/dehighlight functionality
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
                    var value = d.properties[expressed.attr];
                    if(value) {
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
                })
                .on("click", function(event,d) { //activate click event
                    highlight(d.properties);
                    console.log("highlighted")//check if it's working
                })
                .on("mouseout", function(event,d) { //deavtivate highlight
                    dehighlight(d.properties)
                    console.log("dehighlighted");
                })
                //.on("mousemove", moveLabel); //generated two unmatched labels, couldn't mix so made static

        // descriptor for each state path
        var desc = state.append("desc")
            .text('{"stroke": "#17012f", "stroke-width": "1px"}');

    }; //end of setEnumerationUnits function

    //create chart
    function setChart(csvData, colorScale){ //pass csv data and colorScale to chart to match map

        //svg to hold chart
        var chart = d3.select(".container")
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
                return b[expressed.attr]-a[expressed.attr]; //sort bars by high to low value
            })
            .attr("class", function(d){
                return "bar " + d.NAME;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("click", function(event,d) { //activate click event
                highlight(d);
                //console.log("chart highlight");
                console.log("Clicked data:", d);
            })
            .on("mouseout", function(event,d) { //deactivate highlight
                dehighlight(d);
                //console.log("chart dehighlight");
            })
            //.on("mousemove", moveLabel);
        
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        //create y axis with values and grid lines for readibility
        var yAxis = d3.axisLeft()
            .scale(yScale)
            .tickSize(-chartInnerWidth);

        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //frame to hold chart, which is smaller than main chart svg
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);

    }; //end of setChart function

    //couldn't figure this out
    //should be able to use to access min and max values to update y axis for every attribute
   /* function getDataValues(csvData, expressedValue) {
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

    //supposed to update yScale based on min and max accessed in previous function
    //function to create y scale
    function createYScale(csvData, chartHeight) {
        var dataMinMax = getDataValues(csvData, expressed.attr)
        return yScale = d3.scaleLinear().range([0, chartHeight]).domain([dataMinMax[1], dataMinMax[0]]);
    }; */

    //position, size and color bars in chart
    function updateChart(bars, n, colorScale){

        //set position of bars on teh x axis
        bars.attr("x", function(d,i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //calc height of y axis
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed.attr]));
        })
        //calc y axis value based on attribute values
        .attr("y", function(d,i){
            return yScale(parseFloat(d[expressed.attr])) + topBottomPadding;
        })
        //assign color based on attribute values/colorScale
        .style("fill", function(d){
            var value = d[expressed.attr];
            if(value){
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });
    }; //end of updateChart function

    //was trying to update the text next to dropdown mene
    /*
    function updateMenuText(){
        
        var newTitle = d3.select(".menuTitle")
            .text("Amount of " + expressed.label + " per acre in each State");
    };*/

    //dropdown change event handler
    function changeAttribute(attribute, csvData){
        expressed.attr = attribute; //change expressed attribute

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //create visual blend/transition between reexpress / change of attribute in map
        var state = d3.selectAll(".state")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed.attr];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        //create visual blend/transition between reexpress / change of attribute in chart
        var bars = d3.selectAll(".bar")
            //sort bars
            .sort(function(a,b){
                return b[expressed.attr]-a[expressed.attr];
            })
            .transition()
            .delay(function(d,i){
                return i * 20
            })
            .duration(500);

        //updateMenuText();
        
        //activate chart update
        updateChart(bars, csvData.length, colorScale);

    }; //end of changeAttribute function

    //generate highlighting style
    function highlight (props) {
        //update stroke color and width of state when selected
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", "yellow")
            .style("stroke-width", "2");

        selected.raise() //bring to front
        setLabel(props)
    };

    //generate dehighlighting style
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

        //remove label with dehighlight
        d3.select(".infolabel")
            .remove();
    };

    /*
    //function to move info label with mouse
    //couldn't make this work properly
    function moveLabel(event, d){
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };*/
3
    //generate labels to retrieve data on click
    function setLabel(props){
        
        var labelAttribute = "<h1>" + props[expressed.attr] +
            "</h1><br>" + expressed.unit + "<span style = 'color: #a8a1a7; font-size: 1.5em; line-height: 1.2em'>" + "<br>" + props.NAME + "</span>";

        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.NAME + "_label")
            .html(labelAttribute);
    };

})(); //call main function