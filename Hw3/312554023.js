fetch('abalone.data')
  .then(response => response.text())
  .then(data => {
    const rows = data.split('\n').filter(line => line.trim() !== '').map(line => line.split(','));

    const features = ['Sex', 'Length', 'Diameter', 'Height', 'Whole_weight', 'Shucked_weight', 'Viscera_weight', 'Shell_weight', 'Rings'];

    const sexValues = ['M', 'F', 'I']; // 使用 I 代表 infant

    let allCorrelationMatrices = {};

    for (let sex of sexValues) {
      const filteredRows = rows.filter(row => row[0] === sex);
      let matrix = [];
      for (let i = 1; i < features.length; i++) {
        let row = [];
        for (let j = 1; j < features.length; j++) {
          const values1 = filteredRows.map(row => parseFloat(row[i]));
          const values2 = filteredRows.map(row => parseFloat(row[j]));
          const correlation = i === j ? 1 : calculatePearsonCorrelation(values1, values2);  // 對角線上的值應該是1
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
  const size = 50;  // 每個格子的大小
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const width = matrix[0].length * size + margin.left + margin.right;
  const height = matrix.length * size + margin.top + margin.bottom;

  // 創建SVG元素
  const svg = d3.select(containerId).append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // 定義色彩比例尺
  const colors = d3.scaleSequential(d3.interpolateCool)
    .domain([-1, 1]); // Pearson correlation範圍是[-1, 1]

  // 繪製熱圖
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      svg.append("rect")
        .attr("x", j * size)
        .attr("y", i * size)
        .attr("width", size)
        .attr("height", size)
        .style("fill", colors(matrix[i][j]))
        .style("stroke", "white");

      // 在每個格子中填充數字
      svg.append("text")
        .attr("x", j * size + size / 2)  // 使數字在格子中居中
        .attr("y", i * size + size / 2)
        .attr("dy", ".35em")  // 微調，使文字垂直居中
        .attr("text-anchor", "middle")  // 文字居中對齊
        .text(matrix[i][j].toFixed(2))  // 保留兩位小數
        .attr("font-size", "10px")  // 可根據需要調整字體大小
        .attr("fill", "black");  // 文字顏色
    }
  }
}


