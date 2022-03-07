require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require ("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

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
//using cipher encryption - using mongoose-encryption
//usersSchema.plugin(encrypt, {secret: process.env.ENCRYPT_KEY, encryptedFields: ["password"]});

const User = new mongoose.model("User", usersSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    const username = req.body.username;
    //const password = md5(req.body.password); //use to unencrypt password
    const password = req.body.password;

    User.findOne({
      email: username
    }, function(err, user) {
      if (err) {
        console.log(err);
      } else {
        if (user) {
          bcrypt.compare(password, user.password, function(err, result) {
              if (result === true) {
                res.render("secrets");
              } else {
                console.log("Incorrect password");
              }
          });
          // if (user.password === password) {
          //   res.render("secrets");
          // } else {
          //   console.log("Incorrect username or password");
          // }
        } else {
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
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      const newUser = new User({
        email: req.body.username,
        //password: md5(req.body.password)      //encrypt password using hash - can be decrypted using https://www.md5online.org/md5-decrypt.html
        password: hash
      });
      newUser.save(function(err) {
        if (err) {
          console.log(err);
        } else {
          res.render("secrets");
        }
      });
    });

  });






app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
