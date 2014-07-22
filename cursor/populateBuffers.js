/**
 * Module dependencies
 */

var _ = require('lodash');
var strategies = require('./strategies');

/**
 * Default populateBuffers logic. Can be overridden in an adapter.
 */

module.exports = function populateBuffers(options, cb) {

  var buffers = options.buffers;
  var childCriteria = options.childCriteria;
  var childIdentity = options.childIdentity;

  // IMPORTANT:
  // If the child criteria has a `sort`, `limit`, or `skip`, then we must execute
  // N child queries; where N is the number of parent results.
  // Otherwise the result set will not be accurate.
  var canCombineChildQueries = !!(
    childCriteria.sort  ||
    childCriteria.limit ||
    childCriteria.skip
  );

  // SKIP THIS STEP ENTIRELY FOR NOW
  // TODO: implement this optimization
  canCombineChildQueries = false;



  if (canCombineChildQueries) {

    // Special case for VIA_JUNCTOR:
    if (strategy === strategies.VIA_JUNCTOR) {
      return next(new Error('via_junctor not implemented yet'));
    }
    else {
      switch (strategy) {
        case strategies.HAS_FK:
          _where[childPK] = _.pluck(parentResults, parentFK);
          return _where;
        case strategies.VIA_FK:
          _where[childFK] = _.pluck(parentResults, parentPK);
          return _where;
      }
    }
    return cb(new Error('not implemented yet!'));
  }


  // Now execute the queries
  async.each(buffers, function (buffer, next){

    // •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
    // NOTE:
    // This step could be optimized by calculating the query function
    // ahead of time since we already know the association strategy it
    // will use before runtime.
    // •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••

    // Special case for VIA_JUNCTOR:
    if (strategy === strategies.VIA_JUNCTOR) {

      // NOTE:
      // (TODO: look at optimizing this later)
      // I think for this strategy we can always find all of the junctor
      // records relating to ANY of the parent records ahead of time, and
      // the `canCombineChildQueries` distinction is really just limited
      // to that third [set of] quer[ies/y].  For now, we just do a separate
      // query to the junctor for each parent record to keep things tight.
      var junctorCriteria = {where:{}};
      junctorCriteria.where[junctorFKToParent] = buffer.belongsToPKValue;

      $find( junctorIdentity, junctorCriteria,
      function _afterFetchingJunctorRecords(err, junctorRecordsForThisBuffer) {
        if (err) return next(err);

        // Build criteria to find matching child records which are also
        // related to ANY of the junctor records we just fetched.
        var bufferChildCriteria = _defaultsDeep((function _buildBufferCriteriaChangeset (_criteria) {
          _criteria.where[childPK] = _.pluck(junctorRecordsForThisBuffer, junctorFKToChild);
          return _criteria;
        })({where:{}}), childCriteria);

        // Now find related child records
        $find( childIdentity, bufferChildCriteria,
        function _afterFetchingRelatedChildRecords(err, childRecordsForThisBuffer) {
          if (err) return next(err);

          buffer.records = childRecordsForThisBuffer;
          return next();
        });
      });

    }
    // General case for the other strategies:
    else {

      var criteriaToPopulateBuffer =
      _defaultsDeep((function _buildBufferCriteriaChangeset () {
        return {
          where: (function _buildBufferWHERE (_where){
            switch (strategy) {
              case strategies.HAS_FK:
                _where[childPK] = buffer.belongsToFKValue;
                return _where;
              case strategies.VIA_FK:
                _where[childFK] = buffer.belongsToPKValue;
                return _where;
            }
          })({})
        };
      })(), childCriteria);

      // console.log(
      //   'Populating buffer for parent record "%s" using the following criteria: \n',
      //   buffer.belongsToPKValue,
      //   util.inspect(criteriaToPopulateBuffer, false, null)
      // );

      $find( childIdentity, criteriaToPopulateBuffer,
      function _afterFetchingBufferRecords(err, childRecordsForThisBuffer) {
        if (err) return next(err);

        // console.log('CHILD RECORDS FOUND FOR THIS BUFFER (%s):',
        //   attrName,
        //   util.inspect(childRecordsForThisBuffer, false, null));

        buffer.records = childRecordsForThisBuffer;
        return next();
      });
    }

  }, cb);

};
