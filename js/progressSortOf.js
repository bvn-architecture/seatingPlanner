document.addEventListener("DOMContentLoaded", function(){
    let svg = d3.select("svg");
    // svg.attr("viewBox", "-75000 -5000 3000 60000");
    let xMin = -75000;
    let yMin =  -5000;
    let xMax =   3000;
    let yMax =  60000;
    var g = svg.append("g")
    let width = +svg.attr("width");
    let height = +svg.attr("height");
    let radius = 700;
    let numCircles = 20;

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(d3.zoom()
            .scaleExtent([0.0001, 0.015])
            .on("zoom", zoomed));
    
    function zoomed() {
      g.attr("transform", d3.event.transform);
    }

    

    let color = d3.scaleOrdinal()
        .range(d3.schemeAccent);

    let circles = d3.range(numCircles).map(function() {
        return {
            x: Math.round(Math.random() * (xMin - xMax)),
            y: Math.round(Math.random() * (xMax - xMin))
        };
    });

    const url='tempPoints.json';    
    let seatPoints = null;
    fetch(url)
        .then(x=>x.json())
        .then(y=>{
            seatPoints = y;
            let snapPoints = seatPoints.map((p)=>{
                return {
                    x: Math.round(p.x),
                    y: Math.round(p.y)
                };
            });

            g.selectAll("rect")
                .data(snapPoints)
                .enter().append("rect")
                .attr("x", function(d) { return d.x; })
                .attr("y", function(d) { return d.y; })
                .attr("width", radius/2)
                .attr("height", radius/2)
                .style("fill", function(d, i) { return color(i); })
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));
            
            
            
            g.selectAll("circle")
                .data(circles)
                .enter().append("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", radius)
                .style("fill", function(d, i) { return color(i); })
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            function dragstarted(d) {
                d3.select(this).raise().classed("active", true);
            }
        
            function distance(a, b) {
                return Math.sqrt(
                        Math.pow(( a.x - b.x ), 2) + 
                        Math.pow(( a.y - b.y ), 2)
                    );
            }
        
            function dragged(d) {
                /* calculate the distances off the pointer, not the element. 
                    If you use the element then snaps become irreversable.
                */
                let distances = snapPoints.map((sp)=>{
                    return {snapPt: sp, distance: distance(d3.event, sp)};
                });
                distances = distances.sort((a,b) => a.distance - b.distance);
                let close_one = distances[0];
        
                let snapRadius = radius * 2;
                if (close_one.distance < snapRadius) {
                    d3.select(this).attr("cx", d.x = close_one.snapPt.x).attr("cy", d.y = close_one.snapPt.y);
                    console.log("Snapped to", close_one);
                }
                else {
                    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
                }
            }
        
            function dragended(d) {
                d3.select(this).classed("active", false);
            }
        });

});
