import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export default function indexChart({
  container,
  dates,
  series,
  k,
  activeIndex = 0,
}) {
  let width, indexedValues;

  const marginTop = 40;
  const marginRight = 64;
  const marginBottom = 24;
  const marginLeft = 40;
  const height = 320;

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const x = d3.scaleUtc().domain(d3.extent(dates)).clamp(true);

  const y = d3
    .scaleLog()
    .domain([1 / k, k])
    .range([height - marginBottom, marginTop]);

  const line = d3
    .line()
    .x((_, i) => x(dates[i]))
    .y((d) => y(d));

  const bisect = (date) => d3.bisectCenter(dates, date);

  const idPrefix = `id-${crypto.randomUUID()}`;

  const svg = container
    .classed("index-chart", true)
    .append("svg")
    .on("mousemove touchmove", moved, { passive: true });

  const clipPathRect = svg
    .append("defs")
    .selectChildren("clipPath")
    .data(["positive", "negative"])
    .join("clipPath")
    .attr("id", (d) => `${idPrefix}-${d}`)
    .append("rect")
    .attr("x", marginLeft)
    .attr("y", (_, i) => (i === 0 ? 0 : y(1)))
    .attr("height", (_, i) => (i === 0 ? y(1) : height));

  const xAxisG = svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height - marginBottom})`);

  const yAxisG = svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${marginLeft},0)`);

  const linePath = svg
    .append("g")
    .attr("class", "lines")
    .attr("fill", "none")
    .selectChildren()
    .data(["positive", "negative"])
    .join("path")
    .attr("class", "line")
    .attr("clip-path", (d) => `url(#${idPrefix}-${d})`)
    .attr("data-direction", (d) => d);

  const activeG = svg
    .append("g")
    .attr("class", "active")
    .call((g) =>
      g
        .append("line")
        .attr("class", "active-line")
        .attr("stroke", "currentColor")
        .attr("y1", marginTop)
        .attr("y2", height - marginBottom)
    )
    .call((g) =>
      g
        .append("g")
        .attr("class", "active-date")
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("transform", `translate(0,${marginTop})`)
        .selectChildren()
        .data(["Year", "Month"])
        .join("text")
        .attr("y", (_, i) => (i === 0 ? -24 : -8))
    );

  const latestValueText = svg
    .append("text")
    .attr("class", "latest-value")
    .attr("dy", "0.35em");

  wrangle();

  new ResizeObserver((entries) =>
    entries.forEach((entry) => {
      resized(entry.contentRect);
    })
  ).observe(container.node());

  function resized(contentRect) {
    width = contentRect.width;

    x.range([marginLeft, width - marginRight]);

    svg.attr("viewBox", [0, 0, width, height]);

    clipPathRect.attr("width", width - marginLeft - marginRight);

    render();
    renderActive();
  }

  function wrangle() {
    const v = series.values[activeIndex];
    indexedValues = series.values.map((d) => d / v);
  }

  function render() {
    xAxisG.call(
      d3
        .axisBottom(x)
        .ticks((width - marginLeft - marginRight) / 80)
        .tickPadding(8)
        .tickSize(4)
    );

    yAxisG
      .call(
        d3
          .axisLeft(y)
          .ticks(null, (d) => d3.format(".1r")(d) + "x")
          .tickPadding(8)
          .tickSize(-(width - marginLeft - marginRight))
      )
      .selectAll(".tick line")
      .attr("stroke-opacity", (d) => (d === 1 ? null : 0.2));
  }

  function renderActive() {
    const date = dates[activeIndex];
    const value = indexedValues[indexedValues.length - 1];

    linePath.attr("d", line(indexedValues));

    activeG
      .attr("transform", `translate(${x(date)},0)`)
      .select(".active-date")
      .selectChildren()
      .data([date.getUTCFullYear(), monthNames[date.getUTCMonth()]])
      .join("text")
      .text((d) => d);

    latestValueText
      .attr("transform", `translate(${width - marginRight + 8},${y(value)})`)
      .attr(
        "data-direction",
        value > 1 ? "positive" : value < 1 ? "negative" : "neutral"
      )
      .text(d3.format(".1f")(value) + "x");
  }

  function moved(event) {
    const [mx] = d3.pointer(event, this);
    const date = x.invert(mx);
    const index = bisect(date);
    if (activeIndex !== index) {
      activeIndex = index;
      container.dispatch("activeindexchange", {
        detail: activeIndex,
        bubbles: true,
      });
    }
  }

  function updateActiveIndex(_) {
    activeIndex = _;
    wrangle();
    render();
    renderActive();
  }

  return {
    updateActiveIndex,
  };
}
