var express     = require("express"),
    mongoose    = require("mongoose"),
    bodyParser  = require("body-parser"),
        app     = express()

// setting up defaults that app requires
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));


// login page
app.get("/", function(req, res){
    res.render("login");
})

// compnay sign up page
app.get("/companySignUp", function(req, res){
    res.render("companySignUp");
})

//home page
app.get("/home", function(req, res){
    res.render("home");
})

//tasks page
app.get("/tasks", function(req, res){
    res.render("tasks");
})

//goals page
app.get("/goals", function(req, res){
    res.render("goals");
})

app.get("/employees", function(req, res){
    res.render("employees");
})

app.get("/manageUsers", function(req, res){
    res.render("manageUsers");
})

app.get("/generalSettings", function(req, res){
    res.render("generalSettings");
})

app.get("/addEmployee", function(req, res){
    res.render("addEmployee");
})

app.get("/viewDirectory", function(req, res){
    res.render("viewDirectory");
})

app.get("/editPersonalInfo", function(req, res){
    res.render("editPersonalInfo");
})

app.get("/360feedback", function(req, res){
    res.render("360feedback");
})


//forgot password page
app.get("/forgotPassword", function(req,res){
    res.render("forgotPassword");
})

//demo login page
app.get("/demo", function(req, res){
    res.render("demo");
})

// running app at local host 3000
app.listen(3000, function(){
    console.log("listening at port 3000");
})