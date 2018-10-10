document.addEventListener("DOMContentLoaded", function(){
    Promise.all([
        d3.json("data/peopleData.json"),
        d3.json("data/tempPoints.json")
      ])
      .then(([people_json_data, 
              seatPoints]) =>  {
        console.log("all, as promised", [people_json_data, seatPoints]);


        let svg = d3.select("svg");
        let width = +svg.attr("width");
        let height = +svg.attr("height");
        let transform = d3.zoomIdentity;
        let radius = 700;

        let analyticsLayer  = svg.append('g').attr('class', "analytics");
        let backgroundLayer = svg.append('g').attr('class', "background");
        let peopleLayer     = svg.append('g').attr('class', "people");

        let snapPoints = seatPoints.map((s) => {
            return {
                x: Math.round(s.x),
                y: Math.round(s.y)
            };
        });
        let bounds = getPointCollectionBounds(snapPoints);
        console.log(bounds);
        svg.attr("viewBox", `${bounds.xMin} ${bounds.yMin} ${bounds.xMax-bounds.xMin} ${bounds.yMax-bounds.yMin}`);
        
        let peopleData = people_json_data.map((person) => ({
                x: Math.round(randBetween(bounds.xMin, bounds.xMax)),
                y: Math.round(randBetween(bounds.yMin, bounds.yMax)),
                displayName: person.FirstName + " " + person.LastName,
                FirstName: person.FirstName,
                LastName: person.LastName,
                studio: person.Studio,
                team: person.team
            }) );

        let color = d3.scaleOrdinal()
            .range(d3.schemeAccent);

        let g = svg.append("g")
            .attr("transform", "translate(1120,38) scale(0.0165)"); // TODO: make this dynamic

        let people = peopleLayer.selectAll("g.person")
            .data(peopleData.filter(p => p.studio == 'Sydney'))
            .enter().append("g")
            .classed("person", true)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        people.append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", radius * 2)
            .classed("person-handle", true);
        people.append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", radius)
            .style("fill", (d, i) => color(i))
            .classed("person-dot", true);
        people.append("text")
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr("text-anchor", "middle")
            .text((d) => d.displayName)
            .classed("person-label", true);
            

        backgroundLayer.selectAll(".desk")
            .data(snapPoints)
            .enter().append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", radius/4)
            .style("fill", (d, i) => color(i))
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        
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
            draggedNode.classed("active", false);

            if (draggedNode.classed("snapped")) {
                let i = people_json_data.findIndex(p => p.FirstName === d.FirstName);
                people_json_data[i].x = d.x;
                people_json_data[i].y = d.y;
                console.log(people_json_data, d);
                updateTable(people_json_data);
            }
        }


        /*TEAM HULLS*/
        let teams = Array.from(new Set(people_json_data.map(p=>p.team)));
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
        let titles = d3.keys(people_json_data[0]);
        let headers = table.append('thead').append('tr')
                        .selectAll('th')
                        .data(titles).enter()
                        .append('th')
                        .text( (d) =>  d)
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

        updateTable(people_json_data);

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


    });

    function rowClicked(e) {
        console.log(e);
    }
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

function randBetween(min,max) // min and max included
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
