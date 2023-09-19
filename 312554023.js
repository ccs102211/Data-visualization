const colorMapping = {
  'Iris-setosa': 'red',
  'Iris-versicolor': 'blue',
  'Iris-virginica': 'green'
};


(function (d3) {
  'use strict';

  /*

    The DOM structure looks like this:

    <select>
      <option value="volvo">Volvo</option>
      <option value="saab">Saab</option>
      <option value="mercedes">Mercedes</option>
      <option value="audi">Audi</option>
    </select>

  */

  const dropdownMenu = (selection, props) => {
    const {
      options,
      onOptionClicked,
      selectedOption,
    } = props;
    
    
    let select = selection.selectAll('select').data([null]);
    select = select.enter().append('select')
      .merge(select)
      .on('change', function() {
          onOptionClicked(this.value);
          if (this.value !== "-- x-axis --") {
              d3.select(this).selectAll('option[value=""]').remove();
          }
      });

    select.selectAll('option:not(:first-child)').remove();

    const option = select.selectAll('option').data(options, d => d);
    option.enter().append('option')
      .attr('value', d => d)
      .property('selected', d => d === selectedOption)
      .text(d => d);
    select.selectAll('option').filter(d => d === "class").remove();
  };

  const scatterPlot = (selection, props) => {
    const {
      xValue,
      xAxisLabel,
      yValue,
      circleRadius,
      yAxisLabel,
      margin,
      width,
      height,
      data
    } = props;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, xValue))
      .range([0, innerWidth])
      .nice();
    
    const yScale = d3.scaleLinear();
    yScale.domain(d3.extent(data, yValue));
    yScale.range([innerHeight, 0]);
    yScale.nice();
    
    const g = selection.selectAll('.container').data([null]);
    const gEnter = g
      .enter().append('g')
        .attr('class', 'container');
    gEnter
      .merge(g)
        .attr('transform',
          `translate(${margin.left},${margin.top})`
        );
    
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickPadding(15);
    
    const yAxis = d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickPadding(10);
    
    const yAxisG = g.select('.y-axis');
    const yAxisGEnter = gEnter
      .append('g')
        .attr('class', 'y-axis');
    yAxisG
      .merge(yAxisGEnter)
        .call(yAxis)
        .selectAll('.domain').remove();
    
    const yAxisLabelText = yAxisGEnter
      .append('text')
        .attr('class', 'axis-label')
        .attr('y', -93)
        .attr('fill', 'black')
        .attr('transform', `rotate(-90)`)
        .attr('text-anchor', 'middle')
      .merge(yAxisG.select('.axis-label'))
        .attr('x', -innerHeight / 2)
        .text(yAxisLabel);
    
    
    const xAxisG = g.select('.x-axis');
    const xAxisGEnter = gEnter
      .append('g')
        .attr('class', 'x-axis');
    xAxisG
      .merge(xAxisGEnter)
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('.domain').remove();
    
    const xAxisLabelText = xAxisGEnter
      .append('text')
        .attr('class', 'axis-label')
        .attr('y', 75)
        .attr('fill', 'black')
      .merge(xAxisG.select('.axis-label'))
        .attr('x', innerWidth / 2)
        .text(xAxisLabel);

    
    let circles = g.merge(gEnter)
      .selectAll('circle').data(data.filter(d => xValue(d) !== 0 || yValue(d) !== 0));
    circles
      .enter().append('circle')
        .attr('cx', innerWidth / 2)
        .attr('cy', innerHeight / 2)
        .attr('r', 0)
        .attr('fill', d => colorMapping[d.class])
      .merge(circles)
      .transition().duration(2000)
      .delay((d, i) => i * 10)
        .attr('cy', d => yScale(yValue(d)))
        .attr('cx', d => xScale(xValue(d)))
        .attr('r', circleRadius);
        
    circles.filter(d => d['petal length']===0 || d['sepal length']===0 || d['petal width']===0 || d['sepal width']===0).remove();
  };

  const svg = d3.select('svg');

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
    
    d3.select('#x-menu')
      .call(dropdownMenu, {
        options: data.columns,
        onOptionClicked: onXColumnClicked,
        selectedOption: xColumn
      });
    
    d3.select('#y-menu')
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
      margin: { top: 20, right: 40, bottom: 88, left: 150 },
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
    }
  )
      render();
    });

}(d3));