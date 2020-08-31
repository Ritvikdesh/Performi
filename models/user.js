var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    privilege: String,
    companyName: String,
    admin:
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin"
        },
    manager: 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Manager"
        },
    employee:
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee"
        }
})
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);