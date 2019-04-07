var loopback = require('loopback');
var path = require('path');

module.exports = function(app) {
  var staticPath = app.get('staticPath');
  var resetPassPath = path.join(staticPath, '/reset-password');

  app.use(path.join(staticPath, '/reset-password'), loopback.token({
    model: 'GoozeAccessToken'
  }));

  // show password reset form
  app.get(resetPassPath, function(req, res, next) {
    var apiRoot = app.get('restApiRoot');

    console.log(req, apiRoot);

    if (!req.accessToken) return res.sendStatus(401);
    res.render('password-reset', {
      errors: [],
      staticPath: staticPath,
      // redirectUrl: apiRoot + '/GoozeUsers/gzeResetPassword?access_token=' + req.accessToken.id
      redirectUrl: resetPassPath + '?access_token=' + req.accessToken.id
    });
  });

  app.post(resetPassPath, function(req, res, next) {
    var GoozeUser = app.models.GoozeUser;

    console.log(req);
    if (!req.accessToken) return res.sendStatus(401);

    if (!req.body || !req.body.newPassword) {
      return res.status(422)
        .render('password-reset', {
          staticPath: staticPath,
          redirectUrl: resetPassPath + '?access_token=' + req.accessToken.id,
          errors: ['La contraseña es un campo obligatorio']
        });
    }

    var newPassword = req.body.newPassword;
    var confirmation = req.body.confirmation;

    if (newPassword !== confirmation) {
      return res.status(422)
        .render('password-reset', {
          staticPath: staticPath,
          redirectUrl: resetPassPath + '?access_token=' + req.accessToken.id,
          errors: ['La contraseña y su confirmación no coinciden']
        });
    }

    GoozeUser.setPassword(req.accessToken.userId, newPassword, function(err) {
      if (err) {
        return res.status(err.statusCode)
          .render('password-reset', {
            staticPath: staticPath,
            redirectUrl: resetPassPath + '?access_token=' + req.accessToken.id,
            errors: [err.message]
          });
      }

      res.render('password-reset-success', {
        staticPath: staticPath
      });
    });
  });
};
