
//Bubble visualization for demo

class BubbleChart {

    //Constructor method to initialize the visualization
    constructor(_parentElement, data) {
        this.parentElement = _parentElement;
        this.data = data;
        this.categorySelection = "nutriscore_grade";
        this.displayData = [];
        this.totalValidCount = 0;
        // Drill-down state
        this.drillMode = false;
        this.drillFilterField = null;
        this.drillFilterValue = null;
        this.drillDisplayField = null;
        this.initVis();
    }

    //Method to initialize the visualization
    initVis() {
        let vis = this;
        vis.margin = { top: 16, right: 16, bottom: 16, left: 16 };
        vis.width = 700 - vis.margin.left - vis.margin.right;
        vis.height = 520 - vis.margin.top - vis.margin.bottom;

        // Back button – inserted before the first <select> in chart-area
        vis.backBtn = d3.select(vis.parentElement)
            .insert("button", "select")
            .attr("id", "backBtn")
            .style("display", "none")
            .text("← Back")
            .on("click", () => vis.goBack());

        // Second dropdown – shown only when drilling into a brand
        vis.subDropdown = d3.select(vis.parentElement)
            .append("select")
            .attr("id", "subCategorySelection")
            .style("display", "none");

        vis.subDropdown.append("option").attr("value", "nutriscore_grade").text("Nutri-Score Grade");
        vis.subDropdown.append("option").attr("value", "ecoscore_grade").text("Eco-Score Grade");

        vis.subDropdown.on("change", function() {
            if (vis.drillMode) {
                vis.drillDisplayField = this.value;
                vis.wrangleData();
            }
        });

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
        vis.tooltip = d3.select("body")
            .append("div")
            .attr("class", "bubble-tooltip")
            .style("position", "fixed")
            .style("z-index", "1000")
            .style("pointer-events", "none")
            .style("background", "rgba(8, 14, 30, 0.94)")
            .style("color", "#f2f6ff")
            .style("border", "1px solid #9bb4df")
            .style("border-radius", "8px")
            .style("padding", "10px 12px")
            .style("font-size", "13px")
            .style("line-height", "1.35")
            .style("box-shadow", "0 6px 18px rgba(0, 0, 0, 0.32)")
            .style("display", "none");

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

        let filteredData, activeField;

        if (vis.drillMode) {
            filteredData = vis.data.filter(d => {
                const v = d[vis.drillFilterField];
                return v !== null && v !== undefined &&
                    String(v).toLowerCase() === vis.drillFilterValue;
            });
            activeField = vis.drillDisplayField;
        } else {
            filteredData = vis.data;
            activeField = vis.categorySelection;
        }

        const validValues = filteredData
            .map(d => d[activeField])
            .filter(d => d !== null && d !== undefined && d !== "" && d !== "unknown");

        vis.totalValidCount = validValues.length;

        const aggregated = d3.rollups(
            validValues,
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
        vis.tooltip.style("display", "none");

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

        bubblesMerge
            .style("cursor", vis.drillMode ? "default" : "pointer")
            .on("click", function(event, d) {
                if (!vis.drillMode) vis.drillDown(d.data.name);
            })
            .on("mouseenter", function(event, d) {
                const share = vis.totalValidCount ? ((d.data.value / vis.totalValidCount) * 100).toFixed(2) : "0.00";
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<strong>Category:</strong> ${vis.drillMode ? vis.drillDisplayField : vis.categorySelection}<br>` +
                        `<strong>Value:</strong> ${d.data.name}<br>` +
                        `<strong>Products:</strong> ${d.data.value}<br>` +
                        `<strong>Share:</strong> ${share}%`
                    );
            })
            .on("mousemove", function(event) {
                vis.tooltip
                    .style("left", `${event.clientX + 14}px`)
                    .style("top", `${event.clientY + 14}px`);
            })
            .on("mouseleave", function() {
                vis.tooltip.style("display", "none");
            });

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

    drillDown(clickedName) {
        let vis = this;
        vis.drillMode = true;
        vis.drillFilterField = vis.categorySelection;
        vis.drillFilterValue = clickedName;

        if (vis.categorySelection === "brands") {
            // Drill into grade breakdown for a specific brand
            vis.drillDisplayField = vis.subDropdown.property("value");
            vis.subDropdown.style("display", null);
        } else {
            // Drill into brand breakdown for a specific grade
            vis.drillDisplayField = "brands";
            vis.subDropdown.style("display", "none");
        }

        vis.backBtn.style("display", null);
        vis.wrangleData();
    }

    goBack() {
        let vis = this;
        vis.drillMode = false;
        vis.drillFilterField = null;
        vis.drillFilterValue = null;
        vis.drillDisplayField = null;
        vis.backBtn.style("display", "none");
        vis.subDropdown.style("display", "none");
        vis.wrangleData();
    }

    //Public method to update selected category and redraw
    setCategory(category) {
        this.categorySelection = category;
        if (this.drillMode) {
            this.goBack();
        } else {
            this.wrangleData();
        }
    }



}