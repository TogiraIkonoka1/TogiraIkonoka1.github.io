
//Bubble visualization for demo

class BubbleChart {

    //Constructor method to initialize the visualization
    constructor(_parentElement, data) {
        this.parentElement = _parentElement;
        this.data = data;
        this.categorySelection = "nutriscore_grade";
        this.displayData = [];
        this.initVis();
    }

    //Method to initialize the visualization
    initVis() {
        let vis = this;
        vis.margin = { top: 16, right: 16, bottom: 16, left: 16 };
        vis.width = 700 - vis.margin.left - vis.margin.right;
        vis.height = 520 - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        vis.pack = d3.pack()
            .size([vis.width, vis.height])
            .padding(8);

        vis.colorScale = d3.scaleOrdinal()
            .range(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1"]);

        vis.nodesGroup = vis.svg.append("g").attr("class", "bubble-nodes");
        vis.noDataText = vis.svg.append("text")
            .attr("class", "no-data-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#666")
            .style("display", "none")
            .text("No data available for this category");

        vis.wrangleData();
    }

    //Method to wrangle the data
    wrangleData() {
        let vis = this;

        const TOP_N = 20;

        const aggregated = d3.rollups(
            vis.data
                .map(d => d[vis.categorySelection])
                .filter(d => d !== null && d !== undefined && d !== "" && d !== "unknown"),
            values => values.length,
            d => String(d).toLowerCase()
        )
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => d3.descending(a.value, b.value))
            .slice(0, TOP_N);

        if (aggregated.length === 0) {
            vis.displayData = [];
        } else {
            const root = d3.hierarchy({ children: aggregated }).sum(d => d.value);
            vis.displayData = vis.pack(root).leaves();
        }

        vis.updateVis();
    }

    //Method to update the visualization
    updateVis() {
        let vis = this;

        vis.noDataText.style("display", vis.displayData.length ? "none" : null);

        const bubbles = vis.nodesGroup
            .selectAll(".bubble-node")
            .data(vis.displayData, d => d.data.name);

        bubbles.exit()
            .transition()
            .duration(400)
            .style("opacity", 0)
            .remove();

        const bubblesEnter = bubbles.enter()
            .append("g")
            .attr("class", "bubble-node")
            .attr("transform", `translate(${vis.width / 2},${vis.height / 2})`)
            .style("opacity", 0);

        bubblesEnter.append("circle")
            .attr("r", 0)
            .attr("fill", d => vis.colorScale(d.data.name))
            .attr("fill-opacity", 0.82)
            .attr("stroke", "#222")
            .attr("stroke-width", 1);

        bubblesEnter.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", d => `${Math.max(10, Math.min(16, d.r * 0.25))}px`)
            .style("pointer-events", "none")
            .style("fill", "#fff")
            .text(d => d.data.name.toUpperCase());

        const bubblesMerge = bubblesEnter.merge(bubbles);

        bubblesMerge.transition()
            .duration(600)
            .style("opacity", 1)
            .attr("transform", d => `translate(${d.x},${d.y})`);

        bubblesMerge.select("circle")
            .transition()
            .duration(600)
            .attr("r", d => d.r)
            .attr("fill", d => vis.colorScale(d.data.name));

        bubblesMerge.select("text")
            .transition()
            .duration(600)
            .style("font-size", d => `${Math.max(10, Math.min(16, d.r * 0.25))}px`);
    }

    //Public method to update selected category and redraw
    setCategory(category) {
        this.categorySelection = category;
        this.wrangleData();
    }



}