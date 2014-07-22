/**
 * Module dependencies
 */

// var util = require('util');
var _ = require('lodash');
var async = require('async');
// var _defaultsDeep = require('merge-defaults');


var QueryPlanner = require('./cursor/planner');
var Buffer = require('./cursor/buffer');
var populateBuffers = require('./cursor/populateBuffers');

/**
 * Run joins (adapter-agnostic)
 *
 * @param  {Object}   options
 *                      .parentResults
 *                      .instructions
 *                      .$find()  {Function}
 *                      .$getPK() {Function}
 *
 * @param  {Function} cb
 */

module.exports = function runJoins(options, cb) {

  var criteria = options.instructions;
  var supportsNative = options.nativeJoins || false;
  var $find = options.$find;
  var $getPK = options.$getPK;
  var $populateBuffers = options.$populateBuffers || populateBuffers;

  // Create a new buffer
  var buffers = new Buffer();

  // Normalize joins key name
  if(criteria.join) {
    criteria.joins = criteria.join;
  }

  // For each type of association plan the strategy used
  var planStrategies = function planStrategies(done) {

    // Group the joinInstructions array by "alias", then interate over each one
    // s.t. `instructions` in our lambda function contains a list of join instructions
    // for the particular `populate` on the specified logical attribute (i.e. alias).
    //
    // Note that `parentResults` will be mutated inline.
    var joinsByAssociation = _.groupBy(criteria.joins, 'alias');

    function determineStrategy(attrName, next) {

      var strategy;
      try {
        strategy = QueryPlanner({
          instructions: joinsByAssociation[attrName],
          $getPK: $getPK
        });

        joinsByAssociation[attrName].strategy = strategy;
        // return next();
      }

      catch(e) {
        return next(e);
      }

      return next();

      // _joinOneParticularAssoc({
      //   attrName: attrName,
      //   instructions: joinsByAssociation[attrName],
      //   parentResults: parentResults,
      //   $find: $find,
      //   $getPK: $getPK
      // }, next);
    }

    async.each(_.keys(joinsByAssociation), determineStrategy, function afterwards(err) {
      if (err) return done(err);
      criteria.instructions = joinsByAssociation;
      delete criteria.joins;
      done(null, criteria);
    });

  };

  /**
   * Process the query when native joins are supported.
   *
   */

  var processNativeJoins = function() {

    // Plan out all the strategies
    planStrategies(function(err, mappedCriteria) {
      if(err) return cb(err);

      // Given the mappedCriteria, send it populateBuffers
      $populateBuffers({
        instructions: mappedCriteria,
        buffers: buffers
      },

      function afterNative(err) {
        if(err) return cb(err);

        // Now we need to pluck out the parent results from the buffers
        var parentRecords = buffers.getParents();

        if(!parentRecords) {
          return cb(new Error('No records were flagged as the top level records in the query.'));
        }

        // If the buffer only has a single item in it, we are done.
        var bufferedRecords = buffers.read();

        if(bufferedRecords.length === 1) {
          return cb(null, parentRecords);
        }
        else {
          console.log('MUST DO INTEGRATOR STUFFZ')
        }
      });
    });
  };


  // If native joins are supported, we should be able to do everything in a single query.
  if(supportsNative) {
    return processNativeJoins();
  }


  /**
   * Step 1: Plan Query
   *
   */


};








