const express = require("express");
const app = express();
const session = require("express-session");
const mongodb = require("mongodb");
const multer = require("multer");
const fs = require("fs");



app.use(session({
    secret:"abc@123",
    saveUninitialized:true,
    resave:false
}))

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/uploads"));
app.set("view engine","ejs");


const storage = multer.diskStorage({
    destination:(req, file, cb) => {
        cb(null,"uploads/");
    },
    filename:(req, file, cb) => {
        cb(null,`${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({storage});


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

// Singin an login

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


// home


app.get("/home", authentication, (req, res) =>{
    const { username, role } = req.session.userData;
    if(role != "admin"){
        dbinstance.collection("blogs").findOne({ username, role }).then((data) => {
            if(data && data.blogs.length > 0){
                console.log("user data found and sent to home.ejs for rendering...");
                res.render("home",{message:`Welcome ${req.session.userData.name}`,userblogs:data,dataExists:true,userRole:role});
            }else{
                console.log("Data doesn't exists for the current user...");
                res.render("home",{message:`Welcome ${req.session.userData.name}`,userblogs:data,dataExists:false,userRole:role});
            }
        }).catch((err) => {
            console.log("Error in fetching blogs data for rendering... : ",err);
        })
    }else{
        dbinstance.collection("blogs").find({}).toArray().then((data) => {
            if(data){
                console.log("All data fetched for admin to render...");
                res.render("home",{message:`Welcome ${req.session.userData.name}`,userblogs:data,dataExists:true,userRole:role,username});
            }else{
                console.log("No data exists to show for admin..");
                res.render("home",{message:`Welcome ${req.session.userData.name}`,userblogs:data,dataExists:false,userRole:role});
            }
        }).catch((err) => {
            console.log("Error in fetching data for the admin to render...",err);
        })
    }
})


app.get("/",(req,res) => {
    console.log(req.url);
    res.send("<h1>This is a trial webpage</h1>");
})


// Create-Post


app.get("/createpost", authentication, (req, res) => {
    res.render("createPost");
})

app.post("/createpost", upload.single("thumbnail"), (req, res) => {
    const { title, content } = req.body;
    const filename = req.file.filename;
    const userRole = req.session.userData.role;
    const uname = req.session.userData.username;
    const newBlog = {
        title,
        content,
        filename,
        created_at: new Date()
    };

    dbinstance.collection("blogs").findOne({ username: uname })
        .then((data) => {
            if (data) {
                dbinstance.collection("blogs").updateOne(
                    { username: uname },
                    { $push: { blogs: newBlog } }
                );
            } else {
                const newUserBlogs = {
                    username: uname,
                    role:userRole,
                    blogs: [newBlog]
                };
                dbinstance.collection("blogs").insertOne(newUserBlogs);
            }
        })
        .then(() => {
            console.log("Blog post created and added to the user's blogs array.");
            res.redirect("/home");
        })
        .catch((err) => {
            console.error("Error updating user document with new blog post:", err);
            res.redirect("/home");
        });
});


// Update-Post



app.get("/updatepost/:blogid", authentication, (req, res) => {
    const blogind = req.params.blogid;
    const username = req.session.userData.username;
    dbinstance.collection("blogs").findOne({username}).then((data) => {
        if (!data || !data.blogs || !data.blogs[blogind]) {
            console.error("Data or blog not found for update.");
            res.redirect("/home");
            return;
        }

        res.render("updatePost", { data: data.blogs[blogind], blogind });
    }).catch((err) => {
        console.error("Error in finding the blog data: ", err);
        res.redirect("/home");
    });
});

app.post("/updatepost/:blogid", upload.single("thumbnail"), (req, res) => {
    const blogId = parseInt(req.params.blogid, 10); // Convert blogId to integer
    const { title, content } = req.body;
    const username = req.session.userData.username;
    const newFilename = req.file ? req.file.filename : null; // Get the new filename if provided

    // Find the user and blog post by username
    dbinstance.collection("blogs").findOne({ username }).then((data) => {
        if (!data || !Array.isArray(data.blogs) || data.blogs.length <= blogId) {
            console.log("Blog post not found.");
            return res.redirect("/home");
        }

        // Retrieve the blog post data
        const blog = data.blogs[blogId];
        const prevFilename = blog.filename;

        // Update the blog post with the new details
        blog.title = title;
        blog.content = content;
        blog.updated_at = new Date();

        // Update the filename and delete the previous file if a new thumbnail is provided
        if (newFilename) {
            // Delete the previous file if it exists
            if (prevFilename) {
                const prevFilePath = `./uploads/${prevFilename}`;
                fs.unlink(prevFilePath, (err) => {
                    if (err) {
                        console.error("Error deleting previous photo:", err);
                    } else {
                        console.log("Previous photo deleted successfully.");
                    }
                });
            }
            // Set the new filename in the blog data
            blog.filename = newFilename;
        }

        // Update the database
        dbinstance.collection("blogs").updateOne(
            { _id: data._id, username: data.username },
            { $set: { [`blogs.${blogId}`]: blog } }
        )
        .then(() => {
            console.log("Blog post updated successfully.");
            // Redirect the user to the /home endpoint
            res.redirect("/home");
        })
        .catch((err) => {
            console.log("Error updating the blog post:", err);
            res.redirect("/home");
        });
    })
    .catch((err) => {
        console.log("Error finding the blog data:", err);
        res.redirect("/home");
    });
});



// Update-Info

app.get("/updateinfo", authentication, (req, res) => {
    const  userName = req.session.userData.username; 
    dbinstance.collection("users").findOne({username:userName}).then((data) => {
        console.log("Data found for updation..");
        res.render("updateInfo",{userData:data});
    }).catch((err) => {
        console.log("Error occurred while finding the user for updation");
    })
})

app.post("/updateinfo", (req, res) => {
    const prevuname = req.session.userData.username;
    const { username, name, password } = req.body;
    if(req.session.userData.role == "admin"){
        userRole = "admin";
    }else{
        userRole = "author";
    }
    const updatedData = {
        username,name,password,role:userRole
    }
    dbinstance.collection("users").updateOne({ username : prevuname }, { $set : updatedData}).then((data) => {
        if(data){
            console.log("User data successfully updated");
            req.session.userData.username = updatedData.username;
            req.session.userData.name = updatedData.name;
        }else{
            console.log("user not updated..");
            res.redirect("/home");
        }
    }).catch((err) => {
        console.log("Error in updating the user info");
        res.redirect("/home");
    })

    dbinstance.collection("blogs").updateOne({username:prevuname},{$set : {username: updatedData.username}}).then((data) => {
        console.log("User also updated in blogs..");
        res.redirect("/home");
    }).catch((err) => {
        console.log("Error in updating the user in the blogs db");
        res.redirect("/home");
    })
})


// Delete Post

app.get("/deletepost/:blogId/:username", (req, res) => {
    const blogind = req.params.blogId;
    const username = req.params.username;
    dbinstance.collection("blogs").findOne({username}).then((data) => {
        if(data){
            const filepath = "./uploads/" + data.blogs[blogind].filename;
            fs.unlink(filepath, (err) => {
                if (err) {
                    console.error("Error deleting previous photo:", err);
                } else {
                    console.log("Previous photo deleted successfully.");
                }
            });
            const blogtoDelete = data.blogs[blogind];
            dbinstance.collection("blogs").updateOne({username},{$pull:{blogs:blogtoDelete}}).then((data) => {
                console.log("Blog successfully deleted...");
                res.redirect("/home");
            }).catch((err) => {
                console.log("Error in deleting the blog : ",err);
                res.redirect("/home");
            })
        }else{
            console.log("User blogs not found..");
            res.redirect("/home");
        }
    }).catch((err) => {
        console.log("Error in finding the user blogs..");
        res.redirect("/home");
    })
})


// Logout

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
})

app.listen(5000, (err) => {
    if(err){
        console.log("Error in starting the port");
    }else{
        console.log("Server is listening at http://localhost:5000");
    }
})