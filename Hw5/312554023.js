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
function getOrientation() {
  return document.getElementById("orientationSelect").value;
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
    let category = getSelectedCategory();
    let sortType = getSortOrder();
    let orientation = getOrientation();

    data.sort((a, b) => (sortType === "ascending" ? a[category] - b[category] : b[category] - a[category]));


    if (orientation === "horizontal") {
      let height = data.length * 22;
      let margin = { top: 40, right: 50, bottom: 30, left: 350 };  // 修改左側邊距
      svg.attr("height", height + margin.top + margin.bottom);
      svg.attr("width", 1450 + margin.left + margin.right);
      let width = 1850 - margin.left - margin.right;
      let xMax = d3.max(data, d => d.overallScores);
      let y = d3.scaleBand().domain(data.map(d => d.university)).range([0, height]).padding(0.4);
      let x = d3.scaleLinear().domain([0, xMax]).range([0, width]);  // 使用xMax作為domain的上限

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
        .attr("x", d => margin.left + x(d.overallScores) + 5)
        .attr("alignment-baseline", "middle")
        .attr("font-size", "10px")
        .text(d => d.overallScores.toFixed(2)); // 將得分四捨五入到小數點後兩位

      let yAxis = d3.axisLeft(y).tickSize(0); // Removing tick size for a cleaner look
      let xAxis = d3.axisTop(x);

      svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("alignment-baseline", "middle")
        .call(yAxis);

      svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(xAxis);
    }
    else if (orientation === "vertical") {
      let margin = { top: 50, right: 50, bottom: 200, left: 90 };
      let height = 600;
      let width = data.length * 26; // 假設每一條 bar 的寬度為 22
      svg.attr("height", 750 + margin.top + margin.bottom);
      svg.attr("width", width + margin.left + margin.right + 400);
      let xMax = d3.max(data, d => d.overallScores);  // 根據數據動態設定X軸的最大值

      // 更新比例尺的定義
      let x = d3.scaleBand().domain(data.map(d => d.university)).range([0, width]).padding(0.6);
      let y = d3.scaleLinear().domain([0, xMax]).range([height, 0]);

      data.forEach(d => {
        let accumulatedHeight = 0;
        ["teaching", "research", "citations", "industryIncome", "international"].forEach(cat => {
          d[cat + "Start"] = accumulatedHeight;
          d[cat + "Height"] = y(0) - y(d[cat]); // Calculate the height for this segment
          accumulatedHeight += d[cat + "Height"]; // Add the height to the accumulated height
        });
      });

      ["teaching", "research", "citations", "industryIncome", "international"].forEach(cat => {
        svg.append("g")
          .attr("transform", `translate(${margin.left}, ${margin.top})`)
          .selectAll("rect." + cat)
          .data(data)
          .enter().append("rect")
          .attr("class", cat)
          .attr("x", d => x(d.university))
          .attr("y", d => y(0) - d[cat + "Start"] - d[cat + "Height"])  // Starts from the bottom and subtracts the accumulated height
          .attr("width", x.bandwidth())
          .attr("height", d => d[cat + "Height"])
          .attr("fill", categoryColors[cat]).on("mouseover", function (event, d) {
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

      let xAxis = d3.axisBottom(x);
      let yAxis = d3.axisLeft(y);

      svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(yAxis);

      // 在bar的上方顯示相對應的分數
      data.forEach((d, i) => {
        svg.append("text")
          .attr("x", x(d.university) + x.bandwidth() / 2 + margin.left + 30)
          .attr("y", y(d.overallScores) - 15 + margin.top)  // 將文字位置設定在bar的上方一點
          .text(d.overallScores.toFixed(2))  // 顯示分數
          .style("text-anchor", "end") // 修改錨點以保持旋轉後的正確對齊
          .attr("transform", `rotate(-45, ${x(d.university) + x.bandwidth() / 2 + margin.left}, ${y(d.overallScores) - 5 + margin.top})`) // 對每個分數文字旋轉
          .style("font-size", "12px");
      });

      svg.append("g")
        .attr("transform", `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis)
        .selectAll("text")   // 選擇所有坐標軸上的文字
        .attr("transform", "rotate(-45)")  // 將文字旋轉-45度
        .style("text-anchor", "end")       // 重新設定文字的錨點，使其不會超出圖表範圍
        .attr("dx", "-.8em")               // 調整文字的位置
        .attr("dy", ".15em");

      // 在x軸的學校名稱下方加入對應的順序
      data.forEach((d, i) => {
        svg.append("text")
          .attr("x", x(d.university) + x.bandwidth() / 2 + margin.left)
          .attr("y", height + margin.top + 250)  // 將文字位置設定在x軸的名稱下方
          .text(i + 1)  // 顯示順序
          .style("text-anchor", "middle")  // 設定文字的錨點在中間，使其居中
          .style("font-size", "10px");
      });
    }
  });
}



// 當下拉選單變更時呼叫 updateChart
document.getElementById("categorySelect").addEventListener("change", updateChart);
document.getElementById("sortSelect").addEventListener("change", updateChart);
document.getElementById("orientationSelect").addEventListener("change", updateChart);



// 初始加载时调用
updateChart();
