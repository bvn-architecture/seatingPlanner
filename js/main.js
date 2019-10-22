/*jshint esversion: 6 */
document.addEventListener("DOMContentLoaded", function() {
  // Where are the furniture outlines stored?
  // This is mainly a refactoring to keep line lengths short
  const fam = "data/FamilyArchitypes";
  // stuff from rhino has a different origin point,
  // these offsets make it look more or less the same
  const crappyXoffset = -26534;
  const crappyYoffset = 22114;
  Promise.all([
    d3.json("data/peopleData.json"),
    d3.json("data/boundary_points.json"),
    d3.json("data/overall_floor_boundary.json"),

    // d3.json("data/furniture_instance_metadata.json"),
    d3.json("data/DesksFromRhino.json"),

    /* a */
    d3.json(fam + "/Pedestal_FUR_500W x 830H x 800D.json"),
    /* b */
    d3.json(fam + "/Stool_Stylecraft_Capdell_FUR_420Wx360Hx420D.json"),
    /* c */
    d3.json(
      fam +
        "/Table_Square_Schiavello_Laminex Commercial_FUR_1200W x 900H x 1200D.json"
    ),
    /* d */
    d3.json(fam + "/White Board_Mobile_FUR_960-1015W x 1860H.json"),
    /* e */
    d3.json(
      fam + "/Workstation_1P_BVN_Adjustable_FYS_2PC_1500W x 700D x 900H.json"
    ),
    /* f */
    d3.json(fam + "/Workstation_1P_Corner_New_FYS_1500X730.json"),
    /* g */
    d3.json(fam + "/Workstation_1P_Corner_New_FYS_1500X780.json"),
    /* h */
    d3.json(fam + "/DeskFromRhino.json"),
  ]).then(
    ([
      peopleData,
      boundaries,
      overall_floor_boundary,

      furniture_instance_metadata,

      furn_a,
      furn_b,
      furn_c,
      furn_d,
      furn_e,
      furn_f,
      furn_g,
      furn_h,
      //   furn_i,
      //   furn_j
    ]) => {
      let furniture_outlines = [
        furn_a,
        furn_b,
        furn_c,
        furn_d,
        furn_e,
        furn_f,
        furn_g,
        furn_h,
        // furn_i,
        // furn_j
      ];
      console.log("all, as promised", [
        "peopleData", peopleData,
        "boundaries", boundaries,
        "overall_floor_boundary", overall_floor_boundary,
        "furniture_instance_metadata", furniture_instance_metadata,
        "furniture_outlines", furniture_outlines
      ]);

      // Cut the data down to just A people so that it's easier to work with
      // peopleData = peopleData.filter(p => p.FirstName[0] == "A");
      peopleData.forEach((val, index) => {
        peopleData[index].id = index;
      });

      function rotatePoint(point, centre, angle) {
        angle = (angle * (Math.PI / 180)) % Math.PI; // Convert to radians
        
        const rotatedX =
          Math.cos(angle) * (point.x - centre.x) -
          Math.sin(angle) * (point.y - centre.y) +
          centre.x;

        const rotatedY =
          Math.sin(angle) * (point.x - centre.x) +
          Math.cos(angle) * (point.y - centre.y) +
          centre.y;

        const newP = { x: rotatedX, y: rotatedY };
        return newP;
      }

      let svg = d3.select("svg");
      let width = +svg.attr("width");
      let height = +svg.attr("height");
      let transform = d3.zoomIdentity;
      let radius = 500;
      let flipMapY = true;

      let snapPoints = furniture_instance_metadata.map(s => {
        if (s.Type.family.includes("Doherty") ||
            s.Type.family.includes("Workstation")
            /* Doherty is for my ghetto rhino version, workstation is 
               for the legit revit version.
               No prizes for guessing which one actually works...*/
            ) { 
          const centre = { x: s.Point.X, y: s.Point.Y };
          const point = { x: centre.x, y: centre.y + 1000 };
          const angle = 360 - s.Rotation + 90; //TODO check if this should be 360-s.Rotation
          const rotatedPoint = rotatePoint(point, centre, angle);
          const compoundPoint = {
            x: rotatedPoint.x + crappyXoffset,
            y: rotatedPoint.y + crappyYoffset,
            insertionX: centre.x + crappyXoffset,
            insertionY: centre.y + crappyYoffset,
            name: s.Name,
            rotation: angle,
            type: s.Type
          };
          return compoundPoint;
        }
      });
      snapPoints = snapPoints.filter(x => x != undefined);
      let bounds = getPointCollectionBounds(snapPoints);
      // console.log(bounds);
      svg.attr(
        "viewBox",
        `${bounds.xMin} ${bounds.yMin} ${bounds.xMax -
          bounds.xMin} ${bounds.yMax - bounds.yMin}`
      );

      let p1 = { x: -16220, y: 16770 };
      let p2 = { x: -41646, y: 17186 };
      let p3 = { x: -41646, y: 41065 };
      let p4 = { x: -13427, y: 40870 };

      peopleData = peopleData.map(person => {
        STRONG = true;
        let x = 0;
        let y = 0;
        if(STRONG) {
          // temp strong placement, overrides some other stuff
          let thisPersonsDesk = snapPoints.filter(s => s.name == person.HumanPlacement)[0];
          x = thisPersonsDesk.x;
          y = thisPersonsDesk.y;
          person.placed = true;
          person.onMap = true;
        } else {
          x = getCoord(person.x, bounds.xMin, bounds.xMax);
          y = getCoord(person.y, bounds.yMin, bounds.yMax);
        }
        return {
          x: x,
          y: y,
          displayName: `${person.FirstName} ${person.LastName}`,
          selectorName: person.FirstName + person.LastName.replace(/\s/gi, "-"),
          FirstName: person.FirstName,
          LastName: person.LastName,
          studio: person.Studio,
          team: person.team,
          placed: person.placed,
          onMap: person.onMap,
          highlighted: false,
          id: person.id
        };
      });

      let color = d3.scaleOrdinal().range(d3.schemeAccent);

      function tidyName(s) {
        if (s != undefined) {
          return s.trim().replace(/\s+/gi, "_");
        } else {
          return "";
        }
      }
      let defs = svg.append("defs");
      defs
        .selectAll("path.boundary")
        .data(furniture_outlines)
        .enter()
        .append("path")
        .attr("id", d => tidyName(d.Family))
        .attr("d", d => {
          let xyPairs = d.loopVertices.map(c => `${c.X},${c.Y}`);
          return "M" + xyPairs.join("L") + "Z";
        });

      let g = svg.append("g");

      let analyticsLayer = g.append("g").attr("class", "analytics");
      let backgroundLayer = g.append("g").attr("class", "background");
      let peopleLayer = g.append("g").attr("class", "people");

      backgroundLayer
        .selectAll("path.boundary")
        .data(boundaries.loopVertices)
        .enter()
        .append("path")
        .attr("d", d => {
          let xyPairs = d.map(c => `${c.X},${c.Y}`);
          return "M" + xyPairs.join("L") + "Z";
        })
        .classed("layoutable-area", true)
        .classed("boundary", true);
      backgroundLayer
        .selectAll("path.perimeter")
        .data(overall_floor_boundary.loopVertices)
        .enter()
        .append("path")
        .attr("d", d => {
          let xyPairs = d.map(c => `${c.X},${c.Y}`);
          return "M" + xyPairs.join("L") + "Z";
        })
        .classed("overall-area", true)
        .classed("perimeter", true);

      // furniture_instance_metadata.map(f => {
      //   // console.log(f);
      //   backgroundLayer
      //     .append("g")
      //     .attr(
      //       "transform",
      //       `translate(${f.Point.X}, ${f.Point.Y}) rotate(${f.Rotation})`
      //     )
      //     .attr("class", `${tidyName(f.Type.family)} furniture`)
      //     .append("use")
      //     .attr("xlink:href", `#${tidyName(f.Type.family)}`);
      // });

      let peopleFlipAdjust = "";
      if (flipMapY) {
        analyticsLayer.attr("transform", "scale(1, -1)");
        analyticsLayer.attr("transform-origin", "center");
        backgroundLayer.attr("transform", "scale(1, -1)");
        backgroundLayer.attr("transform-origin", "center");
        peopleLayer.attr("transform", "scale(1, -1)");
        peopleLayer.attr("transform-origin", "center");
        peopleFlipAdjust = "scale(1, -1)";
      }

      let peopleOnMap = peopleData.filter(p => p.onMap == true);
      let people = peopleLayer
        .selectAll("g.person")
        .data(peopleOnMap, p => p.id);
      drawPeople();

      backgroundLayer
        .selectAll(".desk")
        .data(snapPoints)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x}, ${d.y}) `
                               +`rotate(${d.rotation || 0})`)
        .append("use")
          .attr("xlink:href", d => {
            return `#${tidyName(d.type.family)}`
          })
          .attr("id", d => "desk_" + d.name)
          .attr("class", "deskShape")
        .select(function() {
          return this.parentNode;
        })
        .append("text")
          .classed("desk-label", true)
          .attr("text-anchor", "middle")
          .attr("x", 1000)
          .attr("y", 0)
          .text(d => d.name)
        .select(function() {
          return this.parentNode;
        })
          .append("circle")
          .attr("cx", d => 1000)
          .attr("cy", d => 0)
          .attr("r", 50)
          .style("fill", "red")
        .select(function() {
          return this.parentNode;
        })
          .append("circle")
          .attr("cx", d => 0)
          .attr("cy", d => 0)
          .attr("r", 10)
          .style("fill", "black");
      

      svg.call(d3.zoom().on("zoom", zoomed));
      function zoomed() {
        g.attr("transform", d3.event.transform);
      }

      function distance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
      }

      function dragstarted(d) {
        d3.select(this)
          .raise()
          .classed("active", true);
        d.highlighted = true;
        updateTable();
      }

      function dragged(d) {
        /* calculate the distances off the pointer, not the element. 
           If you use the element then snaps become irreversable. */
        let distances = snapPoints.map(sp => ({
          snapPt: sp,
          distance: distance(d3.event, sp)
        }));
        distances = distances.sort((a, b) => a.distance - b.distance);
        let close_one = distances[0];

        let snapRadius = radius * 2;
        if (close_one.distance < snapRadius) {
          drag_node(this, close_one.snapPt);
          d.x = close_one.snapPt.x;
          d.y = close_one.snapPt.y;
          d3.select(this).classed("snapped", true);
          console.log("Snapped to", close_one);
        } else {
          drag_node(this, d3.event);
          d.x = d3.event.x;
          d.y = d3.event.y;
          d3.select(this).classed("snapped", false);
        }

        function drag_node(me, pt) {
          d3.select(me).attr(
            "transform",
            `translate(${pt.x}, ${pt.y}) ${peopleFlipAdjust}`
          );
        }

        redrawHulls();
      }

      function dragended(d) {
        let draggedNode = d3.select(this);

        let i = peopleData.findIndex(p => p.FirstName === d.FirstName);
        peopleData[i].placed = false;
        draggedNode.classed("active", false);

        if (draggedNode.classed("snapped")) {
          peopleData[i].x = d.x;
          peopleData[i].y = d.y;
          peopleData[i].placed = true;
          console.log(peopleData, d);
        }
        d.highlighted = false;
        updateTable();
      }

      /*TEAM HULLS*/
      function redrawHulls() {
        if(DOING_HULLS) {
          teams.map((t, i) => {
            let vertices;
            let teamPeople = peopleData.filter(p => p.team == t && p.onMap);
            if (teamPeople.length >= 3) {
              //must have 3 people to make a meaningful hull
              vertices = teamPeople.map(a => [a.x, a.y]);
            } else {
              vertices = [[0, 0], [0, 1], [1, 1]];
            }
            hulls[i]
              .datum(d3.polygonHull(vertices))
              .attr("d", d => "M" + d.join("L") + "Z");
          });
        }
      }
      let teams = Array.from(new Set(peopleData.map(p => p.team)));
      // console.log(teams);
      DOING_HULLS = false;
      if (DOING_HULLS) {
        let hulls = teams.map((t, i) => {
          return analyticsLayer
            .append("path")
            .attr("class", `hull ${t} `)
            .attr("stroke-width", radius * 2)
            .style("fill", color(i))
            .style("stroke", color(i));
        });
        redrawHulls();
      } //end hulls

      
      /*TABLE*/
      var sortAscending = true;
      var table = d3.select("#page-wrap").append("table");
      var columnsToShow = ["FirstName", "LastName", "studio", "team"];
      // var titles = d3.keys(peopleData[0]);
      var titles = columnsToShow;
      var headers;
      var headersEl;
      var rows;
      var rowsEl;

      table.append("thead").append("tr");

      table.append("tbody");

      updateTable();
      function updateTable() {
        headers = table
          .select("thead tr")
          .selectAll("th")
          .data(columnsToShow);

        headersEl = headers
          .enter()
          .append("th")
          .merge(headers);

        headersEl.text(d => d).on("click", doSort);

        headers.exit().remove();

        rows = table
          .select("tbody")
          .selectAll("tr")
          .data(peopleData);

        rowsEl = rows
          .enter()
          .append("tr")
          .attr("data-row", d => d.FirstName)
          .attr("data-who", d => d.FirstName)

          .on("click", togglePersonOnMap)
          // .on('mousedown', highlightPerson)
          // .on('mouseup', unhighlightPerson)
          .on("mouseover", highlightPerson)
          .on("mouseout", unhighlightPerson)
          .on("contextmenu", removePersonFromMap);

        let rowMerge = rowsEl.merge(rows);
        rowMerge.classed("highlighted", d => d.highlighted);

        let rowContent = rowMerge.selectAll("td").data(d => {
          return titles.map(k => ({ value: d[k], colName: k }));
        });

        rowContent
          .enter()
          .append("td")
          .attr("data-th", d => d.colName)
          .merge(rowContent)
          .text(d => d.value);

        rows.exit().remove();
        // made, now update

        /*
            headers
                .text(d => d)
                .on("click", doSort);
            
            rows
                .selectAll("td")
                .attr("data-th", d => d.name)
                .text(d => d.value); */
      }

      function doSort(d) {
        headersEl.attr("class", "header"); //reset header to no arrow

        var direction;
        if (sortAscending) {
          sortAscending = false;
          direction = 1;
          this.className = "aes";
        } else {
          sortAscending = true;
          direction = -1;
          this.className = "des"; // adds arrow
        }

        var rowsEl1 = rowsEl.merge(rows);
        rowsEl1.sort(function(a, b) {
          var nameA = Number.isInteger(a[d]) ? a[d] : a[d].toLowerCase();
          var nameB = Number.isInteger(b[d]) ? b[d] : b[d].toLowerCase();
          if (nameA < nameB)
            //sort string ascending
            return -1 * direction;
          if (nameA > nameB) return 1 * direction;
          return 0; //default return value (no sorting)
        });
        // updateTable();
      }

      function highlightPerson(e) {
        d3.select(`g[data-name='${e.selectorName}']`).classed("focused", true);
      }
      function unhighlightPerson(e) {
        d3.select(`g[data-name='${e.selectorName}']`).classed("focused", false);
      }
      function addPersonToMap(d, i) {
        peopleData[i].onMap = true;
        drawPeople();
        updateTable();
        redrawHulls();
      }

      function togglePersonOnMap(d, i) {
        peopleData[i].onMap = !peopleData[i].onMap;
        drawPeople();
        updateTable();
        redrawHulls();
      }

      function removePersonFromMap(d, i) {
        d3.event.preventDefault();
        // react on right-clicking
        peopleData[i].onMap = false;
        // drawPeople();
        updateTable();
        redrawHulls();
      }

      function drawPeople() {
        let peopleOnMap = peopleData.filter(p => p.onMap == true);
        let people = peopleLayer
          .selectAll("g.person")
          .data(peopleOnMap, p => p.id);

        people
          .enter()
          .append("g")
          .attr(
            "transform",
            d => `translate(${d.x}, ${d.y}) ${peopleFlipAdjust}`
          )
          .classed("person", true)
          .classed("focused", p => p.highlighted)
          .classed("offMap", p => !p.onMap)
          .attr("data-name", p => p.selectorName)
          .call(
            d3
              .drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended)
          )
          .append("circle")
          .classed("person-handle", true)
          .attr("r", radius * 2)
          .select(function() {
            return this.parentNode;
          })
          .append("circle")
          .classed("person-dot", true)
          .attr("r", radius)
          .style("fill", (d, i) => color(d.id))
          .select(function() {
            return this.parentNode;
          })
          .append("text")
          .classed("person-label", true)
          .attr("text-anchor", "middle")
          .text(d => d.displayName);

        people
          .select(".person.handle")
          .classed("person-handle", true)
          .attr("r", radius * 2);

        people
          .select(".person-dot")
          .classed("person-dot", true)
          .attr("r", radius)
          .style("fill", (d, i) => color(d.id));

        people
          .select(".person-label")
          .classed("person-label", true)
          .attr("text-anchor", "middle")
          .text(d => d.displayName);

        people.exit().remove();
      }
    }
  );
});

function getPointCollectionBounds(snapPoints) {
  let xVals = snapPoints.map(a => a.x);
  let yVals = snapPoints.map(a => a.y);
  let xMax = Math.max(...xVals);
  let yMax = Math.max(...yVals);
  let xMin = Math.min(...xVals);
  let yMin = Math.min(...yVals);
  return { xMax, yMax, xMin, yMin };
}

function randBetween(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getCoord(inputCoord, boundsMin, boundsMax) {
  if (inputCoord == 0) {
    return Math.round(randBetween(boundsMin, boundsMax));
  } else {
    return inputCoord;
  }
}
