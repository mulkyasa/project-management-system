const express = require("express");
const router = express.Router();
const helpers = require("../helpers/util");
const path = require("path");
const moment = require("moment");

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

          let sqlOption = `SELECT optionprojects FROM users WHERE userid = ${req.session.user.userid}`;
          db.query(sqlOption, (err, optionData) => {
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
              link,
              option: optionData.rows[0].optionprojects
            });
          });
        });
      });
    });
  });

  router.post("/option", helpers.isLoggedIn, (req, res) => {
    let sqlEditOption = `UPDATE users SET optionprojects = '${JSON.stringify(
      req.body
    )}' WHERE userid = ${req.session.user.userid}`;

    db.query(sqlEditOption, err => {
      if (err) res.status(500).json(err);
      res.redirect("/projects");
    });
  });

  // landing page to add project data
  router.get("/add", helpers.isLoggedIn, (req, res, next) => {
    let sql = `SELECT * FROM users ORDER BY userid`;
    db.query(sql, (err, data) => {
      if (err) res.status(500).json(err);

      let result = data.rows.map(item => item);

      res.render("projects/add", {
        user: req.session.user,
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
          user: req.session.user,
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
  router.get("/delete/:id", helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
    const id = [req.params.id];
    let deleteProject = `DELETE FROM members WHERE projectid = ${id};
    DELETE FROM projects WHERE projectid = ${id};
    DELETE FROM issues WHERE projectid = ${id};`;
    
    db.query(deleteProject, err => {
      if (err) res.status(500).json(err);

      res.redirect("/projects");
    });
  });

  // project overview page
  router.get("/overview/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

    db.query(sqlData, [projectid], (err, data) => {
      if (err) res.status(500).json(err);

      let sqlIssues = `SELECT * FROM issues WHERE projectid = $1`;
      
      db.query(sqlIssues, [projectid], (err, issuesData) => {
        if (err) res.status(500).json(err);
        let bugOpen = 0;
        let bugTotal = 0;
        let featureOpen = 0;
        let featureTotal = 0;
        let supportOpen = 0;
        let supportTotal = 0;

        issuesData.rows.forEach((item) => {
          if (item.tracker == 'Bug' && item.status !== "Closed") {
            bugOpen += 1;
          };
          if (item.tracker == 'Bug') {
            bugTotal += 1;
          };
        });
  
        issuesData.rows.forEach((item) => {
          if (item.tracker == 'Feature' && item.status !== "Closed") {
            featureOpen += 1;
          };
          if (item.tracker == 'Feature') {
            featureTotal += 1;
          };
        });
  
        issuesData.rows.forEach((item) => {
          if (item.tracker == 'Support' && item.status !== "Closed") {
            supportOpen += 1;
          };
          if (item.tracker == 'Support') {
            supportTotal += 1;
          };
        });

        let sqlMembers = `SELECT userid, position, CONCAT(firstname,' ',lastname) AS fullname FROM users
        WHERE userid  IN (SELECT users.userid FROM members INNER JOIN users ON users.userid = members.userid WHERE members.projectid = $1)`;

        db.query(sqlMembers, [projectid], (err, membersData) => {
          if (err) res.status(500).json(err);

          res.render("projects/overview", {
            title: "Overview",
            user: req.session.user,
            url: "projects",
            subUrl: "overview",
            result: data.rows[0],
            issuesData: issuesData.rows,
            membersData: membersData.rows,
            bugOpen,
            bugTotal,
            featureOpen,
            featureTotal,
            supportOpen,
            supportTotal
          });
        });
      });
    });
  });

  // project activity page
  router.get("/activity/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sqlActivity = `SELECT activityid, (time AT TIME ZONE 'Asia/Jakarta' AT TIME ZONE 'asia/jakarta')::DATE dateactivity, (time AT TIME ZONE 'Asia/Jakarta' AT time zone 'asia/jakarta')::time timeactivity, title, description, CONCAT(users.firstname, ' ', users.lastname) AS fullname FROM activity
    INNER JOIN users ON activity.author = users.userid
    WHERE projectid = $1 ORDER BY activityid DESC`;
    let sqlProjectName = `SELECT DISTINCT members.projectid, projects.name projectname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) WHERE projectid = $1`;

    function convertDateTerm(date) {
      date = moment(date).format('YYYY-MM-DD')
      const today = moment().format('YYYY-MM-DD')
      const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");
      if (date == today) {
        return "Today";
      } else if (date == yesterday) {
        return "Yesterday";
      }
      return moment(date).format("MMMM Do, YYYY")
    };

    db.query(sqlActivity, [projectid], (err, response) => {
      if (err) res.status(500).json(err);
      db.query(sqlProjectName, [projectid], (err, result) => {
        if (err) res.status(500).json(err);
        let dataProjects = result.rows;
        let dataActivity = response.rows;
        dataActivity = dataActivity.map(data => {
          data.dateactivity = moment(data.dateactivity).format('YYYY-MM-DD');
          data.timeactivity = moment(data.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss');
          return data;
        });

        let dateonly = dataActivity.map(data => data.dateactivity)
        dateunix = dateonly.filter((date, index, arr) => {
          return arr.indexOf(date) == index
        });

        let activitydate = dateunix.map(date => {
          let dataindate = dataActivity.filter(item => item.dateactivity == date);
          return {
            date: convertDateTerm(date),
            data: dataindate
          };
        });
        
        projectname = dataProjects.map(data => data.projectname);
        console.log(activitydate)
        let sqlProjects = `SELECT * FROM projects WHERE projectid = $1`;
        db.query(sqlProjects, [projectid], (err, dataProjects) => {
          if (err) res.status(500).json(err);
          res.render("projects/activity", {
            title: "Activity",
            user: req.session.user,
            url: "projects",
            subUrl: "activity",
            projectid,
            moment,
            activitydate,
            result: dataProjects.rows[0]
          });
        });
      });
    });
  });

  // project members page
  router.get("/members/:projectid", helpers.isLoggedIn, (req, res, next) => {
    const { projectid } = req.params;
    let sql = `SELECT COUNT(member) AS total  FROM (SELECT members.userid FROM members
      JOIN users ON members.userid = users.userid WHERE members.projectid = $1`;
    const link =
      (req.url == `/members/${projectid}`
        ? `/members/${projectid}/?page=1`
        : req.url);
    let page = req.query.page || 1;
    let limit = 3;
    let offset = (page - 1) * limit;
    const {
      checkId,
      inputId,
      checkName,
      inputName,
      checkPosition,
      inputPosition
    } = req.query;
    let filter = [];

    if (checkId && inputId) {
      filter.push(`members.id = ${inputId}`);
    }
    if (checkName && inputName) {
      filter.push(
        `CONCAT (users.firstname, ' ', users.lastname) ILIKE '%${inputName}%'`
      );
    }
    if (checkPosition && inputPosition) {
      filter.push(`members.role = '${inputPosition}'`);
    }

    if (filter.length > 0) {
      sql += ` AND ${filter.join(" AND ")}`;
    }
    sql += `) AS member`;

    db.query(sql, [projectid], (err, count) => {
      if (err) res.status(500).json(err);

      const total = count.rows[0].total;
      const pages = Math.ceil(total / limit);
      let sql = `SELECT projects.projectid, members.id, members.role, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM members
      LEFT JOIN projects ON projects.projectid = members.projectid
      LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = $1`;

      if (filter.length > 0) {
        sql += ` AND ${filter.join(" AND ")}`;
      }
      sql += ` ORDER BY members.id LIMIT ${limit} OFFSET ${offset}`;

      db.query(sql, [projectid], (err, membersData) => {
        if (err) res.status(500).json(err);
        let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

        db.query(sqlData, [projectid], (err, data) => {
          if (err) res.status(500).json(err);
          let sqlOption = `SELECT optionmembers FROM users WHERE userid = ${req.session.user.userid}`;

          db.query(sqlOption, (err, optionData) => {
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
              link,
              option: optionData.rows[0].optionmembers
            });
          });
        });
      });
    });
  });

  router.post("/members/:projectid", helpers.isLoggedIn, (req, res) => {
    const {projectid} = req.params;
    let sqlEditOption = `UPDATE users SET optionmembers = '${JSON.stringify(
      req.body
    )}' WHERE userid = ${req.session.user.userid}`;

    db.query(sqlEditOption, err => {
      if (err) res.status(500).json(err);
      res.redirect(`/projects/members/${projectid}`);
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
  router.post(
    "/members/:projectid/add",
    helpers.isLoggedIn,
    (req, res, next) => {
      const { projectid } = req.params;
      let { member, position } = req.body;
      let sqlMembers = `INSERT INTO members (userid, role, projectid) VALUES ($1, $2, $3)`;

      db.query(sqlMembers, [member, position, projectid], err => {
        if (err) res.status(500).json(err);
        res.redirect(`/projects/members/${projectid}`);
      });
    }
  );

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
      const { projectid, memberid } = req.params;
      const { role } = req.body;
      let sqlEdit = `UPDATE members SET role = $1 WHERE id = $2`;

      db.query(sqlEdit, [role, memberid], err => {
        if (err) res.status(500).json(err);

        res.redirect(`/projects/members/${projectid}`);
      });
    }
  );

  router.get(
    "/members/:projectid/delete/:memberid",
    helpers.isLoggedIn,
    helpers.isAdmin,
    (req, res, next) => {
      const { projectid, memberid } = req.params;

      let sqlDelete = `DELETE FROM members WHERE projectid = $1 AND id = $2`;
      db.query(sqlDelete, [projectid, memberid], err => {
        if (err) res.status(500).json(err);

        res.redirect(`/projects/members/${projectid}`);
      });
    }
  );

  router.get("/issues/:projectid", helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
    const { projectid } = req.params;
    let sqlIssues = `SELECT COUNT(total) AS totaldata FROM (SELECT i1.*, users.userid, CONCAT(users.firstname, ' ', users.lastname) AS fullname, CONCAT(u2.firstname, ' ', u2.lastname) AS author FROM issues i1 
    INNER JOIN users ON  users.userid = i1.assignee INNER JOIN users u2 ON i1.author = u2.userid  WHERE projectid = 21`;
    const link = (req.url == `/issues/${projectid}` ? `/issues/${projectid}/?page=1` : req.url);
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;
    const {
      checkId,
      inputId,
      checkSubject,
      inputSubject,
      checkTracker,
      inputTracker
    } = req.query;
    let result = [];

    if (checkId && inputId) {
      result.push(`issueid = ${inputId}`);
    };
    if (checkSubject && inputSubject) {
      result.push(`subject ILIKE '%${inputSubject}%'`);
    };
    if (checkTracker && inputTracker) {
      result.push(`tracker = '${inputTracker}'`)
    };
    if (result.length > 0) {
      sqlIssues += ` AND ${result.join(' AND ')}`;
    };

    sqlIssues += `) AS total`;
    db.query(sqlIssues, (err, totalIssues) => {
      if (err) res.status(500).json(err);
      const total = totalIssues.rows[0].totaldata;
      const pages = Math.ceil(total / limit);

      let sqlIssues = `SELECT i1.*, users.userid, CONCAT(users.firstname, ' ', users.lastname) AS fullname, CONCAT(u2.firstname, ' ', u2.lastname) AS author, i1.subject AS issuename FROM issues i1
      LEFT JOIN users ON  users.userid = i1.assignee LEFT JOIN users u2 ON i1.author = u2.userid  WHERE projectid = $1`;

      if (result.length > 0) {
        sqlIssues += ` AND ${result.join(' AND ')}`;
      };
      sqlIssues += ` LIMIT ${limit} OFFSET ${offset}`;
      db.query(sqlIssues, [projectid], (err, issuesData) => {
        if (err) res.status(500).json(err);
        let issuesResult = issuesData.rows.map(item => {
          item.startdate = moment(item.startdate).format('LL');
          item.duedate = moment(item.duedate).format('LL');
          item.createddate = moment(item.createddate).format('LL');
          return item;
        });
        let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

        db.query(sqlData, [projectid], (err, data) => {
          if (err) res.status(500).json(err);
          let sqlOption = `SELECT optionissues FROM users WHERE userid = ${req.session.user.userid}`;

          db.query(sqlOption, (err, optionData) => {
            if (err) res.status(500).json(err);

            res.render("projects/issues/list", {
              title: "Issues",
              user: req.session.user,
              url: "projects",
              subUrl: "issues",
              result: data.rows[0],
              issuesResult,
              moment,
              projectid,
              page,
              pages,
              link,
              option: optionData.rows[0].optionissues
            });
          });
        });
      });
    });
  });

  router.post("/issues/:projectid", helpers.isLoggedIn, (req, res) => {
    const {projectid} = req.params;
    let sqlEditOption = `UPDATE users SET optionissues = '${JSON.stringify(
      req.body
    )}' WHERE userid = ${req.session.user.userid}`;

    db.query(sqlEditOption, err => {
      if (err) res.status(500).json(err);
      res.redirect(`/projects/issues/${projectid}`);
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
          projectid,
          result: data.rows[0],
          usersData: usersData.rows
        });
      });
    });
  });

  router.post(
    "/issues/:projectid/add",
    helpers.isLoggedIn,
    (req, res, next) => {
      const { projectid } = req.params;
      let sqlData = `SELECT * FROM projects WHERE projectid = $1`;

      db.query(sqlData, [projectid], (err, data) => {
        if (err) res.status(500).json(err);

        const authorid = req.session.user.userid;
        const {
          tracker,
          subject,
          description,
          status,
          priority,
          assignee,
          startdate,
          duedate,
          estimatedtime,
          done,
          file
        } = req.body;
        let sqlIssue = `INSERT INTO issues (projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`;
        const issueData = [
          projectid,
          tracker,
          subject,
          description,
          status,
          priority,
          assignee,
          startdate,
          duedate,
          estimatedtime,
          done,
          file,
          authorid
        ];
        if (req.files) {
          let file = req.files.file;
          let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-");

          file.mv(path.join(__dirname, "..", "public", "upload", fileName), err => {
              if (err) res.status(500).json(err);

              issueData[11] = `/upload/${fileName}`;
              db.query(sqlIssue, issueData, err => {
                if (err) res.status(500).json(err);

                res.redirect(`/projects/issues/${projectid}`);
              });
            }
          );
        } else {
          db.query(sqlIssue, issueData, err => {
            if (err) res.status(500).json(err);

            res.redirect(`/projects/issues/${projectid}`);
          });
        }
        console.log(req.files);
      });
    }
  );

  router.get(
    "/issues/:projectid/edit/:issueid",
    helpers.isLoggedIn,
    (req, res, next) => {
      const { projectid, issueid } = req.params;
      let sqlIssues = `SELECT issues.*, projects.name FROM issues
      LEFT JOIN projects ON projects.projectid = issues.projectid WHERE issueid = $1`;

      db.query(sqlIssues, [issueid], (err, data) => {
        if (err) res.status(500).json(err);
        let sqlMembers = `SELECT userid, CONCAT(firstname,' ',lastname) AS fullname FROM users WHERE userid
        IN (SELECT users.userid FROM members INNER JOIN users ON users.userid = members.userid WHERE members.projectid = $1)`

        db.query(sqlMembers, [projectid], (err, membersData) => {
          if (err) res.status(500).json(err);
          let sqlTask = `SELECT issueid, subject, tracker FROM issues GROUP BY issueid HAVING projectid = $1`;

          db.query(sqlTask, [projectid], (err, tasks) => {
            if (err) res.status(500).json(err);
            res.render("projects/issues/edit", {
              title: "Edit Issue",
              user: req.session.user,
              url: "projects",
              subUrl: "issues",
              result: data.rows[0],
              resultMembers: membersData.rows,
              tasks: tasks.rows,
              moment
            });
          });
        });
      });
    }
  );

  router.post("/issues/:projectid/edit/:issueid", helpers.isLoggedIn, (req, res, next) => {
    const {projectid, issueid} = req.params;
    const userid = req.session.user.userid;
    const {
      tracker,
      subject,
      description,
      status,
      priority,
      assignee,
      duedate,
      done,
      file,
      spenttime,
      targetversion,
      parenttask
    } = req.body;
    let sqlIssues = `UPDATE issues SET
    tracker = $1,
    subject = $2,
    description = $3,
    status = $4,
    priority = $5,
    assignee = $6,
    duedate = $7,
    done = $8,
    files = $9,
    spenttime = $10,
    targetversion = $11,
    author = $12,
    updateddate = NOW(),
    parenttask = $13
    WHERE issueid = $14`;
    let issueData = [
      tracker,
      subject,
      description,
      status,
      priority,
      assignee,
      duedate,
      done,
      file,
      spenttime,
      targetversion,
      userid,
      parenttask,
      issueid
    ];
    if (req.files) {
      let file = req.files.images;
      let fileName = file.name.toLowerCase().replace('', Date.now().split(' ').join('-'));
      file.mv(path.join(__dirname, '..', 'public', 'upload', fileName), (err) => {
        if (err) res.status(500).json(err);
        issueData[9] = `/upload/${fileName}`;
        db.query(sqlIssues, issueData, (err) => {
          if (err) res.status(500).json(err);
          const recordActivity = `INSERT INTO activity (projectid, time, title, description, author)
          VALUES ($1, NOW(), $2, $3, $4, $5)`;
          const activityData = [projectid, subject, description, userid];
          db.query(recordActivity, activityData, (err) => {
            if (err) res.status(500).json(err);
            res.redirect(`/projects/issues/${projectid}`);
          });
        });
      });
    } else {
      db.query(sqlIssues, issueData, (err) => {
        const recordActivity = `INSERT INTO activity (projectid, time, title, description, author)
        VALUES ($1, NOW(), $2, $3, $4)`;
        const activityData = [projectid, subject, description, userid];
        db.query(recordActivity, activityData, (err) => {
          if (err) res.status(500).json(err);
          res.redirect(`/projects/issues/${projectid}`);
        });
      });
    };
  });

  router.get("/issues/:projectid/delete/:issueid", helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
    const {projectid, issueid} = req.params;
    let sqlIssues = `DELETE FROM issues WHERE issueid = $1`;
    
    db.query(sqlIssues, [issueid], (err) => {
      if (err) res.status(500).json(err);

      res.redirect(`/projects/issues/${projectid}`);
    });
  });

  return router;
};
