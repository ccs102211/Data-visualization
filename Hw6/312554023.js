const graphDimensions = {
  width: 1200,
  height: 860,
  margin: { top: 20, right: 60, bottom: 40, left: 60 }
};

const graphWidth = graphDimensions.width - graphDimensions.margin.left - graphDimensions.margin.right;
const graphHeight = graphDimensions.height - graphDimensions.margin.top - graphDimensions.margin.bottom;

const canvas = d3.select("svg")
  .attr("width", graphDimensions.width)
  .attr("height", graphDimensions.height)
  .append("g")
  .attr("transform", `translate(${graphDimensions.margin.left}, ${graphDimensions.margin.top})`);

function formatDate(input) {
  const dateComponents = input.split('/');
  return new Date(dateComponents[2], dateComponents[1] - 1, dateComponents[0]);
}

function getSelectedStreams() {
  let selectedKeys = [];
  d3.selectAll(".streamCheckbox input:checked").each(function () {
    const key = this.id.replace("streamCheckbox_", "");
    selectedKeys.push(key);
  });
  return selectedKeys;
}

async function fetchAndProcessData() {
  let rawData = await d3.csv("http://vis.lab.djosix.com:2023/data/ma_lga_12345.csv");
  rawData = rawData.filter(d => formatDate(d.saledate) > formatDate('30/09/2007'));
  rawData.forEach(d => d.saledate = formatDate(d.saledate));

  return d3.rollups(rawData,
    v => d3.median(v, d => d.MA),
    d => d.saledate,
    d => d.type,
    d => d.bedrooms
  ).map(group => {
    const entry = { saledate: group[0] };
    group[1].forEach(subGroup => {
      subGroup[1].forEach(dataPoint => {
        const keyName = `${subGroup[0]}_${dataPoint[0]}`;
        entry[keyName] = dataPoint[1];
      });
    });
    return entry;
  });
}

function drawStreamGraph(data) {
  const selectedKeys = getSelectedStreams();
  const stackedData = d3.stack().keys(selectedKeys)(data);
  const keys = Object.keys(data[0]).filter(key => key !== "saledate");

  canvas.selectAll("*").remove();

  const xScale = d3.scaleTime()
    .range([0, graphWidth])
    .domain(d3.extent(data, d => d.saledate));

  const yScale = d3.scaleLinear()
    .range([graphHeight, 0])
    .domain([
      d3.min(stackedData, layer => d3.min(layer, segment => segment[0])),
      d3.max(stackedData, layer => d3.max(layer, segment => segment[1]))
    ]);

  const colorScale = d3.scaleOrdinal()
    .domain(keys)
    .range(d3.schemeTableau10);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  canvas.selectAll("path")
    .data(stackedData)
    .enter().append("path")
    .style("fill", d => colorScale(d.key))
    .attr("d", d3.area()
      .x(d => xScale(d.data.saledate))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
    )
    .on("mousemove", function (event, d) {
      const [x, y] = d3.pointer(event);
      const hoveredDate = xScale.invert(x);

      const bisectDate = d3.bisector(d => d.saledate).left;
      const i = bisectDate(data, hoveredDate, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const matchedData = hoveredDate - d0.saledate > d1.saledate - hoveredDate ? d1 : d0;

      if (matchedData) {
        const keyParts = d.key.split("_");
        const type = keyParts[0];
        const bedrooms = keyParts[1];
        const value = matchedData[d.key];
        const displayDate = d3.timeFormat("%Y-%m-%d")(matchedData.saledate);

        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`Date: ${displayDate}<br/>Type: ${type}<br/>Bedrooms: ${bedrooms}<br/>Value: ${value}`)
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 60) + "px");
      }
    })
    .on("mouseout", function () {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  canvas.append("g")
    .attr("transform", `translate(0, ${graphHeight})`)
    .call(d3.axisBottom(xScale));

  canvas.append("g")
    .call(d3.axisLeft(yScale));

  canvas.append("text")
    .attr("x", graphWidth / 2)
    .attr("y", graphHeight + 30)
    .style("text-anchor", "middle")
    .text("Sale Date");

  canvas.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -graphHeight / 2)
    .style("text-anchor", "middle")
    .text("Value");

  d3.selectAll(".streamCheckbox input").on("change", function () {
    drawStreamGraph(data);
  });
}

fetchAndProcessData().then(drawStreamGraph);
