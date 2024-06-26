var router = require("express").Router();
var User = require("../models/user");
var Cart = require("../models/cart");
var async = require("async");
var { check, validationResult } = require("express-validator");
var passport = require("passport");
var passportConf = require("../config/passport");

router.get("/login", function (req, res) {
  if (req.user) return res.redirect("/");
  res.render("./accounts/login", { message: req.flash("loginMessage") });
});

router.post(
  "/login",
  passport.authenticate("local-login", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.get("/profile", passportConf.isAuthenticated, function (req, res, next) {
  User.findOne({ _id: req.user._id })
    .populate("history.item")
    .exec(function (err, foundUser) {
      if (err) return next(err);

      res.render("accounts/profile", { user: foundUser });
    });
});

router.get("/signup", function (req, res) {
  res.render("./accounts/signup", {
    errors: req.flash("errors"),
  });
});

router.post(
  "/signup",
  [
    check("name", "Please add name").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  function (req, res, next) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
      let errorMessages = errors
        .array()
        .map((error) => error.msg)
        .join(", ");
      req.flash(
        "errors",
        `Wrong inputs, Please fill up the form again! ${errorMessages}`
      );
      console.log(errors.array());
      return res.redirect("/signup");
    }

    async.waterfall([
      function (callback) {
        var user = new User();

        user.profile.name = req.body.name;
        user.password = req.body.password;
        user.email = req.body.email;
        user.profile.picture = user.gravatar();

        User.findOne({ email: req.body.email }, function (err, existingUser) {
          if (existingUser) {
            req.flash(
              "errors",
              "Account with that email address already exists"
            );
            return res.redirect("/signup");
          } else {
            user.save(function (err, user) {
              if (err) return next(err);
              callback(null, user);
            });
          }
        });
      },

      function (user) {
        var cart = new Cart();
        cart.owner = user._id;
        cart.save(function (err) {
          if (err) return next(err);
          req.logIn(user, function (err) {
            if (err) return next(err);
            res.redirect("/profile");
          });
        });
      },
    ]);
  }
);

router.get("/logout", function (req, res, next) {
  req.logOut();
  res.redirect("/");
});

router.get(
  "/edit-profile",
  passportConf.isAuthenticated,
  function (req, res, next) {
    res.render("./accounts/edit-profile.ejs", {
      message: req.flash("success"),
    });
  }
);

router.post("/edit-profile", function (req, res, next) {
  User.findOne({ _id: req.user._id }, function (err, user) {
    if (err) return next(err);
    if (req.body.name) user.profile.name = req.body.name;
    if (req.body.address) user.address = req.body.address;

    user.save(function (err) {
      if (err) return next(err);
      req.flash("success", "Successfully edited your profile");
      return res.redirect("/profile");
    });
  });
});
module.exports = router;
