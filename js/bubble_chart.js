
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

        // Back button – inserted before the first <select> in chart-controls
        vis.backBtn = d3.select("#chart-controls")
            .insert("button", "select")
            .attr("id", "backBtn")
            .style("display", "none")
            .text("← Back")
            .on("click", () => vis.goBack());

        // Second dropdown – shown only when drilling into a brand
        vis.subDropdown = d3.select("#chart-controls")
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

        vis.nutriscoreColorMap = {
            a: "#038141",
            b: "#85BB2F",
            c: "#FECB02",
            d: "#EE8100",
            e: "#E63E11"
        };

        vis.ecoscoreColorMap = {
            "a+": "#005C2E",
            a:    "#038141",
            b:    "#85BB2F",
            c:    "#FECB02",
            d:    "#FFAD00",
            e:    "#EE8100",
            f:    "#E63E11"
        };

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

        vis.detailedViewPanel = d3.select("#detailed-view-panel");
        vis.detailedViewSubtitle = d3.select("#detailed-view-subtitle");
        vis.detailedViewCloseBtn = d3.select("#detailed-view-close");
        vis.detailedViewStats = d3.select("#detailed-view-stats");
        vis.detailPie = new DetailPie("#detailed-view-svg");

        vis.detailedViewCloseBtn.on("click", () => vis.closeDetailedView());
        vis.detailedViewPanel.on("click", function(event) {
            if (event.target === this) {
                vis.closeDetailedView();
            }
        });

        vis.chartDescription = d3.select("#chart-description");

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
                    vis.normalizeFieldValue(vis.drillFilterField, v) === vis.drillFilterValue;
            });
            activeField = vis.drillDisplayField;
        } else {
            filteredData = vis.data;
            activeField = vis.categorySelection;
        }

        const NA_VALUES = new Set([
            "unknown", "not-applicable", "not applicable", "not_applicable",
            "not-available", "not available", "not_available",
            "n/a", "na"
        ]);

        const validValues = filteredData
            .map(d => d[activeField])
            .filter(d => {
                if (d === null || d === undefined || d === "") return false;
                const s = String(d).toLowerCase();
                return !NA_VALUES.has(s) && !s.startsWith("en:not-");
            });

        vis.totalValidCount = validValues.length;

        const aggregated = d3.rollups(
            validValues,
            values => values.length,
            d => {
                const s = String(d).toLowerCase();
                if (activeField === "ecoscore_grade" && s === "a-plus") return "a+";
                return s;
            }
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
            .attr("fill", d => vis.getBubbleColor(d.data.name))
            .attr("fill-opacity", 0.82)
            .attr("stroke", "#222")
            .attr("stroke-width", 1);

        bubblesEnter.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", d => `${Math.max(10, Math.min(16, d.r * 0.25))}px`)
            .style("pointer-events", "none")
            .style("fill", "#fff")
            .text(d => vis.formatDisplayLabel(d.data.name));

        const bubblesMerge = bubblesEnter.merge(bubbles);

        bubblesMerge
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                if (!vis.drillMode) {
                    vis.drillDown(d.data.name);
                } else {
                    vis.openDetailedView(d.data.name);
                }
            })
            .on("mouseenter", function(event, d) {
                const share = vis.totalValidCount ? ((d.data.value / vis.totalValidCount) * 100).toFixed(2) : "0.00";
                const clickToDrillHtml = vis.drillMode
                    ? `<div class="bubble-tooltip-cta">Click to see detailed view.</div>`
                    : `<div class="bubble-tooltip-cta">Click to see breakdown.</div>`;
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<strong>Category:</strong> ${vis.drillMode ? vis.drillDisplayField : vis.categorySelection}<br>` +
                        `<strong>Value:</strong> ${d.data.name}<br>` +
                        `<strong>Products:</strong> ${d.data.value}<br>` +
                        `<strong>Share:</strong> ${share}%` +
                        clickToDrillHtml
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
            .attr("fill", d => vis.getBubbleColor(d.data.name));

        bubblesMerge.select("text")
            .transition()
            .duration(600)
            .style("font-size", d => `${Math.max(10, Math.min(16, d.r * 0.25))}px`);

        vis.renderLegend();
        vis.updateChartDescription();
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

    getActiveColorField() {
        return this.drillMode ? this.drillDisplayField : this.categorySelection;
    }

    getBubbleColor(rawValue) {
        let vis = this;
        const activeField = vis.getActiveColorField();
        const value = String(rawValue).toLowerCase();

        if (activeField === "nutriscore_grade") {
            return vis.nutriscoreColorMap[value] || "#9aa0a6";
        }
        if (activeField === "ecoscore_grade") {
            return vis.ecoscoreColorMap[value] || "#9aa0a6";
        }

        return vis.colorScale(value);
    }

    formatDisplayLabel(name) {
        const activeField = this.getActiveColorField();
        if (activeField === "nutriscore_grade" || activeField === "ecoscore_grade") {
            return name.toUpperCase();
        }
        // Brand names: title case (proper noun)
        return name.replace(/\b\w/g, c => c.toUpperCase());
    }

    renderLegend() {
        let vis = this;
        const activeField = vis.getActiveColorField();
        const legendEl = document.getElementById("chart-legend");
        if (!legendEl) return;

        let html = "";

        if (activeField === "nutriscore_grade") {
            html += `<h4 class="legend-title">Nutri-Score</h4>`;
            [["A", "#038141"], ["B", "#85BB2F"], ["C", "#FECB02"], ["D", "#EE8100"], ["E", "#E63E11"]]
                .forEach(([label, color]) => {
                    html += `<div class="legend-item"><span class="legend-swatch" style="background:${color}"></span><span>${label}</span></div>`;
                });
        } else if (activeField === "ecoscore_grade") {
            html += `<h4 class="legend-title">Eco-Score</h4>`;
            [["A+", "#005C2E"], ["A", "#038141"], ["B", "#85BB2F"], ["C", "#FECB02"], ["D", "#FFAD00"], ["E", "#EE8100"], ["F", "#E63E11"]]
                .forEach(([label, color]) => {
                    html += `<div class="legend-item"><span class="legend-swatch" style="background:${color}"></span><span>${label}</span></div>`;
                });
        } else {
            html += `<h4 class="legend-title">Brands</h4>`;
            if (vis.displayData.length > 0) {
                vis.displayData.forEach(d => {
                    const color = vis.colorScale(d.data.name);
                    html += `<div class="legend-item"><span class="legend-swatch" style="background:${color}"></span><span class="legend-label">${vis.formatDisplayLabel(d.data.name)}</span></div>`;
                });
            } else {
                html += `<span class="legend-empty">No data</span>`;
            }
        }

        legendEl.innerHTML = html;
    }

    getPrimarySelectionDescription() {
        const primaryField = this.drillFilterField;
        const primaryValue = this.drillFilterValue;
        const displayValue = this.formatDisplayLabel(primaryValue || "");

        if (primaryField === "ecoscore_grade") {
            return `Items with Ecoscore Rating ${displayValue}`;
        }
        if (primaryField === "nutriscore_grade") {
            return `Items with Nutriscore Rating ${displayValue}`;
        }
        if (primaryField === "brands") {
            return `Items belonging to ${displayValue}`;
        }

        return "Selected Items";
    }

    openDetailedView(clickedName) {
        if (!this.drillMode) return;

        const descriptor = this.getPrimarySelectionDescription();
        this.detailedViewSubtitle.text(
            `Analyse the Various Characteristics and Demographics of ${descriptor}`
        );

        const detailData = this.getDetailedData(clickedName);
        const otherScoreField = this.getOtherScoreField();
        const pieHeading = otherScoreField === "nutriscore_grade"
            ? "Nutriscore Distribution"
            : "Ecoscore Distribution";

        this.detailPie.render(detailData, otherScoreField, pieHeading);
        this.renderDetailedStats(detailData);
        this.detailedViewPanel.classed("hidden", false);
    }

    closeDetailedView() {
        this.detailedViewPanel.classed("hidden", true);
    }

    updateChartDescription() {
        let vis = this;
        let text = "";

        if (!vis.drillMode) {
            if (vis.categorySelection === "brands") {
                text = "Most Frequent Brands in the Database";
            } else if (vis.categorySelection === "nutriscore_grade") {
                text = "Distribution of Nutriscores";
            } else if (vis.categorySelection === "ecoscore_grade") {
                text = "Distribution of Ecoscores";
            }
        } else {
            const filterValue = vis.formatDisplayLabel(vis.drillFilterValue || "");
            if (vis.drillFilterField === "nutriscore_grade") {
                text = `Most Frequent Brands with Nutriscore ${filterValue}`;
            } else if (vis.drillFilterField === "ecoscore_grade") {
                text = `Most Frequent Brands with Ecoscore ${filterValue}`;
            } else if (vis.drillFilterField === "brands") {
                if (vis.drillDisplayField === "nutriscore_grade") {
                    text = `Nutriscore Distribution for ${filterValue}`;
                } else if (vis.drillDisplayField === "ecoscore_grade") {
                    text = `Ecoscore Distribution for ${filterValue}`;
                }
            }
        }

        if (vis.chartDescription) {
            vis.chartDescription.text(text);
        }
    }

    normalizeFieldValue(field, value) {
        const s = String(value).toLowerCase();
        if (field === "ecoscore_grade" && s === "a-plus") return "a+";
        return s;
    }

    getDetailedData(clickedName) {
        const clickedValue = String(clickedName || "").toLowerCase();

        if (this.drillFilterField === "brands") {
            // Brand selected first, then nutri/eco grade bubble clicked.
            return this.data.filter(d => {
                const brandMatch = d.brands !== null && d.brands !== undefined &&
                    String(d.brands).toLowerCase() === this.drillFilterValue;
                const gradeMatch = d[this.drillDisplayField] !== null && d[this.drillDisplayField] !== undefined &&
                    this.normalizeFieldValue(this.drillDisplayField, d[this.drillDisplayField]) === clickedValue;
                return brandMatch && gradeMatch;
            });
        }

        // Nutri/Eco selected first, then brand bubble clicked.
        return this.data.filter(d => {
            const primaryMatch = d[this.drillFilterField] !== null && d[this.drillFilterField] !== undefined &&
                this.normalizeFieldValue(this.drillFilterField, d[this.drillFilterField]) === this.drillFilterValue;
            const brandMatch = d.brands !== null && d.brands !== undefined &&
                String(d.brands).toLowerCase() === clickedValue;
            return primaryMatch && brandMatch;
        });
    }

    getOtherScoreField() {
        const activeScoreField = this.drillFilterField === "brands"
            ? this.drillDisplayField
            : this.drillFilterField;
        return activeScoreField === "nutriscore_grade" ? "ecoscore_grade" : "nutriscore_grade";
    }

    normalizeCategoriesTags(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            return value.split(",").map(s => s.trim()).filter(Boolean);
        }
        return [];
    }

    computeAverageGrade(records, field) {
        const nutriRank = { a: 1, b: 2, c: 3, d: 4, e: 5 };
        const ecoRank = { "a+": 1, a: 2, b: 3, c: 4, d: 5, e: 6, f: 7 };
        const scale = field === "nutriscore_grade" ? nutriRank : ecoRank;

        const values = records
            .map(d => d[field])
            .filter(v => v !== null && v !== undefined && v !== "")
            .map(v => {
                const s = String(v).toLowerCase();
                return field === "ecoscore_grade" && s === "a-plus" ? "a+" : s;
            })
            .filter(v => Object.prototype.hasOwnProperty.call(scale, v))
            .map(v => scale[v]);

        if (!values.length) return "N/A";

        const avg = d3.mean(values);
        return avg.toFixed(2);
    }

    renderDetailedStats(records) {
        if (!this.detailedViewStats) return;

        const categoryCounts = d3.rollups(
            records.flatMap(d => this.normalizeCategoriesTags(d.categories_tags)
                .filter(tag => tag !== null && tag !== undefined && tag !== "")),
            v => v.length,
            d => String(d)
        )
            .sort((a, b) => d3.descending(a[1], b[1]))
            .slice(0, 5);

        const formatTag = (tag) => String(tag)
            .replace(/^en:/, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());

        const nutriAverage = this.computeAverageGrade(records, "nutriscore_grade");
        const ecoAverage = this.computeAverageGrade(records, "ecoscore_grade");

        let html = "";
        html += `<h4 class="detail-stats-title">Category Statistics</h4>`;
        html += `<div class="detail-stat-line"><span>Products in selection:</span><strong>${records.length}</strong></div>`;
        html += `<div class="detail-stat-line"><span>Average Nutriscore:</span><strong>${nutriAverage}</strong></div>`;
        html += `<div class="detail-stat-line"><span>Average Ecoscore:</span><strong>${ecoAverage}</strong></div>`;
        html += `<h5 class="detail-stats-subtitle">Top Category Tags</h5>`;

        if (categoryCounts.length) {
            html += `<ol class="detail-tag-list">`;
            categoryCounts.forEach(([tag, count]) => {
                html += `<li><span>${formatTag(tag)}</span><strong>${count}</strong></li>`;
            });
            html += `</ol>`;
        } else {
            html += `<p class="detail-tag-empty">No category tags available.</p>`;
        }

        this.detailedViewStats.html(html);
    }

}