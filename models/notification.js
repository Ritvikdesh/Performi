var mongoose = require("mongoose");

var notificationSchema = new mongoose.Schema({
    username: String,
    message: String,
    url: String,
    selfAssessment: {type: Boolean, default: false},
    managerAssessment: {type: Boolean, default: false},
    managerReviewed: {type: Boolean, default: false},
    feedback: {type: Boolean, default: false},
    isRead: {type: Boolean, default: false}
})

module.exports = mongoose.model("Notification", notificationSchema);