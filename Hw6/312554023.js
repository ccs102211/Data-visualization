d3.csv("http://vis.lab.djosix.com:2023/data/ma_lga_12345.csv").then(data => {

  // 數據轉換
  let parseDate = d3.timeParse("%d/%m/%Y");
  data.forEach(d => {
    d.saledate = parseDate(d.saledate);
    d.MA = +d.MA;
  });

  let typeColorScale = d3.scaleOrdinal(["#1f77b4", "#ff7f0e"]);
  let bedroomColorScale = d3.scaleSequential(d3.interpolateViridis).domain([1, 5]);

  // 數據分組和聚合
  let groupedData = d3.group(data, d => d.type + "_" + d.bedrooms);

  let processedData = Array.from(groupedData, ([key, value]) => {
    let nestedData = d3.group(value, d => d.saledate);
    let dataArray = Array.from(nestedData, ([dateKey, dateValue]) => {
      let maValues = dateValue.map(d => d.MA);
      let medianPrice = d3.median(maValues);
      return {
        date: dateKey,
        lowerBound: medianPrice * 0.9,
        upperBound: medianPrice * 1.1,
        medianPrice: medianPrice
      };
    });
    return { key: key, values: dataArray.sort((a, b) => a.date - b.date) };
  });

  let svg = d3.select("#themeRiver");
  let startDate = d3.min(data, d => d.saledate);
  let endDate = d3.max(data, d => d.saledate);
  let maxMedianPrice = d3.max(processedData, d => d3.max(d.values, v => v.upperBound));
  let margin = { top: 50, right: 150, bottom: 50, left: 100 },
    width = 1600 - margin.left - margin.right,  // SVG的寬度減去左右邊界
    height = 860 - margin.top - margin.bottom;  // SVG的高度減去上下邊界

  let xScale = d3.scaleTime().domain([startDate, endDate]).range([0, width]);
  let yScale = d3.scaleLinear().domain([0, maxMedianPrice]).range([height, 0]);  // 將高度調整為SVG高度減去上下邊界
  let color = d3.scaleOrdinal(d3.schemeCategory10);

  // 添加容器並向右平移
  let container = svg.append("g").attr("transform", "translate(60, 0)");  // 平移60像素，您可以根據需要進行調整


  let areaGenerator = d3.area()
    .x(d => xScale(d.date))
    .y0(d => yScale(d.lowerBound))
    .y1(d => yScale(d.upperBound));

  let layers = container.selectAll(".layer")
    .data(processedData)
    .enter().append("g")
    .attr("class", "layer")
  //.datum(d => d.values);  // 使用.datum()绑定d.values数组


  layers.selectAll("path")
    .data(d => [d.values])
    .enter().append("path")
    .attr("d", areaGenerator)
    .attr("fill", function (d, i, nodes) {
      let parentNodeData = d3.select(nodes[i].parentNode).datum();
      let parts = parentNodeData.key.split("_");
      let type = parts[0];
      let bedrooms = +parts[1];
      let typeColor = typeColorScale(type);
      let bedroomColor = bedroomColorScale(bedrooms);
      return d3.interpolateRgb(typeColor, bedroomColor)(0.5);
    })
    .on("mousemove", (event, d) => {
      let mouseX = d3.pointer(event, event.currentTarget)[0];
      let hoverDate = xScale.invert(mouseX);

      let closestDataPoint = d.reduce((prev, curr) => {
        return (Math.abs(curr.date - hoverDate) < Math.abs(prev.date - hoverDate) ? curr : prev);
      });
      if (closestDataPoint) {
        let parentNode = d3.select(event.currentTarget.parentNode);
        let parentNodeData = parentNode.datum();
        let medianPriceValue = closestDataPoint.medianPrice;
        let tooltip = d3.select(".tooltip");
        tooltip.style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`類型: ${parentNodeData.key.split("_")[0]}<br>臥室數: ${parentNodeData.key.split("_")[1]}<br>中位價格: ${medianPriceValue}`);
      }
      console.log("Mouse coordinates:", d3.pointer(event, event.currentTarget));
      console.log("Hover Date:", hoverDate);
      console.log("Data:", d);
      console.log("Closest Data Point:", closestDataPoint);


    })
    .on("mouseout", () => {
      let tooltip = d3.select(".tooltip");
      tooltip.style("opacity", 0);
    });


  // 添加按鈕來觸發流的重新排序
  let dropdown = d3.select("body").append("select").on("change", reorderStreams);
  dropdown.append("option").attr("value", "max").text("按最大中位價格");
  dropdown.append("option").attr("value", "min").text("按最小中位價格");
  dropdown.append("option").attr("value", "avg").text("按平均中位價格");

  function reorderStreams() {
    let orderType = dropdown.node().value;

    switch (orderType) {
      case 'max':
        processedData.sort((a, b) => {
          let maxA = d3.max(a.values, v => v.medianPrice);
          let maxB = d3.max(b.values, v => v.medianPrice);
          return d3.descending(maxA, maxB);
        });
        break;
      case 'min':
        processedData.sort((a, b) => {
          let minA = d3.min(a.values, v => v.medianPrice);
          let minB = d3.min(b.values, v => v.medianPrice);
          return d3.ascending(minA, minB);
        });
        break;
      case 'avg':
        processedData.sort((a, b) => {
          let avgA = d3.mean(a.values, v => v.medianPrice);
          let avgB = d3.mean(b.values, v => v.medianPrice);
          return d3.descending(avgA, avgB);
        });
        break;
      default:
        break;
    }

    // 更新每個流的位置
    container.selectAll(".layer")
      .data(processedData)
      .selectAll("path")
      .data(d => [d.values])
      .attr("d", areaGenerator);
  }

  // 添加輔助線
  let xAxis = d3.axisBottom(xScale);
  let yAxis = d3.axisLeft(yScale);
  container.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
  container.append("g")
    .call(yAxis);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.top)
    .style("text-anchor", "middle")
    .text("Year");

  // 調整y軸標籤的位置
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 90)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Value");

  // 調整圖例的位置
  var legend = svg.selectAll(".legend")
    .data(color.domain())
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", function (d, i) { return "translate(0," + (i * 20 + height + margin.top - 120) + ")"; });
  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend.append("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function (d) { return d; });

}).catch(error => {
  console.log("加載數據時出錯:", error);
});
