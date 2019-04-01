import each from 'component-each';
import Elements from './elements';
import errors from './errors';
import {normalize} from '../util/normalize';
import uuid from 'uuid/v4';

const debug = require('debug')('recurly:token');

/**
 * Fields that are sent to API.
 *
 * @type {Array}
 * @private
 */

export const FIELDS = [
  'first_name',
  'last_name',
  'address1',
  'address2',
  'company',
  'country',
  'city',
  'state',
  'postal_code',
  'phone',
  'vat_number',
  'fraud_session_id',
  'token'
];

/**
 * Parses the token call signature to determine the form of tokenization to perform,
 * then passes the customer data on for tokenization
 *
 * == When tokenizing Elements ==
 *
 * @param {Elements} elements An Elements instance containing one tokenizable Element
 * @param {HTMLFormElement|Object} customerData An HTMLFormElement whose children correspond to
 *                                              billing properties via their 'data-reurly'
 *                                              attributes, or an Object containing customer data
 *                                              (see customerData object).
 * @param {Function} done callback
 *
 *
 * == When tokenizing Hosted Fields ==
 *
 * @param {HTMLFormElement} customerData An HTMLFormElement whose children correspond to billing
 *                                       properties via their 'data-reurly' attributes, or an Object
 *                                       containing customer data (see customerData object).
 * @param {Function} done callback
 *
 *
 * == customerData object ==
 *
 * @param {String} [first_name] customer first name
 * @param {String} [last_name] customer last name
 * @param {String} [address1]
 * @param {String} [address2]
 * @param {String} [country]
 * @param {String} [city]
 * @param {String} [state]
 * @param {String|Number} [postal_code]
 */

export function tokenDispatcher (...args) {
  let bus, elements, customerData, done;

  // signature variance
  if (args[0] instanceof Elements) {
    [elements, customerData, done] = args;
    bus = elements.bus;
  } else {
    [customerData, done] = args;
    bus = this.bus;
  }

  // Basic validations
  if (!this.configured) {
    throw errors('not-configured');
  }

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  // We perform this hosted field health check here in order to retain
  // the generic nature of the token method
  if (this.config.parent && !elements && this.hostedFields.errors.length > 0) {
    throw this.hostedFields.errors[0];
  }

  customerData = normalize(customerData, FIELDS, { parseCard: true });

  return token.call(this, customerData, bus, done);
}

/**
 * Generates a token from customer data.
 *
 * The callback signature is `err, response` where `err` is a
 * connection, request, or server error, and `response` is the
 * recurly service response. The generated token is accessed
 * at `response.token`.
 *
 * When using Elements
 *
 * @param {Object} customerData Billing properties
 * @param {Elements} options.elements an Elements instance containing one tokenizable Element
 * @param {HTMLFormElement} [options.form] whose children correspond to billing properties via their
 *                                       'data-reurly' attributes
 *
 * @param {Function} done callback
 *
 *
 * When using Hosted Fields
 *
 * @param {HTMLFormElement} options An HTMLFormElement whose children correspond to billing
 *                                  properties via their 'data-reurly' attributes
 * @param {Function} done callback
 */
function token (customerData, bus, done) {
  debug('token');

  let inputs = customerData.values;

  if (this.config.parent) {
    inputs.fraud = this.fraud.params(inputs);

    const id = uuid();
    this.once(`token:done:${id}`, msg => complete(msg.err, msg.token));
    bus.send('token:init', { id, inputs });
  } else {
    let userErrors = validate.call(this, inputs);
    if (userErrors.length) {
      return done(errors('validation', { fields: userErrors }));
    }

    this.request.post({ route: '/token', data: inputs, done: complete });
  }

  function complete (err, res) {
    if (err) return done(err);
    if (customerData.fields.token && res.id) {
      customerData.fields.token.value = res.id;
    }
    done(null, res);
  }
}

/**
 * Performs rudimentary validations against customer data
 *
 * @param {Object} customerData
 * @return {Array} indicates which fields are not valid
 */

function validate (customerData) {
  let errors = [];

  if (!this.validate.cardNumber(customerData.number)) {
    errors.push('number');
  }

  if (!this.validate.expiry(customerData.month, customerData.year)) {
    errors.push('month', 'year');
  }

  if (!customerData.first_name) {
    errors.push('first_name');
  }

  if (!customerData.last_name) {
    errors.push('last_name');
  }

  if ((~this.config.required.indexOf('cvv') || customerData.cvv) && !this.validate.cvv(customerData.cvv)) {
    errors.push('cvv');
  }

  each(this.config.required, function(field) {
    if (!customerData[field] && ~FIELDS.indexOf(field)) {
      errors.push(field);
    }
  });

  debug('validate errors', errors);

  return errors;
}
