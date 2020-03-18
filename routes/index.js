var express = require("express");
var router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
const saltRounds = 10;

router.use(bodyParser.urlencoded({
  extended: false
}));
router.use(bodyParser.json());

function isLoggedIn(req, res, next) {
  if(req.session.user) {
    next();
  } else {
    res.redirect('/');
  };
};

/* GET home page. */
module.exports = (db) => {
  router.get("/", function(req, res, next) {
    res.render('login', { loginMessage: req.flash('loginMessage'), title: 'Sign in' });
  });

  router.post("/login", function(req, res, next) {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password], (err, data) => {
      if(err) return res.send(err);
      if(data.rows.length == 0) {
        req.flash('loginMessage', 'User not found!');
        return res.redirect('/');
      };
      if(data.rows[0].email != email && data.rows[0].password != password) {
        req.flash('loginMessage', 'User or password is wrong, please try again!');
        return res.redirect('/');
      };
      req.session.user = data.rows[0];
      res.redirect('/project');
    });
  });

  router.get('/project', isLoggedIn, (req, res, next) => {
    res.render('project/list', { title: 'Projects', user: req.session.user });
  });

  router.get('/logout', (req, res, next) => {
    req.session.destroy(function(err) {
      res.redirect('/');
    })
  });
  return router;
};
