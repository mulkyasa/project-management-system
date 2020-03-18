// configure helpers
const helpers = {
  isLoggedIn: (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      res.redirect("/");
    };
  },
};

module.exports = helpers;