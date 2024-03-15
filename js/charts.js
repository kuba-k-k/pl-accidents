export function load_accident_counts_by_months(data_url, div_id, settings) {
  d3.csv(data_url).then(function(data) {
      // load data
      data.forEach(function(d) {
          d.date = d3.isoParse(d.date);
          d.count = +d.count;
      });

      // data transformation
      const data_counts = d3.rollups(data,
          v => d3.sum(v, d => d.count),
          d => d.date.getFullYear() + "-" + String(d.date.getMonth() + 1).padStart(2, '0')
        ).map(function([key, value]) {
          return {
            period: d3.timeParse("%Y-%m")(key),
            count: value};
      }).sort((a, b) => a.period - b.period);

      const data_rolling = data_counts.map((d, i, arr) => {
          if (i < 12) {return {period: d.period, rolling_avg: null};}
          else {
              let sum = 0;
              for (let j = i - 11; j <= i; j++) {
                  sum += arr[j].count;
              }
              return {period: d.period, rolling_avg: sum / 12};
          }
      });

      // svg setup
      const container = document.getElementById(div_id);
      const margin = {top: 20, right: 50, bottom: 30, left: 40},
            width = container.clientWidth - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

      const svg = d3.select("#" + div_id).append("svg")
          .attr('class', div_id + "-by-months")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr('class', div_id + "-by-months-chart-group")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      // axes
      const x = d3.scaleTime()
          .domain(d3.extent(data_counts, d => d.period))
          .range([0, width]);

      const y = d3.scaleLinear()
          .domain([0, d3.max(data_counts, d => d.count)])
          .range([height, 0]);

      svg.append("g")
         .attr('class', 'x-axis')
         .attr("transform", "translate(0," + height + ")")
         .call(d3.axisBottom(x));

      svg.append("g")
         .attr('class', 'y-axis')
         .call(d3.axisLeft(y));

      // remarks
      if (settings) {
        settings["remarks"].forEach(function(remark){
          var position_top = (remark["text-position"].split("-")[1]=="bottom") ? (210) : (10);
          if (remark["type"]=="area"){
            svg.append("rect")
                .attr('class', 'remarks')
                .attr("x", x(remark["date-from"]))
                .attr("y", 0)
                .attr("width", x(remark["date-to"]) - x(remark["date-from"]))
                .attr("height", height)
                .attr("fill", "#FFBF00")
                .style("opacity", 0);
            svg.append("text").attr("class", "remarks")
              .attr("x", x(remark["date-from"]) + (x(remark["date-to"]) - x(remark["date-from"]))/2)
              .attr("y", position_top).style("font-size", 12)
              .style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
              .text(remark["text-upper"]);
            svg.append("text").attr("class", "remarks").attr("x", x(remark["date-from"]) + (x(remark["date-to"]) - x(remark["date-from"]))/2)
              .attr("y", position_top+15).style("font-size", 10)
              .style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
              .text(remark["text-lower"]);

            d3.select("#" + div_id + " rect.remarks").transition().duration(1000).delay(1500).style("opacity", 0.2);
            d3.selectAll("#" + div_id + " text.remarks").transition().duration(800).delay(1700).style("opacity", 1);
          } else if (remark["type"]=="line"){
              svg.append("line")
                  .attr('class', 'remarks')
                  .attr("x1", x(remark["date"]))
                  .attr("y1", 0)
                  .attr("x2", x(remark["date"]))
                  .attr("y2", height)
                  .attr("stroke", "black")
                  .attr("stroke-width", 1)
                  .style("opacity", 0);
              svg.append("text").attr("class", "remarks")
                .attr("x", x(remark["date"]) + 5).attr("y", position_top)
                .style("font-size", 12).style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                .text(remark["text-upper"]);
              svg.append("text").attr("class", "remarks")
                .attr("x", x(remark["date"]) + 5).attr("y", position_top + 15)
                .style("font-size", 10).style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                .text(remark["text-lower"]);

             d3.select("#" + div_id + " line.remarks").transition().duration(1000).delay(1500).style("opacity", 1);
             d3.selectAll("#" + div_id + " text.remarks").transition().duration(800).delay(1700).style("opacity", 1);
          } else {}
        });

        // legend
        var legend_horizontal  = (() => {
            switch (settings["legend-position"].split("-")[0]) {
                case "left": return 20;
                case "center": return width/2;
                case "right": return width-200;
                default: return 20;
            }
        })();
        var legend_vertical  = (() => {
            switch (settings["legend-position"].split("-")[1]) {
                case "top": return 0;
                case "center": return height/2;
                case "bottom": return 180;
                default: return 180;
            }
        })();

        const legend = svg.append("g")
          .attr("class", "legend")
        const legend_rect = legend.append("rect")
          .attr("x", legend_horizontal)
          .attr("y", legend_vertical)
          .attr('fill', 'none')
          .attr('stroke', 'black')
          .attr('stroke-width', 0.2)
          .attr('height', 52)
          .attr('width', 0)
          .transition().duration(500)
          .attr('width', 210);
        legend.append("rect").attr("class", "legend-item")
          .attr("x", legend_horizontal + 10).attr("y", legend_vertical + 15)
          .attr("width", 20).attr("height", 2).style("fill", "#DC143C").style("opacity", 0);
        legend.append("text")
          .attr("class", "legend-item-text")
          .attr("x", legend_horizontal + 35).attr("y", legend_vertical + 19)
          .style("font-size", 12)
          .style("text-anchor", "start")
          .text("liczba wypadków w miesiącu")
          .style("opacity", 0);
        legend.append("rect").attr("class", "legend-item")
          .attr("x",legend_horizontal + 10).attr("y", legend_vertical + 35)
          .attr("width", 9).attr("height", 2).style("fill", "#333333").style("opacity", 0);
        legend.append("rect").attr("class", "legend-item")
          .attr("x", legend_horizontal + 21).attr("y", legend_vertical + 35).attr("width", 9)
          .attr("height", 2).style("fill", "#333333").style("opacity", 0);
        legend.append("text")
          .attr("class", "legend-item-text")
          .attr("x", legend_horizontal + 35).attr("y", legend_vertical + 39)
          .style("font-size", 12)
          .style("text-anchor", "start")
          .text("średnia krocząca (12 miesięcy)")
          .style("opacity", 0);
        d3.selectAll(".legend-item, .legend-item-text")
          .transition()
          .delay(250)
          .duration(500)
          .style("opacity", 1)
      }

      // counts line
      const countsLine = d3.line()
          .x(d => x(d.period))
          .y(d => y(d.count))
          .curve(d3.curveMonotoneX);

      const pathCounts = svg.append("path")
          .attr('class', 'chart-line')
          .data([data_counts])
          .attr("fill", "none")
          .attr("stroke", "#DC143C")
          .attr("stroke-width", 2)
          .attr("d", countsLine);

      // animation
      const totalLengthCounts = pathCounts.node().getTotalLength();
      pathCounts.attr("stroke-dasharray", totalLengthCounts + " " + totalLengthCounts)
          .attr("stroke-dashoffset", totalLengthCounts)
          .transition()
          .duration(1000)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);


      // rolling average line
      const rollingLine = d3.line()
          .defined(d => d.rolling_avg !== null)
          .x(d => x(d.period))
          .y(d => y(d.rolling_avg))
          .curve(d3.curveMonotoneX);

      svg.append("path")
          .attr('class', 'chart-line')
          .data([data_rolling])
          .attr("fill", "none")
          .attr("stroke", "#333333")
          .attr("stroke-dasharray", "5,5")
          .attr("stroke-width", 1)
          .attr("d", rollingLine)
          .style("opacity", 0)
          .transition()
          .duration(1000)
          .delay(1000)
          .style("opacity", 1);

  }).catch(function(error) {
      console.log(error);
  });
}


