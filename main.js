import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import indexChart from "./index-chart.js";

d3.csv("./data.csv").then((csv) => {
  const { dates, series } = processData(csv);
  console.log({ dates, series });

  // https://observablehq.com/@d3/index-chart/2
  // Create the vertical scale. For each series, compute the ratio *s* between its maximum and
  // minimum values; the path is going to move between [1 / s, 1] when the reference date
  // corresponds to its maximum and [1, s] when it corresponds to its minimum. To have enough
  // room, the scale is based on the series that has the maximum ratio *k*
  const k = d3.max(series, ({ values }) => d3.max(values) / d3.min(values));

  const charts = [];
  const container = d3.select("#charts").on("activeindexchange", (event) => {
    charts.forEach((chart) => chart.updateActiveIndex(event.detail));
  });
  const chart = container
    .selectChildren()
    .data(series)
    .join("div")
    .attr("class", "chart");
  chart.append("h2").text((d) => d.key);
  chart.append("div").each(function (d) {
    charts.push(
      indexChart({
        container: d3.select(this),
        dates,
        series: d,
        k,
      })
    );
  });
});

function processData(csv) {
  const parseDate = d3.utcParse("%m/%Y");
  const dates = Array(csv.length);
  const series = csv.columns.slice(1).map((key) => ({
    key,
    values: Array(csv.length),
  }));
  csv.forEach((d, i) => {
    dates[i] = parseDate(d[csv.columns[0]]);
    series.forEach((s) => {
      s.values[i] = +d[s.key];
    });
  });
  return { dates, series };
}
