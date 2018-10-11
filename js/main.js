document.addEventListener("DOMContentLoaded", function(){
    Promise.all([
        d3.json("data/peopleData.json"),
        d3.json("data/tempPoints.json")
      ])
      .then(([peopleData, 
              seatPoints]) =>  {
        console.log("all, as promised", [peopleData, seatPoints]);

        peopleData = peopleData.filter((p)=>p.FirstName[0]=='A');

        let svg = d3.select("svg");
        let width = +svg.attr("width");
        let height = +svg.attr("height");
        let transform = d3.zoomIdentity;
        let radius = 700;

        let snapPoints = seatPoints.map((s) => {
            return {
                x: Math.round(s.x),
                y: Math.round(s.y)
            };
        });
        let bounds = getPointCollectionBounds(snapPoints);
        console.log(bounds);
        svg.attr("viewBox", `${bounds.xMin} ${bounds.yMin} ${bounds.xMax-bounds.xMin} ${bounds.yMax-bounds.yMin}`);
        
        let p1 = {x:-16220, y: 16770};
        let p2 = {x:-41646, y: 17186};
        let p3 = {x:-41646, y: 41065};
        let p4 = {x:-13427, y: 40870};
        
        peopleData = peopleData.map((person) => ({
                x: getCoord(person.x, bounds.xMin, bounds.xMax),
                y: getCoord(person.y, bounds.yMin, bounds.yMax),
                displayName: person.FirstName + " " + person.LastName,
                selectorName: person.FirstName + person.LastName.replace(/\s/gi, '-'),
                FirstName: person.FirstName,
                LastName: person.LastName,
                studio: person.Studio,
                team: person.team,
                placed: person.placed,
                onMap: person.onMap,
                highlighted: false
            }) );

        let color = d3.scaleOrdinal()
            .range(d3.schemeAccent);

        let g = svg.append("g")
            .attr("transform", "translate(1120,38) scale(0.0165)"); // TODO: make this dynamic

        let analyticsLayer  = g.append('g').attr('class', "analytics");
        let backgroundLayer = g.append('g').attr('class', "background");
        let peopleLayer     = g.append('g').attr('class', "people");

        let people = peopleLayer.selectAll("g.person")
            .data(peopleData);
        drawPeople();
            

        backgroundLayer.selectAll(".desk")
            .data(snapPoints)
            .enter().append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", radius/4)
            .style("fill", (d, i) => color(i));

        
        svg.call(d3.zoom()
            .scaleExtent([0.0165, 2])
            .on("zoom", zoomed));
        function zoomed() {
            g.attr("transform", d3.event.transform);
        }

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
                If you use the element then snaps become irreversable. */
            let distances = snapPoints.map((sp) => ( {snapPt: sp, distance: distance(d3.event, sp)} ));
            distances = distances.sort((a,b) => a.distance - b.distance);
            let close_one = distances[0];

            let snapRadius = radius * 2;
            if (close_one.distance < snapRadius) {
                drag_node(this, close_one.snapPt);
                d3.select(this).classed("snapped", true);
                console.log("Snapped to", close_one);
            } else {
                drag_node(this, d3.event);
                d3.select(this).classed("snapped", false);
            }

            function drag_node(me, pt) {
                d3.select(me).select("text.person-label").attr("x", d.x = pt.x).attr("y", d.y = pt.y);
                d3.select(me).select("circle.person-dot").attr("cx", d.x = pt.x).attr("cy", d.y = pt.y);
                d3.select(me).select("circle.person-handle").attr("cx", d.x = pt.x).attr("cy", d.y = pt.y);
            }

            redraw();
        }

        function dragended(d) {
            let draggedNode = d3.select(this);
            
            let i = peopleData.findIndex(p => p.FirstName === d.FirstName);
            draggedNode.classed("active", false);
            peopleData[i].placed = "No";

            if (draggedNode.classed("snapped")) {
                peopleData[i].x = d.x;
                peopleData[i].y = d.y;
                peopleData[i].placed = "Yes";
                console.log(peopleData, d);
                updateTable(peopleData);
            } 
        }


        /*TEAM HULLS*/
        let teams = Array.from(new Set(peopleData.map(p=>p.team)));
        // console.log(teams);
        if (true) {
            let hulls = teams.map((t, i) => {
                return analyticsLayer.append("path")
                    .attr("class", `hull ${t} cowboys`)
                    .attr('stroke-width', radius*2)
                    .style("fill", color(i))
                    .style("stroke", color(i));
            });
            redraw();

            function redraw() {
                teams.map((t, i) => {
                    let teamPeople = peopleData.filter((p) => p.team == t);
                    let vertices = teamPeople.map(a => [a.x, a.y]);
                    hulls[i].datum(d3.polygonHull(vertices))
                        .attr("d", (d) => "M" + d.join("L") + "Z");
                });
            }

        } //end hulls



        /*TABLE*/
        let sortAscending = true;
        let table = d3.select('#page-wrap').append('table');
        let titles = d3.keys(peopleData[0]);
        console.log(titles);
        let headers = table.append('thead').append('tr')
                        .selectAll('th')
                        .data(titles).enter()
                        .append('th')
                        .text( (d) => d)
                        .on('click', function (d) {
                            headers.attr('class', 'header');
                            
                            if (sortAscending) {
                                rows.sort((a, b) =>  b[d] < a[d]);
                                sortAscending = false;
                                this.className = 'aes';
                            } else {
                                rows.sort((a, b) => b[d] > a[d]);
                                sortAscending = true;
                                this.className = 'des';
                            }
                            
                        });

        updateTable(peopleData);

        function updateTable(newdata) {
            // TODO: do this: http://bl.ocks.org/LeeMendelowitz/11383724
            //       and not is horrible hack
            d3.selectAll('tbody').remove();
            
            
            let rows = table.append('tbody').selectAll('tr')
                        .data(newdata).enter()
                        .append('tr')
                        .attr("data-who", d=>d.FirstName)
                        .on('click', rowClicked);
            rows.selectAll('td')
            .data(function (d) {
                return titles.map(function (k) {
                    return { 'value': d[k], 'name': k};
                });
            }).enter()
            .append('td')
            .attr('data-th', (d) => d.name)
            .text((d) =>  d.value);
        };


        function rowClicked(e) {
            console.log(e);
            let thisPerson = peopleData.filter((p)=>p.FirstName==e.FirstName && p.LastName==e.LastName);
            // console.log(thisPerson[0].node).classed("focused", true);
            d3.select("g[data-name='"+thisPerson.selectorName+"']").classed("focused", true);

            let i = peopleData.findIndex((p) => p.FirstName==e.FirstName && p.LastName==e.LastName);
            peopleData[i].placed = "No";
            peopleData[i].highlighted = true;
            drawPeople();
            // peopleData[i].highlighted = false;
        }
    

        function drawPeople() {
            people.exit().remove();

            people.enter().append("g")
                .classed("person", true)
                .classed("focused", p => p.highlighted)
                .classed("offMap", p => !p.onMap)
                .attr('data-name', p => p.selectorName)
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))
                .append("circle")
                .classed("person-handle", true)
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y)
                .attr("r", radius * 2)
              .select(function() { return this.parentNode; })
                .append("circle")
                .classed("person-dot", true)
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y)
                .attr("r", radius)
                .style("fill", (d, i) => color(i))
              .select(function() { return this.parentNode; })
                .append("text")
                .classed("person-label", true)
                .attr('x', (d) => d.x)
                .attr('y', (d) => d.y)
                .attr("text-anchor", "middle")
                .text((d) => d.displayName);
            

            people.select(".person.handle")
                .classed("person-handle", true)
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y)
                .attr("r", radius * 2);

            people.select(".person-dot")
                .classed("person-dot", true)
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y)
                .attr("r", radius)
                .style("fill", (d, i) => color(i));
            
            people.select(".person-label")
                .classed("person-label", true)
                .attr('x', (d) => d.x)
                .attr('y', (d) => d.y)
                .attr("text-anchor", "middle")
                .text((d) => d.displayName);

    
            
        }
    });
});



function getPointCollectionBounds(snapPoints) {
    let xVals = snapPoints.map(a => a.x);
    let yVals = snapPoints.map(a => a.y);
    let xMax = Math.max(...xVals);
    let yMax = Math.max(...yVals);
    let xMin = Math.min(...xVals);
    let yMin = Math.min(...yVals);
    return {xMax, yMax, xMin, yMin};
}

function randBetween(min,max) { // min and max included
    return Math.floor(Math.random()*(max-min+1)+min);
}

function getCoord(inputCoord, boundsMin, boundsMax) {
    if (inputCoord == 0) {
        return Math.round(randBetween(boundsMin, boundsMax));
    } else {
        return inputCoord;
    }
}
