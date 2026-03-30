class DetailPie {
    constructor(config) {
        this.svg = d3.select(config.svgSelector);
        this.legend = d3.select(config.legendSelector);
        this.field = config.field;
        this.width = 420;
        this.height = 240;

        this.nutriColors = {
            a: "#038141",
            b: "#85BB2F",
            c: "#FECB02",
            d: "#EE8100",
            e: "#E63E11"
        };

        this.ecoColors = {
            "a+": "#005C2E",
            a: "#038141",
            b: "#85BB2F",
            c: "#FECB02",
            d: "#FFAD00",
            e: "#EE8100",
            f: "#E63E11"
        };

        this.tooltip = d3.select("body").select("#detail-pie-tooltip");
        if (this.tooltip.empty()) {
            this.tooltip = d3.select("body")
                .append("div")
                .attr("id", "detail-pie-tooltip")
                .attr("class", "detail-pie-tooltip")
                .style("display", "none");
        }
    }

    getColor(key) {
        if (this.field === "nutriscore_grade") {
            return this.nutriColors[key] || "#9aa0a6";
        }
        return this.ecoColors[key] || "#9aa0a6";
    }

    formatLabel(value) {
        return String(value).toUpperCase();
    }

    normalizeGrade(value) {
        const s = String(value).toLowerCase();
        if (this.field === "ecoscore_grade" && s === "a-plus") return "a+";
        return s;
    }

    getAggregated(records) {
        const NA_VALUES = new Set([
            "unknown", "not-applicable", "not applicable", "not_applicable",
            "not-available", "not available", "not_available", "n/a", "na"
        ]);

        const values = records
            .map(d => d[this.field])
            .filter(v => {
                if (v === null || v === undefined || v === "") return false;
                const s = String(v).toLowerCase();
                return !NA_VALUES.has(s) && !s.startsWith("en:not-");
            })
            .map(v => this.normalizeGrade(v));

        return d3.rollups(values, arr => arr.length, d => d)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => d3.descending(a.value, b.value));
    }

    renderLegend(aggregated) {
        this.legend.html("");

        if (!aggregated.length) {
            this.legend.html('<p class="detail-tag-empty">No grade data available.</p>');
            return;
        }

        aggregated.forEach(item => {
            const row = this.legend.append("div").attr("class", "detail-pie-legend-item");
            const left = row.append("div").attr("class", "detail-pie-legend-left");

            left.append("span")
                .attr("class", "detail-pie-legend-swatch")
                .style("background", this.getColor(item.name));

            left.append("span")
                .attr("class", "detail-pie-legend-label")
                .text(this.formatLabel(item.name));

            row.append("span")
                .attr("class", "detail-pie-legend-count")
                .text(item.value);
        });
    }

    render(records) {
        const aggregated = this.getAggregated(records);
        const total = d3.sum(aggregated, d => d.value);

        this.svg.selectAll("*").remove();
        this.renderLegend(aggregated);

        if (!aggregated.length) {
            this.svg.append("text")
                .attr("x", this.width / 2)
                .attr("y", this.height / 2)
                .attr("text-anchor", "middle")
                .style("fill", "#d7e3ff")
                .style("font-size", "14px")
                .text("No data available");
            return;
        }

        const radius = Math.min(this.width * 0.48, this.height * 0.82) / 2;
        const centerX = this.width * 0.5;
        const centerY = this.height * 0.54;

        const pie = d3.pie()
            .sort(null)
            .value(d => d.value);

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        const group = this.svg.append("g")
            .attr("transform", `translate(${centerX},${centerY})`);

        group.selectAll("path")
            .data(pie(aggregated))
            .enter()
            .append("path")
            .attr("d", arc)
            .attr("fill", d => this.getColor(d.data.name))
            .attr("stroke", "#0b1f3a")
            .attr("stroke-width", 2)
            .on("mouseenter", (event, d) => {
                const pct = total ? ((d.data.value / total) * 100).toFixed(1) : "0.0";
                this.tooltip
                    .style("display", "block")
                    .html(
                        `<strong>${this.formatLabel(d.data.name)}</strong><br>` +
                        `Products: ${d.data.value}<br>` +
                        `Share: ${pct}%`
                    );
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("left", `${event.clientX + 12}px`)
                    .style("top", `${event.clientY + 12}px`);
            })
            .on("mouseleave", () => {
                this.tooltip.style("display", "none");
            });

        group.selectAll("text")
            .data(pie(aggregated))
            .enter()
            .append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("fill", "#ffffff")
            .style("font-size", "11px")
            .style("font-weight", 700)
            .text(d => {
                const pct = total ? Math.round((d.data.value / total) * 100) : 0;
                return pct >= 8 ? `${this.formatLabel(d.data.name)} ${pct}%` : "";
            });
    }
}
