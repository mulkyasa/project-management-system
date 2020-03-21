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
        data: data.rows[0]
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
        sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', position = '${position}', typejob = ${isTypeJob} WHERE email = '${user.email}'`;
      } else {
        sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', password = '${hash}', position = '${position}', typejob = ${isTypeJob} WHERE email='${user.email}'`;
      };
      db.query(sql, (err, data) => {
        if (err) res.status(500).json(err);
        res.redirect("/profile");
      });
    });
  });
  return router;
};
