/**
 * Module dependencies
 */

var _ = require('lodash');

/**
 * Build a "buffer" used to hold results from queries.
 */

var Buffer = module.exports = function() {

  this.store = [];

  return this;
};

/**
 * Read buffer:
 */

Buffer.prototype.read = function() {
  return this.store;
};

/**
 * Return the buffer's parents.
 */

Buffer.prototype.getParents = function() {
  var parent = _.find(this.store, function(buffer) {
    return buffer.parent;
  });

  return parent.records || false;
};

/**
 * Add to buffer:
 */

Buffer.prototype.add = function(values) {

  var self = this;

  // Normalize values to an array
  if(!Array.isArray(values)) {
    values = [values];
  }

  values.forEach(function(val) {
    self.store.push({
      attrName: val.attrName,
      belongsToPKValue: val.parentPK,

      // Optional (only used if implementing a HAS_FK strategy)
      belongsToFKValue: val.parentPK
    });
  });

};
