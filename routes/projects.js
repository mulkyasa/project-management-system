const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");

module.exports = db => {
  /* project page (main page) */
  // main page, filter and pagination data
  router.get("/", helpers.isLoggedIn, (req, res, next) => {
    let sqlProjects = `SELECT COUNT(ID) AS TOTAL FROM (SELECT DISTINCT projects.projectid as id FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid`;
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;
    const link = req.url == "/" ? "/?page=1" : req.url;
    const {
      checkId,
      inputId,
      checkName,
      inputName,
      checkMember,
      inputMember
    } = req.query;
    let result = [];

    if (checkId && inputId) {
      result.push(`projects.projectid = ${inputId}`);
    }
    if (checkName && inputName) {
      result.push(`projects.name ILIKE '%${inputName}%'`);
    }
    if (checkMember && inputMember) {
      result.push(`members.userid = ${inputMember}`);
    }
    if (result.length > 0) {
      sqlProjects += ` WHERE ${result.join(" AND ")}`;
    }

    sqlProjects += `) AS total`;
    db.query(sqlProjects, (err, dataProjects) => {
      if (err) res.status(500).json(err);

      const total = dataProjects.rows[0].total;
      const pages = Math.ceil(total / limit);
      let sqlProjects = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG(users.firstname || ' ' || users.lastname, ', ') as membersname FROM projects
      JOIN members ON members.projectid = projects.projectid
      JOIN users ON members.userid = users.userid`;

      if (result.length > 0) {
        sqlProjects += ` WHERE ${result.join(" AND ")}`;
      }

      sqlProjects += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;

      db.query(sqlProjects, (err, projectData) => {
        if (err) res.status(500).json(err);

        let sqlUsers = `SELECT userid, CONCAT(firstname, ' ', lastname) as fullname FROM users`;
        db.query(sqlUsers, (err, usersData) => {
          if (err) res.status(500).json(err);

          res.render("projects/list", {
            title: "Projects",
            url: "projects",
            query: req.query,
            user: req.session.user,
            data: projectData.rows,
            usersData: usersData.rows,
            pages,
            page,
            link
          });
        });
      });
    });
  });

  // landing page to add project data
  router.get("/add", helpers.isLoggedIn, (req, res, next) => {
    let sql = `SELECT * FROM users ORDER BY userid`;
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);

      let result = data.rows.map(item => item);

      res.render("projects/add", {
        title: "Add Project",
        url: "projects",
        projectsMessage: req.flash("projectsMessage"),
        result
      });
    });
  });

  // to post/add project data
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
      req.flash("projectsMessage", "Please add project name and member!");
      res.redirect("/projects/add");
    }
  });

  // landing page to edit project data
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
          projectsMessage: req.flash("projectsMessage"),
          users: dataUsers.rows
        });
      });
    });
  });

  // to post edited project data
  router.post("/edit/:id", helpers.isLoggedIn, (req, res, next) => {
    const { name, member } = req.body;
    const { id } = req.params;
    let sqlEdit = `UPDATE projects SET name = '${name}' WHERE projectid = ${id}`;

    if (member && name) {
      db.query(sqlEdit, err => {
        if (err) res.status(500).json(err);

        let sqlDelMember = `DELETE FROM members WHERE projectid = $1`;
        db.query(sqlDelMember, [id], err => {
          if (err) res.status(500).json(err);

          let temp = [];
          if (typeof member == "string") {
            temp.push(`(${member}, ${id})`);
          } else {
            for (let i = 0; i < member.length; i++) {
              temp.push(`(${member[i]}, ${id})`);
            }
          }
          let sqlUpdate = `INSERT INTO members(userid, role, projectid) VALUES ${temp.join(
            ","
          )}`;
          db.query(sqlUpdate, err => {
            if (err) res.status(500).json(err);

            res.redirect(`/projects`);
          });
        });
      });
    } else {
      req.flash("projectsMessage", "Project name and member can't be empty!");
      res.redirect("/projects/edit/:id");
    }
  });

  // to delete project data
  router.get("/delete/:id", (req, res, next) => {
    let deleteProject = "DELETE FROM members WHERE projectid = $1";
    const id = [req.params.id];

    db.query(deleteProject, id, err => {
      if (err) res.status(500).json(err);

      deleteProject = "DELETE FROM projects WHERE projectid = $1";
      db.query(deleteProject, id, err => {
        if (err) res.status(500).json(err);

        res.redirect("/projects");
      });
    });
  });

  // project overview page
  router.get("/overview/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);
      res.render("projects/overview", {
        title: "Overview",
        user: req.session.user,
        url: "projects",
        subUrl: "overview",
        result: data.rows[0]
      });
    });
  });

  // project activity page
  router.get("/activity/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);
      res.render("projects/activity", {
        title: "Activity",
        user: req.session.user,
        url: "projects",
        subUrl: "activity",
        result: data.rows[0]
      });
    });
  });

  // project members page
  router.get("/members/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const {projectid} = req.params;
    const link = (req.url == `/member/${projectid}`) ? `/member/${projectid}/?page=1` : req.url;
    let page = req.query.page || 1;
    let limit = 3;
    let offset = (page - 1) * limit
    const {checkId, inputId, checkName, inputName, checkPosition, inputPosition} = req.body;
    let filter = [];

    if (checkId && inputId) {
      filter.push(`members.id = ${inputId}`)
    };
    if (checkName && inputName) {
      filter.push(`CONCAT (users.firstname, ' ', users.lastname) ILIKE '%${inputName}%'`)
    };
    if (checkPosition && inputPosition) {
      filter.push(`members.role = ${inputPosition}`)
    };

    let sql = `SELECT COUNT (member) AS total  FROM (SELECT members.userid FROM members
      JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`;

      if (filter.length > 0) {
        sql += ` AND ${filter.join(' AND ')}`;
      };
      sql += `) AS member`;

    db.query(sql, (err, count) => {
      if (err) res.status(500).json(err);

      const total = count.rows[0].total;
      const pages = Math.ceil(total / limit);
      let sqlMembers = `SELECT projects.projectid, members.id, members.role, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM members
      LEFT JOIN projects ON projects.projectid = members.projectid
      LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = $1`;

      if (filter.length > 0) {
        sql += ` AND ${filter.join(' AND ')}`;
      };
      sql +=  ` ORDER BY members.id LIMIT ${limit} OFFSET ${offset}`

      db.query(sqlMembers, [projectid], (err, membersData) => {
        if (err) res.status(500).json(err);
        let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

        db.query(sqlData, [projectid], (err, data) => {
          if (err) res.status(500).json(err);

          res.render("projects/members/list", {
            title: "Members",
            user: req.session.user,
            data: membersData.rows,
            result: data.rows[0],
            projectid,
            url: "projects",
            subUrl: "members",
            page,
            totalPage: pages,
            link
          });
        });
      });
    });
  });

  // project member addition page
  router.get(
    "/members/:projectid/add",
    helpers.isLoggedIn,
    (req, res, next) => {
      const { projectid } = req.params;
      let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

      db.query(sqlData, [projectid], (err, data) => {
        if (err) res.status(500).json(err);

        let sqlUsers = `SELECT userid, email, CONCAT(firstname, ' ', lastname) AS fullname FROM users
        WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = $1)`;
        db.query(sqlUsers, [projectid], (err, usersData) => {
          res.render("projects/members/add", {
            title: "Add member",
            user: req.session.user,
            url: "projects",
            subUrl: "members",
            usersData: usersData.rows,
            result: data.rows[0]
          });
        });
      });
    }
  );

  // to post the addition of project members
  router.post("/members/:projectid/add", helpers.isLoggedIn, (req, res, next) => {
    const {projectid} = req.params;
    let {member, position} = req.body;
    let sqlMembers = `INSERT INTO members (userid, role, projectid) VALUES ($1, $2, $3)`;

    db.query(sqlMembers, [member, position, projectid], (err) => {
      if (err) res.status(500).json(err);
      res.redirect(`/projects/members/${projectid}`);
    });
  });

  router.get(
    "/members/:projectid/edit/:memberid",
    helpers.isLoggedIn,
    (req, res, next) => {
      const { projectid, memberid } = req.params;
      let sqlData = `SELECT * FROM projects WHERE projectid = $1`;
      db.query(sqlData, [projectid], (err, data) => {
        if (err) res.status(500).json(err);

        let sqlUsers = `SELECT CONCAT(users.firstname, ' ' ,users.lastname) AS fullname, members.role, members.id FROM members
        LEFT JOIN users ON users.userid = members.userid
        LEFT JOIN projects ON projects.projectid = members.projectid WHERE projects.projectid = $1 AND id = $2`;
        db.query(sqlUsers, [projectid, memberid], (err, usersData) => {
          if (err) res.status(500).json(err);

          res.render("projects/members/edit", {
            title: "Edit member",
            user: req.session.user,
            url: "projects",
            subUrl: "members",
            result: data.rows[0],
            usersData: usersData.rows[0]
          });
        });
      });
    }
  );

  router.post(
    "/members/:projectid/edit/:memberid",
    helpers.isLoggedIn,
    (req, res, next) => {
      const {projectid, memberid} = req.params;
      const {role} = req.body;
      console.log(req.body)
      let sqlEdit = `UPDATE members SET role = $1 WHERE id = $2`

      db.query(sqlEdit, [role, memberid], (err) => {
        if (err) res.status(500).json(err);

        res.redirect(`/projects/members/${projectid}`)
      });
    }
  );

  router.get(
    '/members/:projectid/delete/:memberid',
    helpers.isLoggedIn,
    (req, res, next) => {
      const {projectid, memberid} = req.params;

      let sqlDelete = `DELETE FROM members WHERE projectid = $1 AND id = $2`
      db.query(sqlDelete, [projectid, memberid], err => {
        if (err) res.status(500).json(err)
        res.redirect(`/projects/members/${projectid}`)
      });
    }
  );

  router.get("/issues/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);
      res.render("projects/issues/list", {
        title: "Issues",
        user: req.session.user,
        url: "projects",
        subUrl: "issues",
        result: data.rows[0]
      });
    });
  });

  router.get("/issues/:projectid/add", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);

      let sqlUsers = `SELECT userid, CONCAT(firstname,' ',lastname) AS fullname FROM users
      WHERE userid IN (SELECT users.userid FROM members INNER JOIN users ON users.userid = members.userid WHERE members.projectid = $1)`;

      db.query(sqlUsers, [projectid], (err, usersData) => {
        if (err) res.status(500).json(err);

        res.render("projects/issues/add", {
          title: "Add Issue",
          user: req.session.user,
          url: "projects",
          subUrl: "issues",
          result: data.rows[0],
          usersData: usersData.rows
        });
      });
    });
  });

  router.post("/issues/:projectid/add", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);

      let sqlUsers = `SELECT userid, CONCAT(firstname,' ',lastname) AS fullname FROM users
      WHERE userid IN (SELECT users.userid FROM members INNER JOIN users ON users.userid = members.userid WHERE members.projectid = $1)`;

      db.query(sqlUsers, [projectid], (err, usersData) => {
        if (err) res.status(500).json(err);

        res.render("projects/issues/add", {
          title: "Add Issue",
          user: req.session.user,
          url: "projects",
          subUrl: "issues",
          result: data.rows[0],
          usersData: usersData.rows
        });
      });
    });
  });

  router.get(
    "/issues/:projectid/edit",
    helpers.isLoggedIn,
    (req, res, next) => {
      const { projectid } = req.params;
      let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

      db.query(sqlData, [projectid], (err, data) => {
        if (err) res.status(500).json(err);
        res.render("projects/issues/edit", {
          title: "Edit Issue",
          user: req.session.user,
          url: "projects",
          subUrl: "issues",
          result: data.rows[0]
        });
      });
    }
  );

  return router;
};
