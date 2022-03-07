require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require ("md5");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

/////////////////////////DATABASE CONFIGURATION/////////////////////////
mongoose.connect("mongodb://localhost:27017/userDB");
const usersSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});
//using cipher encryption - using mongoose-encryption
//usersSchema.plugin(encrypt, {secret: process.env.ENCRYPT_KEY, encryptedFields: ["password"]});
usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

const User = new mongoose.model("User", usersSchema);
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());        //local serialization
// passport.deserializeUser(User.deserializeUser());    //local deserialization

passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page
    res.redirect('/secrets');
  });

  app.get("/auth/facebook", passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login"}),
  function(req, res) {
    // Successful authentication, redirect to secrets page
    res.redirect('/secrets');
  });

app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    // const username = req.body.username;
    // //const password = md5(req.body.password); //use to unencrypt password
    // const password = req.body.password;
    //
    // User.findOne({
    //   email: username
    // }, function(err, user) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     if (user) {
    //       bcrypt.compare(password, user.password, function(err, result) {
    //           if (result === true) {
    //             res.render("secrets");
    //           } else {
    //             console.log("Incorrect password");
    //           }
    //       });
    //     } else {
    //       console.log("No user found");
    //     }
    //   }
    // });

    const user = new User({
      username: req.body.username,
      pasword: req.body.password
    });
    //Use passport to login user and authenticate
    req.login(user, function(err){
      if (err){
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //   const newUser = new User({
    //     email: req.body.username,
    //     //password: md5(req.body.password)      //encrypt password using hash - can be decrypted using https://www.md5online.org/md5-decrypt.html
    //     password: hash
    //   });
    //   newUser.save(function(err) {
    //     if (err) {
    //       console.log(err);
    //     } else {
    //       res.render("secrets");
    //     }
    //   });
    // });

    //Use functions provided by passport-local-mongoose to register new users
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });
  });

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, users){
    if (err) {
      console.log(err);
    } else {
      if (users){
        res.render("secrets", {usersWithSecrets: users});
      }
    }
  })
})

app.get("/logout", function(req, res){
  //De-authenticate user and end the user session using Passport
  req.logout();
  res.redirect("/");
});

app.route("/submit")
  .get(function(req, res){
    //check if user is authenticated
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(function(req, res){
    const submittedSecret = req.body.secret;
    //find the current user and save the secret to their profile
    User.findById(req.user._id, function(err, user){
      if (err) {
        console.log(err);
      } else {
        if (user) {
          user.secret = submittedSecret;
          user.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });

app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
