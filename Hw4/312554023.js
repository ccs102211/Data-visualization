const colorMapping = {
  'Iris-setosa': 'red',
  'Iris-versicolor': 'blue',
  'Iris-virginica': 'green'
};

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
  schemeSet1, // color array
} = d3;


// Data source
const csvUrl = 'http://vis.lab.djosix.com:2023/data/iris.csv';

// specify how to parse data
const parseRow = (d) => {
  // cast numeric fields to numbers
  d.sepal_length = +d.sepal_length;
  d.sepal_width = +d.sepal_width;
  d.petal_length = +d.petal_length;
  d.petal_width = +d.petal_width;
  return d;
};

// this time we divide by 4 to get a 4 x 4 matrix
const width = window.innerWidth / 4;
const height = window.innerHeight / 4;

// implementing margin convention
const margin = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 50,
};

const radius = 4;

// this is the function for plotting each chart
const plotChart = (selection, originalData, itemX, itemY) => {
  // Filter out data where either itemX or itemY is 0
  const data = originalData.filter(d => Math.abs(d[itemX]) > 0.001 && Math.abs(d[itemY]) > 0.001);

  // accessors (they give back one value from data)
  const xValue = (d) => d[itemX];
  const yValue = (d) => d[itemY];

  // x scale function
  const x = scaleLinear()
    .domain(extent(data, xValue))
    .range([margin.left, width - margin.right]);

  // y scale function
  const y = scaleLinear()
    .domain(extent(data, yValue))
    .range([height - margin.bottom, margin.top]);

  if (itemX === itemY) {
    // Create histogram data
    const bins = histogram()
      .domain(x.domain())
      .thresholds(x.ticks(20))
      (data.map(xValue));

    // Adjust y scale for histogram data
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
    // use map to transform data for scatter plot
    const marks = data.map((d) => ({
      x: x(xValue(d)),
      y: y(yValue(d)),
      color: colorMapping[d.class]  // <-- Get the color directly from the colorMapping
    }));

    selection
      .selectAll('circle')
      .data(marks)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', radius)
      .attr('opacity', 0.7)
      .attr('fill', d => d.color);  // <-- Use the color from colorMapping
  }

  // axes
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

  // Define a container to hold the entire 4x4 matrix
  const container = select('body')
    .append('svg')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight);

  // Create 4x4 matrix of plots
  for (let i = 0; i < numericFields.length; i++) {
    for (let j = 0; j < numericFields.length; j++) {
      const xPosition = i * width;
      const yPosition = j * height;

      const svg = container
        .append('svg')
        .attr('x', xPosition)
        .attr('y', yPosition)
        .attr('width', width)
        .attr('height', height);

      plotChart(svg, data, numericFields[i], numericFields[j]);
    }
  }

  // Add labels at the top outside the main SVG
  numericFields.forEach((field, i) => {
    container
      .append('text')
      .attr('class', 'title')
      .attr('x', (i + 0.5) * width)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '.32em')
      .text(field);
  });

  // Add labels on the left side outside the main SVG
  numericFields.forEach((field, i) => {
    container
      .append('text')
      .attr('class', 'title')
      .attr('y', (i + 0.5) * height)
      .attr('x', 20)  // 將標籤向右移動至40像素位置
      .attr('text-anchor', 'middle')
      .attr('dy', '.32em')
      .attr('transform', `rotate(-90, ${10}, ${(i + 0.5) * height})`)  // 根據新位置調整旋轉的中心
      .text(field);
  });
};

main();
