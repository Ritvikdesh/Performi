require('dotenv').config();
var express     = require("express"),
    mongoose    = require("mongoose"),
    bodyParser  = require("body-parser"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    User        = require("./models/user"),
    Goal        = require("./models/goals"),
    Feedback        = require("./models/feedback"),
    Comment        = require("./models/comment"),
    methodOverride  = require("method-override"),
    flash       = require("connect-flash"),
    cron = require('node-cron'),
    async       = require("async"),
    nodemailer       = require("nodemailer"),
    crypto      = require("crypto"),
        app     = express();

// setting up defaults that app requires
mongoose.connect("mongodb://localhost/performi_app");
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

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
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.sendForm = app.locals.sendForm;
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

//FOROGOT PASSWORD PAGE
app.get("/forgotPassword", function(req,res){
    res.render("forgotPassword");
})

//FOROGOT PASSWORD PAGE
app.post("/forgotPassword", function(req, res, next){
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({email: req.body.email}, function(err, user){
                if(!user) {
                    req.flash("error", "No account with that email address.");
                    return res.redirect("/forgotPassword");
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000;

                user.save(function(err) {
                    done(err, token, user);
                });
            });
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail', 
                auth: {
                    user: 'kingritz1@gmail.com',
                    pass: process.env.GMAILPWW
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'kingritz1@gmail.com',
                subject: 'Performi Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                console.log('mail sent');
                req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(err, 'done');
            });
        }
    ], function(err) {
        if (err) return next(err);
            res.redirect('/forgotPassword');
    });
});

app.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgotPassword');
        }
        res.render('reset', {token: req.params.token});
    });
});
  
app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
            if (!user) {
                req.flash('error', 'Password reset token is invalid or has expired.');
                return res.redirect('back');
            }
            if(req.body.password === req.body.confirm) {
                user.setPassword(req.body.password, function(err) {
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;
  
                    user.save(function(err) {
                        req.logIn(user, function(err) {
                            done(err, user);
                        });
                    });
                })
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
            }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'kingritz1@gmail.com',
            pass: process.env.GMAILPWW
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'kingritz1@mail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/home');
    });
  });
   
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

//MY PERFORMANCE PAGE (INDEX FOR GOALS, FEedback)
app.get("/myPerformance", isLoggedIn, function(req, res){
    Goal.find({}).populate("comments").exec(function(err, allGoals){
        if (err){
            console.log("goals error: " + err);
        }
        else{
            Feedback.find({}, function(err, allFeedbacks){
                if (err){
                    console.log("Feedback error: " + err);
                }
                else{
                    res.render("goals", {feedbacks: allFeedbacks, goals: allGoals});
                }
            })
        }
    })
})

//CREATE PAGE FOR GOALS
app.post("/myPerformance/goals/create", isLoggedIn, function(req, res){
    var title = req.body.title;
    var dueDate = req.body.dueDate;
    var description = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var goal = {title: title, dueDate: dueDate, description: description, author: author}; 
    console.log(goal);
    Goal.create(goal, function(err, goal){
        if(err){
            console.log(err);
        }
        else{
            console.log(goal);
            res.redirect("/myPerformance");
        }
    })
})


//CREATE COMMENTS
app.post("/myPerformance/goals/:id/comments/create", isLoggedIn, function(req, res){
    //look up camground using id 
    Goal.findById(req.params.id, function(err, goal){
        if(err){
            console.log(err);
            res.redirect("/home");
        }else{
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    req.flash("error", "Something went wrong");
                    console.log(err);
                }else{
                    // add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    //save comment
                    comment.save();
                    goal.comments.push(comment);
                    goal.save();
                    req.flash("success", "Successfully added comment");
                    res.redirect("/myPerformance");
                }
            })
        }
    });
})

app.post("/sendForm", function(req, res){
    app.locals.sendForm = false;
    res.redirect("/myPerformance");
})

// MANAGE USERS PAGE
app.get("/manageUsers", isAdmin, function(req, res){
    if(req.query.employee){
        const regex = new RegExp(escapeRegex(req.query.employee), 'gi');
        User.find({firstName: regex}, function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("manageUsers", {users: allUsers});
            }
        })
    }else{
        User.find({}, function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("manageUsers", {users: allUsers});
            }
        })
    }
})

// MANAGE ACCOUNT PAGE
app.get("/manageAccount", isAdmin, function(req, res){
    res.render("generalSettings");
})

// POST ROUTE FOR GENERAL SETTINGS
app.post("/generalSettings", function(req, res){
    req.user.companyName = req.body.companyName;
    req.user.save();    
    res.redirect("/manageAccount");
})

// POST ROUTE FOR REVIEW CYCLES
app.post("/reviewCycles", function(req, res){
    var today = new Date();
    var counter = Number(req.body.counter)

    for(var i = 1; i <= counter; i++){
        var startDate = req.body['startDate' + i];
        var month = Number(startDate.charAt(0));
        var date = Number(startDate.charAt(2));
        if(today.getDate() == date){
                app.locals.sendForm = true;
        }else{
            cron.schedule(`* * ${date} ${month} *`, function() {
                app.locals.sendForm = true;
            });
        }
    }
    
    res.redirect("/home");
})

// EMPLOYEES INDEX
app.get("/employees", isLoggedIn, function(req, res){
    if(req.query.employee){
        const regex = new RegExp(escapeRegex(req.query.employee), 'gi');
        User.find({firstName: regex}, function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("employees", {users: allUsers});
            }
        })
    }else{
        User.find({}, function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("employees", {users: allUsers});
            }
        })
    }
})

// ADD EMDPLOYEE 
app.get("/employees/new", isAdmin, function(req, res){
    res.render("addEmployee");
})

//CREATE EMPLOYEE
app.post("/employees/create", isAdmin, function(req,res){
    var newUser = new User(
        {
            photo: req.body.photo,
            username: req.body.username,
            firstName: req.body.firstName,
            middleName: req.body.middleName, 
            lastName: req.body.lastName, 
            gender: req.body.gender,
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
        console.log(newUser);
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
        photo: req.body.photo, 
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
   
    if(req.query.employee){
        const regex = new RegExp(escapeRegex(req.query.employee), 'gi');
        User.find({firstName: regex}, function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("360feedback", {users: allUsers});
            }
        })
    }else{
        User.find({}, function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("360feedback", {users: allUsers});
            }
        })
    }
})

//360Feedback index


//360 FEEDBACK CREATE
app.post("/360feedback", function(req, res){
    var feedback = {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        pros: req.body.pros,
        cons: req.body.cons
    };
    console.log(feedback);

    Feedback.create(feedback, function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/360feedback");
        }
    })
})

app.post("/360feedback/:id", function(req,res){
    User.findById(req.params.id, function(err, person){
        req.user.feedbackFirstName = person.firstName;
        req.user.feedbackLastName = person.lastName;
        req.user.save();
        console.log("first name: " + req.user.feedbackFirstName);
        console.log("last name: " + req.user.feedbackFirstName);
        res.redirect("/360feedback");
    })
}) 


//SEND 360 FEEDBACK FORM
app.post("/360feedback/sendFeedback/:id", function(req,res){
    User.findById(req.params.id, function(err, user){
        req.flash("success", "You sent a peer feedback form to: " + user.firstName);
        req.user.sendFeedbackFormTo.push(req.params.id);
        req.user.save();
        res.redirect("/360feedback");
    })
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

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// running app at local host 3000
app.listen(process.env.PORT || 3000, function(){
    console.log("listening at port 3000");
})