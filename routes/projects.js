const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");

module.exports = db => {
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/list", {
      title: "Projects",
      user: req.session.user,
      url: "projects"
    });
  });

  router.get("/add", helpers.isLoggedIn, (req, res, next) => {
    let sql = `SELECT * FROM users ORDER BY userid`;
    db.query(sql, (err, data) => {
      if(err) res.status(500).json(err);
      let result = data.rows.map(item => item);

      res.render("projects/add", {
        title: "Add Project",
        url: "projects",
        result
      });
    });
  });

  router.post("/add", helpers.isLoggedIn, (req, res, next) => {
    const { name, member } = req.body;
    console.log(req.body)
    if(name && member) {
      let sqlProject = `INSERT INTO projects (name) VALUES ('${name}')`;
      console.log(sqlProject);
      db.query(sqlProject, (err, data) => {
        if(err) res.status(500).json(err);
        
        let sqlMax = `SELECT MAX (projectid) FROM projects`;
        db.query(sqlMax, (err, dataMax) => {
          let resultMax = dataMax.rows[0].max;
          let sqlMember = `INSERT INTO members (userid, role, projectid) VALUES`
          if(typeof member == 'string') {
            sqlMember += ` (${member}, ${resultMax})`;
          } else {
            let members = member.map((item) => {
              return `(${item}, ${resultMax})`
            }).join(',')
            sqlMember += `${members}`
          };
          db.query(sqlMember, (err, dataSelect) => {
            res.redirect('/projects')
          });
        });
      });
    } else {
      req.flash('projectsMessage', 'Please add project name and members!');
      res.redirect('/projects/add');
    };
  });

  router.get("/edit", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/edit", {
      title: "Edit Project",
      url: "projects"
    });
  });

  router.get("/overview", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/overview", {
      title: "Overview",
      user: req.session.user,
      url: "projects",
      subUrl: "overview"
    });
  });

  router.get("/activity", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/activity", {
      title: "Activity",
      user: req.session.user,
      url: "projects",
      subUrl: "activity"
    });
  });

  router.get("/members", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/members/list", {
      title: "Members",
      user: req.session.user,
      url: "projects",
      subUrl: "members"
    });
  });

  router.get("/members/add", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/members/add", {
      title: "Add member",
      user: req.session.user,
      url: "projects",
      subUrl: "members"
    });
  });

  router.get("/members/edit", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/members/edit", {
      title: "Edit member",
      user: req.session.user,
      url: "projects",
      subUrl: "members"
    });
  });

  router.get("/issues", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/issues/list", {
      title: "Issues",
      user: req.session.user,
      url: "projects",
      subUrl: "issues"
    });
  });

  router.get("/issues/add", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/issues/add", {
      title: "Add issue",
      user: req.session.user,
      url: "projects",
      subUrl: "issues"
    });
  });

  router.get("/issues/edit", helpers.isLoggedIn, (req, res, next) => {
    res.render("projects/issues/edit", {
      title: "Edit issue",
      user: req.session.user,
      url: "projects",
      subUrl: "issues"
    });
  });

  return router;
};
