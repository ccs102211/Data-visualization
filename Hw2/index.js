import {
  select,
  csv,
  scaleLinear,
  extent,
  axisLeft,
  axisBottom
} from 'd3';
import { dropdownMenu } from './dropdownMenu';
import { scatterPlot } from './scatterPlot';

const svg = select('svg');

const width = +svg.attr('width');
const height = +svg.attr('height');

let data;
let xColumn;
let yColumn;

const onXColumnClicked = column => {
  xColumn = column;
  render();
};

const onYColumnClicked = column => {
  yColumn = column;
  render();
};

const render = () => {
  
  select('#x-menu')
    .call(dropdownMenu, {
      options: data.columns,
      onOptionClicked: onXColumnClicked,
      selectedOption: xColumn
    });
  
  select('#y-menu')
    .call(dropdownMenu, {
      options: data.columns,
      onOptionClicked: onYColumnClicked,
      selectedOption: yColumn
    });
  
  svg.call(scatterPlot, {
    xValue: d => d[xColumn],
    xAxisLabel: xColumn,
    yValue: d => d[yColumn],
    circleRadius: 10,
    yAxisLabel: yColumn,
    margin: { top: 10, right: 40, bottom: 88, left: 150 },
    width,
    height,
    data
  });
};

d3.csv('http://vis.lab.djosix.com:2023/data/iris.csv')
.then(irisdata => {
  data = irisdata;
  data.forEach(d => {
    d['petal length'] = +d['petal length'];
    d['petal width'] = +d['petal width'];
    d['sepal length'] = +d['sepal length'];
    d['sepal width'] = +d['sepal width'];
    });
    render();
  });