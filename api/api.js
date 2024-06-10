var router = require("express").Router();
var async = require("async");

var Category = require("../models/category");
var Product = require("../models/product");

router.post("/:name", function (req, res, next) {
  console.log("hello, world");
  async.waterfall([
    function (callback) {
      Category.findOne({ name: req.params.name }, function (err, category) {
        if (err) return next(err);
        callback(null, category);
      });
    },
    function (category, callback) {
      var product = new Product();
      product.category = category._id;
      product.name = req.body.productName;
      product.color = req.body.productColor;
      product.productMaterial = req.body.productMaterial;
      product.price = req.body.productPrice;
      product.image = req.body.productImage;
      product.description = req.body.productDesc;

      product.save();
    },
  ]);
  res.json({ message: "success" });
});

module.exports = router;
