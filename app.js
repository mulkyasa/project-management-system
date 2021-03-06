var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var flash = require('connect-flash');
const fileUpload = require('express-fileupload');

const { Pool } = require('pg')
// const pool = new Pool({
//   user: 'zqukcrnnftqbiv',
//   host: 'ec2-3-211-48-92.compute-1.amazonaws.com',
//   database: 'd6tqrje5unalje',
//   password: 'cc8415ac7ae2996af5314c21edcf08b2dd609e40298cfc145c4b3e3af4a29d00',
//   port: 5432
// });

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pmsdb',
  password: '010203',
  port: 5432
});

var indexRouter = require('./routes/index')(pool);
var usersRouter = require('./routes/users')(pool);
var profileRouter = require('./routes/profile')(pool);
var projectsRouter = require('./routes/projects')(pool);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(fileUpload());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'kukulilineran',
  resave: true,
  saveUninitialized: true
}));
app.use(flash());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/profile', profileRouter);
app.use('/projects', projectsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
