var express = require("express");
var router = express.Router();
const helpers = require("../helpers/util");

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
    const { firstname, lastname, email, password, position, typejob } = req.body;
    const isTypeJob = typejob == 'Full Time' ? true : false;
    const user = req.session.user;
    if (!password) {
      sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', position = '${position}', typejob = ${isTypeJob} WHERE email = '${user.email}'`;
    } else {
      sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', password = '${password}', position = '${position}', typejob = ${isTypeJob} WHERE email='${user.email}'`;
    }
    console.log(sql);
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);
      res.redirect("/profile");
    });
  });
  return router;
};
