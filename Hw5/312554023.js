function getSelectedCategories() {
  let checkboxes = document.querySelectorAll("#options input[type='checkbox']:checked");
  let selected = [];
  checkboxes.forEach(cb => {
    selected.push(cb.value);
  });
  return selected;
}

function updateChart() {
  let svg = d3.select("svg");
  svg.selectAll("*").remove(); // 清除原有的图表元素

  let selectedCategories = getSelectedCategories();

  d3.csv("./TIMES_WorldUniversityRankings_2024.csv", function (d) {
    let teaching = +d.scores_teaching;
    let research = +d.scores_research;
    let citations = +d.scores_citations;
    let industryIncome = +d.scores_industry_income;
    let international = +d.scores_international_outlook;

    // 检查是否任何字段是NaN
    if (isNaN(teaching) || isNaN(research) || isNaN(citations) || isNaN(industryIncome) || isNaN(international)) {
      return null; // 如果有NaN，则排除此数据条目
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
    data = data.slice(0, 10);

    let margin = { top: 20, right: 20, bottom: 30, left: 40 };
    let width = +svg.attr("width") - margin.left - margin.right;
    let height = +svg.attr("height") - margin.top - margin.bottom;

    let colors = d3.scaleOrdinal(d3.schemeCategory10);

    let stackedData = d3.stack().keys(selectedCategories)(data);

    let x = d3.scaleBand().domain(data.map(d => d.university)).rangeRound([0, width]).paddingInner(0.1);
    let y = d3.scaleLinear().domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))]).rangeRound([height, 0]);
    let z = d3.scaleOrdinal().domain(selectedCategories).range(d3.schemeCategory10);

    svg.selectAll("g")
      .data(stackedData)
      .enter().append("g")
      .attr("fill", d => z(d.key))
      .selectAll("rect")
      .data(d => d)
      .enter().append("rect")
      .attr("x", d => x(d.data.university))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());
  });
}

// 當複選框變更時呼叫 updateChart
document.querySelectorAll("#options input[type='checkbox']").forEach(cb => {
  cb.addEventListener("change", updateChart);
});

// 初始加载时调用
updateChart();
