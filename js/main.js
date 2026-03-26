//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 750,
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
        .scale(1000) //scale of map
        .translate([width / 2, height / 2]); //set map to half the width and height of the svg object

    //create path generator
    var path = d3.geoPath().projection(projection);

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
            .attr("d", path);
        */

        //add States to map
        var state = map
            .selectAll("state")
            .data(states48)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "state " + d.properties.NAME; //shows state.StateName in inspect mode for each datum
            })
            .attr("d", path);
    };
};