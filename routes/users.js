const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = db => {
  /* GET users listing. */
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const url = req.url == '/' ? '/?page=1' : req.url;
    console.log(url);
    let sql = `SELECT userid, email, password, CONCAT(firstname,' ',lastname) AS name, position, typejob FROM users`;
    // filter users
    let result = [];
    let filterData = false;
    const {
      checkId,
      inputId,
      checkName,
      inputName,
      checkEmail,
      inputEmail,
      checkPosition,
      inputPosition,
      checkTypeJob,
      inputTypeJob
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
    if (checkPosition && inputPosition) {
      result.push(`position = '${inputPosition}'`);
      filterData = true;
    }
    if (checkTypeJob && inputTypeJob) {
      result.push(`typejob = ${inputTypeJob == 'Full Time' ? true : false}`);
      filterData = true;
    }

    if (result.length > 0) {
      sql += ` WHERE ${result.join(" AND ")}`;
    }

    sql += ` ORDER BY userid`;

    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page -1) * limit;

    db.query(sql, (err, data) => {
      if(err) res.status(500).json(err);

      const pages = Math.ceil(data.rows.length / limit);

      sql += ` LIMIT ${limit} OFFSET ${offset}`;
      console.log(sql);
      db.query(sql, (err, data) => {
        if (err) res.status(500).json(err);
        res.render("users/list", {
          user: req.session.user,
          data: data.rows,
          title: "Users",
          pages,
          page,
          url,
          query: req.query
        });
      });
    });
  });

  router.get("/add", helpers.isLoggedIn, (req, res) => {
    res.render("users/add", {
      title: "Add User"
    });
  });

  router.post("/add", helpers.isLoggedIn, (req, res) => {
    const { email, password, firstname, lastname, position, typejob } = req.body;
    const isTypeJob = typejob == "Full Time" ? true : false;
    db.query(`INSERT INTO users (email, password, firstname, lastname, position, typejob) VALUES ($1, $2, $3, $4, $5, $6)`, [email, password, firstname, lastname, position, isTypeJob], (err, data) => {
        if (err) res.status(500).json(err);
        res.redirect("/users");
      }
    );
  });

  router.get("/edit/:userid", helpers.isLoggedIn, (req, res) => {
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

  router.post("/edit/:userid", helpers.isLoggedIn, (req, res) => {
    const { firstname, lastname, email, password, position, typejob } = req.body;
    const isTypeJob = typejob == 'Full Time' ? true : false;
    const { userid } = req.params;
    if (!password) {
      sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', email = '${email}', position = '${position}', typejob = ${isTypeJob} WHERE userid = ${userid}`;
    } else {
      sql = `UPDATE users SET firstname = '${firstname}', lastname = '${lastname}', email = '${email}', password = '${password}', position = '${position}', typejob = ${isTypeJob} WHERE userid=${userid}`;
    }
    console.log(sql);
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);
      res.redirect("/users");
    });
  });

  router.get("/delete/:userid", helpers.isLoggedIn, (req, res) => {
    const { userid } = req.params;
    db.query(`DELETE FROM users WHERE userid = $1`, [userid], (err, data) => {
      if (err) res.status(500).json(err);
      res.redirect("/users");
    });
  });

  return router;
};