export function unload_accident_counts_by_months(div_id, callback) {
  d3.select("." + div_id + "-by-months-chart-group").selectAll(".chart-line, .legend, .remarks, .x-axis")
    .transition()
    .duration(500)
    .style('opacity', 0);

  d3.select("." + div_id + "-by-months-chart-group").selectAll(".y-axis")
    .transition()
    .duration(500)
    .style('opacity', 0)
    .on('end', () => {
      d3.select("." + div_id + "-by-months").remove();
      if(callback) callback();
    });
}



export function load_accident_counts_by_days(data_url, div_id, highlighted_year, settings) {
  function parseDate(d) {
      const parsed = d3.timeParse("%Y-%m-%d")(d);
      if (parsed.getMonth() === 1 && parsed.getDate() === 29) {return null;}
      return parsed;
  }

  function dayOfYearToDate(dayOfYear) {
      var date = new Date(2021, 0);
      return new Date(date.setDate(dayOfYear));
  }

  d3.csv(data_url).then(function(data) {
      const filteredData = data.map(d => ({
          date: parseDate(d.date),
          count: +d.count
      })).filter(d => d.date !== null);

      const data_rolling = d3.groups(filteredData, d => d.date.getFullYear(), d => d3.timeFormat("%j")(d.date))
          .map(([year, days]) => ({
              year,
              days: days.map(([dayOfYear, entries], index, arr) => {
                  let sum = 0;
                  let count = 0;
                  for (let i = -6; i <= 0; i++) {
                      const pos = index + i;
                      if (pos >= 0 && pos < arr.length) {
                          const [, dayEntries] = arr[pos];
                          const daySum = d3.sum(dayEntries, d => d.count);
                          sum += daySum;
                          count++;
                      }
                  }
                  return {
                      dayOfYear: +dayOfYear,
                      count: sum / count
                  };
              })
          }));
      data_rolling.forEach(yearData => {
          yearData.days.forEach(d => {
              d.date = dayOfYearToDate(d.dayOfYear);
          });
      });

      // svg setup
      const container = document.getElementById(div_id);
      const margin = {top: 20, right: 50, bottom: 30, left: 40},
            width = container.clientWidth - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

      const svg = d3.select("#" + div_id).append("svg")
          .attr('class', div_id + "-by-days")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr('class', div_id + "-by-days-chart-group")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // blur filter
      const defs = svg.append("defs");
      const blurFilter = defs.append("filter")
          .attr("id", "blur")
          .append("feGaussianBlur")
          .attr("stdDeviation", 2);

      const x = d3.scaleTime()
          .domain([new Date(2021, 0, 1), new Date(2021, 11, 31)])
          .range([0, width]);
      const xAxis = d3.axisBottom(x)
          .tickFormat(d3.timeFormat("%d-%b"));

      const y = d3.scaleLinear().domain([0, d3.max(data_rolling, year => d3.max(year.days, d => d.count))]).range([height, 0]);

      svg.append("g")
          .attr('class', 'x-axis')
          .attr("transform", `translate(0,${height})`)
          .call(xAxis);

      svg.append("g")
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y));


      if (settings){
        // legend
        var legend_horizontal  = (() => {
            switch (settings["legend-position"].split("-")[0]) {
                case "left": return 20;
                case "center": return width/2;
                case "right": return width-210;
                default: return 20;
            }
        })();
        var legend_vertical  = (() => {
            switch (settings["legend-position"].split("-")[1]) {
                case "top": return 0;
                case "center": return height/2;
                case "bottom": return 180;
                default: return 180;
            }
        })();

        const legend = svg.append("g")
          .attr("class", "legend")
        const legend_rect = legend.append("rect")
          .attr("x", legend_horizontal)
          .attr("y", legend_vertical)
          .attr('fill', 'none')
          .attr('stroke', 'black')
          .attr('stroke-width', 0.2)
          .attr('height', 52)
          .attr('width', 0)
          .transition().duration(500)
          .attr('width', 210);
        legend.append("rect").attr("class", "legend-item")
          .attr("x", legend_horizontal + 10).attr("y", legend_vertical + 15)
          .attr("width", 20).attr("height", 2).style("fill", "#DC143C").style("opacity", 0);
        legend.append("text")
          .attr("class", "legend-item-text highlighted")
          .attr("x", legend_horizontal + 35).attr("y", legend_vertical + 19)
          .style("font-size", 12)
          .style("text-anchor", "start")
          .text(highlighted_year + " - średnia krocząca (7 dni)")
          .style("opacity", 0);
        legend.append("rect").attr("class", "legend-item")
          .attr("x",legend_horizontal + 10).attr("y", legend_vertical + 35)
          .attr("width", 20).attr("height", 2).style("fill", "#333333").attr("filter", "url(#blur)").style("opacity", 0);
        legend.append("text")
          .attr("class", "legend-item-text")
          .attr("x", legend_horizontal + 35).attr("y", legend_vertical + 39)
          .style("font-size", 12)
          .style("text-anchor", "start")
          .text("pozostałe lata")
          .style("opacity", 0);
        d3.selectAll(".legend-item, .legend-item-text")
          .transition()
          .delay(250)
          .duration(500)
          .style("opacity", 1)

      }


      const color = year => year === highlighted_year ? "#DC143C" : "#B3B3B3";
      const lineGenerator = d3.line()
          .x(d => x(d.date))
          .y(d => y(d.count))
          .curve(d3.curveMonotoneX);

      // lines
      const yearLines = svg.selectAll(".chart-line")
          .data(data_rolling)
          .enter().append("path")
          .attr("class", "chart-line")
          .attr("d", d => lineGenerator(d.days))
          .style("stroke", d => color(d.year))
          .attr("stroke-width", d => d.year !== highlighted_year ? 1 : 2)
          .attr("filter", d => d.year !== highlighted_year ? "url(#blur)" : null)
          .style("fill", "none");

      // animate
      yearLines.each(function() {
          const totalLength = this.getTotalLength();
          d3.select(this)
              .attr("stroke-dasharray", totalLength + " " + totalLength)
              .attr("stroke-dashoffset", totalLength)
              .transition()
              .duration(1000)
              .ease(d3.easeLinear)
              .attr("stroke-dashoffset", 0);
      });

  }).catch(function(error) {
      console.log(error);
  });
}



