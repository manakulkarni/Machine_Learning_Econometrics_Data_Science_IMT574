var margin = 75;
    width = 1500 - margin,
    height = 700 - margin;

var legendWidth = width/6

var svg = d3.select("#viz")
    .append("svg") 
    .attr("width", width + margin)
    .attr("height", height + margin)
    .attr("class", "svg-map")

var map = svg.append('g')
             .attr("id", "map");

var projection = d3.geo.mercator()
                  .scale(200)
                  .translate([width/2, height/1.3]); 

var path = d3.geo.path().projection(projection);


var unitArray;
var comparisonArray;

//Loading the data
queue()
.defer(d3.json, "data/world_countries.json")

.defer(d3.csv, "data/mobile-world-data.csv")

.await(callback);



function callback(error, worldData, mobileData) {


  var countryData = {}; 

  mobileData.forEach(function(d) {  

    
    countryCode = d['country.code'];
    countryData[countryCode] = {'mb': {}, 'gb': {}}; 


    d['gni.month'] = +d['gni.month'];
    d['gb.cost.gb'] = +d['gb.cost.gb'];
    d['gb.cost.mb'] = +d['gb.cost.mb'];
    d['percent.income.gb'] = +d['percent.income.gb'];
    d['percent.income.mb'] = +d['percent.income.mb'];

    

    /*for(index in d) {
      if(index != "country.code" & index != "country.name" ) {
        countryData[countryCode][index] = d[index];
      }
    }*/
    countryData[countryCode]['gni.month'] =d['gni.month'];

    countryData[countryCode]['gb']['cost'] = d['gb.cost.gb'];
    countryData[countryCode]['gb']['cost.bucket'] = d['gb.cost.gb.bucket'];
    countryData[countryCode]['gb']['percent.income'] = d['percent.income.gb'];
    countryData[countryCode]['gb']['percent.income.bucket'] = d['percent.income.gb.bucket'];

    countryData[countryCode]['mb']['cost'] = d['gb.cost.mb'];
    countryData[countryCode]['mb']['cost.bucket'] = d['gb.cost.mb.bucket'];
    countryData[countryCode]['mb']['percent.income'] = d['percent.income.mb'];
    countryData[countryCode]['mb']['percent.income.bucket'] = d['percent.income.mb.bucket'];

  });



  for(index in worldData.features){  
    countryCode = worldData.features[index].id;

    if(countryCode in countryData){

      
      worldData.features[index]['mobile'] = {'gb': {},'mb': {}};
      worldData.features[index]['monthlyIncome'] = countryData[countryCode]["gni.month"];

      //Looping through MB and GB
      for(unitType in countryData[countryCode]) {
        if(unitType != "gni.month" ) {

          for(field in countryData[countryCode][unitType]) {
            worldData.features[index]['mobile'][unitType][field] = countryData[countryCode][unitType][field];
          }
        }
      }
    }

  

  }; 






  //Tooltip Creation
  tip = d3.tip().attr('class', 'd3-tip')
                .html(function(d) {
                  var content = '<p>' + d.properties.name + '</p>';
                  if(d.mobile != undefined){ 

                    

                    if(comparisonArray != undefined && unitArray != undefined) { 
                      unit = unitArray[1];
                      comparison = comparisonArray[1];

                      if(isNaN(d.mobile[unit][comparison])) {
                        content += "(no plans quoted in " + unit.toUpperCase()+ ")";
                      } else{

                    
                        content += '<p>$' + d.mobile[unit]['cost'] + ' (USD)</p>';
                      

                      }
                    } 
                  } else {
                    content += " (no data)";
                    }
                  return content;
                })
                .offset(function() {
                  return [0,0];
                });

  map.call(tip);
  tip.direction(function(d) {
    west = []; 
    east = ["FJI"];
    if(west.indexOf(d.id) != -1){
      return "w";
    } else{
      if(east.indexOf(d.id) != -1){
      return "e";
      } else{return "s";}
    }
  });


  // create map
  map.selectAll('path') // creating paths
               .data(worldData.features) // coordinate data in '.features' array
               .enter()
               .append('path')
               .attr('d', path)
               .style('fill', 'gray')
               .style('stroke', 'white') 
               .style('stroke-width', 0.5)
               .attr("class", "country")
               .on('mouseover', tip.show)
               .on('mouseout', tip.hide);



  
  function updateSelection(specsArray) {

    //Creating color scale

   
    var domain;
    var domainValues = [];
    var unitArr = specsArray[0];
    var unit = unitArr[1];
    var comparisonArr = specsArray[1];
    var comparisonBucket = comparisonArr[2];

    for(index in worldData.features) {
      var hasMobile = worldData.features[index]['mobile'];

      if(hasMobile != undefined) { 

        if(unitArr != undefined && comparisonArr != undefined) { 
          var domainVal = worldData.features[index]['mobile'][unit][comparisonBucket];

          if(domainValues.indexOf(domainVal) == -1 && domainVal != "NA"){ 
          domainValues.push(domainVal);
          }
        }
      }
    }

  
    domain = domainValues.sort(function(a, b){return +a.split("-")[0] - +b.split("-")[0]});

    //Color Scale
    var color = d3.scale.ordinal()
                .domain(domain)
                .range(colorbrewer['Blues']['9'].slice(3));


  
    map.selectAll('path')
             .transition()
             .duration(800)
             .style('fill', function(d){
              var hasMobile = ('mobile' in d);
            
              if(hasMobile && (d.mobile[unit][comparisonBucket] != "NA")) {
                return color(d.mobile[unit][comparisonBucket]);
              } else{return "DimGray"}
             });





    //LEGEND

  //https://www.udacity.com/course/data-visualization-and-d3js--ud507-
    if(d3.select(".legend")[0][0] != null) {
      d3.select(".legend")[0][0].remove();
    }

    
    threshDomain = domain.map(function(d){return +d.split("-")[0]}).slice(1);

    var threshold = d3.scale.threshold()
                            .domain(threshDomain)
                            .range(color.range());

    var x = d3.scale.linear()
                    .domain([0, 100])
                    .range([0, legendWidth]);

    var xAxis = d3.svg.axis()
                      .scale(x)
                      .orient("top")
                      .tickSize(5) // I chose the text down because it is clear to read
                      .tickValues(threshold.domain())
                      .tickPadding(0); // vertical offset from axis
                   

    var legend = d3.select("#legend")
                    .insert("svg") // separate svg for the legend
                    .attr("class", "legend")
                    .attr("width", legendWidth)
                   
                    .attr("height", 65)
                    .append("g")
                    .attr("transform", "translate(0, " + 40 + ")");



    legend.selectAll("rect")
          .data(threshold.range().map(function(color) {
           
            var d = threshold.invertExtent(color);
   
            if (d[0] == null) d[0] = x.domain()[0];
          
            if (d[1] == null) d[1] = x.domain()[1];
            return d;
          }))
          .enter()
          .append("rect")
          .attr("x", function(d) {
            return x(d[0]);
          })
          .attr("height", 22)
          .attr("width", function(d) {
            return x(d[1]) - x(d[0]);
          })
          .transition()
          .duration(600)
          .style("fill", function(d) {
            return threshold(d[0]);
          });

    legend.call(xAxis).append("text")
                 .attr("class", "caption")
                 .attr("y", 15) // text up or down
                 .attr("x", -40) // text left or right
                 .text(function(d){
                  if(comparisonArr[1] == 'cost'){
                    return "USD";
                  } else {return "%";}
                 });


  } 


  //Code and Logic Reference: https://github.com/winkelman/udacity-dand-viz
  // looking at the valid arguments for updateSelection we can see what data we want in the buttons
  var unitData = [['Less than 1GB', 'mb'], ['Greater than 1 GB', 'gb']];
  var comparisonData = [['USD/GB', 'cost', 'cost.bucket'],
  ['% Income', 'percent.income', 'percent.income.bucket']];
  
  // unit buttons
  var unitTitle = d3.select("#control-panel")
                    .append("div")
                    .attr("id", "unitTitle");
                  

  var unitButtons = d3.select("#control-panel")
                    .append("div")
                    .attr("class", "unitButtons")
                    .selectAll("button")
                    .data(unitData)
                    .enter()
                    .append("button")
                    .text(function(d) {
                        return d[0];
                    })
                    // side-by-side buttons
                    .attr("style", function(d) {
                      if(d[1] == "mb"){
                        return "float: left;";
                      } else {return "float: right;";}
                    })
                    .attr("class", "buttons")
                    .classed("button-default", true);

  unitButtons.on("click", function(d) {
    // reset all buttons first
    d3.select(".unitButtons")
                  .selectAll("button")
                  .classed("button-select", false)
                  .classed("button-default", true)
                  .transition()
                  .duration(600);
    d3.select(this)
                  .classed("button-select", true)
                  .transition()
                  .duration(600);
    unitArray = d;
    updateSelection([unitArray, comparisonArray]);
    });


  // comparison buttons
  var comparisonTitle = d3.select("#control-panel")
                    .append("div")
                    .attr("id", "comparisonTitle");
                    

  var comparisonButtons = d3.select("#control-panel")
                    .append("div")
                    .attr("class", "comparisonButtons")
                    .selectAll("button")
                    .data(comparisonData)
                    .enter()
                    .append("button")
                    .text(function(d) {
                        return d[0];
                    })
                    .attr("style", function(d) {
                      if(d[1] == "cost"){
                        return "float: left;";
                      } else {return "float: right;";}
                    })
                    .attr("class", "buttons")
                    .classed("button-default", true);;

  comparisonButtons.on("click", function(d) {
    // reset all buttons first
    d3.select(".comparisonButtons")
                  .selectAll("button")
                  .classed("button-select", false)
                  .classed("button-default", true)
                  .transition()
                  .duration(600);
    d3.select(this)
                  .classed("button-select", true)
                  .transition()
                  .duration(600);
    comparisonArray = d;
    updateSelection([unitArray, comparisonArray]);
    });


  // initiate the map
  d3.selectAll(".buttons")[0][0].click();
  d3.selectAll(".buttons")[0][3].click();
  
  var delay=3000; //delay
  setTimeout(function(){
    d3.selectAll(".buttons")[0][1].click();
    d3.selectAll(".buttons")[0][2].click();
  }, delay);


} 