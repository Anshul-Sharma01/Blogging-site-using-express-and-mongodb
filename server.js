const express = require("express");
const app = express();
const session = require("express-session");
const mongodb = require("mongodb");

app.use(session({
    secret:"abc@123",
    saveUninitialized:true,
    resave:false
}))

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.set("view engine","ejs");

let dbinstance;
const client = mongodb.MongoClient;
client.connect("mongodb://localhost:27017/").then((database) => {
    console.log("connected");
    dbinstance = database.db("Blogging_site");
}).catch((err) => {
    console.log("Error in connecting to the database : ",err);
})





function authentication(req, res, next){
    if(req.session.userAuthenticated){
        next();
    }else{
        res.redirect("/login");
    }
}

function authorization(req, res, next){
    if(req.session.userAuthenticated && req.session.userData.role == "admin"){
        next();
    }else{
        res.redirect("/home");
    }
}

app.get("/login", (req,res) => {
    if(req.session.userAuthenticated){
        res.redirect("/home");
    }else{
        res.render("login");
    }
})

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    dbinstance.collection("users").findOne({username, password}).then((data) => {
        if(data){
            req.session.userAuthenticated = true;
            req.session.userData = {
                username, name:data.name, role:data.role,
            }
            res.redirect("/home");
        }else{
            console.log("user not registered, redirecting to the signin page...");
            res.redirect("/signin");
        }
    }).catch((err) => {
        console.log("Error in finding the user in the database");
    })
})

app.get("/signin", (req, res) => {
    if(req.session.userAuthenticated){
        res.redirect("/home");
    }else{
        res.render("signin");
    }
})

app.post("/signin", (req, res) => {
    const { username, name, password } = req.body;
    dbinstance.collection("users").findOne({username, password}).then((data) => {
        if(data){
            const updateData =  {
                username, name, role: data.role
            }
            req.session.userAuthenticated = true;
            req.session.userData = updateData;
            console.log("User already registered, redirecting to the home page...");
            res.redirect("/home");
        }else{
            dbinstance.collection("users").insertOne({username, name, password, role:"author"}).then((data) => {
                const updateData = {
                    username, name, role:"author"
                };
                req.session.userAuthenticated = true;
                req.session.userData = updateData;
                console.log("Successfully registered..");
                res.redirect("/home");
            }).catch((err) => {
                console.log("Error in registering the user...",err);
            })
        }
    }).catch((err) => {
        console.log("Error in finding the user if it is present: ",err);
    })
})

app.get("/home", authentication, (req,res) => {
    console.log(req.session.userData);
    res.render("home",{message:`Welcome ${req.session.userData.name}`});
})

app.get("/",(req,res) => {
    console.log(req.url);
    res.send("<h1>This is a trial webpage</h1>");
})



app.listen(5000, (err) => {
    if(err){
        console.log("Error in starting the port");
    }else{
        console.log("Server is listening at http://localhost:5000");
    }
})