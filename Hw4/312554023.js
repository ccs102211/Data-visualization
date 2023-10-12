const colorMapping = {
  'Iris-setosa': 'red',
  'Iris-versicolor': 'blue',
  'Iris-virginica': 'green'
};
const { rgb } = d3;

const {
  csv,
  select,
  scaleLinear,
  scaleBand,
  scaleOrdinal,
  histogram,
  max,
  extent,
  axisLeft,
  axisBottom,
  schemeSet1,
} = d3;

const csvUrl = 'http://vis.lab.djosix.com:2023/data/iris.csv';

const parseRow = (d, index) => {
  d.id = index;
  d.sepal_length = +d.sepal_length;
  d.sepal_width = +d.sepal_width;
  d.petal_length = +d.petal_length;
  d.petal_width = +d.petal_width;
  return d;
};

const width = window.innerWidth / 4 * 0.9;
const height = window.innerHeight / 4 * 0.9;

const offsetX = 50;
const offsetY = 40;

let selectedIds = new Set();
let chartGroup;
let container = null;

const margin = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 50,
};

const radius = 4;

const brush = d3.brush()
  .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
  .on("brush", brushed)
  .on("end", brushended);

function brushed(event, data, x, y, itemX, itemY) {
  if (event.selection) {
    const [[x0, y0], [x1, y1]] = event.selection;

    selectedIds.clear();
    data.forEach(d => {
      if (x0 <= x(d[itemX]) && x(d[itemX]) <= x1 && y0 <= y(d[itemY]) && y(d[itemY]) <= y1) {
        selectedIds.add(d.id);
      }
    });

    //console.log("Brushed over these IDs:", Array.from(selectedIds));
    highlightSelectedPoints();
  }
}


function brushended(event) {
  if (!event.selection) {
    selectedIds.clear();
    highlightSelectedPoints();
  }
}


function highlightSelectedPoints() {
  container.selectAll('g').selectAll("circle")
    .attr('fill', d => selectedIds.has(d.original.id) ? rgb(colorMapping[d.original.class]).brighter(1) : colorMapping[d.original.class])
    .attr('r', d => selectedIds.has(d.original.id) ? radius * 1.5 : radius);
}


const plotChart = (selection, originalData, itemX, itemY) => {
  const data = originalData.filter(d => Math.abs(d[itemX]) > 0.001 && Math.abs(d[itemY]) > 0.001);

  const xValue = (d) => d[itemX];
  const yValue = (d) => d[itemY];

  const x = scaleLinear()
    .domain(extent(data, xValue))
    .range([margin.left, width - margin.right]);

  const y = scaleLinear()
    .domain(extent(data, yValue))
    .range([height - margin.bottom, margin.top]);

  if (itemX === itemY) {
    const bins = histogram()
      .domain(x.domain())
      .thresholds(x.ticks(20))
      (data.map(xValue));

    y.domain([0, max(bins, d => d.length)]).nice();

    const bar = selection.selectAll(".bar")
      .data(bins)
      .enter().append("g")
      .attr("class", "bar")
      .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`);

    bar.append("rect")
      .attr("x", 1)
      .attr("width", d => x(d.x1) - x(d.x0) - 1)
      .attr("height", d => height - y(d.length) - margin.bottom)
      .attr("fill", "steelblue");

  } else {
    const marks = data.map((d) => ({
      x: x(xValue(d)),
      y: y(yValue(d)),
      color: colorMapping[d.class],
      original: d
    }));


    selection
      .selectAll('circle')
      .data(marks)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', radius)
      .attr('opacity', 0.7)
      .attr('fill', d => d.color);

    const localBrush = d3.brush()
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .on("brush", (event) => brushed(event, originalData, x, y, itemX, itemY))
      .on("end", brushended);

    if (itemX !== itemY) {
      selection.call(localBrush);
    }

  }

  selection
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(axisLeft(y));

  selection
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(axisBottom(x));
};


const main = async () => {
  const data = await csv(csvUrl, parseRow);

  const numericFields = [...data.columns];
  const speciesIndex = numericFields.indexOf('species');
  numericFields.splice(speciesIndex, 1);

  container = select('body')
    .append('svg')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight);

  chartGroup = container.append('g')
    .attr('transform', `translate(${offsetX}, ${offsetY})`);

  for (let i = 0; i < numericFields.length; i++) {
    for (let j = 0; j < numericFields.length; j++) {
      const xPosition = i * width;
      const yPosition = j * height;

      const group = chartGroup
        .append('g')
        .attr('transform', `translate(${xPosition}, ${yPosition})`);

      plotChart(group, data, numericFields[i], numericFields[j]);
    }
  }

  numericFields.forEach((field, i) => {
    container
      .append('text')
      .attr('class', 'title')
      .attr('x', (i + 0.65) * width)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '.40em')
      .style('font-size', '25px')
      .text(field);
  });

  numericFields.forEach((field, i) => {
    container
      .append('text')
      .attr('class', 'title')
      .attr('y', (i + 0.75) * height)
      .attr('x', 20)
      .attr('text-anchor', 'middle')
      .attr('dy', '.40em')
      .attr('transform', `rotate(-90, ${20}, ${(i + 0.65) * height})`)
      .style('font-size', '25px')
      .text(field);
  });
};

main();
