var mongoose = require("mongoose");

var AdminSchema = new mongoose.Schema({
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
    email: {type: String, unique: true},
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
    managersFirstName: [String],
    sentPerformanceReview: {type: Boolean, default: false},
    recievePerformanceReview: {type: Boolean, default: false},
    userId: String,
    managerAssessmentForms: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ManagerAssessment"
        }
    ],
    managers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Manager"
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

module.exports = mongoose.model("Admin", AdminSchema);