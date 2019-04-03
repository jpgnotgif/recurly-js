var staticConfig = {
  basePath: '',
  frameworks: ['mocha', 'sinon', 'source-map-support'],
  files: [
    'build/recurly.js',
    'build/test.js'
  ],
  proxies: { '/api': 'http://localhost:9877' },
  reporters: ['mocha', 'coverage'],
  port: 9876,
  colors: true,
  autoWatch: true,
  browsers: [
    // 'ChromeHeadless'
    'ChromeDebug'
    // 'FirefoxDebug'
    // 'VirtualBoxIE11Win7'
  ],
  singleRun: true,
  concurrency: Infinity,
  browserDisconnectTimeout: 800000,
  browserDisconnectTolerance : 4,
  browserNoActivityTimeout: 800000,
  captureTimeout: 800000,
  customLaunchers: {
    ChromeDebug: {
      base: 'Chrome',
      flags: ['--auto-open-devtools-for-tabs']
    },
    FirefoxDebug: {
      base: 'Firefox',
      flags: ['-devtools']
    },
    VirtualBoxIE11Win7: {
      base: 'VirtualBoxIE11',
      keepAlive: true,
      vmName: 'IE11 - Win7'
    }
  },
  client: {
    captureConsole: true,
    mocha: {
      timeout : 800000, // 800 seconds
      grep: ''
    }
  },
  coverageReporter: {
    dir : 'build/reports/',
    reporters: [
      { type: 'lcovonly', subdir: 'coverage', file: 'lcov.info' }
    ]
  }
};

function runner (config) {
  var frameworks = staticConfig.frameworks;
  if (~staticConfig.browsers.indexOf('PhantomJS')) frameworks.push('phantomjs-shim');
  config.set(Object.assign({}, staticConfig, {
    logLevel: config.LOG_INFO,
    frameworks: frameworks
  }));
};

var server = require('./test/server');

runner.staticConfig = staticConfig;

module.exports = runner;
