var mongoose = require("mongoose");

var managerAssessmentSchema = new mongoose.Schema({
    username: String,
    pros: String,
    cons: String
})

module.exports = mongoose.model("ManagerAssessment", managerAssessmentSchema);