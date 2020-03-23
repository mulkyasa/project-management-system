const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");

module.exports = db => {
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    let sqlProjects = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG(users.firstname || ' ' || users.lastname, ', ') as membersname FROM projects
    JOIN members ON members.projectid = projects.projectid JOIN users ON members.userid = users.userid GROUP BY projects.projectid`;

    db.query(sqlProjects, (err, projectData) => {
      if (err) res.status(500).json(err);
      res.render("projects/list", {
        title: "Projects",
        url: "projects",
        user: req.session.user,
        data: projectData.rows
      });
    });
  });

  router.get("/add", helpers.isLoggedIn, (req, res, next) => {
    let sql = `SELECT * FROM users ORDER BY userid`;
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);
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
    if (name && member) {
      let sqlProject = `INSERT INTO projects (name) VALUES ('${name}')`;
      db.query(sqlProject, (err, data) => {
        if (err) res.status(500).json(err);

        let sqlMax = `SELECT MAX (projectid) FROM projects`;
        db.query(sqlMax, (err, dataMax) => {
          if (err) res.status(500).json(err);

          let resultMax = dataMax.rows[0].max;
          let sqlMember = `INSERT INTO members (userid, role, projectid) VALUES`;
          if (typeof member == "string") {
            sqlMember += ` (${member}, ${resultMax})`;
          } else {
            let members = member
              .map(item => {
                return `(${item}, ${resultMax})`;
              })
              .join(",");
            sqlMember += `${members}`;
          }
          db.query(sqlMember, err => {
            if (err) res.status(500).json(err);

            res.redirect("/projects");
          });
        });
      });
    } else {
      req.flash("projectsMessage", "Please add project name and members!");
      res.redirect("/projects/add");
    }
  });

  router.get("/edit/:id", helpers.isLoggedIn, (req, res, next) => {
    const id = [req.params.id];

    const sqlUsers = `SELECT userid, CONCAT(firstname, ' ', lastname) as fullname FROM users`;
    db.query(sqlUsers, (err, dataUsers) => {
      if (err) res.status(500).json(err);
      let sqlProjects = `SELECT DISTINCT projects.projectid, projects.name, members.userid, concat(users.firstname || ' ' || users.lastname) as fullname FROM projects LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid WHERE projects.projectid = $1`;
      db.query(sqlProjects, id, (err, dataProjects) => {
        if (err) res.status(500).json(err);
        res.render("projects/edit", {
          title: "Edit Project",
          url: "projects",
          projects: dataProjects.rows,
          members: dataProjects.rows.map(members => members.userid),
          users: dataUsers.rows
        });
      });
    });
  });

  router.post("/edit/:id", helpers.isLoggedIn, (req, res, next) => {
    const { name, member } = req.body;
    const { id } = req.params;
    let sqlEdit = `UPDATE projects SET name = ${name} WHERE projectid = ${id}`;
    console.log(sqlEdit);
    db.query(sqlEdit, [name, id], err => {
      if (err) res.status(500).json(err);
      let sqlDelMember = `DELETE FROM members WHERE projectid = $1`;
      db.query(sqlDelMember, [id], (err) => {
        if (err) res.status(500).json(err);
        let temp = [];
        if (typeof member == "string") {
          temp.push(`(${member}, ${id})`)
        } else {
          for (let i = 0; i < member.length; i++) {
            temp.push(`(${member[i]}, ${id})`)
          };
        };
        let sqlUpdate = `INSERT INTO members(userid, role, projectid) VALUES ${temp.join(',')}`;
        db.query(sqlUpdate, err => {
          if (err) res.status(500).json(err);
          res.redirect(`/projects`);
        });
      });
    });
  });

  router.get('/delete/:id',  (req, res, next) => {
    let deleteProject = 'DELETE FROM members WHERE projectid = $1';
    const id = [req.params.id];
    db.query(deleteProject, id, (err) => {
        if (err) throw err;
        deleteProject = 'DELETE FROM projects WHERE projectid = $1';
        db.query(deleteProject, id, (err) => {
            if (err) throw err;
            res.redirect('/projects');
        })
    });
})

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
