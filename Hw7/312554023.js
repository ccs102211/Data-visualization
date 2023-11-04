function median(values) {
  if (values.length === 0) return 0;

  values.sort(function (a, b) {
    return a - b;
  });

  var half = Math.floor(values.length / 2);

  if (values.length % 2) {
    return values[half];
  } else {
    return (values[half - 1] + values[half]) / 2.0;
  }
}

function initializeEventHandlers(horizonChartData, pollutants, pollutantColors) {
  const select = document.getElementById("year-selector");
  if (select) {
    select.addEventListener("change", function () {
      const selectedYear = this.value;
      const filteredDataByYear = horizonChartData.filter(d => d.date.getFullYear().toString() === selectedYear);

      document.querySelectorAll("svg").forEach(svg => svg.remove());


      pollutants.forEach(pollutant => {
        const filteredData = filteredDataByYear.filter(d => d.pollutant === pollutant);

        const horizonChart = HorizonChart(filteredData, {
          x: d => d.date,
          y: d => d.level,
          z: d => d.station,
          yDomain: [0, d3.max(filteredData, d => d.level)],
          width: 1280,
          size: 50,
          scheme: pollutantColors[pollutant]

        });
        document.body.appendChild(horizonChart);
      });
    });

    select.value = "2017";
    select.dispatchEvent(new Event('change'));
  } else {
    console.error("Element #year-selector was not found!");
  }
}

const tooltip = d3.select('body').append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0)
  .style('position', 'absolute')
  .style('text-align', 'center')
  .style('width', '120px')
  .style('height', '28px')
  .style('padding', '2px')
  .style('font', '12px sans-serif')
  .style('background', 'lightsteelblue')
  .style('border', '0px')
  .style('border-radius', '8px')
  .style('pointer-events', 'none');


