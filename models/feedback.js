var mongoose = require("mongoose");

var FeedbackSchema = new mongoose.Schema ({
    firstName: String,
    lastName: String,
    pros: String,
    cons: String,
    sendFeedbackTo: String,
    reviewedByFirstName: String,
    reviewedByLastName: String,
    completedAt: String
})

module.exports = mongoose.model("Feedback", FeedbackSchema);