class DetailPie {
    constructor(svgSelector) {
        this.svg = d3.select(svgSelector);
        this.width = 760;
        this.height = 560;

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

        this.fallbackColors = d3.scaleOrdinal()
            .range(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1"]);
    }

    getColor(field, key) {
        if (field === "nutriscore_grade") {
            return this.nutriColors[key] || "#9aa0a6";
        }
        if (field === "ecoscore_grade") {
            return this.ecoColors[key] || "#9aa0a6";
        }
        return this.fallbackColors(key);
    }

    formatGradeLabel(field, value) {
        if (field === "nutriscore_grade" || field === "ecoscore_grade") {
            return String(value).toUpperCase();
        }
        return String(value);
    }

    render(records, field, heading) {
        const NA_VALUES = new Set([
            "unknown", "not-applicable", "not applicable", "not_applicable",
            "not-available", "not available", "not_available", "n/a", "na"
        ]);

        const values = records
            .map(d => d[field])
            .filter(v => {
                if (v === null || v === undefined || v === "") return false;
                const s = String(v).toLowerCase();
                return !NA_VALUES.has(s) && !s.startsWith("en:not-");
            })
            .map(v => {
                const s = String(v).toLowerCase();
                if (field === "ecoscore_grade" && s === "a-plus") return "a+";
                return s;
            });

        const aggregated = d3.rollups(values, arr => arr.length, d => d)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => d3.descending(a.value, b.value));

        this.svg.selectAll("*").remove();

        if (!aggregated.length) {
            this.svg.append("text")
                .attr("x", this.width / 2)
                .attr("y", this.height / 2)
                .attr("text-anchor", "middle")
                .style("fill", "#d7e3ff")
                .style("font-size", "18px")
                .text("No data available for pie chart");
            return;
        }

        const radius = Math.min(this.width * 0.46, this.height * 0.62) / 2;
        const centerX = this.width * 0.33;
        const centerY = this.height * 0.52;

        this.svg.append("text")
            .attr("x", centerX)
            .attr("y", 42)
            .attr("text-anchor", "middle")
            .style("fill", "#f2f6ff")
            .style("font-size", "20px")
            .style("font-weight", 700)
            .text(heading);

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
            .attr("fill", d => this.getColor(field, d.data.name))
            .attr("stroke", "#0b1f3a")
            .attr("stroke-width", 2);

        group.selectAll("text")
            .data(pie(aggregated))
            .enter()
            .append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("fill", "#ffffff")
            .style("font-size", "12px")
            .style("font-weight", 700)
            .text(d => {
                const total = d3.sum(aggregated, x => x.value);
                const pct = total ? Math.round((d.data.value / total) * 100) : 0;
                return pct >= 7 ? `${this.formatGradeLabel(field, d.data.name)} ${pct}%` : "";
            });

        const legend = this.svg.append("g")
            .attr("transform", `translate(${this.width * 0.62},${this.height * 0.2})`);

        aggregated.forEach((item, i) => {
            const y = i * 32;
            legend.append("rect")
                .attr("x", 0)
                .attr("y", y)
                .attr("width", 18)
                .attr("height", 18)
                .attr("rx", 3)
                .attr("fill", this.getColor(field, item.name));

            legend.append("text")
                .attr("x", 28)
                .attr("y", y + 13)
                .style("fill", "#d7e3ff")
                .style("font-size", "14px")
                .text(`${this.formatGradeLabel(field, item.name)} (${item.value})`);
        });
    }
}
