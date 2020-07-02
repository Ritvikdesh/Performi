var express = require("express"),
        app = express()

// landing page
app.get("/", function(req, res){
    res.send("hey this is the home page");
})

// running app at local host 3000
app.listen(3000, function(){
    console.log("listening at port 3000");
})