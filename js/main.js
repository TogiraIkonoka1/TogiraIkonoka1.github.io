
//Create function to update the graph when a new selection is made
function updateGraph() {
    //Get the new selection from the dropdown menu
    selection = d3.getElementById("categorySelector").value;
    //Update the graph with the new selection
    d3.json("data.json").then(function(data) {
        //Filter the data based on the new selection
        var filteredData = data.filter(function(d) {
            return d.category === selection;
        });
        //Update the graph with the filtered data

    });
}
