const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = (db) => {
  /* GET users listing. */
  router.get("/", helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
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
      inputTypeJob,
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
        let sqlOption = `SELECT option FROM users WHERE userid = ${req.session.user.userid}`;
        db.query(sqlOption, (err, optionData) => {
          if (err) res.status(500).json(err);
          res.render("users/list", {
            user: req.session.user,
            data: data.rows,
            title: "Users",
            pages,
            page,
            link,
            url: "users",
            query: req.query,
            option: optionData.rows[0].option,
          });
        });
      });
    });
  });

  router.post("/", helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
    let sqlEditOption = `UPDATE users SET option = '${JSON.stringify(
      req.body
    )}' WHERE userid = ${req.session.user.userid}`;

    db.query(sqlEditOption, (err) => {
      if (err) res.status(500).json(err);
      res.redirect("/users");
    });
  });

  router.get("/add", helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
    res.render("users/add", {
      user: req.session.user,
      title: "Add User",
      url: "users",
    });
  });

  router.post("/add", helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
    const {
      email,
      password,
      firstname,
      lastname,
      position,
      typejob,
    } = req.body;
    const isTypeJob = typejob == "Full Time" ? true : false;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) res.status(500).json(err);
      let option =
        '{"checkId":"true","checkName":"true","checkPosition":"true"}';
      let optProjects = '{"checkId":"true","checkName":"true","checkMember":"true"}';
      let optMembers = '{"checkId":"true","checkName":"true","checkPosition":"true"}';
      let optIssues = '{"checkId":"true","checkTracker":"true","checkSubject":"true","checkDescription":"true","checkStatus":"true","checkPriority":"true","checkAssignee":"true","checkStartDate":"true","checkDueDate":"true","checkEstimatedTime":"true","checkDone":"true","checkAuthor":"true","checkSpentTime":"true","checkFile":"true","checkTargetVersion":"true","checkCreatedDate":"true","checkUpdatedDate":"true","checkClosedDate":"true","checkParentTask":"true"}';
      let isAdmin = false;
      let sql = `INSERT INTO users (email, password, firstname, lastname, position, typejob, option, optionprojects, optionmembers, optionissues, isadmin) VALUES (${email}, ${hash}, ${firstname}, ${lastname}, ${position}, ${isTypeJob}, ${option}, ${optProjects}, ${optMembers}, ${optIssues}, ${isAdmin})`;
      console.log(sql)
      db.query(
        sql,
        (err) => {
          if (err) res.status(500).json(err);
          res.redirect("/users");
        }
      );
    });
  });

  router.get(
    "/edit/:userid",
    helpers.isLoggedIn,
    helpers.isAdmin,
    (req, res) => {
      const { userid } = req.params;
      db.query(
        `SELECT * FROM users WHERE userid = $1`,
        [userid],
        (err, data) => {
          if (err) res.status(500).json(err);
          res.render("users/edit", {
            user: req.session.user,
            title: "Edit Users",
            query: req.query,
            data: data.rows[0],
            url: "users",
          });
        }
      );
    }
  );

  router.post(
    "/edit/:userid",
    helpers.isLoggedIn,
    helpers.isAdmin,
    (req, res) => {
      const {
        firstname,
        lastname,
        email,
        password,
        position,
        typejob,
      } = req.body;
      const isTypeJob = typejob == "Full Time" ? true : false;
      const { userid } = req.params;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) res.status(500).json(err);
        if (!password) {
          sql = `UPDATE users SET firstname = $2, lastname = $3, email = $4, position = $5, typejob = $6 WHERE userid = $1`;
        } else {
          sql = `UPDATE users SET firstname = $2, lastname = $3, email = $4, password = $7, position = $5, typejob = $6 WHERE userid=$1`;
        }
        db.query(
          sql,
          [userid, firstname, lastname, email, position, isTypeJob, hash],
          (err, data) => {
            if (err) res.status(500).json(err);
            res.redirect("/users");
          }
        );
      });
    }
  );

  router.get(
    "/delete/:userid",
    helpers.isLoggedIn,
    helpers.isAdmin,
    (req, res) => {
      const { userid } = req.params;
      let deleteMembers = `DELETE FROM members WHERE userid = ${userid}`;
      let deleteUsers = `DELETE FROM users WHERE userid = ${userid}`;

      db.query(deleteMembers, (err) => {
        if (err) res.status(500).json(err);
        db.query(deleteUsers, (err) => {
          if (err) res.status(500).json(err);
          res.redirect("/users");
        });
      });
    }
  );

  return router;
};
