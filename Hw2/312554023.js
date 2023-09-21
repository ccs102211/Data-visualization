const colorMapping = {
  'Iris-setosa': 'red',
  'Iris-versicolor': 'blue',
  'Iris-virginica': 'green'
};

(function (d3) {
  'use strict';

  const dropdownMenu = (selection, props) => {
    const {
      options,
      onOptionClicked,
      selectedOption,
      menuId
    } = props;

    let select = selection.selectAll(`#${menuId} select`).data([null]);
    select = select.enter().append('select')
      .merge(select)
      .on('change', function() {
          onOptionClicked(this.value, menuId);
          if (this.value !== `-- ${menuId.split('-').pop()} axis --`) {
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

  const parallelCoordinatePlot = (selection, props) => {
    const {
        dimensions,
        width,
        height,
        data
    } = props;

    const margin = { top: 30, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const y = {};

    const dimensionNames = Object.values(dimensions).map((d, index) => {
        return Object.values(dimensions).slice(0, index + 1).filter(val => val === d).length > 1 ? d + index : d;
    });

    dimensionNames.forEach((dimension, index) => {
        y[dimension] = d3.scaleLinear()
            .domain(d3.extent(data, d => d[dimension.replace(/[0-9]/g, "")]))
            .range([innerHeight, 0]);
    });

    const path = d => {
      const coordinates = dimensionNames.map((p, index) => {
          const value = d[p.replace(/[0-9]/g, "")];
          return [x(p), y[p](value)];
      });
      if (coordinates.length > 0) {
          const start = `M${coordinates[0].join(",")}`;
          const lines = coordinates.slice(1).map(coord => `L${coord.join(",")}`).join("");
          return start + lines;
      }
      return "";
  };

    const x = d3.scalePoint()
        .range([0, innerWidth])
        .padding(1)
        .domain(dimensionNames);

    const line = d3.line();

    const background = selection.append("g")
        .attr("class", "background")
        .selectAll("path")
        .data(data.filter(d => visibleClasses.has(d.class)))
        .enter().append("path")
        .attr("d", path)
        .attr("stroke", "#ccc")
        .attr("fill", "none");

    const foreground = selection.append("g")
        .attr("class", "foreground")
        .selectAll("path")
        .data(data.filter(d => visibleClasses.has(d.class)))
        .enter().append("path")
        .attr("d", path)
        .attr("stroke", d => colorMapping[d.class])
        .attr("fill", "none");

    const dimension = selection.selectAll(".dimension")
        .data(dimensionNames)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d)})`);

    dimension.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d);

    dimension.append("text")
    .style("text-anchor","middle")
    .attr("y", innerHeight + 30)
    .attr("x", -9)
    .text(d => d.replace(/[0-9]/g, ""));
};


  const svg = d3.select('svg');
  const width = +svg.attr('width');
  const height = +svg.attr('height');

  let data;
  let dimensions = {};

  const onDimensionSelected = (dimension, menuId) => {
    dimensions[menuId] = dimension;

    const sortedKeys = Object.keys(dimensions).sort();
    const sortedDimensions = {};
    sortedKeys.forEach(key => {
        sortedDimensions[key] = dimensions[key];
    });
    dimensions = sortedDimensions;

    svg.selectAll("*:not(#titleGroup)").remove();

    render();
};

  const render = () => {
    svg.selectAll("*:not(#titleGroup)").remove();

    const menus = ["dimension-menu-1", "dimension-menu-2", "dimension-menu-3", "dimension-menu-4"];
    menus.forEach(menuId => {
      d3.select(`#${menuId}`)
        .call(dropdownMenu, {
          options: data.columns,
          onOptionClicked: onDimensionSelected,
          selectedOption: dimensions[menuId] || null,
          menuId: menuId
        });
    });
    
    svg.call(parallelCoordinatePlot, {
      dimensions,
      width,
      height,
      data
    });
  };

  const visibleClasses = new Set(Object.keys(colorMapping));

  d3.selectAll("#class-selection input[type='checkbox']").on("change", function() {
      if (this.checked) {
          visibleClasses.add(this.value);
      } else {
          visibleClasses.delete(this.value);
      }
      render();
  });


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