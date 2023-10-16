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
      let margin = { top: 40, right: 50, bottom: 30, left: 350 };
      svg.attr("height", height + margin.top + margin.bottom);
      svg.attr("width", 1450 + margin.left + margin.right);
      let width = 1850 - margin.left - margin.right;
      let xMax = d3.max(data, d => d.overallScores);
      let y = d3.scaleBand().domain(data.map(d => d.university)).range([0, height]).padding(0.4);
      let x = d3.scaleLinear().domain([0, xMax]).range([0, width]);

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
        .attr("x", margin.left - 150)
        .attr("y", margin.top - 10)
        .attr("font-weight", "bold")
        .text("School");

      svg.append("g")
        .attr("transform", `translate(${0}, ${margin.top})`)
        .selectAll(".rankText")
        .data(data)
        .enter().append("text")
        .attr("y", d => y(d.university) + y.bandwidth() / 2 + 2)
        .attr("x", margin.left - 330)
        .attr("alignment-baseline", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text((d, i) => i + 1);

      svg.append("g")
        .attr("transform", `translate(${0}, ${margin.top})`)
        .selectAll(".scoreText")
        .data(data)
        .enter().append("text")
        .attr("y", d => y(d.university) + y.bandwidth() / 2)
        .attr("x", d => margin.left + x(d.overallScores) + 5)
        .attr("alignment-baseline", "middle")
        .attr("font-size", "10px")
        .text(d => d.overallScores.toFixed(2));

      let yAxis = d3.axisLeft(y).tickSize(0);
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
      let width = data.length * 26;
      svg.attr("height", 750 + margin.top + margin.bottom);
      svg.attr("width", width + margin.left + margin.right + 400);
      let xMax = d3.max(data, d => d.overallScores);

      let x = d3.scaleBand().domain(data.map(d => d.university)).range([0, width]).padding(0.6);
      let y = d3.scaleLinear().domain([0, xMax]).range([height, 0]);

      data.forEach(d => {
        let accumulatedHeight = 0;
        ["teaching", "research", "citations", "industryIncome", "international"].forEach(cat => {
          d[cat + "Start"] = accumulatedHeight;
          d[cat + "Height"] = y(0) - y(d[cat]);
          accumulatedHeight += d[cat + "Height"];
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
          .attr("y", d => y(0) - d[cat + "Start"] - d[cat + "Height"])
          .attr("width", x.bandwidth())
          .attr("height", d => d[cat + "Height"])
          .attr("fill", categoryColors[cat]).on("mouseover", function (event, d) {
            tooltip.transition()
              //.duration(200)
              .style("opacity", .9);

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

      data.forEach((d, i) => {
        svg.append("text")
          .attr("x", x(d.university) + x.bandwidth() / 2 + margin.left + 30)
          .attr("y", y(d.overallScores) - 15 + margin.top)
          .text(d.overallScores.toFixed(2))
          .style("text-anchor", "end")
          .attr("transform", `rotate(-45, ${x(d.university) + x.bandwidth() / 2 + margin.left}, ${y(d.overallScores) - 5 + margin.top})`)
          .style("font-size", "12px");
      });

      svg.append("g")
        .attr("transform", `translate(${margin.left}, ${height + margin.top})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");

      data.forEach((d, i) => {
        svg.append("text")
          .attr("x", x(d.university) + x.bandwidth() / 2 + margin.left)
          .attr("y", height + margin.top + 250)
          .text(i + 1)
          .style("text-anchor", "middle")
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
