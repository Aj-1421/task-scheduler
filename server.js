const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const { createClient } = require("redis");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();

// ✅ Serve frontend files
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(cors());

// ✅ MongoDB Atlas connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

// ✅ Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL,
  username: process.env.REDIS_USER || "default",
  password: process.env.REDIS_PASS
});

redisClient.on("error", (err) => console.error("❌ Redis error:", err));

(async () => {
  try {
    await redisClient.connect();
    console.log("✅ Connected to Redis");
  } catch (err) {
    console.error("❌ Failed to connect Redis:", err);
  }
})();

// ✅ Nodemailer transporter (SendGrid)
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey",              // this must be literally the word "apikey"
    pass: process.env.SENDGRID_API_KEY
  }
});


// ✅ Schemas
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  dob: Date,
  username: { type: String, unique: true },
  password: String,
  email: { type: String, unique: true }
});

const taskSchema = new mongoose.Schema({
  name: String,
  dateTime: Date,
  userId: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

// ----------- ROOT TEST -----------
app.get("/", (req, res) => {
  res.json({ message: "🚀 API is running with MongoDB Atlas + Redis..." });
});

// ----------- SIGNUP -----------
app.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, dob, username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ firstName, lastName, dob, username, password: hashedPassword, email });
    await newUser.save();

    res.json({ message: "✅ User registered successfully!" });
  } catch (err) {
    console.error("❌ Signup Error:", err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// ----------- SIGNIN -----------
app.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(401).json({ message: "❌ Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "❌ Invalid credentials" });

    res.json({
      message: "✅ Signin successful!",
      userId: user._id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error("❌ Signin Error:", err);
    res.status(500).json({ message: "Signin failed" });
  }
});

// ----------- ADD TASK -----------
app.post("/tasks", async (req, res) => {
  try {
    const { name, dateTime, userId } = req.body;

    const newTask = new Task({ name, dateTime, userId });
    await newTask.save();

    const user = await User.findById(userId);
    if (user?.email) {
      // Send immediate email
      await transporter.sendMail({
        from: `"Task Scheduler" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: "Task Created",
        text: `✅ Your task "${name}" has been scheduled at ${dateTime}.`
      });

      // Reminder 30 mins before
      const reminderTime = new Date(new Date(dateTime).getTime() - 30 * 60 * 1000);
      const delay = reminderTime.getTime() - Date.now();

      if (delay > 0) {
        setTimeout(async () => {
          try {
            await transporter.sendMail({
              from: `"Task Scheduler" <${process.env.GMAIL_USER}>`,
              to: user.email,
              subject: "⏰ Task Reminder",
              text: `Reminder: Your task "${name}" is scheduled at ${dateTime}.`
            });
            console.log(`📧 Reminder sent to ${user.email}`);
          } catch (mailErr) {
            console.error("❌ Reminder Email Error:", mailErr);
          }
        }, delay);
      }
    }

    res.json({ message: "✅ Task added successfully!" });
  } catch (err) {
    console.error("❌ Task Insert Error:", err);
    res.status(500).json({ message: "Insert failed" });
  }
});

// ----------- GET TASKS -----------
app.get("/tasks/:userId", async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (err) {
    console.error("❌ Task Fetch Error:", err);
    res.status(500).json({ message: "Database query failed" });
  }
});

// ----------- OTP SEND -----------
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await redisClient.setEx(`otp:${email}`, 300, otp);

    await transporter.sendMail({
      from: `"Task Scheduler" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`
    });

    res.json({ message: "✅ OTP sent to email!" });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ----------- OTP VERIFY -----------
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

  try {
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (storedOtp === otp) {
      await redisClient.del(`otp:${email}`);
      res.json({ message: "✅ OTP verified successfully!" });
    } else {
      res.status(400).json({ message: "❌ Invalid or expired OTP" });
    }
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

// ----------- START SERVER -----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
