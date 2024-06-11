var router = require("express").Router();
var User = require("../models/user");
var Cart = require("../models/cart");
var Product = require("../models/product");
var Address = require("../models/address");
var async = require("async");
var passportConf = require("../config/passport");
var category = require("../models/category");
var stripe = require("stripe")(process.env.SECRET_KEY);

const shuffleProductsArray = (prod) => {
  for (let i = 0; i < prod.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [prod[i], prod[j]] = [prod[j], prod[i]];
  }

  return prod;
};

router.get("/", function (req, res, next) {
  if (req.user) {
    Product.find()
      .populate("category")
      .exec(function (err, products) {
        if (err) return next(err);
        Product.count().exec(function (err, count) {
          if (err) return next(err);
          const shuffledProducts = shuffleProductsArray(products);
          res.render("main/product-main", {
            products: shuffledProducts,
          });
        });
      });
  } else {
    res.render("main/home");
  }
});

router.get("/about", function (req, res) {
  res.render("main/about");
});

router.get("/products/:id", function (req, res, next) {
  Product.find({ category: req.params.id })
    .populate("category")
    .exec(function (err, products) {
      if (err) return next(err);
      res.render("./main/category", {
        products: products,
      });
    });
});

router.get("/product/:id", function (req, res, next) {
  Product.findById(req.params.id)
    .populate("category")
    .exec(function (err, product) {
      if (err) return next(err);
      console.log(product);

      Product.find({ category: product.category._id }).exec(function (
        err,
        similarProducts
      ) {
        if (err) return next(err);
        console.log(similarProducts);
        res.render("main/product", {
          product: product,
          similarProducts: similarProducts,
        });
      });
    });
});

router.get("/cart", passportConf.isAuthenticated, function (req, res, next) {
  Cart.findOne({ owner: req.user._id })
    .populate("items.item")
    .exec(function (err, foundCart) {
      if (err) return next(err);
      res.render("main/cart", {
        foundCart: foundCart,
        message: req.flash("remove"),
      });
    });
});

router.post("/product/:product_id", function (req, res, next) {
  Cart.findOne({ owner: req.user._id }, function (err, cart) {
    cart.items.push({
      item: req.body.product_id,
      price: parseFloat(req.body.priceValue),
      quantity: parseInt(req.body.quantity),
    });

    cart.total = (cart.total + parseFloat(req.body.priceValue)).toFixed(2);

    cart.save(function (err) {
      if (err) return next(err);
      return res.redirect("/cart");
    });
  });
});

router.post("/remove", function (req, res, next) {
  Cart.findOne({ owner: req.user._id }, function (err, foundCart) {
    foundCart.items.pull(String(req.body.item));

    foundCart.total = (foundCart.total - parseFloat(req.body.price)).toFixed(2);
    foundCart.save(function (err, found) {
      if (err) return next(err);
      req.flash("remove", "Successfully removed");
      res.redirect("/cart");
    });
  });
});

router.get(
  "/shipping-form",
  passportConf.isAuthenticated,
  function (req, res, next) {
    Cart.findOne({ owner: req.user._id })
      .populate("items.item")
      .exec(function (err, foundCart) {
        if (err) return next(err);
        res.render("./main/shipping-form.ejs", {
          foundCart: foundCart,
        });
      });
  }
);

router.post(
  "/shipping-form",
  passportConf.isAuthenticated,
  function (req, res, next) {
    Cart.findOne({ owner: req.user._id })
      .populate("items.item")
      .exec(function (err, foundCart) {
        if (err) return next(err);
        var address = new Address();

        address.fname = req.body.fname;
        address.mobile = req.body.mobile;
        address.pincode = req.body.pincode;
        address.flatno = req.body.flatno;
        address.area_colony = req.body.area_colony;
        address.landmark = req.body.landmark;
        address.town = req.body.town;
        address.save();
        res.render("./main/payment.ejs", { foundCart: foundCart });
      });
  }
);

router.get(
  "/initiatePayment",
  passportConf.isAuthenticated,
  function (req, res, next) {
    Cart.findOne({ owner: req.user._id })
      .populate("items.item")
      .exec(function (err, foundCart) {
        if (err) return next(err);
        res.render("./main/payment.ejs", {
          foundCart: foundCart,
        });
      });
  }
);

router.post("/payment", function (req, res, next) {
  async.waterfall([
    function (callback) {
      Cart.findOne({ owner: req.user._id }, function (err, cart) {
        callback(err, cart);
      });
    },
    function (cart, callback) {
      User.findOne({ _id: req.user._id }, function (err, user) {
        if (user) {
          for (var i = 0; i < cart.items.length; i++) {
            user.history.push({
              item: cart.items[i].item,
              paid: cart.items[i].price,
            });
          }
          user.save(function (err, user) {
            if (err) return next(err);
            callback(err, user);
          });
        }
      });
    },
    function (user) {
      Cart.update(
        { owner: user._id },
        { $set: { items: [], total: 0 } },
        function (err, updated) {
          if (updated) {
            res.redirect("/profile");
          }
        }
      );
    },
  ]);
});

// Implementation of Search Functionality

router.post("/", function (req, res, next) {
  var q = req.body.search_item;
  console.log(q);

  Product.find(
    { $text: { $search: q } },
    // { _id: 0, __v: 0 },
    function (err, products) {
      if (err) {
        console.log(err);
      } else {
        console.log(products);
        res.render("main/product_searched", {
          products: products,
          category: category,
          search_term: q,
        });
      }
    }
  );
});

console.log(process.env.PUBLISHABLE_KEY);
router.get("/product-checkout", function (req, res) {
  Cart.findOne({ owner: req.user._id })
    .populate("items.item")
    .exec(function (errors, cartItems) {
      if (errors) {
        console.log(errors);
      } else {
        res.render("main/payment.ejs", {
          key: process.env.PUBLISHABLE_KEY,
          cartItems: cartItems,
        });
      }
    });
});

router.post("/payment", (req, res) => {
  stripe.customers
    .create({
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
      name: "Saroj Sah",
      address: {
        line1: "123 Street Sarlahi Nepal",
        postal_code: "45802",
        city: "Sarlahi",
        state: "Province 2",
        country: "Nepal",
      },
    })
    .then((customer) => {
      return stripe.charges.create({
        amount: req.body.stripeCurrency,
        description: "Ecommerce Product Purchase",
        currency: "USD",
        customer: customer.id,
      });
    })
    .then((charge) => {
      console.log(charge);
      res.send("Success");
    })
    .catch((error) => {
      console.log(error);
    });
});

module.exports = router;
