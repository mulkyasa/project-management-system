const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = db => {
  /* GET users listing. */
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const link = req.url == "/" ? "/?page=1" : req.url;
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;
    let sql = `SELECT userid, email, password, CONCAT(firstname,' ',lastname) AS name, position, typejob FROM users`;
    // filter users
    let result = [];
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
      result.push(`typejob = ${inputTypeJob == "Full Time" ? true : false}`);
      filterData = true;
    }

    if (result.length > 0) {
      sql += ` WHERE ${result.join(" AND ")}`;
    }

    sql += ` ORDER BY userid`;

    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);

      const pages = Math.ceil(data.rows.length / limit);

      sql += ` LIMIT ${limit} OFFSET ${offset}`;
      db.query(sql, (err, data) => {
        if (err) res.status(500).json(err);
        res.render("users/list", {
          user: req.session.user,
          data: data.rows,
          title: "Users",
          pages,
          page,
          link,
          url: 'users',
          query: req.query
        });
      });
    });
  });

  router.get("/add", helpers.isLoggedIn, (req, res) => {
    res.render("users/add", {
      title: "Add User",
      url: 'users'
    });
  });

  router.post("/add", helpers.isLoggedIn, (req, res) => {
    const {
      email,
      password,
      firstname,
      lastname,
      position,
      typejob
    } = req.body;
    const isTypeJob = typejob == "Full Time" ? true : false;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) res.status(500).json(err);
      db.query(
        `INSERT INTO users (email, password, firstname, lastname, position, typejob) VALUES ($1, $2, $3, $4, $5, $6)`,
        [email, hash, firstname, lastname, position, isTypeJob],
        (err, data) => {
          if (err) res.status(500).json(err);
          res.redirect("/users");
        }
      );
    });
  });

  router.get("/edit/:userid", helpers.isLoggedIn, (req, res) => {
    const { userid } = req.params;
    db.query(`SELECT * FROM users WHERE userid = $1`, [userid], (err, data) => {
      if (err) res.status(500).json(err);
      res.render("users/edit", {
        title: "Edit Users",
        query: req.query,
        data: data.rows[0],
        url: 'users',
      });
    });
  });

  router.post("/edit/:userid", helpers.isLoggedIn, (req, res) => {
    const {
      firstname,
      lastname,
      email,
      password,
      position,
      typejob
    } = req.body;
    const isTypeJob = typejob == "Full Time" ? true : false;
    const { userid } = req.params;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) res.status(500).json(err);
      if (!password) {
        sql = `UPDATE users SET firstname = $2, lastname = $3, email = $4, position = $5, typejob = $6 WHERE userid = $1`;
      } else {
        sql = `UPDATE users SET firstname = $2, lastname = $3, email = $4, password = $7, position = $5, typejob = $6 WHERE userid=$1`;
      };
      db.query(sql, [userid, firstname, lastname, email, position, isTypeJob, hash], (err, data) => {
        if (err) res.status(500).json(err);
        res.redirect("/users");
      });
    });
  });

  router.get("/delete/:userid", helpers.isLoggedIn, (req, res) => {
    const { userid } = req.params;
    let result = 'Are you sure you want to delete?';

    if (result) {
      db.query(`DELETE FROM users, me WHERE userid = $1`, [userid], (err, data) => {
        if (err) res.status(500).json(err);
        res.redirect("/users");
      });
    };
    res.redirect('/users')
  });

  return router;
};
