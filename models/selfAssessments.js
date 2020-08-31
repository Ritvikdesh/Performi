var mongoose = require("mongoose");

var selfAssessmentSchema = new mongoose.Schema({
    username: String,
    value: String,
    impact: String,
    pros: String,
    cons: String,
    favouriteProject: String
})

module.exports = mongoose.model("SelfAssessment", selfAssessmentSchema);