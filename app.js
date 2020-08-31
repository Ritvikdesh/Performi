require('dotenv').config();
var express     = require("express"),
    mongoose    = require("mongoose"),
    bodyParser  = require("body-parser"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    User        = require("./models/user"),
    Admin        = require("./models/admin"),
    Manager        = require("./models/manager"),
    Employee        = require("./models/employee"),
    Goal        = require("./models/goals"),
    Feedback        = require("./models/feedback"),
    SelfAssessment        = require("./models/selfAssessments"),
    ManagerAssessment        = require("./models/managerAssessments"),
    Notification        = require("./models/notification"),
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
mongoose.set('useFindAndModify', false);
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
let noAccount = true;

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
    res.locals.currentUser2 = app.locals.currentUser3;
    // if(req.user){
    //     User.findById(req.user._id).populate("admin").populate("manager").populate("employee").exec(function(err, user){
    //         var person = personRole(user);
    //         person.findById(user[`${user.privilege}`]._id).populate('notifications', null, {isRead: false}).exec(function(err, personRole){
    //             console.log(personRole);
    //             // console.log("this is how many notifications i have: " + personRole.notifications.length);
    //         });
    //     });
    // }
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
    var newUser = new User({username: req.body.username, privilege: "admin", companyName: req.body.companyName});
    var newAdmin = {firstName: req.body.firstName, lastName: req.body.lastName};
    User.register(newUser, req.body.password, function(err, user){
        if (err){
            console.log(err);
           return res.redirect("/companySignUp")
        }
        Admin.create(newAdmin, function(err, admin){
            if(err){
                console.log(err);
            }else{
                user.admin = admin;
                user.save();
            }
        });
        console.log(user);
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

            User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, users){
                noAccount = true;
                if(err){
                    console.log(err);
                }else{
                    users.forEach(function(person){
                        if(person[`${person.privilege}`].email == req.body.email){
                            noAccount = false;
                            var userRole = personRole(person);
                            userRole.findById(person[`${person.privilege}`]._id, function(err, user){
                                user.resetPasswordToken = token;
                                user.resetPasswordExpires = Date.now() + 3600000;

                                user.save(function(err) {
                                    done(err, token, user);
                                });
                            });
                        }
                    });

                    if(noAccount) {
                        req.flash("error", "No account with that email address.");
                        return res.redirect("/forgotPassword");
                    }
                }
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

    User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, users){
        if(err){
            console.log(err);
        }else{
            users.forEach(function(person){
                if(person[`${person.privilege}`].resetPasswordToken == req.params.token){
                   
                    var userRole = personRole(person);
                    userRole.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
                        if (!user) {
                            req.flash('error', 'Password reset token is invalid or has expired.');
                            return res.redirect('/forgotPassword');
                        }
                        res.render('reset', {token: req.params.token});
                    });
                }
            });
        }
    });
});
  
app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, users){
            if(err){
                console.log(err);
            }else{
                users.forEach(function(person){
                    if(person[`${person.privilege}`].resetPasswordToken == req.params.token){
                       
                        var userRole = personRole(person);
                        userRole.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
                            if (!user) {
                                req.flash('error', 'Password reset token is invalid or has expired.');
                                return res.redirect('back');
                            }
                            if(req.body.password === req.body.confirm) {
                                person.setPassword(req.body.password, function(err) {
                                    console.log("the password is: " + req.body.password);
                                    user.resetPasswordToken = undefined;
                                    user.resetPasswordExpires = undefined;

                                    user.save();
                  
                                    person.save(function(err) {
                                        req.logIn(person, function(err) {
                                            done(err, person);
                                        });
                                    });
                                })
                            } else {
                              req.flash("error", "Passwords do not match.");
                              return res.redirect('back');
                            }
                        });
                    }
                });
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
        console.log('mail sent');
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
    User.findOne({username: req.user.username}).populate(`${req.user.privilege}`).exec(function(err, user){
        if(err){
            console.log(err);
        }else{
            var person = personRole(user);
            if(user.privilege == "admin") {
                person.findById(user[`${user.privilege}`]._id).populate("managers").populate("notifications").exec(function(err, personRole){
                    app.locals.currentUser3 = personRole;
                })
            } else if(user.privilege == "manager") {
                person.findById(user[`${user.privilege}`]._id).populate("employees").populate("notifications").exec(function(err, personRole){
                    app.locals.currentUser3 = personRole;
                })
            } else if(user.privilege == "employee") {
                person.findById(user[`${user.privilege}`]._id).populate("notifications").exec(function(err, personRole){
                    app.locals.currentUser3 = personRole;
                })
            }
            res.render("home");
        }
    });
})

