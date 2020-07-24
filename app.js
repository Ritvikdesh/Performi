var express     = require("express"),
    mongoose    = require("mongoose"),
    bodyParser  = require("body-parser"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    User        = require("./models/user"),
    methodOverride  = require("method-override"),
        app     = express()

// setting up defaults that app requires
mongoose.connect("mongodb://localhost/performi_app");
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "this is a secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
})

// LOGIN PAGE
app.get("/", function(req, res){
    res.render("login");
})  

app.post("/login", passport.authenticate("local", {successRedirect: "/home", failureRedirect: "/"}), function(req, res){

})  

// COMPANY SIGN UP PAGE
app.get("/companySignUp", function(req, res){
    res.render("companySignUp");
})


app.post("/companySignUp", function(req,res){
    var newUser = new User({username: req.body.username, firstName: req.body.firstName, lastName: req.body.lastName, companyName: req.body.companyName, isAdmin: true});
    console.log(newUser);
    User.register(newUser, req.body.password, function(err, user){
        if (err){
            console.log(err);
           return res.redirect("/companySignUp")
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/home");  
        }); 
    });
})

app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/");
})

//HOME PAGE         
app.get("/home", isLoggedIn, function(req, res){
    res.render("home");
})

//TASKS PAGE
app.get("/tasks", isLoggedIn, function(req, res){
    res.render("tasks");
})

//MY PERFORMANCE PAGE
app.get("/myPerformance", isLoggedIn, function(req, res){
    res.render("goals");
})


// MANAGE USERS PAGE
app.get("/manageUsers", isAdmin, function(req, res){
    User.find({}, function(err, allUsers){
        if(err){
            console.log(err);
        }
        else{
            res.render("manageUsers", {users: allUsers});
        }
    })
})

// MANAGE ACCOUNT PAGE
app.get("/manageAccount", isAdmin, function(req, res){
    res.render("generalSettings");
})

// EMPLOYEES INDEX
app.get("/employees", isLoggedIn, function(req, res){
    User.find({}, function(err, allUsers){
        if(err){
            console.log(err);
        }
        else{
            res.render("employees", {users: allUsers});
        }
    })
})

// ADD EMDPLOYEE 
app.get("/employees/new", isAdmin, function(req, res){
    res.render("addEmployee");
})

//CREATE EMPLOYEE
app.post("/employees/create", isAdmin, function(req,res){
    var newUser = new User(
        {
            username: req.body.username,
            firstName: req.body.firstName,
            middleName: req.body.middleName, 
            lastName: req.body.lastName, 
            // gender: req.body.button,
            hireDate: req.body.hireDate,
            address: req.body.address,
            city: req.body.city,
            postalCode: req.body.postalCode,
            country: req.body.country,
            email: req.body.email,
            workPhoneNumber: req.body.workPhoneNumber,
            mobilePhoneNumber: req.body.mobilePhoneNumber,
            department: req.body.department,
            jobTitle: req.body.jobTitle,
            reportsTo: req.body.reportsTo,
            manager: req.body.manager,
            workingStatus: req.body.workingStatus,
            companyName: req.user.companyName
        });
        console.log(req.body.button);
    User.register(newUser, req.body.password, function(err, user){
        if (err){
            console.log(err);
           return res.redirect("/employees/new")
        }
        // passport.authenticate("local")(req, res, function(){
        //     res.redirect("/employees"); 
        // }); 
        
    });
    res.redirect("/home"); 

})

// EDIT USER ROUTE
app.get("/employees/:id/edit", function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err){
            console.log(err);
            return res.redirect("/manageUsers");
        }
        res.render("editPersonalInfo", {user: user});
    })
})

//UPDATE USER ROUTE
app.put("/employees/:id", function(req, res){
    var data = {
        firstName: req.body.firstName,
        middleName: req.body.middleName, 
        lastName: req.body.lastName, 
        hireDate: req.body.hireDate,
        address: req.body.address,
        city: req.body.city,
        postalCode: req.body.postalCode,
        country: req.body.country,
        email: req.body.email,
        workPhoneNumber: req.body.workPhoneNumber,
        mobilePhoneNumber: req.body.mobilePhoneNumber,
        jobTitle: req.body.jobTitle,
        reportsTo: req.body.reportsTo,
        companyName: req.user.companyName
    }

    User.findByIdAndUpdate(req.params.id, data, function(err, updatedUser){
        if(err){
            res.redirect("/home");
        }else{
            res.redirect("/manageUsers");
        }
    })
})

//DELETE USER ROUTE
app.delete("/employees/:id", isAdmin , function(req,res){
    User.findByIdAndRemove(req.params.id, function(err){
        res.redirect("/manageUsers");
    })
}) 


//VIEW DIRECTORY PAGE
app.get("/viewDirectory", isLoggedIn, function(req, res){
    res.render("viewDirectory");
})

//EDIT PERSONAL INFO PAGE
app.get("/editPersonalInfo", isLoggedIn, function(req, res){
    res.render("editPersonalInfo");
})

//360 FEEDBACK PAGE
app.get("/360feedback", isLoggedIn, function(req, res){
    User.find({}, function(err, allUsers){
        if(err){
            console.log(err);
        }
        else{
            res.render("360feedback", {users: allUsers});
        }
    })
})

//FOROGOT PASSWORD PAGE
app.get("/forgotPassword", function(req,res){
    res.render("forgotPassword");
})

//DEMO LOGIN PAGE
app.get("/demo", function(req, res){
    res.render("demo");
})

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/");
}

function isAdmin(req,res, next){
    if(req.user.isAdmin && req.isAuthenticated()){
        return next();
    }
    res.redirect("/home");
}

// running app at local host 3000
app.listen(process.env.PORT || 3000, function(){
    console.log("listening at port 3000");
})