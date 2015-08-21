/*global document*/
'use strict';
var webdriver = require('webdriverio');
var selenium = require('selenium-standalone');
var thunkify = require('thunkify');
var fs = require('fs');

module.exports.init = function*() {
  var ssdir = './config/screen';
  if(!fs.existsSync(ssdir)) {
    fs.mkdirSync(ssdir);
  }
  var num = 0;

  yield thunkify(selenium.start.bind(selenium))({spawnOptions: {stdio: 'inherit'}});
  var browser = webdriver.remote({desiredCapabilities:{browserName:'chrome'}}).init();
  browser.timeouts('script', 60 * 1000);
  browser.timeouts('implicit', 10 * 1000);
  browser.timeouts('page load', 120 * 1000);
  browser.yieldable = {
    call: thunkify(browser.call.bind(browser)),
    click: function*(selector) {
      yield browser.execute(
        function(selector) {
          document.querySelector(selector).click();
        }, selector);
    },
    end: thunkify(browser.end.bind(browser)),
    element: thunkify(browser.element.bind(browser)),
    getHTML: thunkify(browser.getHTML.bind(browser)),
    getText: thunkify(browser.getText.bind(browser)),
    getValue: thunkify(browser.getValue.bind(browser)),
    isExisting: thunkify(browser.isExisting.bind(browser)),
    isSelected: thunkify(browser.isSelected.bind(browser)),
    save: function*(name) {
      yield browser.yieldable.call();
      var fileName = ('00' + (++num)).slice(-3) + '-' + name + '.png';
      console.log('-   Take screenshot : ' + fileName);
      browser.saveScreenshot(ssdir + '/' + fileName);
      yield browser.yieldable.call();
    }
  };
  browser.windowHandleMaximize();
  yield browser.yieldable.call();
  module.exports.browser = browser;
};
