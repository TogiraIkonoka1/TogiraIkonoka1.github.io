
let bubbleChart;

function loadDataWithFallback() {
    const pageDir = window.location.pathname.replace(/\/[^/]*$/, "/");
    const candidates = [
        "data/filtered_sample1.json",
        "./data/filtered_sample1.json",
        `${pageDir}data/filtered_sample1.json`
    ];

    let lastError = null;

    return candidates.reduce((promise, url) => {
        return promise.catch(() => {
            return d3.json(url).catch(err => {
                lastError = err;
                throw err;
            });
        });
    }, Promise.reject(new Error("No URL attempted yet"))).catch(() => {
        throw lastError || new Error("Failed to load dataset");
    });
}

loadDataWithFallback()
    .then(function(data) {
        bubbleChart = new BubbleChart("#chart-area", data);

        const categoryDropdown = d3.select("#categorySelection");
        bubbleChart.setCategory(categoryDropdown.property("value"));

        categoryDropdown.on("change", function() {
            bubbleChart.setCategory(this.value);
        });
    })
    .catch(function(error) {
        console.error("Dataset loading failed:", error);

        d3.select("#chart-area")
            .append("p")
            .style("color", "#b00020")
            .style("font-weight", "600")
            .text("Could not load chart data. Verify the data file path for GitHub Pages.");
    });
