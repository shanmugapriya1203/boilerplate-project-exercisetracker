const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");

const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const connectionString = process.env.MONGO_URI;
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});
const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);


//POST_USER
app.post("/api/users", (req, res) => {
  const { username } = req.body;
  const user = new User({ username });

  user
    .save()
    .then((doc) => res.json({ username: doc.username, _id: doc._id }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Error registering new user" });
    });
});
//GET_USER
app.get("/api/users", (req, res) => {
  User.find({})
    .then((users) => res.json(users))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Failed to retrieve users" });
    });
});
//POST_USER_EXERCISE
app.post("/api/users/:_id/exercises", (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;
  let userData = null;
  User.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).send("User not found");
      }
      userData = user;

      const exercise = new Exercise({
        user: user._id,
        description,
        duration: parseInt(duration, 10),
        date: date ? new Date(date) : new Date(),
      });

      return exercise.save();
    })
    .then((ex) => {
      res.json({
        _id: userData._id,
        username: userData.username,
        date: ex.date.toDateString(),
        duration: ex.duration,
        description: ex.description,
      });
    })
    .catch((err) => {
      console.error("Error saving or finding user/exercise:", err);
      res.status(500).send("Database error");
    });
});

//GET_LOGS
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).send("User not found");
      }
      let query = Exercise.find({ user: userId });
      if (from || to) {
        let dateQuery = {};
        if (from) {
          dateQuery.$gte = new Date(from);
        }
        if (to) {
          dateQuery.$lte = new Date(to);
        }
        query = query.where("date").gte(dateQuery.$gte).lte(dateQuery.$lte);
      }

      if (limit) {
        query = query.limit(parseInt(limit));
      }
      query
        .exec()
        .then((exercises) => {
          const log = exercises.map((ex) => ({
            description: ex.description,
            duration: ex.duration,
            date: ex.date.toDateString(), // Format the date
          }));

          // Respond with user info and exercise log
          res.json({
            username: user.username,
            count: exercises.length,
            _id: user._id,
            log: log,
          });
        })
        .catch((err) => {
          console.error("Error finding exercises:", err);
          res.status(500).send("Error retrieving exercises");
        });
    })
    .catch((err) => {
      console.error("Error finding user:", err);
      res.status(500).send("Database error");
    });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
