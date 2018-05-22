'use strict';

module.exports = function(server) {
  if (process.env.GZEINSTALL !== 'INSTALL') return;

  // Create admin role and set it to a user
  var GZERateComment = server.models.GZERateComment;

  var comments = [
    'rate.comment.punctualUser',
    'rate.comment.recommended',
    'rate.comment.unpunctual',
    'rate.comment.notRecommended',
    'rate.comment.breakAgreements'
  ];

  GZERateComment.create(
    comments.map(function(text) {
      return {text: text};
    }),
    function(err) {
      if (err) { return console.log(err); }
    }
  );
};