export function unload_accident_counts_by_days(div_id, callback) {
  d3.select("." + div_id + "-by-days-chart-group").selectAll(".chart-line, .legend, .remarks, .x-axis")
    .transition()
    .duration(500)
    .style('opacity', 0);

  d3.select("." + div_id + "-by-days-chart-group").selectAll(".y-axis")
    .transition()
    .duration(500)
    .style('opacity', 0)
    .on('end', () => {
      d3.select("." + div_id + "-by-days").remove();
      if(callback) callback();
    });
}



export function change_accident_counts_by_days(div_id, highlighted_year, settings) {
    d3.selectAll("#" + div_id + " rect.remarks, #" + div_id + " line.remarks, #" + div_id + " text.remarks")
      .transition()
      .duration(500)
      .style('opacity', 0)
      .remove();

    d3.selectAll("." + div_id + "-by-days-chart-group .chart-line")
      .filter(d => d.year === highlighted_year)
      .raise();
    d3.selectAll("." + div_id + "-by-days-chart-group .chart-line")
      .transition().duration(500)
      .style("stroke", function(d) {
          return d.year === highlighted_year ? "#DC143C" : "#B3B3B3";
      })
      .attr("stroke-width", function(d) {
          return d.year === highlighted_year ? 2: 1;
      })
      .attr("filter", function(d) {
          return d.year === highlighted_year ? null: "url(#blur)";
      });
    d3.selectAll("." + div_id + "-by-days-chart-group .legend-item-text.highlighted")
      .transition().duration(250).style("opacity", 0)
      .transition().duration(250).text(highlighted_year + " - średnia krocząca (7 dni)").style("opacity", 1);


    if (settings){
      const width = document.getElementById(div_id).clientWidth - 90;
      const height = document.getElementById(div_id).clientHeight - 50;
      const x = d3.scaleTime()
          .domain([new Date(2021, 0, 1), new Date(2021, 11, 31)])
          .range([0, width]);

      settings["remarks"].forEach(function(remark){
        if (remark["years"].includes(highlighted_year)){
          var position_top = (remark["text-position"].split("-")[1]=="bottom") ? (210) : (10);
          if (remark["type"]=="area"){
            d3.select("#" + div_id + " svg").append("rect")
                .attr('class', 'remarks')
                .attr("x", x(remark["date-from"])+40)
                .attr("y", 20)
                .attr("width", x(remark["date-to"]) - x(remark["date-from"]))
                .attr("height", height)
                .attr("fill", "#FFBF00")
                .style("opacity", 0);
            d3.select("#" + div_id + " svg").append("text").attr("class", "remarks")
              .attr("x", x(remark["date-from"]) + (x(remark["date-to"]) - x(remark["date-from"]))/2 + 40)
              .attr("y", position_top + 30).style("font-size", 12)
              .style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
              .text(remark["text-upper"]);
            d3.select("#" + div_id + " svg").append("text").attr("class", "remarks").attr("x", x(remark["date-from"]) + (x(remark["date-to"]) - x(remark["date-from"]))/2 + 40)
              .attr("y", position_top + 45).style("font-size", 10)
              .style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
              .text(remark["text-lower"]);

            d3.select("#" + div_id + " rect.remarks").transition().duration(1000).delay(500).style("opacity", 0.2);
            d3.selectAll("#" + div_id + " text.remarks").transition().duration(800).delay(700).style("opacity", 1);
          } else if (remark["type"]=="line"){
              d3.select("#" + div_id + " svg").append("line")
                  .attr('class', 'remarks')
                  .attr("x1", x(remark["date"])+40)
                  .attr("y1", 20)
                  .attr("x2", x(remark["date"])+40)
                  .attr("y2", height+20)
                  .attr("stroke", "black")
                  .attr("stroke-width", 1)
                  .style("opacity", 0);
              d3.select("#" + div_id + " svg").append("text").attr("class", "remarks")
                .attr("x", x(remark["date"]) + 50).attr("y", position_top + 20)
                .style("font-size", 12).style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                .text(remark["text-upper"]);
              d3.select("#" + div_id + " svg").append("text").attr("class", "remarks")
                .attr("x", x(remark["date"]) + 50).attr("y", position_top + 35)
                .style("font-size", 10).style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                .text(remark["text-lower"]);

             d3.select("#" + div_id + " line.remarks").transition().duration(1000).delay(500).style("opacity", 1);
             d3.selectAll("#" + div_id + " text.remarks").transition().duration(800).delay(700).style("opacity", 1);
          } else {}
        }
      });
    }
}


