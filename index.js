const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
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
//User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

//excercise Schema
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.post("/api/users", (req, res) => {
  const { username } = req.body;

  const newUser = new User({ username });
  newUser.save((err, user) => {
    if (err) {
      res.json({ error: "Failed to create user" });
    } else {
      res.json({ username: user.username, _id: user._id });
    }
  });
});

// GET /api/users to get a list of all users
app.get("/api/users", (req, res) => {
  User.find({}, (err, users) => {
    if (err) {
      res.json({ error: "Failed to retrieve users" });
    } else {
      res.json(users);
    }
  });
});

// POST /api/users/:_id/exercises to add an exercise for a user
app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  let exerciseDate;
  if (date) {
    exerciseDate = new Date(date);
  } else {
    exerciseDate = new Date();
  }

  const newExercise = new Exercise({
    userId,
    description,
    duration: parseInt(duration),
    date: exerciseDate,
  });

  newExercise.save((err, exercise) => {
    if (err) {
      res.json({ error: "Failed to add exercise" });
    } else {
      res.json({
        username: userId,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
        _id: userId,
      });
    }
  });
});

// GET /api/users/:_id/logs to retrieve a user's exercise log
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Convert date strings to Date objects
  let fromDate, toDate;
  if (from) {
    fromDate = new Date(from);
  }
  if (to) {
    toDate = new Date(to);
  }

  // Build query object for date range
  let query = { userId };
  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = fromDate;
    if (toDate) query.date.$lte = toDate;
  }

  // Find exercises with query and optional limit
  Exercise.find(query)
    .limit(parseInt(limit) || undefined)
    .select("-userId")
    .exec((err, exercises) => {
      if (err) {
        res.json({ error: "Failed to retrieve log" });
      } else {
        User.findById(userId, (err, user) => {
          if (err) {
            res.json({ error: "User not found" });
          } else {
            res.json({
              username: user.username,
              count: exercises.length,
              _id: user._id,
              log: exercises.map((exercise) => ({
                description: exercise.description,
                duration: exercise.duration,
                date: exercise.date.toDateString(),
              })),
            });
          }
        });
      }
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