function HorizonChart(data, {
  x = ([x]) => x,
  y = ([, y]) => y,
  z = () => 1,
  defined,
  curve = d3.curveLinear,
  marginTop = 20,
  marginRight = 0,
  marginBottom = 0,
  marginLeft = 0,
  width = 1200,
  size = 25,
  bands = 5,
  padding = 1,
  xType = d3.scaleUtc,
  xDomain,
  xRange = [marginLeft, width - marginRight],
  yType = d3.scaleLinear,
  yDomain,
  yRange = [size, size - bands * (size - padding)],
  zDomain,
  scheme = d3.schemeGreys,
  colors = scheme[Math.max(3, bands)],
} = {}) {
  const X = d3.map(data, x);
  const Y = d3.map(data, y);
  const Z = d3.map(data, z);
  if (defined === undefined) defined = (d, i) => !isNaN(X[i]) && !isNaN(Y[i]);
  const D = d3.map(data, defined);

  if (xDomain === undefined) xDomain = d3.extent(X);
  if (yDomain === undefined) yDomain = [0, d3.max(Y)];
  if (zDomain === undefined) zDomain = Z;
  zDomain = new d3.InternSet(zDomain);

  const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));

  const height = zDomain.size * size + marginTop + marginBottom;

  const xScale = xType(xDomain, xRange);
  const yScale = yType(yDomain, yRange);
  const xAxis = d3.axisTop(xScale).ticks(width / 80).tickSizeOuter(0);

  const uid = `O-${Math.random().toString(16).slice(2)}`;

  const area = d3.area()
    .defined(i => D[i])
    .curve(curve)
    .x(i => xScale(X[i]))
    .y0(yScale(0))
    .y1(i => yScale(Y[i]));

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10);

  const g = svg.selectAll("g")
    .data(d3.group(I, i => Z[i]))
    .join("g")
    .attr("transform", (_, i) => `translate(0,${i * size + marginTop})`);

  const defs = g.append("defs");

  defs.append("clipPath")
    .attr("id", (_, i) => `${uid}-clip-${i}`)
    .append("rect")
    .attr("y", padding)
    .attr("width", width)
    .attr("height", size - padding);

  defs.append("path")
    .attr("id", (_, i) => `${uid}-path-${i}`)
    .attr("d", ([, I]) => area(I));

  g
    .attr("clip-path", (_, i) => `url(${new URL(`#${uid}-clip-${i}`, location)})`)
    .selectAll("use")
    .data((d, i) => new Array(bands).fill(i))
    .join("use")
    .attr("fill", (_, i) => colors[i + Math.max(0, 3 - bands)])
    .attr("transform", (_, i) => `translate(0,${i * size})`)
    .attr("xlink:href", (i) => `${new URL(`#${uid}-path-${i}`, location)}`);

  g.append("text")
    .attr("x", marginLeft)
    .attr("y", (size + padding) / 2)
    .attr("dy", "0.35em")
    .text(([z]) => z);

  g.selectAll("use")
    .data((d) => d[1].map(index => ({ index, group: d[0] })))
    .join("use")
    //.attr("xlink:href", (d) => `${new URL(`#${uid}-path-${d.index}`, location)}`)
    .on("mousemove", function (event, d) {
      const mouseX = event.pageX - this.getBoundingClientRect().left;
      const date = xScale.invert(mouseX);
      const mouseY = event.pageY - this.getBoundingClientRect().top;

      const closestDataPoint = data.reduce((prev, curr) => {
        return (Math.abs(curr.date - date) < Math.abs(prev.date - date) ? curr : prev);
      });

      const formattedDate = d3.timeFormat("%Y/%m/%d")(closestDataPoint.date);
      const formattedValue = closestDataPoint.level.toFixed(2);

      tooltip.style('opacity', 1)
        .html(`測站: ${d.group}<br>日期: ${formattedDate}<br>值: ${formattedValue}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on("mouseout", function () {
      tooltip.style('opacity', 0);
    });

  svg.append("g")
    .attr("transform", `translate(0,${marginTop})`)
    .call(xAxis)
    .call(g => g.selectAll(".tick")
      .filter(d => xScale(d) < 10 || xScale(d) > width - 10)
      .remove())
    .call(g => g.select(".domain").remove());

  return svg.node();
}
d3.csv("http://vis.lab.djosix.com:2023/data/air-pollution.csv").then(data => {

  const dailyMeans = {};
  const pollutants = ["CO", "CN2", "O3", "PM2.5", "PM10", "SO2"];

  data.forEach(d => {
    const measurementDate = d["Measurement date"].split(" ")[0];
    const stationCode = d["Station code"];
    if (!dailyMeans[measurementDate]) {
      dailyMeans[measurementDate] = {};
    }
    if (!dailyMeans[measurementDate][stationCode]) {
      dailyMeans[measurementDate][stationCode] = {};
    }
    pollutants.forEach(pollutant => {
      const value = parseFloat(d[pollutant]);
      if (!isNaN(value)) {
        if (!dailyMeans[measurementDate][stationCode][pollutant]) {
          dailyMeans[measurementDate][stationCode][pollutant] = [];
        }
        dailyMeans[measurementDate][stationCode][pollutant].push(value);
      }
    });
  });
  for (const date in dailyMeans) {
    for (const station in dailyMeans[date]) {
      pollutants.forEach(pollutant => {
        if (dailyMeans[date][station][pollutant]) {
          const values = dailyMeans[date][station][pollutant];
          medianValue = median(values);
        }
        dailyMeans[date][station][pollutant] = medianValue;
      });
    }
  }

  const horizonChartData = [];
  for (const date in dailyMeans) {
    for (const station in dailyMeans[date]) {
      pollutants.forEach(pollutant => {
        const meanValue = dailyMeans[date][station][pollutant];
        if (meanValue !== undefined) {
          horizonChartData.push({
            date: new Date(date),
            level: meanValue,
            station: station,
            pollutant: pollutant
          });
        }
      });
    }
  }
  const pollutantColors = {
    "CO": d3.schemeReds,
    "CN2": d3.schemeOranges,
    "O3": d3.schemeGreys,
    "PM2.5": d3.schemeGreens,
    "PM10": d3.schemeBlues,
    "SO2": d3.schemePurples
  };
  const years = Array.from(new Set(data.map(d => d["Measurement date"].split(" ")[0].split("-")[0])));
  const select = document.getElementById("year-selector");
  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    select.appendChild(option);
  });

  initializeEventHandlers(horizonChartData, pollutants, pollutantColors);
});
