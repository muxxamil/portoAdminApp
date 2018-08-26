var createError               = require('http-errors');
var express                   = require('express');
var path                      = require('path');
var cookieParser              = require('cookie-parser');
var logger                    = require('morgan');
let routes                    = require('./routes/appRouter');
let authenticationMiddleware  = require('./middlewares/Authentication');
var i18n                      = require("i18n-express");


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.use(i18n({
  translationsPath: path.join(__dirname, 'languages'),
  siteLangs: ["en"],
  textsVarName: 'translation'
}));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(authenticationMiddleware.isAuthenticUser.unless(
  { path: [
      { url: '/authentication/login', methods: ['POST'] },
      { url: 'authentication/logout', methods: ['DELETE'] },
  ]}
));

routes(app);

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