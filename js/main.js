
let bubbleChart;

d3.json("data/filtered_sample1.json").then(function(data) {
    bubbleChart = new BubbleChart("#chart-area", data);

    const categoryDropdown = d3.select("#categorySelection");
    bubbleChart.setCategory(categoryDropdown.property("value"));

    categoryDropdown.on("change", function() {
        bubbleChart.setCategory(this.value);
    });
});
