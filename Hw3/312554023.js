const colorSchemes = {
  'M': d3.scaleSequential(d3.interpolateBlues),
  'F': d3.scaleSequential(d3.interpolateReds),
  'I': d3.scaleSequential(d3.interpolateGreens)
};


fetch('http://vis.lab.djosix.com:2023/data/abalone.data')
  .then(response => response.text())
  .then(data => {
    const rows = data.split('\n').filter(line => line.trim() !== '').map(line => line.split(','));

    const features = ['Sex', 'Length', 'Diameter', 'Height', 'Whole_weight', 'Shucked_weight', 'Viscera_weight', 'Shell_weight', 'Rings'];

    const sexValues = ['M', 'F', 'I'];

    let allCorrelationMatrices = {};

    for (let sex of sexValues) {
      const filteredRows = rows.filter(row => row[0] === sex);
      let matrix = [];
      for (let i = 1; i < features.length; i++) {
        let row = [];
        for (let j = 1; j < features.length; j++) {
          const values1 = filteredRows.map(row => parseFloat(row[i]));
          const values2 = filteredRows.map(row => parseFloat(row[j]));
          const correlation = i === j ? 1 : calculatePearsonCorrelation(values1, values2);
          row.push(correlation);
        }
        matrix.push(row);
      }
      allCorrelationMatrices[sex] = matrix;
      drawHeatmap(allCorrelationMatrices[sex], features, sex);
      console.log(sex)
    }

    //document.getElementById('results').textContent = JSON.stringify(allCorrelationMatrices, null, 2);
  })
  .catch(error => console.error("Error:", error));

function calculatePearsonCorrelation(arr1, arr2) {
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < arr1.length; i++) {
    numerator += (arr1[i] - mean1) * (arr2[i] - mean2);
    denominator1 += Math.pow(arr1[i] - mean1, 2);
    denominator2 += Math.pow(arr2[i] - mean2, 2);
  }

  return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
}

function mean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function drawHeatmap(matrix, features, sex) {
  const containerId = `#heatmap-${sex}`;
  const size = 60;
  const margin = { top: 100, right: 150, bottom: 50, left: 150 };
  const width = matrix[0].length * size + margin.left + margin.right;
  const height = matrix.length * size + margin.top + margin.bottom;

  const svgContainer = d3.select(containerId).append("svg")
    .attr("width", width)
    .attr("height", height)

  const svg = svgContainer.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const rectGroup = svg.append("g");
  const textGroup = svg.append("g");

  const colors = colorSchemes[sex].domain([-1, 1]);


  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      rectGroup.append("rect")
        .attr("x", j * size)
        .attr("y", i * size)
        .attr("width", size)
        .attr("height", size)
        .style("fill", colors(matrix[i][j]))
        .style("stroke", "white")
        .on('mouseover', function () {
          d3.select(this)
            .style('opacity', '0.7')
            .attr('width', size * 1.2)
            .attr('height', size * 1.2)
            .attr('x', j * size - (size * 0.05))
            .attr('y', i * size - (size * 0.05));

          d3.select(`#text-${i}-${j}`)
            .attr("font-size", "18px")
            .attr("x", j * size + size * 1.2 / 2)
            .attr("y", i * size + size * 1.2 / 2);
        })
        .on('mouseout', function () {
          d3.select(this)
            .style('opacity', '1')
            .attr('width', size)
            .attr('height', size)
            .attr('x', j * size)
            .attr('y', i * size);

          d3.select(`#text-${i}-${j}`)
            .attr("font-size", "15px")
            .attr("x", j * size + size / 2)
            .attr("y", i * size + size / 2);
        });

      textGroup.append("text")
        .attr("x", j * size + size / 2)
        .attr("y", i * size + size / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("id", `text-${i}-${j}`)
        .text(matrix[i][j].toFixed(2))
        .attr("font-size", "15px")
        .attr("fill", "black");

      textGroup.append("text")
        .attr("x", width / 2 - margin.left)
        .attr("y", -80)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Abalone Type: ${sex}`);


      const featureLabels = features.slice(1);

      svg.selectAll(".yLabel")
        .data(featureLabels)
        .enter()
        .append("text")
        .text(d => d)
        .attr("x", -10)
        .attr("y", (d, i) => i * size + size / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("font-size", "14px");


      svg.selectAll(".xLabel")
        .data(featureLabels)
        .enter()
        .append("text")
        .text(d => d)
        .attr("x", (d, i) => i * size + size / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("transform", (d, i) => `translate(0,-10) rotate(-25, ${i * size + size / 2}, -10)`)
        .attr("font-size", "14px");

    }
  }
}

document.getElementById('toggle-M').addEventListener('change', function () {
  document.getElementById('heatmap-M').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('toggle-F').addEventListener('change', function () {
  document.getElementById('heatmap-F').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('toggle-I').addEventListener('change', function () {
  document.getElementById('heatmap-I').style.display = this.checked ? 'block' : 'none';
});


