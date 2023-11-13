d3.sankey = function () {
  var sankey = {},
    nodeWidth = 24,
    nodePadding = 8,
    size = [1, 1],
    nodes = [],
    links = [];

  sankey.nodeWidth = function (_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };

  sankey.nodePadding = function (_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function (_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function (_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function (_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.layout = function (iterations) {
    computeNodeLinks();
    computeNodeValues();
    computeNodeBreadths();
    computeNodeDepths(iterations);
    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function () {
    computeLinkDepths();
    return sankey;
  };

  sankey.link = function () {
    var curvature = .5;

    function link(d) {
      var x0 = d.source.x + d.source.dx,
        x1 = d.target.x,
        xi = d3.interpolateNumber(x0, x1),
        x2 = xi(curvature),
        x3 = xi(1 - curvature),
        y0 = d.source.y + d.sy + d.dy / 2,
        y1 = d.target.y + d.ty + d.dy / 2;
      return "M" + x0 + "," + y0
        + "C" + x2 + "," + y0
        + " " + x3 + "," + y1
        + " " + x1 + "," + y1;
    }

    link.curvature = function (_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    nodes.forEach(function (node) {
      node.sourceLinks = [];
      node.targetLinks = [];
    });
    links.forEach(function (link) {
      var source = link.source,
        target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    nodes.forEach(function (node) {
      node.value = Math.max(
        d3.sum(node.sourceLinks, value),
        d3.sum(node.targetLinks, value)
      );
    });
  }

  // Iteratively assign the breadth (x-position) for each node.
  // Nodes are assigned the maximum breadth of incoming neighbors plus one;
  // nodes with no incoming links are assigned breadth zero, while
  // nodes with no outgoing links are assigned the maximum breadth.
  function computeNodeBreadths() {
    var remainingNodes = nodes,
      nextNodes,
      x = 0;

    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(function (node) {
        node.x = x;
        node.dx = nodeWidth;
        node.sourceLinks.forEach(function (link) {
          nextNodes.push(link.target);
        });
      });
      remainingNodes = nextNodes;
      ++x;
    }

    //
    moveSinksRight(x);
    scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
  }

  function moveSourcesRight() {
    nodes.forEach(function (node) {
      if (!node.targetLinks.length) {
        node.x = d3.min(node.sourceLinks, function (d) { return d.target.x; }) - 1;
      }
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(function (node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }

  function scaleNodeBreadths(kx) {
    nodes.forEach(function (node) {
      node.x *= kx;
    });
  }

  function computeNodeDepths(iterations) {
    // 使用 d3.group 代替 d3.nest
    var nodesByBreadth = Array.from(d3.group(nodes, d => d.x))
      .sort((a, b) => d3.ascending(a[0], b[0]))
      .map(d => d[1]);

    //
    initializeNodeDepth();
    resolveCollisions();
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99);
      resolveCollisions();
      relaxLeftToRight(alpha);
      resolveCollisions();
    }

    function initializeNodeDepth() {
      var ky = d3.min(nodesByBreadth, function (nodes) {
        return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
      });

      nodesByBreadth.forEach(function (nodes) {
        nodes.forEach(function (node, i) {
          node.y = i;
          node.dy = node.value * ky;
        });
      });

      links.forEach(function (link) {
        link.dy = link.value * ky;
      });
    }

    function relaxLeftToRight(alpha) {
      nodesByBreadth.forEach(function (nodes, breadth) {
        nodes.forEach(function (node) {
          if (node.targetLinks.length) {
            var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedSource(link) {
        return center(link.source) * link.value;
      }
    }

    function relaxRightToLeft(alpha) {
      nodesByBreadth.slice().reverse().forEach(function (nodes) {
        nodes.forEach(function (node) {
          if (node.sourceLinks.length) {
            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });

      function weightedTarget(link) {
        return center(link.target) * link.value;
      }
    }

    function resolveCollisions() {
      nodesByBreadth.forEach(function (nodes) {
        var node,
          dy,
          y0 = 0,
          n = nodes.length,
          i;

        // Push any overlapping nodes down.
        nodes.sort(ascendingDepth);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) node.y += dy;
          y0 = node.y + node.dy + nodePadding;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodePadding - size[1];
        if (dy > 0) {
          y0 = node.y -= dy;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.dy + nodePadding - y0;
            if (dy > 0) node.y -= dy;
            y0 = node.y;
          }
        }
      });
    }

    function ascendingDepth(a, b) {
      return a.y - b.y;
    }
  }

  function computeLinkDepths() {
    nodes.forEach(function (node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(function (node) {
      var sy = 0, ty = 0;
      node.sourceLinks.forEach(function (link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function (link) {
        link.ty = ty;
        ty += link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      return a.source.y - b.source.y;
    }

    function ascendingTargetDepth(a, b) {
      return a.target.y - b.target.y;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};

var units = "Widgets";

var margin = { top: 10, right: 10, bottom: 10, left: 10 },
  width = 1800 - margin.left - margin.right,
  height = 740 - margin.top - margin.bottom;

// format variables
var formatNumber = d3.format(",.0f"),    // zero decimal places
  format = function (d) { return d + " cars"; };
color = d3.scaleOrdinal(d3.schemeCategory10);

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");

// Set the sankey diagram properties
var sankey = d3.sankey()
  .nodeWidth(36)
  .nodePadding(10)
  .size([width, height]);

var path = sankey.link();

fetch('http://vis.lab.djosix.com:2023/data/car.data')
  .then(response => response.text())
  .then(text => {
    // 確保第一行是列名
    const header = "buying,maint,doors,persons,lug_boot,safety,class";
    const csv = header + "\n" + text;
    const data = d3.csvParse(csv);
    // 预处理数据，创建nodes和links
    let processedData = preprocessCarEvaluationData(data);

    // 创建Sankey图
    sankey
      .nodes(processedData.nodes)
      .links(processedData.links)
      .layout(32);

    // add in the links
    var link = svg.append("g").selectAll(".link")
      .data(processedData.links)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", path)
      .style("stroke-width", function (d) { return Math.max(1, d.dy); })
      .style("stroke", function (d) {
        return color(d.source.name); // 使用源节点的名称作为颜色比例尺的输入
      })
      .sort(function (a, b) { return b.dy - a.dy; });

    // add the link titles
    link.append("title")
      .text(function (d) {
        return d.source.name + " → " +
          d.target.name + "\n" + format(d.value);
      });

    // add in the nodes
    var node = svg.append("g").selectAll(".node")
      .data(processedData.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      })
      .call(d3.drag()
        .subject(function (d) {
          return d;
        })
        .on("start", function () {
          this.parentNode.appendChild(this);
        })
        .on("drag", dragmove));

    // add the rectangles for the nodes
    node.append("rect")
      .attr("height", function (d) { return d.dy; })
      .attr("width", sankey.nodeWidth())
      .style("fill", function (d) {
        return d.color = color(d.name.replace(/ .*/, ""));
      })
      .style("stroke", function (d) {
        return d3.rgb(d.color).darker(2);
      })
      .append("title")
      .text(function (d) {
        return d.name + "\n" + format(d.value);
      });

    // add in the title for the nodes
    node.append("text")
      .attr("x", -6)
      .attr("y", function (d) { return d.dy / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      .text(function (d) { return d.name; })
      .filter(function (d) { return d.x < width / 2; })
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");

    // the function for moving the nodes
    function dragmove(event, d) {
      // 使用 event 而不是 d3.event
      d3.select(this).attr("transform",
        "translate(" + d.x + "," + (
          d.y = Math.max(0, Math.min(height - d.dy, event.y))
        ) + ")");
      sankey.relayout();
      link.attr("d", path);
    }
  }).catch(function (error) {
    console.error("Error loading the data: ", error);
  });


function preprocessCarEvaluationData(data) {
  // 定义列头对应的属性名
  const columnHeaders = ['buying', 'maint', 'doors', 'persons', 'lug_boot', 'safety', 'class'];

  // 初始化节点和链接数组
  let nodes = [], links = [];
  let nodeMap = new Map(); // 存储节点名称与索引的映射

  // 处理每一行数据
  data.forEach((rowData, rowIndex) => {
    let prevNodeKey = null; // 存储前一个属性的节点键值以建立链接

    // 遍历每个属性创建节点和链接
    columnHeaders.forEach(attribute => {
      if (rowData[attribute] === undefined) {
        console.error(`Undefined value found at row ${rowIndex + 1} for attribute: ${attribute}`);
      }

      // 生成节点名称，例如 "buying_vhigh"
      let nodeName = `${attribute}_${rowData[attribute]}`;
      let nodeKey = nodeName.toLowerCase(); // 使用小写键来保证一致性

      // 如果节点尚未创建，那么创建新的节点
      if (!nodeMap.has(nodeKey)) {
        let newNode = { name: nodeName, node: nodes.length };
        nodes.push(newNode);
        nodeMap.set(nodeKey, newNode);
      }

      // 如果存在前一个属性节点，则创建链接
      if (prevNodeKey) {
        let sourceNode = nodeMap.get(prevNodeKey);
        let targetNode = nodeMap.get(nodeKey);
        let value = 1; // 假设每对属性间的初始链接值为1

        // 查找或创建链接
        let link = links.find(l => l.source === sourceNode.node && l.target === targetNode.node);
        if (link) {
          link.value += value; // 链接存在，增加值
        } else {
          links.push({ source: sourceNode.node, target: targetNode.node, value: value });
        }
      }

      // 更新前一个节点键值
      prevNodeKey = nodeKey;
    });
  });

  return { nodes, links };
}
