import _ from 'lodash';
import * as mongodb from 'mongodb';
import BadRequestError from '../../Errors/BadRequestError';

/**
 * Ensure that passed values are of the type indicated.
 */
var casters = {
  'String': function(val) {
    return `${val}`;
  },
  'ObjectId': function(val) {
    if (mongodb.ObjectId.isValid(val)) {
      return new mongodb.ObjectId(val);
    }

    return undefined;
  },
  'Boolean': function(val) {
    if (typeof val === 'boolean') {
      return val;
    }
    if (`${val}`.toLowerCase() === 'true') {
      return true;
    } else if (`${val}`.toLowerCase() === 'false') {
      return false;
    }

    return undefined;
  },
  'Date': function(val) {
    return new Date(val);
  },
  'Null': function() {
    return null;
  },
  'Number': function(val) {
    var num = Number(val);
    if (Number.isNaN(num)) {
      return undefined;
    }

    return num;
  }
};

/**
 * Create an individual query
 *
 * @param {function} caster - function to cast the value.
 * @param {string} operator - The operator, e.g. eq, ne, gt etc.
 * @param {string} field - The document field name.
 * @param {*} value - The value to be queried.
 *
 * @return {object} - Individual query on a field.
 */
function query(caster, operator, field, value) {
  const query = {};
  value = caster(value);
  if (value !== undefined) {
    operator = `$${operator}`;
    if (operator === '$eq') {
      query[field] = value;
    } else {
      const selector = {};
      selector[operator] = value;
      query[field] = selector;
    }
  }

  return query;
}

/**
 * Format the passed filter object into the corresponding mongo query object.
 *
 * @param {string} operator - The operator, e.g. eq, ne, gt etc.
 * @param {string} field - The document field name.
 * @param {Object} val - Object containg field info.
 * @param {*} fieldInfo.val - The value to be queried.
 * @param {Object} fieldInfo.type - The datatype.
 *
 * @return {object} - A mongo query from the passed filter.
 */
function formatFilter(operator, field, fieldInfo) {
  const value = fieldInfo.value;
  const type = fieldInfo.type;

  if (type === 'Any') {
    var allTypes = [];
    _.each(casters, caster => {
      const q = query(caster, operator, field, value);
      if (Object.keys(q).length) {
        allTypes.push(q);
      }
    });

    return {$or: allTypes};
  }

  return query(casters[type], operator, field, value);
}

/**
 * Middleware for parsing filter requests into mongo db queries.
 *
 */
export default function() {

  return (req, res, next) => {
    if (!req.query.filter) {
      req.query.mongoQuery = {};
      return next();
    }

    let filter = req.query.filter;
    try {
      filter = filter && JSON.parse(filter);
    } catch (err) {
      return next(new BadRequestError('Malformed JSON in filter'));
    }

    const queries = [];
    try {
      _.each(filter, (selector, operator) => {
        _.each(selector, (fieldInfo, field) => {
          queries.push(formatFilter(operator, field, fieldInfo));
        });
      });
    } catch (err) {
      return next(new BadRequestError('Incorrectly formatted filter object'));
    }

    req.query.mongoQuery = {$and: queries};
    next();
  };

}
