'use strict';

module.exports = function(server) {
  if (process.env.GZEINSTALL !== 'INSTALL') return;

  // Create admin role and set it to a user
  var GoozeUser = server.models.GoozeUser;
  var Role = server.models.Role;
  var RoleMapping = server.models.RoleMapping;
  GoozeUser.findById('5abd226c10585e19d8725676', function(err, user) {
    if (err) { return console.log(err); }

    if (!user) { return console.log('User not found'); }

    // create the admin role
    Role.create({
      name: 'admin'
    }, function(err, role) {
      if (err) { console.log(err); }

      // assign admin role
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: user.id
      }, function(err, principal) {
        console.log(err, principal);
      });
    });
  });
};
