require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

/////////////////////////DATABASE CONFIGURATION/////////////////////////
mongoose.connect("mongodb://localhost:27017/userDB");
const usersSchema = new mongoose.Schema({
  email: String,
  password: String
});
usersSchema.plugin(encrypt, {secret: process.env.ENCRYPT_KEY, encryptedFields: ["password"]});
const User = new mongoose.model("User", usersSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.route("/login")
.get(function(req, res) {
  res.render("login");
})
.post(function(req, res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, user){
    if (err){
      console.log(err);
    } else {
      if (user){
        if (user.password === password){
          res.render("secrets");
        } else {
          console.log("Incorrect username or password");
        }
      } else{
        console.log("No user found");
      }
    }
  });
});

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
    });
    newUser.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        res.render("secrets");
      }
    });
  });






app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
