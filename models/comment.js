var mongoose = require("mongoose");

var commentSchema = new mongoose.Schema({
    author: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            username: String
    },
    description: String,
    photo: String
})

module.exports = mongoose.model("Comment", commentSchema);