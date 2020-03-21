var express = require("express");
var router = express.Router();
const bodyParser = require("body-parser");
const helpers = require("../helpers/util");
const bcrypt = require("bcrypt");
const saltRounds = 10;

router.use(
  bodyParser.urlencoded({
    extended: false
  })
);
router.use(bodyParser.json());

/* GET home page. */
module.exports = db => {
  router.get("/", (req, res, next) => {
    res.render("login", {
      loginMessage: req.flash("loginMessage"),
      title: "Sign in"
    });
  });

  router.post("/login", (req, res, next) => {
    const { email, password } = req.body;
    db.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
      (err, data) => {
        if (err) res.status(500).json(err);
        if (data.rows.length == 0) {
          req.flash("loginMessage", "User not found!");
          return res.redirect("/");
        }
        bcrypt.compare(password, data.rows[0].password, (err, result) => {
          if (err) res.status(500).json(err);
          if (!result) {
            req.flash(
              "loginMessage",
              "User or password is wrong, please try again!"
            );
            return res.redirect("/");
          };
          req.session.user = data.rows[0];
          res.redirect("/project");
        });
      }
    );
  });

  router.get("/project", helpers.isLoggedIn, (req, res, next) => {
    res.render("project/list", { title: "Projects", user: req.session.user });
  });

  router.get("/logout", (req, res, next) => {
    req.session.destroy((err) => {
      res.redirect("/");
    });
  });
  return router;
};
