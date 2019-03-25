import each from 'component-each';
import {normalize} from '../util/normalize';
import errors from './errors';

const debug = require('debug')('recurly:bankAccount');

export const bankAccount = {
  token: token,
  bankInfo: bankInfo
};

/**
 * Fields that are sent to API.
 *
 * @type {Array}
 * @private
 */

var fields = [
  'account_number',
  'account_number_confirmation',
  'routing_number',
  'name_on_account',
  'account_type',
  'address1',
  'address2',
  'company',
  'country',
  'city',
  'state',
  'postal_code',
  'phone',
  'vat_number',
  'token'
];

var requiredFields = [
  'account_number',
  'account_number_confirmation',
  'routing_number',
  'account_type',
  'name_on_account',
  'country'
];

/**
 * Generates a token from customer data.
 *
 * The callback signature: `err, response` where `err` is a
 * connection, request, or server error, and `response` is the
 * recurly service response. The generated token is accessed
 * at `response.token`.
 *
 * @param {Object|HTMLFormElement} options Billing properties or an HTMLFormElement
 * with children corresponding to billing properties via 'data-reurly' attributes.
 * @param {String} options.name_on_account customer name on bank account
 * @param {String} options.account_number bank account number
 * @param {String} options.account_number_confirmation bank account number confirmation
 * @param {String} options.routing_number bank routing number
 * @param {String} options.account_type type of bank account (checking/savings)
 * @param {String} [options.address1]
 * @param {String} [options.address2]
 * @param {String} [options.country]
 * @param {String} [options.city]
 * @param {String} [options.state]
 * @param {String|Number} [options.postal_code]
 * @param {Function} done callback
 */

function token (options, done) {
  debug('token');

  var data = normalize(options, fields);
  var input = data.values;
  var userErrors = validate(input);

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  if (userErrors.length) {
    return done(errors('validation', { fields: userErrors }));
  }

  this.request.post({
    route: '/token',
    data: input,
    done: function (err, res) {
      if (err) return done(err);
      if (data.fields.token && res.id) {
        data.fields.token.value = res.id;
      }
      done(null, res);
    }
  });
}

/**
 * performs a bank lookup
 *
 * The callback signature: `err, response` where `err` is
 * a lookup or server error and `response` and the object containing
 * the found bank info.
 *
 * At this time, the only parameter accepted in the options argument
 * is `routingNumber`.
 *
 * @param  {Object} options lookup properties
 * @param  {String} options.routingNumber the rounting number to use for the bank lookup
 * @param  {Function} done callback
 */
function bankInfo (options, done) {
  debug('bankInfo');

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  var routingNumber = options && options.routingNumber;
  if (!routingNumber || typeof routingNumber !== 'string') {
    return done(errors('validation', { fields: ['routingNumber'] }));
  }

  this.request.get({
    route: '/bank',
    data: { routing_number: routingNumber },
    done: function (err, res) {
      if (err) return done(err);
      done(null, res);
    }
  });
}

/**
 * Checks user input on a token call
 *
 * @param {Object} input
 * @return {Array} indicates which fields are not valid
 */

function validate (input) {
  var errors = [];

  each(requiredFields, function(field){
    if (!input[field] || typeof input[field] !== 'string') {
      errors.push(field);
    }
  });

  if (input.account_number !== input.account_number_confirmation) {
    errors.push('account_number_confirmation');
  }

  debug('validate errors', errors);

  return errors;
}
