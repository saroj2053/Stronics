var express = require("express");
var morgan = require("morgan");
var mongoose = require("mongoose");

var ejs = require("ejs");
var ejs_mate = require("ejs-mate");
var session = require("express-session");
var cookieParser = require("cookie-parser");
var Product = require("./models/product");
var flash = require("express-flash");
var MongoStore = require("connect-mongo")(session);
var passport = require("passport");
var stripe = require("stripe")(process.env.SECRET_KEY);
var env = require("dotenv").config();

var User = require("./models/user");
var Category = require("./models/category");

var cartLength = require("./middlewares/middleware");

var app = express();

var db = process.env.MONGO_URI;

mongoose.connect(
  db,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: true,
  },
  function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Connected to database..........");
    }
  }
);

//Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: "Saroj!@#$%^",
    store: new MongoStore({ url: db, autoReconnect: true }),
  })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
  res.locals.user = req.user;
  next();
});
app.use(cartLength);

app.use(function (req, res, next) {
  Category.find({}, function (err, categories) {
    if (err) return next(err);
    res.locals.categories = categories;
    next();
  });
});

app.use(express.static(__dirname + "/public"));
app.engine("ejs", ejs_mate);
app.set("view engine", "ejs");

var mainRoutes = require("./routes/main");
var userRoutes = require("./routes/user");
var adminRoutes = require("./routes/admin");
var apiRoutes = require("./api/api");

app.use(mainRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, function (err) {
  if (err) throw err;
  console.log(`Currently Serving at Port ${PORT}`);
});
