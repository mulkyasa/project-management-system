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

  router.get("/overview", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/overview", {
      title: "Overview",
      user: req.session.user,
      url: 'projects',
      subUrl: 'overview'
    });
  });

  router.get("/activity", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/activity", {
      title: "Activity",
      user: req.session.user,
      url: 'projects',
      subUrl: 'activity'
    });
  });

  router.get("/members", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/members/list", {
      title: "Members",
      user: req.session.user,
      url: 'projects',
      subUrl: 'members'
    });
  });

  router.get("/issues", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/issues/list", {
      title: "Issues",
      user: req.session.user,
      url: 'projects',
      subUrl: 'issues'
    });
  });

  return router;
};
