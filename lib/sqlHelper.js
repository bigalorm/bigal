'use strict';

module.exports = {
  /**
   * Gets the select syntax for the specified model and filters
   * @param {Object} schema - Model schema
   * @param {string[]} select - Array of model property names to return from the query.
   * @param {Object} where - Object representing the where query
   * @param {string[]|Object[]} sorts - Property name(s) to sort by
   */
  getSelectQueryAndParams({
    schema,
    select,
    where,
    sorts,
  }) {
    // NOTE: add in column aliases to each column being queried, if the property name is different from the column name.
    throw new Error(`Not implemented. ${schema}${select}${where}${sorts}`);
  },

};
