var express = require("express");
var router = express.Router();

/* GET home page. */
module.exports = (db) => {
  router.get("/", function(req, res, next) {
    res.render("login");
  });

  router.post("/login", function(req, res, next) {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password], (err, data) => {
      if(err) return res.send(err);
      if(data.rows.length > 0) {
        if(data.rows[0].email == email && data.rows[0].password == password) {
          res.redirect('/projects');
        };
      };
    });
  });

  router.get('/projects', (req, res, nexst) => {
    res.render('index', { user: 'saya' });
  });

  return router;
};
