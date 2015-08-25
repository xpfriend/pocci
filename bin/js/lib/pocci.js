'use strict';

var getServices = function(option) {
  var services = '';
  option.forEach(function(value) {
    if(services.length > 0) {
      services += ' ';
    }
    services += value;
  });
  return services;
};

module.exports = {
  addDefaults: function(options) {
    options.pocci                   = options.pocci                   || {};
    options.pocci.environment       = options.pocci.environment       || {};
    options.pocci.domain            = options.pocci.domain            || 'pocci.test';
    options.pocci.services          = options.pocci.services          || ['gitlab'];
    options.pocci.externalServices  = options.pocci.externalServices  || [];
  },
  addEnvironment: function(options, environment) {
    environment.POCCI_DOMAIN_NAME = options.pocci.domain;
    environment.INTERNAL_SERVICES = getServices(options.pocci.services);
    environment.EXTERNAL_SERVICES = getServices(options.pocci.externalServices);
    environment.ALL_SERVICES      = [environment.INTERNAL_SERVICES, environment.EXTERNAL_SERVICES].join(' ').trim();
  }
};
