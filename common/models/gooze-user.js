'use strict';

/**
 *
 * @param Goozeuser{Validatable}
 */
module.exports = function(Goozeuser) {
  Goozeuser.validatesInclusionOf('gender', {in: ['male', 'female', 'other'], allowNull: true});
  Goozeuser.validatesInclusionOf('status', {in: ['available', 'unavailable']});
  Goozeuser.validatesInclusionOf('mode', {in: ['gooze', 'client']});
};
