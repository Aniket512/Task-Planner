require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.URL);

const taskSchema = new mongoose.Schema({
    title: String,
    content: String
})
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    tasks: [taskSchema]
});


userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());


app.get("/", function (req, res) {
    res.render("home");
});


app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/tasks/:userId", function (req, res) {

    if (req.isAuthenticated()) {
        const requestedUserId = req.params.userId;
        User.findOne({_id: requestedUserId}, function(err, user){
            res.render("tasks",{tasks : req.user.tasks})
        });
    }
    else {
        res.redirect("/login");
    }
});
app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
      res.render("submit");
    }
    else{
      res.redirect("/login");
    }
  });
  
app.get("/logout",function(req,res){
    req.logout(function(err) {
      if (err) { console.log(err); }
      else{
        res.redirect('/');
      }
      
    });
  });

app.get("/tasks/delete/:taskId",function(req,res){
    User.findByIdAndUpdate({'_id':req.user._id},
        { $pull: {  'tasks': { '_id': [req.params.taskId]}}},
        { new: true }, 
        function(err, data) {
            if(!err){
                res.redirect("/tasks/" + req.user._id);
            }
        } 
    )
       
});

app.get("/edit/:id",function(req,res){
    const taskId = req.params.id;
    const tasks = req.user.tasks;
    const task = tasks.find(x => taskId===(x._id).toString());
    res.render("edit",{task: task});
    
})
app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else {
            passport.authenticate("local")(req, res, function () {
                console.log(req.user);
                res.redirect("/tasks/" + req.user._id);
            });

        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/tasks/"+req.user._id);
            });
        }
    });
});

app.post("/submit",function(req,res){
    const submittedTask = {
        title: req.body.title,
        content: req.body.content
    };
    User.findById(req.user.id, function (err, foundUser) {
      if (err){
          console.log(err);
      }
      else{
        if(foundUser){
          foundUser.tasks.push(submittedTask);
          foundUser.save(function(){
            res.redirect("/tasks/" + req.user._id);
          });
        }
          
      }
  });
});

app.post("/edit/:id",function(req,res){
    const taskId = req.params.id;
    User.update({'tasks._id': taskId}, {'$set': {
        'tasks.$.title': req.body.title,
        'tasks.$.content': req.body.content
    }}, function(err){
        if(err){
            console.log(err);
        }
    });
    console.log(req.user);
    res.redirect("/tasks/"+req.user._id);
})
app.listen(3000, function () {
    console.log("Server started on port 3000");
});
