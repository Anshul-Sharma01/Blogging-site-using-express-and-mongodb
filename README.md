# Blogging-site-using-express-and-mongodb
 
--> I Have used Mongodb, Express and NodeJs in this project
--> Dependencies used : 
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "mongodb": "^6.6.0",
    "multer": "^1.4.5-lts.1",
    "nodemon": "^3.1.0" ( Used for automatic refreshing of server )


--> This site have two types of users : Author and Admin 

-Author and admin both can post newblogs (title, content, thumbnail), but author only have the access to update those posts whereas admin can update his/her posts as well as have the access to delete other authors posts.

-On the admin home page all posts along with the authors username is shown and also a button is shown to delete the post
-On the author home page only those posts are shown which belongs to the author along with the button to update those posts

## Internal Working : 
First of all I have used authentication and authorization so first time login page will be shown and if the credentials entered by the user are correct then the user is redirected to the home page and if the credentials are incorrect the user is redirected to the signin page, if the user enters the credentials which are already registered in the database on signin page then the user is redirected to the home page and no duplicate entries are created.


For server i have used NodeJs and ExpressJs, for thumbnail uploads of posts I have used multer and for dynamic rendering of the web pages i had made use of ejs dynamic engine and for the database i have used NoSql database MongoDb