export function load_accidents_by_types(data_url){
  // svg setup
  const container = document.getElementById('accidents-by-type');
  const container_map = document.getElementById('accidents-map');
  const margin = {top: 0, right: 50, bottom: 0, left: 40},
        width = container.clientWidth - margin.left - margin.right,
        height = container_map.clientHeight - margin.top - margin.bottom;

  const svg = d3.select("#accidents-by-type")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Load the CSV data
  d3.csv(data_url, function(d) {return {type: d.type, count: +d.count};})
    .then(function(data) {
      const total = data.reduce((acc, d) => acc + d.count, 0);

      // x-axis
      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.count)])
        .range([0, width]);

      // y-axis
      const y = d3.scaleBand()
        .range([0, height])
        .domain(data.map(d => d.type))
        .padding(0.1);
      svg.append("g")
        .call(d3.axisLeft(y)
          .tickFormat("")
          .tickSize(0)
        )

      // bars
      svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.type))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", "#DC143C")
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr("width", d => x(d.count));

      svg.selectAll(".label")
        .data(data)
        .enter().append("text")
        .attr("class", "label")
        .attr("x", d => d.count > 900000 ? 10 : Math.max(3, x(d.count) + 10))
        .attr("y", d => y(d.type) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => d.type + " - " + ((d.count / total) * 100).toFixed(1) + "%")
        .attr("fill", d => d.count > 900000 ? "white" : "#333333")
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .delay((d, i) => i * 200)
        .style("opacity", 1);
    })
  .catch(function(error) {
      console.log(error);
  });
}



