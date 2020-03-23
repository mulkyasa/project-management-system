var express = require("express");
var router = express.Router();
const helpers = require("../helpers/util");
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = db => {
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const user = req.session.user;
    const sql = `SELECT * FROM users WHERE email = '${user.email}'`;
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);
      res.render("profile/list", {
        title: "Profile",
        data: data.rows[0],
        url: 'profile'
      });
    });
  });

  router.post("/", helpers.isLoggedIn, (req, res) => {
    const {
      firstname,
      lastname,
      email,
      password,
      position,
      typejob
    } = req.body;
    const isTypeJob = typejob == "Full Time" ? true : false;
    const user = req.session.user;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) res.status(500).json(err);
      if (!password) {
        sql = `UPDATE users SET firstname = $1, lastname = $2, position = $3, typejob = $4 WHERE email = $5`;
      } else {
        sql = `UPDATE users SET firstname = $1, lastname = $2, password = $6, position = $3, typejob = $4 WHERE email = $5`;
      };
      db.query(sql, [firstname, lastname, position, isTypeJob, user.email, hash], (err, data) => {
        if (err) res.status(500).json(err);
        res.redirect("/profile");
      });
    });
  });

  return router;

};
