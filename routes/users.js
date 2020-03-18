const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const helpers = require('../helpers/util');

module.exports = (db) => {
  /* GET users listing. */
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    const sqlGet = 'SELECT * FROM users';
    db.query(sqlGet, (err, data) => {
      if(err) return res.send(err);
      res.render('users/list', {
        title: 'Users',
        user: req.session.user,
        data: data.rows
      });
      console.log(sqlGet);
    });
  });
  return router;
};
