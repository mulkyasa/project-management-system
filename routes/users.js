const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = db => {
  /* GET users listing. */
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    let sql = `SELECT userid, email, CONCAT(firstname,' ',lastname) AS name, position, typejob FROM users`;
    console.log(sql);
    // filter users
    let result = [];
    let filterData = false;
    const {
      checkId,
      inputId,
      checkName,
      inputName,
      checkEmail,
      inputEmail
    } = req.query;

    if (checkId && inputId) {
      result.push(`userid = ${inputId}`);
      filterData = true;
    }
    if (checkName && inputName) {
      result.push(`firstname = '${inputName}'`);
      filterData = true;
    }
    if (checkEmail && inputEmail) {
      result.push(`email = '${inputEmail}'`);
      filterData = true;
    }
    if (filterData) {
      sql += ` WHERE ${result.join(" AND ")}`;
    }

    sql += ` ORDER BY userid`;

    db.query(sql, (err, data) => {
      const page = req.query.page || 1;
      

      if (err) res.status(500).json(err);

      db.query(sql, (err, data) => {
        if (err) res.status(500).json(err);
        res.render("users/list", {
          title: "Users",
          user: req.session.user,
          query: req.query,
          data: data.rows
        });
      });
    });
  });

  router.get("/add", helpers.isLoggedIn, (req, res, next) => {
    res.render("users/add", {
      title: "Add User"
    });
  });

  router.post("/add", helpers.isLoggedIn, (req, res, next) => {
    const { email, password, firstname, lastname, position, typejob } = req.body;
    const job = typejob == "Full Time" ? true : false;
    const sql = `INSERT INTO users (email, password, firstname, lastname, position, typejob) VALUES ('${email}', '${password}', '${firstname}', '${lastname}', '${position}', ${job})`;
    db.query(sql, (err, data) => {
        if (err) res.status(500).json(err);
        res.redirect("/users");
      }
    );
  });

  router.get("/edit/:userid", helpers.isLoggedIn, (req, res, next) => {
    const { userid } = req.params;
    db.query(`SELECT * FROM users WHERE userid = $1`, [userid], (err, data) => {
      if (err) res.status(500).json(err);
      res.render("users/edit", {
        title: "Edit Users",
        query: req.query,
        data: data.rows[0]
      });
    });
  });

  router.post("/edit/:userid", helpers.isLoggedIn, (req, res, next) => {
    const { firstname, lastname, email, password } = req.body;
    const { userid } = req.params;
    if (!password) {
      sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', email = '${email}' WHERE userid = ${userid}`;
    } else {
      sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', email = '${email}', password = '${password}' WHERE userid=${userid}`;
    }
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);
      res.redirect("/users");
    });
  });

  router.get("/delete/:userid", helpers.isLoggedIn, (req, res, next) => {
    const { userid } = req.params;
    db.query(`DELETE FROM users WHERE userid = $1`, [userid], (err, data) => {
      if (err) res.status(500).json(err);
      res.redirect("/users");
    });
  });

  return router;
};
