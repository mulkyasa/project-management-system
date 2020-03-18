var express = require("express");
var router = express.Router();

module.exports = (db) => {
  /* GET users listing. */
  router.get("/", (req, res, next) => {
    const sqlGet = 'SELECT * FROM users';
    db.query(sqlGet, (err, data) => {
      if(err) return res.send(err);
      console.log(data);
      res.render('users/list', {
        title: 'Users',
        data: data.rows
      });
    });
  });
  return router;
};
