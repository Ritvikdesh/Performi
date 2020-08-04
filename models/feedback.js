var mongoose = require("mongoose");

var FeedbackSchema = new mongoose.Schema ({
    firstName: String,
    lastName: String,
    pros: String,
    cons: String
})

module.exports = mongoose.model("Feedback", FeedbackSchema);