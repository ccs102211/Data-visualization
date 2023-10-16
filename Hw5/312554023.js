const categoryColors = {
  teaching: "blue",
  research: "green",
  citations: "orange",
  industryIncome: "purple",
  international: "pink"
};

let tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

function getSelectedCategory() {
  return document.getElementById("categorySelect").value;
}

function getSortOrder() {
  return document.getElementById("sortSelect").value;
}

function updateChart() {
  let svg = d3.select("svg");
  svg.selectAll("*").remove();

  let selectedCategory = getSelectedCategory();

  d3.csv("./TIMES_WorldUniversityRankings_2024.csv", function (d) {
    let teaching = +d.scores_teaching;
    let research = +d.scores_research;
    let citations = +d.scores_citations;
    let industryIncome = +d.scores_industry_income;
    let international = +d.scores_international_outlook;

    if (isNaN(teaching) || isNaN(research) || isNaN(citations) || isNaN(industryIncome) || isNaN(international)) {
      return null;
    }

    return {
      university: d.name,
      teaching: teaching,
      research: research,
      citations: citations,
      industryIncome: industryIncome,
      international: international,
      overallScores: (teaching + research + citations + industryIncome + international)
    };
  }).then(function (data) {
    let svg = d3.select("svg");
    let margin = { top: 40, right: 50, bottom: 30, left: 350 };  // 修改左側邊距
    let width = +svg.attr("width") - margin.left - margin.right;
    let height = data.length * 22;

    let category = getSelectedCategory();
    let sortType = getSortOrder();

    data.sort((a, b) => (sortType === "ascending" ? a[category] - b[category] : b[category] - a[category]));

    svg.attr("height", height + margin.top + margin.bottom);

    let xMax = d3.max(data, d => d[category]);  // 根據數據動態設定X軸的最大值
    let y = d3.scaleBand().domain(data.map(d => d.university)).range([0, height]).padding(0.4);
    let x = d3.scaleLinear().domain([0, xMax]).range([0, width]);  // 使用xMax作為domain的上限

    if (category === "overallScores") {
      data.forEach(d => {
        let previousWidth = 0;
        ["teaching", "research", "citations", "industryIncome", "international"].forEach(cat => {
          d[cat + "Width"] = previousWidth;
          previousWidth += x(d[cat]);
        });
      });

      ["teaching", "research", "citations", "industryIncome", "international"].forEach(cat => {
        svg.append("g")
          .attr("transform", `translate(${0}, ${margin.top})`)
          .selectAll("rect." + cat)
          .data(data)
          .enter().append("rect")
          .attr("class", cat)
          .attr("y", d => y(d.university))
          .attr("x", d => margin.left + d[cat + "Width"])
          .attr("height", y.bandwidth())
          .attr("width", d => x(d[cat]))
          .attr("fill", categoryColors[cat])
          .on("mouseover", function (event, d) {
            tooltip.transition()
              //.duration(200)
              .style("opacity", .9);

            // 這裡獲取當前類別和分數
            let currentCategory = this.getAttribute("class");
            let score = d[currentCategory];

            tooltip.html("<strong>Category:</strong> " + currentCategory + "<br><strong>Score:</strong> " + score)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 40) + "px");
          })
          .on("mouseout", function (d) {
            tooltip.transition()
              //.duration(500)
              .style("opacity", 0);
          });
      });
    } else {
      svg.append("g")
        .attr("transform", `translate(${0}, ${margin.top})`)
        .selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("y", d => y(d.university))
        .attr("x", margin.left)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d[category]))
        .attr("fill", categoryColors[category]);
    }

    svg.append("text")
      .attr("x", margin.left - 150) // 調整至左邊合適的位置，與學校名稱齊平
      .attr("y", margin.top - 10)
      .attr("font-weight", "bold")
      .text("School");

    svg.append("g")
      .attr("transform", `translate(${0}, ${margin.top})`)
      .selectAll(".rankText")
      .data(data)
      .enter().append("text")
      .attr("y", d => y(d.university) + y.bandwidth() / 2 + 2)
      .attr("x", margin.left - 330)  // 將數字向左側移動50像素
      .attr("alignment-baseline", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text((d, i) => i + 1);  // i + 1 將會顯示排序序號

    // 在橫條圖的右側加上該大學在所選分類下的得分
    svg.append("g")
      .attr("transform", `translate(${0}, ${margin.top})`)  // Add this line
      .selectAll(".scoreText")
      .data(data)
      .enter().append("text")
      .attr("y", d => y(d.university) + y.bandwidth() / 2)
      .attr("x", d => margin.left + x(d[category]) + 5)
      .attr("alignment-baseline", "middle")
      .attr("font-size", "10px")
      .text(d => d[category].toFixed(2)); // 將得分四捨五入到小數點後兩位

    let yAxis = d3.axisLeft(y).tickSize(0); // Removing tick size for a cleaner look
    let xAxis = d3.axisTop(x);

    svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .attr("alignment-baseline", "middle")
      .call(yAxis);

    svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .call(xAxis);
  });
}



// 當下拉選單變更時呼叫 updateChart
document.getElementById("categorySelect").addEventListener("change", updateChart);
document.getElementById("sortSelect").addEventListener("change", updateChart);


// 初始加载时调用
updateChart();
