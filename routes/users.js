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
        query: req.query,
        data: data.rows
      });
    });
  });

  router.get('/add', helpers.isLoggedIn, (req, res, next) => {
    res.render('users/add', {
      title: 'Add User'
    });
  });

  router.post('/add', helpers.isLoggedIn, (req, res, next) => {
    const {email, password, firstname, lastname} = req.body;
    db.query('INSERT INTO users (email, password, firstname, lastname) VALUES ($1, $2, $3, $4)', [email, password, firstname, lastname], (err, data) => {
      if(err) return res.send(err);
      res.redirect('/users');
    });
  });
  return router;
};
