var mongoose = require("mongoose");

var GoalSchema = new mongoose.Schema ({
    title: String,
    dueDate: String,
    description: String
})

module.exports = mongoose.model("Goal", GoalSchema);