export const load_predicted_accident_counts_by_months = {
    svg: null,
    x: null,
    y: null,
    data: null,
    settings: null,
    containerId: null,
    width: null,
    height: null,

    load: function(data_url, div_id, domain, settings) {
        this.settings = settings;
        this.containerId = div_id;

        d3.csv(data_url).then((data) => {
            this.data = data.map(d => {
                return {
                    period: d3.isoParse(d.period),
                    count: +d.count,
                    predicted_count: +d.predicted_count
                };
            });

            // svg setup
            const container = document.getElementById(div_id);
            const margin = {top: 20, right: 50, bottom: 0, left: 40};
            this.width = container.clientWidth - margin.left - margin.right;
            this.height = 300 - margin.top - margin.bottom;

            this.svg = d3.select("#" + div_id).append("svg")
                .attr('class', div_id + "-by-months")
                .attr("width", this.width + margin.left + margin.right)
                .attr("height", this.height + margin.top + margin.bottom);

            // define & apply clipping path
            this.svg.append("defs")
              .append("clipPath")
                .attr("id", "clip")
              .append("rect")
                .attr("width", this.width)
                .attr("height", this.height);

            const chart_group = this.svg.append("g")
                .attr('class', div_id + "-by-months-chart-group")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("clip-path", "url(#clip)");

            // data for domain
            const dataForDomain = this.data.filter(d => d.period >= domain[0] && d.period <= domain[1]);

            // axes
            this.x = d3.scaleTime()
                .domain(d3.extent(dataForDomain, d => d.period))
                .range([0, this.width]);

            this.y = d3.scaleLinear()
                .domain([0, d3.max(this.data, d => d.count)])
                .domain([0, 1350])
                .range([this.height, 0]);

            this.svg.append("g")
               .attr('class', 'x-axis')
               .attr("transform", "translate(" + margin.left + "," + this.height + ")")
               .call(d3.axisBottom(this.x));

            this.svg.append("g")
               .attr('class', 'y-axis')
               .attr("transform", "translate(" + margin.left + ",0)")
               .call(d3.axisLeft(this.y));

            // remarks
            if (settings){
              settings["remarks"].forEach((remark) => {
                var position_top = (remark["text-position"].split("-")[1]=="bottom") ? (210) : (10);
                if (remark["type"]=="area"){
                  this.svg.append("rect")
                      .attr("transform", "translate(" + margin.left + ",0)")
                      .attr('class', 'remarks')
                      .attr("x", this.x(remark["date-from"]))
                      .attr("y", 0)
                      .attr("width", this.x(remark["date-to"]) - this.x(remark["date-from"]))
                      .attr("height", this.height)
                      .attr("fill", "#FFBF00")
                      .style("opacity", 0);
                  this.svg.append("text").attr("class", "remarks")
                    .attr("transform", "translate(" + margin.left + ",0)")
                    .attr("x", this.x(remark["date-from"]) + (this.x(remark["date-to"]) - this.x(remark["date-from"]))/2)
                    .attr("y", position_top).style("font-size", 12)
                    .style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                    .text(remark["text-upper"]);
                  this.svg.append("text").attr("class", "remarks").attr("x", this.x(remark["date-from"]) + (this.x(remark["date-to"]) - this.x(remark["date-from"]))/2)
                    .attr("transform", "translate(" + margin.left + ",0)")
                    .attr("y", position_top+15).style("font-size", 10)
                    .style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                    .text(remark["text-lower"]);

                  d3.select("#" + div_id + " rect.remarks").transition().duration(1000).delay(1500).style("opacity", 0.2);
                  d3.selectAll("#" + div_id + " text.remarks").transition().duration(800).delay(1700).style("opacity", 1);
                } else if (remark["type"]=="line"){
                    this.svg.append("line")
                        .attr("transform", "translate(" + margin.left + ",0)")
                        .attr('class', 'remarks')
                        .attr("x1", this.x(remark["date"]))
                        .attr("y1", 0)
                        .attr("x2", this.x(remark["date"]))
                        .attr("y2", this.height)
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                        .style("opacity", 0);
                    this.svg.append("text").attr("class", "remarks")
                      .attr("transform", "translate(" + margin.left + ",0)")
                      .attr("x", this.x(remark["date"]) + 5).attr("y", position_top)
                      .style("font-size", 12).style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                      .text(remark["text-upper"]);
                    this.svg.append("text").attr("class", "remarks")
                      .attr("transform", "translate(" + margin.left + ",0)")
                      .attr("x", this.x(remark["date"]) + 5).attr("y", position_top + 15)
                      .style("font-size", 10).style("text-anchor", remark["text-position"].split("-")[0]).style("opacity", 0)
                      .text(remark["text-lower"]);

                   d3.select("#" + div_id + " line.remarks").transition().duration(1000).delay(1500).style("opacity", 1);
                   d3.selectAll("#" + div_id + " text.remarks").transition().duration(800).delay(1700).style("opacity", 1);
                } else {}
              });

              // legend
              var legend_horizontal  = (() => {
                  switch (settings["legend-position"].split("-")[0]) {
                      case "left": return 20;
                      case "center": return this.width/2;
                      case "right": return this.width-200;
                      default: return 20;
                  }
              })();
              var legend_vertical  = (() => {
                  switch (settings["legend-position"].split("-")[1]) {
                      case "top": return 0;
                      case "center": return this.height/2;
                      case "bottom": return 180;
                      default: return 180;
                  }
              })();

              const legend = this.svg.append("g")
                .attr("transform", "translate(" + margin.left + ",0)")
                .attr("class", "legend")
              const legend_rect = legend.append("rect")
                .attr("x", legend_horizontal)
                .attr("y", legend_vertical)
                .attr('fill', 'none')
                .attr('stroke', 'black')
                .attr('stroke-width', 0.2)
                .attr('height', 52)
                .attr('width', 0)
                .transition().duration(500)
                .attr('width', 210);
              legend.append("rect").attr("class", "legend-item")
                .attr("x", legend_horizontal + 10).attr("y", legend_vertical + 15)
                .attr("width", 20).attr("height", 2).style("fill", "#DC143C").style("opacity", 0);
              legend.append("text")
                .attr("class", "legend-item-text")
                .attr("x", legend_horizontal + 35).attr("y", legend_vertical + 19)
                .style("font-size", 12)
                .style("text-anchor", "start")
                .text("Wynik rzeczywisty")
                .style("opacity", 0);
              legend.append("rect").attr("class", "legend-item")
                .attr("x",legend_horizontal + 10).attr("y", legend_vertical + 35)
                .attr("width", 20).attr("height", 2).style("fill", "#333333").style("opacity", 0);
              legend.append("text")
                .attr("class", "legend-item-text")
                .attr("x", legend_horizontal + 35).attr("y", legend_vertical + 39)
                .style("font-size", 12)
                .style("text-anchor", "start")
                .text("Prognoza")
                .style("opacity", 0);
              d3.selectAll(".legend-item, .legend-item-text")
                .transition()
                .delay(250)
                .duration(500)
                .style("opacity", 1)
            }

            // counts line
            const actualLineGenerator = d3.line()
                .x(d => this.x(d.period))
                .y(d => this.y(d.count))
                .curve(d3.curveMonotoneX);

            const pathCounts = chart_group.append("path")
                .attr("transform", "translate(0,"  + -margin.top + ")")
                .attr('class', 'chart-line actual-counts')
                .data([this.data])
                .attr("fill", "none")
                .attr("stroke", "#DC143C")
                .attr("stroke-width", 2)
                .attr("d", actualLineGenerator);

            // counts line
            const predictedLineGenerator = d3.line()
                .x(d => this.x(d.period))
                .y(d => this.y(d.predicted_count))
                .curve(d3.curveMonotoneX);

            const pathPredictedCounts = chart_group.append("path")
                .attr("transform", "translate(0,"  + -margin.top + ")")
                .attr('class', 'chart-line predicted-counts')
                .data([this.data])
                .attr("fill", "none")
                .attr("stroke", "#333333")
                .attr("stroke-width", 2)
                .attr("d", predictedLineGenerator);

        }).catch(function(error) {
            console.log(error);
        });
    },

    change_chart_domain: function(domain) {
      // update x domain
      const dataForDomain = this.data.filter(d => d.period >= domain[0] && d.period <= domain[1]);
      this.x.domain(d3.extent(dataForDomain, d => d.period));

      // x-axis transition
      this.svg.select(".x-axis")
         .transition()
         .duration(500)
         .call(d3.axisBottom(this.x));

      // update remarks
      this.svg.selectAll(".remarks").remove()
      if (domain[1].getTime() === new Date('2022-12-01').getTime()){
        this.svg.append("line")
            .attr("transform", "translate(50,0)")
            .attr('class', 'remarks')
            .attr("x1", this.x(new Date('2021-06-01')))
            .attr("y1", 0)
            .attr("x2", this.x(new Date('2021-06-01')))
            .attr("y2", this.height)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .style("opacity", 0);
        this.svg.append("text").attr("class", "remarks")
          .attr("transform", "translate(50,0)")
          .attr("x", this.x(new Date('2021-06-01')) + 5).attr("y", 10)
          .style("font-size", 12).style("text-anchor", "start").style("opacity", 0)
          .text("Data wejścia w życie");
        this.svg.append("text").attr("class", "remarks")
          .attr("transform", "translate(50,0)")
          .attr("x", this.x(new Date('2021-06-01')) + 5).attr("y", 25)
          .style("font-size", 10).style("text-anchor", "start").style("opacity", 0)
          .text("01/06/2021");

       this.svg.select("line.remarks").transition().duration(1000).delay(500).style("opacity", 1);
       this.svg.selectAll("text.remarks").transition().duration(800).delay(500).style("opacity", 1);
      }

      // line transition
      const actualLineGenerator = d3.line()
        .x(d => this.x(d.period))
        .y(d => this.y(d.count))
        .curve(d3.curveMonotoneX);

      this.svg.selectAll(".chart-line.actual-counts")
        .datum(this.data)
        .transition()
        .duration(500)
        .attr("d", actualLineGenerator);

      const predictedLineGenerator = d3.line()
        .x(d => this.x(d.period))
        .y(d => this.y(d.predicted_count))
        .curve(d3.curveMonotoneX);

      this.svg.selectAll(".chart-line.predicted-counts")
        .datum(this.data)
        .transition()
        .duration(500)
        .attr("d", predictedLineGenerator);

      d3.select("#clip rect")
        .transition()
        .duration(500)
        .attr("x", this.x(domain[0]))
        .attr("width", this.x(domain[1]) - this.x(domain[0]));
    },
    chage_chart_dataset: function(data_url) {
      const flattened_data = this.data.map(d => ({
        ...d,
        count: 0,
        predicted_count: 0
      }));

      // lines
      const actualLineGenerator = d3.line()
        .x(d => this.x(d.period))
        .y(d => this.y(0))
        .curve(d3.curveMonotoneX);

      const predictedLineGenerator = d3.line()
        .x(d => this.x(d.period))
        .y(d => this.y(0))
        .curve(d3.curveMonotoneX);

      this.svg.selectAll(".chart-line.actual-counts")
        .datum(flattened_data)
        .transition()
        .duration(500)
        .attr("d", actualLineGenerator);

      this.svg.selectAll(".chart-line.predicted-counts")
        .datum(flattened_data)
        .transition()
        .duration(500)
        .attr("d", predictedLineGenerator);


      // Step 2: Load new dataset
      d3.csv(data_url).then(data => {
        // parse new data
        const processed_data = data.map(d => ({
          period: d3.isoParse(d.period),
          count: +d.count,
          predicted_count: +d.predicted_count
        }));
        this.data = processed_data;

        // lines
        const actualLineGenerator = d3.line()
          .x(d => this.x(d.period))
          .y(d => this.y(d.count))
          .curve(d3.curveMonotoneX);

        const predictedLineGenerator = d3.line()
          .x(d => this.x(d.period))
          .y(d => this.y(d.predicted_count))
          .curve(d3.curveMonotoneX);

        this.svg.selectAll(".chart-line.actual-counts")
          .datum(this.data)
          .transition()
          .duration(500)
          .delay(500)
          .attr("d", actualLineGenerator);

        this.svg.selectAll(".chart-line.predicted-counts")
          .datum(this.data)
          .transition()
          .duration(500)
          .delay(500)
          .attr("d", predictedLineGenerator);


      }).catch(error => {
        console.error("Failed to load new dataset:", error);
      });
    },

};



