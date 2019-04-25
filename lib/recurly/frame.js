import qs from 'qs';
import Emitter from 'component-emitter';
import uuid from 'uuid/v4';

const debug = require('debug')('recurly:frame');

const DEFAULTS = {
  width: 450,
  height: 535
};

export function factory (options) {
  options = Object.assign({}, options, { recurly: this });
  return new Frame(options);
}

/**
 * Issues an API request to a popup window.
 *
 * @param {Object} options
 */

class Frame extends Emitter {
  constructor (options) {
    super();
    this.recurly = options.recurly;
    this.id = `${this.recurly.id.split('-')[0]}-${uuid().split('-')[0]}`;
    this.name = `recurly-frame-${this.id}`;
    this.width = options.width || DEFAULTS.width;
    this.height = options.height || DEFAULTS.height;
    this.prepare(options.path, options.payload);
    this.listen();
  }

  /**
   * Prepares window for launch
   *
   * @private
   * @param  {String} path - API path to load
   * @param  {Object} payload - Request payload
   */
  prepare (path, payload = {}) {
    debug('creating request frame');

    payload.version = this.recurly.version;
    payload.event = this.name;
    payload.key = this.recurly.config.publicKey;

    this.once(payload.event, res => {
      this.removeRelay();
      if (res.error) this.emit('error', res.error);
      else this.emit('done', res)
    });

    this.url = this.recurly.url(path);
    this.url += (~this.url.indexOf('?') ? '&' : '?') + qs.stringify(payload, { encodeValuesOnly: true });

    this.once('destroy', this.destroy.bind(this));
  }

  listen () {
    this.recurly.bus.add(this);

    // IE (including 11) will not allow communication between windows;
    // thus we must create a frame relay
    if ('documentMode' in document) {
      debug('creating relay');
      let relay = document.createElement('iframe');
      relay.width = relay.height = 0;
      relay.src = this.recurly.url('/relay');
      relay.name = `recurly-relay-${this.id}`;
      relay.style.display = 'none';
      relay.onload = () => this.create();
      window.document.body.appendChild(relay);
      this.relay = relay;
      debug('created relay', relay);
    } else {
      this.create();
    }
  }

  create () {
    const { url, name, attributes } = this;
    this.window = window.open(url, name, attributes);
    this.bindWindowCloseListener();
    debug('opening frame window', this.window, url, name, attributes);
  }

  destroy () {
    this.off();
    if (this.window) this.window.close();
    this.removeRelay();
  }

  removeRelay () {
    if (!this.relay) return;
    window.document.body.removeChild(this.relay);
  }

  bindWindowCloseListener () {
    const tick = setInterval(() => {
      if (!this.window) {
        return clearInterval(tick);
      }
      if (this.window.closed) {
        debug('detected frame window closure. Destroying.', this.window);
        clearInterval(tick);
        this.emit('close');
        this.destroy();
      }
    }, 1000);
  }

  get attributes () {
    const { width, height, top, left } = this;
    return `resizable,scrollbars,width=${width},height=${height},top=${top},left=${left}`;
  }

  get top () {
    const outerHeight = window.outerHeight || window.document.documentElement.clientHeight;
    const outerTop = window.screenY === null ? window.screenTop : window.screenY;

    return center(outerHeight, this.height, outerTop);
  }

  get left () {
    const outerWidth = window.outerWidth || window.document.documentElement.clientWidth;
    const outerLeft = window.screenX === null ? window.screenLeft : window.screenX;

    return center(outerWidth, this.width, outerLeft);
  }
}

function center (outer, inner, offset) {
  return (outer - inner) / 2 + offset;
}
