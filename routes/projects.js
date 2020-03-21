const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");

module.exports = db => {
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/list", {
      title: "Projects",
      user: req.session.user,
      url: 'projects'
    });
  });

  router.get('/add', helpers.isLoggedIn, (req, res, next) => {
    res.render('projects/add', {
      title: 'Add Project',
      url: 'projects'
    });
  });

  router.get('/edit', helpers.isLoggedIn, (req, res, next) => {
    res.render('projects/edit', {
      title: 'Edit Project',
      url: 'projects'
    });
  });

  return router;
};