export function load_police_penalties_chart(data_url, div_id){
  d3.csv(data_url).then(function(data) {
      // load data
      data.forEach(function(d) {
          d.penalty = d.penalty,
          d.police_perc = +d.police_perc,
          d.citizen_perc = +d.citizen_perc;
      });

      // svg setup
      const container = document.getElementById(div_id);
      const margin = {top: 20, right: 50, bottom: 30, left: 100},
            width = container.clientWidth - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

      const svg = d3.select("#" + div_id).append("svg")
          .attr('class', div_id + "-stacked")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr('class', div_id + "-stacked-chart-group")
          .attr("transform", `translate(${margin.left + width / 2}, ${margin.top})`);

      const y = d3.scaleBand()
          .range([height, 0])
          .padding(0.1)
          .domain(data.map(d => d.penalty));

      const xLeft = d3.scaleLinear()
          .range([0, -width / 2])
          .domain([0, 0.75]);

      const xRight = d3.scaleLinear()
          .range([0, width / 2])
          .domain([0, 0.75]);

      // bars
      svg.selectAll(".bar-left")
          .data(data)
          .enter().append("rect")
          .attr("class", "bar-left")
          .attr("x", d => xLeft(d.police_perc))
          .attr("y", d => y(d.penalty))
          .attr("fill", "#164fa6")
          .attr("width", d => Math.abs(xLeft(d.police_perc) - xLeft(0)))
          .attr("height", y.bandwidth());

      svg.selectAll(".bar-right")
          .data(data)
          .enter().append("rect")
          .attr("class", "bar-right")
          .attr("x", xRight(0))
          .attr("y", d => y(d.penalty))
          .attr("fill", "#FFBF00")
          .attr("width", d => xRight(d.citizen_perc))
          .attr("height", y.bandwidth());

      // y-axis
      svg.append("g")
          .call(d3.axisLeft(y).tickSize(0).tickFormat(''))
          .selectAll("text").remove();

      // labels
      svg.selectAll(".bar-label-left")
          .data(data)
          .enter().append("text")
          .attr("class", "bar-label-left")
          .attr("x", d => xLeft(d.police_perc) - 3)
          .attr("y", d => y(d.penalty) + y.bandwidth() / 2)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .style("font-size", 10)
          .text(d => `${(d.police_perc * 100).toFixed(1)}%`);

      svg.selectAll(".bar-label-right")
          .data(data)
          .enter().append("text")
          .attr("class", "bar-label-right")
          .attr("x", d => xRight(d.citizen_perc) + 3)
          .attr("y", d => y(d.penalty) + y.bandwidth() / 2)
          .attr("dy", ".35em")
          .attr("text-anchor", "start")
          .style("font-size", 10)
          .text(d => `${(d.citizen_perc * 100).toFixed(1)}%`);

      svg.selectAll(".bar-label-far-right")
          .data(data)
          .enter().append("text")
          .attr("class", "bar-label-far-right")
          .attr("x", d => xLeft(0.75) - 90)
          .attr("y", d => y(d.penalty) + y.bandwidth() / 2)
          .attr("dy", ".35em")
          .attr("text-anchor", "start")
          .style("font-size", 10)
          .text(d => d.penalty);

      // legend
      const legend = svg.append("g")
        .attr("class", "legend")
      const legend_rect = legend.append("rect")
        .attr("x", 150)
        .attr("y", height - 55)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 0.2)
        .attr('height', 52)
        .attr('width', 110);
      legend.append("rect").attr("class", "legend-item")
        .attr("x", 150 + 10).attr("y", height - 55 + 10)
        .attr("width", 20).attr("height", 10).style("fill", "#164fa6").style("opacity", 1);
      legend.append("text")
        .attr("class", "legend-item-text")
        .attr("x", 150 + 35).attr("y", height - 55 + 19)
        .style("font-size", 12)
        .style("text-anchor", "start")
        .text("Policjanci")
        .style("opacity", 1);
      legend.append("rect").attr("class", "legend-item")
        .attr("x", 150 + 10).attr("y", height - 55 + 30)
        .attr("width", 20).attr("height", 10).style("fill", "#FFBF00").style("opacity", 1);
      legend.append("text")
        .attr("class", "legend-item-text")
        .attr("x", 150 + 35).attr("y", height - 55 + 39)
        .style("font-size", 12)
        .style("text-anchor", "start")
        .text("Obywatele")
        .style("opacity", 1);

    });
}
