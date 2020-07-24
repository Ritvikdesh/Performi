var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    firstName: String,
    middleName: String,
    lastName: String,
    gender: String,
    hireDate: String,
    address: String,
    city: String,
    postalCode: String,
    country: String,
    email: {type: String, unique: true, required: true},
    workPhoneNumber: String,
    mobilePhoneNumber: String,
    department: String,
    jobTitle: String,
    reportsTo: String,
    manager: String,
    workingStatus: String,
    companyName: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false}
})
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);