//TASKS PAGE
app.get("/tasks", isLoggedIn, function(req, res){
    try{
        User.findById(req.user._id).populate("admin").populate("manager").populate("employee").exec(function(err, user){
            var person = personRole(user);
            person.findById(user[`${user.privilege}`]._id).populate({path: "notifications", options: {sort: {"_id": -1}}}).exec(function(err, personRole){
                console.log(personRole);
                res.render("tasks", {allNotifications: personRole.notifications});
            })
        })
    }catch(err){
        console.log(err.message);
    }
})

//MY PERFORMANCE PAGE (VIEW FOR GOALS, FEEDBACK)
app.get("/myPerformance/:id", isLoggedIn, function(req, res){
    User.findById(req.params.id).populate("admin").populate("manager").populate("employee").exec(function(err, user){
        if(err){
            console.log(err);
        }else{

            var person = personRole(user);

            person.findById(user[`${user.privilege}`]._id).populate("goals").populate("feedbacks").populate("selfAssessments").populate("managerAssessmentForms").exec(function(err, userRole){
                if(err){
                    console.log(err);
                }else{
                    // console.log(user[`${user.privilege}`].goals);
                    Goal.find({authorId: req.params.id}).populate("comments").exec(function(err, allGoals){
                        if (err){
                            console.log("goals error: " + err);
                        }
                        else{
                            Feedback.find({firstName: userRole.firstName}, function(err, allFeedbacks){
                                if (err){
                                    console.log("Feedback error: " + err);
                                }
                                else{
                                    SelfAssessment.find({username: user.username}, function(err, allSelfAssessments){
                                        if (err){
                                            console.log("Assessment error: " + err);
                                        }
                                        else{
                                            ManagerAssessment.find({username: user.username}, function(err, allManagerAssessments){
                                                if (err){
                                                    console.log("Manager Assessment error: " + err);
                                                }
                                                else{
                                                    if(userRole.recievePerformanceReview){
                                                        Notification.findOne({managerReviewed: true, username: req.user.username}, function(err, notification){
                                                            notification.isRead = true;
                                                            notification.save();
                                                        })
                                                    }
                                                    // console.log(allGoals[0].comments);
                                                    // console.log(allGoals[8]);
                                                    console.log(userRole);
                                                    res.render("goals", {feedbacks: allFeedbacks, goals: allGoals, assessments: allSelfAssessments, managerAssessments: allManagerAssessments, userId: req.params.id, suboordinate :userRole});
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                } 
            })    
        }
    });
})

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
/////////////////////GOALS ROUTE///////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

//CREATE PAGE FOR GOALS
app.post("/myPerformance/goals/create/:id", isLoggedIn, function(req, res){
    var title = req.body.title;
    var dueDate = req.body.dueDate;
    var description = req.body.description;
    var authorId = req.user._id;
    var authorUsername = req.user.username;

    var goal = {title: title, dueDate: dueDate, description: description, authorId: authorId, authorUsername: authorUsername}; 

    User.findById(req.params.id).populate("admin").populate("manager").populate("employee").exec(function(err, foundUser){
        if(err){
            console.log(err);
        }else{

            var person = personRole(foundUser);

            person.findById(foundUser[`${foundUser.privilege}`]._id, function(err, user){
                if(err){
                    console.log(err);   
                }else{
                    Goal.create(goal, function(err, goal){
                        if(err){
                            console.log(err);
                        }
                        else{
                            // console.log(foundUser[`${foundUser.privilege}`]);
                            user.goals.push(goal);
                            user.save();
                            foundUser[`${foundUser.privilege}`] = user;
                            foundUser.save();
                            // console.log(foundUser);
                            res.redirect("/myPerformance/" + req.params.id);
                        }
                    })
                }
            });
        }
    })
})


//CREATE COMMENTS
app.post("/myPerformance/goals/:id/comments/create/:userId", isLoggedIn, function(req, res){
    User.findById(req.params.userId).populate("admin").populate("manager").populate("employee").exec(function(err, foundUser){
        if(err){
            console.log(err);
        }else{

            var person = personRole(foundUser);

            //look up goal using id 
            person.findById(foundUser[`${foundUser.privilege}`]._id, function(err, user){
                if(err){
                    console.log(err);
                    res.redirect("/home");
                }else{
                    Goal.findById(req.params.id, function(err, goal){
                        if(err){
                            console.log(err);
                        }else{
                            Comment.create(req.body.comment, function(err, comment){
                                if(err){
                                    req.flash("error", "Something went wrong");
                                    console.log(err);
                                }else{
                                    // add username and id to comment
                                    comment.author.id = req.user._id;
                                    comment.author.username = req.user.username;
                                    comment.photo = app.locals.currentUser3.photo;
                                    //save comment
                                    comment.save();
                                    //save goal
                                    goal.comments.push(comment);
                                    goal.save();
                                    // save user holding goal
                                    user.goals.push(goal);
                                    user.save();
                                    // save top level user
                                    foundUser[`${foundUser.privilege}`] = user;
                                    foundUser.save();
                                    req.flash("success", "Successfully added comment");
                                    res.redirect("/myPerformance/" + req.params.userId);
                                }
                            })
                        }
                    })
                }
            });
        }
    })
    
})

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
/////////////////////SELF ASSESSMENTS ROUTE///////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

app.post("/selfAssessment/create", function(req, res){
    var selfAssessmentForm = {
        username: req.user.username,
        pros: req.body.pros,
        cons: req.body.cons,
        favouriteProject: req.body.project
    }

    var notification = {
        selfAssessment: false
    }

    User.findById(req.user._id).populate("admin").populate("manager").populate("employee").exec(function(err, currentUser){
        if(err){
            console.log(err);
        }else{

            var person = personRole(currentUser);

            person.findById(currentUser[`${currentUser.privilege}`]._id, function(err, user){
                if(err){
                    console.log(err);   
                }else{
                    SelfAssessment.create(selfAssessmentForm, function(err, form){
                        if(err){
                            console.log(err);
                        }
                        else{
                            user.sentPerformanceReview = true;
                            user.selfAssessments.push(form);
                            user.save();
                            Notification.findOne({selfAssessment: true, username: req.user.username}, function(err, notification){
                                notification.isRead = true;
                                notification.save();
                            })
                            User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, allUsers){
                                allUsers.forEach(function(foundManager){
                                    if(foundManager[`${foundManager.privilege}`].firstName == user.reportsTo){
                                        Notification.create(notification, function(err, notification){
                                            notification.username = foundManager.username;
                                            notification.message = currentUser.username + " has submitted their performance review.";
                                            notification.url = "/myPerformance/" + req.user.id;
                                            notification.managerAssessment = true;
                                            notification.save();
                                            foundManager[`${foundManager.privilege}`].notifications.push(notification);
                                            foundManager[`${foundManager.privilege}`].save();
                                            console.log(foundManager[`${foundManager.privilege}`]);
                                            console.log("this should be printed out when a user submitts their performance review");
                                        })
                                    }
                                })
                            })
                            res.redirect("/myPerformance/" + req.user.id);
                        }
                    })
                }
            });
        }
    })
})

app.post("/managerAssessment/:id", function(req, res){
    var managerAssessment = {
        pros: req.body.employeePros,
        cons: req.body.employeeCons
    }

    var notification = {
        managerReviewed: true
    }


    User.findById(req.params.id).populate("admin").populate("manager").populate("employee").exec(function(err, user){
        if(err){
            console.log(err);
        }else{

            var person = personRole(user);

            person.findById(user[`${user.privilege}`]._id, function(err, userRole){
                if(err){
                    console.log(err);   
                }else{
                    Notification.findOne({managerAssessment: true, username: req.user.username}, function(err, notification){
                        notification.isRead = true;
                        notification.save();
                    })

                    Notification.create(notification, function(err, notification){
                        notification.username = user.username;
                        notification.message = "Your manager has reviewed your performance review";
                        notification.url = "/myPerformance/" + user._id;
                        notification.save();
                        userRole.notifications.push(notification);
                        userRole.save();
                        console.log(userRole);
                        console.log("this should be printed out when a user submitts their performance review");
                    })

                    ManagerAssessment.create(managerAssessment, function(err, assessmentForm){
                        assessmentForm.username = user.username;
                        assessmentForm.save();
                        userRole.recievePerformanceReview = true;
                        userRole.managerAssessmentForms.push(assessmentForm);
                        userRole.save();
                        console.log(userRole);
                        res.redirect("/myPerformance/" + req.params.id);
                    })
                }
            });
        }
    })
})

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
/////////////////////360 FEEDBACK ROUTE///////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////


//INDEX
app.get("/360feedback", isLoggedIn, function(req, res){
   
    if(req.query.employee){
        const regex = new RegExp(escapeRegex(req.query.employee), 'gi');
        User.find({firstName: regex}).populate("feedbacks").exec(function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                res.render("360feedback", {users: allUsers});
            }
        })
    }else{
        User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                var everyUser = [];
                allUsers.forEach(function(user){
                    everyUser.push(user[`${user.privilege}`]);
                })

                var person = personRole(req.user);
                person.findById(req.user[`${req.user.privilege}`]._id, function(err, currentUserRole){
                    if(err){
                        consoel.log(err);
                    }else{
                        if(currentUserRole.viewFeedback != null) {
                            User.findById(currentUserRole.viewFeedback, function(err, feedbackPerson){
                                // console.log(feedbackPerson);
                                var person2 = personRole(feedbackPerson);
                                person2.findById(feedbackPerson[`${feedbackPerson.privilege}`]._id).populate("feedbacks").exec(function(err, feedbackPersonRole){    
                                   feedbackPersonRole.feedbacks.forEach(function(feedback){
                                       if(feedback.sendFeedbackTo == req.user._id){
                                           console.log(" feedback is: " + feedback);
                                           res.render("360feedback", {users: everyUser, feedback: feedback});
                                       }
                                   })
                                })
                            })
                        } else{
                            console.log("here");
                            res.render("360feedback", {users: everyUser});
                        }
                    }
                })

            }                   
        })
    }
})

//CREATE
app.post("/360feedback/sendFeedback/:id", function(req,res){

    var feedback = {
        firstName: app.locals.currentUser3.firstName,
        lastName: app.locals.currentUser3.lastName,
        sendFeedbackTo: req.params.id
    }

    var notification = {
        message: "Give Peer Feedback for " + req.user.username,
        feedback: true,
        url: "/360feedback"
    }

    User.findById(req.params.id).populate("admin").populate("manager").populate("employee").exec(function(err, user){
        req.flash("success", "You sent a peer feedback form to: " + user[`${user.privilege}`].firstName);
    });

    User.findById(req.user._id).populate("admin").populate("manager").populate("employee").exec(function(err, currentUser){ 
        if(err){
            console.log(err);
        }else{

            var person = personRole(currentUser);

            person.findById(currentUser[`${currentUser.privilege}`]._id, function(err, userRole){
                if(err){
                    console.log(err);
                }else{
                    Feedback.create(feedback, function(err, feedbackForm){
                        if(err){
                            console.log(err);
                        }else{
                            User.findById(req.params.id).populate("admin").populate("manager").populate("employee").exec(function(err, user){ 
                                var person = personRole(user);
                                person.findById(user[`${user.privilege}`]._id, function(err, personRole){
                                    Notification.create(notification, function(err, notification){
                                        notification.username = user.username;
                                        notification.save();
                                        personRole.notifications.push(notification);
                                        personRole.save();
                                        console.log(personRole);
                                    })
                                })
                                feedbackForm.reviewedByFirstName = user[`${user.privilege}`].firstName;
                                feedbackForm.reviewedByLastName = user[`${user.privilege}`].lastName;
                                feedbackForm.save();
                                console.log(feedbackForm);
                            });
                            userRole.sendFeedbackFormTo.push(req.params.id);
                            userRole.feedbacks.push(feedbackForm);
                            userRole.save();
                            currentUser[`${currentUser.privilege}`] = userRole;
                            currentUser.save();
                            res.redirect("/360feedback");
                        }
                    })
                }
            });
        }
    })
}) 

//VIEW
app.get("/360feedback/:id", function(req,res){
    console.log("hey");
    //find 360 feedback with provided ID
    User.findById(req.user._id).populate("admin").populate("manager").populate("employee").exec(function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            var person = personRole(foundUser);
            person.findById(foundUser[`${foundUser.privilege}`]._id, function(err, userRole){
                if(err){
                    console.log(err)
                }else{
                    userRole.viewFeedback = req.params.id;
                    userRole.save();
                    console.log(userRole.viewFeedback);
                    res.redirect("/360feedback");
                }
            })
        } 
    });
}) 

//UPDATE
app.post("/360feedback/:id", function(req, res){
    var today = new Date();
    var dd = today.getDate();

    var mm = today.getMonth()+1; 
    var yyyy = today.getFullYear();
    if(dd<10) 
    {
        dd='0'+dd;
    } 

    if(mm<10) 
    {
        mm='0'+mm;
    } 
    today = mm+'/'+dd+'/'+yyyy;

    var feedback = {
        pros: req.body.pros,
        cons: req.body.cons,
        completedAt: today
    };
    console.log(feedback)
    Notification.findOne({feedback: true, username: req.user.username}, function(err, notification){
        notification.isRead = true;
        notification.save();
    })
    Feedback.findByIdAndUpdate(req.params.id, feedback, function(err, updatedFeedback){
        if(err){
            console.log(err)
        }else{
            console.log(updatedFeedback);
            res.redirect("/360feedback");
        }
    })
})

// MANAGE USERS PAGE
app.get("/manageUsers", isAdmin, function(req, res){
    if(req.query.employee){
        console.log("employee to be found is: " + req.query.employee);
        const regex = new RegExp(escapeRegex(req.query.employee), 'gi');
        User.find({}).populate('admin').populate('manager').populate('employee').exec(function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                allUsers.forEach(function(user){
                    if(user[`${user.privilege}`].firstName == req.query.employee){
                        console.log("here");
                        var everyUser = [];
                        everyUser.push(user[`${user.privilege}`]);
                        res.render("manageUsers", {users: everyUser, userIds: allUsers});
                    }
                })
            }
        })
    }else{
        User.find({}).populate('admin').populate('manager').populate('employee').exec(function(err, allUsers){
            if(err){
                console.log(err);
            }
            else{
                var everyUser = [];
                allUsers.forEach(function(user){
                    everyUser.push(user[`${user.privilege}`]);
                })
                // console.log(everyUser[0].firstName);
                res.render("manageUsers", {users: everyUser, userIds: allUsers});
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
    User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, allUsers){
        if(err){
            console.log(err);
        }else{
            Admin.find({}, function(err, allAdmin){
                allAdmin.forEach(function(admin){
                    admin.companyName = req.body.companyName;
                    admin.save();
                })
            })
            Manager.find({}, function(err, allAdmin){
                allAdmin.forEach(function(admin){
                    admin.companyName = req.body.companyName;
                    admin.save();
                })
            })
            Employee.find({}, function(err, allAdmin){
                allAdmin.forEach(function(admin){
                    admin.companyName = req.body.companyName;
                    admin.save();
                })
            })
            app.locals.currentUser3.companyName = req.body.companyName;

    
        }
    })
    res.redirect("/home");  
})

// POST ROUTE FOR REVIEW CYCLES
app.post("/reviewCycles", function(req, res){
    var notification = {
        message: "You have a new self-assessment form to fill out",
        selfAssessment: true
    }
    var today = new Date();
    var counter = Number(req.body.counter)

    for(var i = 1; i <= counter; i++){
        var startDate = req.body['startDate' + i];
        var month = Number(startDate.charAt(0));
        var date = startDate.charAt(2);
        var date2 = startDate.charAt(3);
        var date3 = Number(date + date2);
        console.log(today.getDate());
        console.log(date3);
        if(today.getDate() == date3){
                app.locals.sendForm = true;
        }else{
            cron.schedule(`* * ${date} ${month} *`, function() {
                app.locals.sendForm = true;
            });
        }

        User.find({}).populate("admin").populate("manager").populate("employee").exec(function(err, users){
            users.forEach(function(user){
                var person = personRole(user);
                person.findById(user[`${user.privilege}`]._id, function(err, personRole){
                    Notification.create(notification, function(err, notification){
                        notification.username = user.username;
                        notification.url = "/myPerformance/" + user._id;
                        notification.save();
                        personRole.notifications.push(notification);
                        personRole.save();
                        console.log(personRole);
                    })
                })
            })
        })

    }
    
    res.redirect("/home");
})

// EMPLOYEES INDEX
app.get("/employees", isManagerOrAdmin, function(req, res){
    if(req.query.employee){
        const regex = new RegExp(escapeRegex(req.query.employee), 'gi');
        User.findById(req.user._id).populate('admin').populate('manager').populate('employee').exec(function(err, user){
            if(err){
                console.log(err);
            }
            else{
                if(user.privilege == "admin"){
                    Admin.findById(user.admin._id).populate("managers").exec(function(err, admin){
                        admin.managers.forEach(function(manager) {
                            if(manager.firstName == req.query.employee){
                                var everyUser = [];
                                everyUser.push(manager);
                                res.render("employees", {suboordinates: everyUser});
                            }
                        });
                    });
                } else{
                    Manager.findById(user.manager._id).populate("employees").exec(function(err, manager){
                        manager.employees.forEach(function(employee) {
                            if(employee.firstName == req.query.employee){
                                var everyUser = [];
                                everyUser.push(manager);
                                res.render("employees", {suboordinates: everyUser});
                            }
                        });
                    });
                }
            }
        })
    }else{
        User.findById(req.user._id).populate('admin').populate('manager').populate('employee').exec(function(err, user){
            if(err){
                console.log(err);
            }
            else{

                if(user.privilege == "admin"){
                    Admin.findById(user.admin._id).populate("managers").exec(function(err, userRole){
                        console.log(userRole);
                        res.render("employees", {suboordinates: userRole.managers});
                    });
                } else{
                    Manager.findById(user.manager._id).populate("employees").exec(function(err, userRole){
                        console.log(userRole);
                        res.render("employees", {suboordinates: userRole.employees});
                    });
                }

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
            username: req.body.username,
            privilege: req.body.privilege,
            companyName: req.user.companyName
        });
    
    var newPerson = 
    {
            photo: req.body.photo,
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
            workingStatus: req.body.workingStatus
    };

    User.register(newUser, req.body.password, function(err, newUser){
        if (err){
            console.log(err);
           return res.redirect("/employees/new")
        }

        if(req.body.privilege == "admin"){
            Admin.create(newPerson, function(err, admin){
                Manager.find({}, function(err, allManagers){
                    allManagers.forEach(function(manager){
                        admin.managersFirstName.push(manager.firstName);
                        admin.managers.push(manager);
                        admin.save();
                    })
                })
                admin.userId = newUser._id;
                admin.save();
                newUser.admin = admin;
                newUser.save();
            });
        } else if(req.body.privilege == "manager"){
            Manager.create(newPerson, function(err, manager){
                Admin.find({}, function(err, allAdmin){
                    allAdmin.forEach(function(admin){
                        if(admin.managersFirstName != manager.firstName){
                            admin.managersFirstName.push(manager.firstName);
                            admin.managers.push(manager);
                            admin.save();
                        }
                    })
                })
                Employee.find({}, function(err, allEmployees){
                    allEmployees.forEach(function(employee){
                        if(employee.reportsTo == manager.firstName){
                            manager.employeesFirstName.push(employee.firstName);
                            manager.employees.push(employee);
                            manager.userId = newUser._id;
                            manager.save();
                            newUser.manager = manager;
                            newUser.save();
                        }
                    })
                })
                Manager.find({}, function(err, allManagers){
                    allManagers.forEach(function(otherManagers){
                        if(manager.reportsTo == otherManagers.firstName){
                            otherManagers.employeesFirstName.push(manager.firstName);
                            otherManagers.emplyoyees.push(manager);
                            otherManagers.save();
                        }
                    })
                })
                Manager.find({}, function(err, allManagers){
                    allManagers.forEach(function(otherManagers){
                        if(otherManagers.reportsTo == manager.firstName){
                            let alreadySaved = false;
                            manager.employeesFirstName.forEach(function(firstName){
                                if(firstName == otherManagers.firstName) {
                                    alreadySaved = true;      
                                }
                            });
                            
                            if(!alreadySaved){
                                manager.employeesFirstName.push(otherManagers.firstName);
                                manager.emplyoyees.push(otherManagers);
                                manager.userId = newUser._id;
                                manager.save();
                                console.log("manager: " + manager);
                            }
                        }
                    })
                })
                manager.userId = newUser._id;
                manager.save();
                newUser.manager = manager;
                newUser.save();
            })


        } else{
            Employee.create(newPerson, function(err, employee){
                Manager.find({}, function(err, allManagers){
                    allManagers.forEach(function(manager){
                        if(employee.reportsTo == manager.firstName){
                            let alreadySaved = false;
                            manager.employeesFirstName.forEach(function(firstName){
                                if(firstName == employee.firstName){
                                    alreadySaved = true;
                                } 
                            })

                            if(!alreadySaved){
                                manager.employeesFirstName.push(employee.firstName);
                                manager.employees.push(employee);
                                manager.save();
                            }
                        }
                    })
                })
                employee.userId = newUser._id;
                employee.save();
                newUser.employee = employee;
                newUser.save();
            })
        }
    });
    // if(req.body.privilege == "manager"){
    //     User.findOne({}).populate("manager").exec(function(err, users){
    //         console.log(users);
    //         // Manager.findById(user.manager._id, function(err, manager){
    //         //     console.log(manager);
    //         // })
    //     })
    // }
    // Manager.findOne({firstName: req.body.firstName }, function(err, manager){
        
    //     // manager.userId = newUser._id;
    //     // manager.save();
    // })
    res.redirect("/home"); 

})

// EDIT USER ROUTE
app.get("/employees/:id/edit", function(req, res){
    User.findById(req.params.id).populate('admin').populate('manager').populate('employee').exec(function(err, user){
        if(err){
            console.log(err);
            return res.redirect("/manageUsers");
        }
        console.log(user._id);
        res.render("editPersonalInfo", {user: user[`${req.user.privilege}`], userId: user._id});
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
        reportsTo: req.body.reportsTo
    }

    User.findById(req.params.id).populate(`${req.user.privilege}`).exec(function(err, user){
        if(err){
            res.redirect("/home");
        }else{
            if(req.user.privilege == "admin"){
                Admin.findByIdAndUpdate(user.admin._id, data, function(err, admin){
                    if(err){
                        console.log(err);
                    }
                    user.admin = admin;
                    app.locals.currentUse3 = admin;
                })
            }else if(req.user.privilege == "manager") {
                Manager.findByIdAndUpdate(user.manager._id, data, function(err, manager){
                    if(err){
                        console.log(err);
                    }
                    user.manager = manager;
                    app.locals.currentUser3 = manager;
                })

            }else if(req.user.privilege == "employee") {
                Employee.findByIdAndUpdate(user.employee._id, data, function(err, employee){
                    if(err){
                        console.log(err);
                    }
                    user.employee = employee;
                    app.locals.currentUser3 = employee;
                })

            }
            res.redirect("/home");
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
    if(req.user.privilege == "admin" && req.isAuthenticated()){
        return next();
    }
    res.redirect("/home");
}

function isManagerOrAdmin(req,res, next){
    if(req.user.privilege == "manager" || req.user.privilege == "admin" && req.isAuthenticated()){
        return next();
    }
    res.redirect("/home");
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function personRole(user){
    if(user.privilege == "admin"){
        var person = Admin;
    }else if (user.privilege == "manager"){
        var person = Manager;
    } else if (user.privilege == "employee"){
        var person = Employee;
    } 
    return person;
}

// running app at local host 3000
app.listen(process.env.PORT || 3000, function(){
    console.log("listening at port 3000");
})