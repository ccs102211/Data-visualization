const colorMapping = {
  'Iris-setosa': 'red',
  'Iris-versicolor': 'blue',
  'Iris-virginica': 'green'
};

(function(d3) {
  'use strict';

  const dropdownMenu = (selection, props) => {
      const {
          options,
          onOptionClicked,
          selectedOptions
      } = props;

      let select = selection.selectAll('select').data([null]);
      select = select.enter().append('select')
          .merge(select)
          .on('change', function() {
              onOptionClicked(this.value);
          });

      const option = select.selectAll('option').data(options);
      option.enter().append('option')
          .attr('value', d => d)
          .property('selected', d => selectedOptions.includes(d))
          .text(d => d);
      option.exit().remove();
      select.selectAll('option').filter(d => d === "class").remove();
  };

  const parallelCoordinatePlot = (selection, props) => {
      const {
          dimensions,
          margin,
          width,
          height,
          data
      } = props;

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const x = d3.scalePoint()
          .domain(dimensions)
          .range([margin.left, width - margin.right]);

      const y = {};
      dimensions.forEach(dim => {
          y[dim] = d3.scaleLinear()
              .domain(d3.extent(data, d => d[dim]))
              .range([innerHeight + margin.top, margin.top])
              .nice();
      });

      const line = d3.line()
          .defined(d => !isNaN(d[1]))
          .x(d => d[0])
          .y(d => d[1]);

      const g = selection.selectAll('.container').data([null]);
      const gEnter = g.enter().append('g')
          .attr('class', 'container')
          .attr('transform', `translate(${margin.left},${margin.top})`);
      gEnter.merge(g);

      dimensions.forEach(dim => {
          const axis = d3.axisLeft(y[dim]);
          gEnter.append('g')
              .attr('class', `y-axis ${dim}`)
              .attr('transform', `translate(${x(dim)},0)`)
              .call(axis);
      });

      const paths = gEnter.selectAll('.path').data(data);
      paths.enter().append('path')
          .attr('class', 'path')
          .attr('d', d => line(dimensions.map(dim => [x(dim), y[dim](d[dim])])))
          .style('fill', 'none')
          .style('stroke', d => colorMapping[d.class])
          .style('opacity', 0.5);

  };

  const svg = d3.select('svg');
  const width = +svg.attr('width');
  const height = +svg.attr('height');

  let data;
  let selectedDimensions = [];

  const onDimensionSelected = dimension => {
      if (!selectedDimensions.includes(dimension)) {
          selectedDimensions.push(dimension);
      }
      if (selectedDimensions.length > 4) {
          selectedDimensions.shift();
      }
      render();
  };

  const render = () => {
      d3.select('#dimension-menu')
          .call(dropdownMenu, {
              options: data.columns,
              onOptionClicked: onDimensionSelected,
              selectedOptions: selectedDimensions
          });

      svg.call(parallelCoordinatePlot, {
          dimensions: selectedDimensions,
          margin: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
          },
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

}(d3));
