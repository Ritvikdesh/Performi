var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var ManagerSchema = new mongoose.Schema({
    photo: String,
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
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    sendFeedbackFormTo : [String],
    viewFeedback: String,
    employeesFirstName: [String],
    userId: String,
    sentPerformanceReview: {type: Boolean, default: false},
    recievePerformanceReview: {type: Boolean, default: false},
    managerAssessmentForms: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ManagerAssessment"
        }
    ],
    employees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee"
        }
    ],
    goals: [
        {   
            type: mongoose.Schema.Types.ObjectId,
            ref: "Goal"
        }
    ],
    feedbacks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Feedback"
        }
    ],
    selfAssessments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SelfAssessment"
        }
    ],
    notifications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Notification"
        }
    ]
})

module.exports = mongoose.model("Manager", ManagerSchema);