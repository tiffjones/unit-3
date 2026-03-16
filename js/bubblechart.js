//execute script when window is loaded
window.onload = function(){
    
    // SVG dimension variables
    var w = 900, h = 500;

    // container block
    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //class assigned as block name for future styling
        .style("background-color", "rgba(0,0,0,0.2)"); //inline style to for svg

    // innerRect block
    var innerRect = container.append("rect") //put a new rect in the svg
        .datum (400) // single point value
        .attr("width", function(d){ //rectangle width
            return d * 2; //returns value of datum d*2 (width 400 * 2 = 800)
        }) 
        .attr("height", function(d){ //rectangle height
            return d; // returns value of datum d (height 400)
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color
    
    /*
    var dataArray = [10, 20, 30, 40, 50]; // data array for circle radii

    var circles = container.selectAll(".circles") // selects all matching circle elements within the container object
        .data(dataArray) // targets data array
        .enter() // necessary evil to make this work
        .append("circle") //add a circle for each datum
        .attr("class", "circles") //apply a class name to all circles
        .attr("r", function(d, i){ //creates circles with radius d the data array for each index
            console.log("d:", d, "i:", i); //print datum value and index to console                return d; //returns value of datum (radius value)
        })
        .attr("cx", function(d, i){ //x coordinate
        return 70 + (i * 180); //returns computed x-coord positioning on the page, using index to change output            
        })
        .attr("cy", function(d){ //y coordinate
            return 450 - (d * 5); //returns computed y-coord position on the page, using index to change output            
        });
    */

    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    var x = d3.scaleLinear() //create the scale
        .range([90, 750]) //output min and max x values
        .domain([0, 3]); //input min and max based on array index

    //find the minimum value of the array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50]) //sets y offset for axis line
        .domain([0, 700000 //sets values listed on y axis
           /* minPop,
            maxPop */
        ]);

    //color scale generator 
    var color = d3.scaleLinear()
        .range([
            "#FDBE85", //sets color of circles from one hexcode to another based on min and max pop
            "#D94701"
        ])
        .domain([
            minPop, 
            maxPop
        ]);

    var circles = container.selectAll(".circles") // selects all matching circle elements within the container object
        .data(cityPop) // targets data array
        .enter() // necessary evil to make this work
        .append("circle") //add a circle for each datum
        .attr("class", "circles") //apply a class name to all circles
        .attr("id", function(d){ //targets the city property of the feature
            return d.city;
        })
        .attr("r", function(d){ //calculate the radius based on population value as circle area
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){
            //use the scale generator with the index to place each circle horizontally
            return x(i);
        })
        .attr("cy", function(d){ //set y position based on population value
            return y(d.population);
        })
        .style("fill", function(d, i){ //add a fill based on the color scale generator
            return color(d.population);
        })
        .style("stroke", "#000000") //black circle stroke
        .style("stroke-width", "1.5px");

        //create y axis generator
        var yAxis = d3.axisLeft(y);

        //create axis group (g) element and add y axis
        var axis = container.append("g")
            .attr("class", "axis") //creates class for axis
            .attr("transform", "translate(50,0)") //insets axis 50pxs
            .call(yAxis);  //passes axis variable to the yAxis generator

        var title = container.append("text") //add title to container
            .attr("class", "title") //class for title
            .attr("text-anchor", "middle") //aligh text
            .attr("x", 450) //set x
            .attr("y", 30) //set y
            .text("City Population");

    var labels = container.selectAll(".labels") //create circle labels
        .data(cityPop) //access cityPop data
        .enter() //need to work
        .append("text")//add text element
        .attr("class", "labels") // create label class
        .attr("text-anchor", "left") //left align
        .attr("y", function(d){
            return y(d.population) + -3; //vertically center on each circle
        })
        .style("fill","#4e4e4e")
        .style("font-family","sans-serif")
        .style("font-size",".9em");

    var nameLine = labels.append("tspan") //first line of label
        .attr("class", "nameLine") //nameLine class
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; //horizontally position to right of each circle
        })
        .text(function(d){
            return d.city; //access city properties
        })
        .style("font-weight", "bold");
    
    var format = d3.format(","); //creates format generator to add commas in the population values

    var popLine = labels.append("tspan") //second line of label
        .attr("class", "popLine") //class assignment
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; //horizontally position to right of each circle
        }) 
        .attr("dy", "17") //vertical offset
        .text(function(d){
            return "Pop. " + format(d.population); //apply format generator
        });
    
        
};