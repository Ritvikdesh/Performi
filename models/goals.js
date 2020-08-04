var mongoose = require("mongoose");

var GoalSchema = new mongoose.Schema ({
    title: String,
    dueDate: String,
    description: String,
    author: {   
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
})

module.exports = mongoose.model("Goal", GoalSchema);