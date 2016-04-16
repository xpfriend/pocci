/*jshint camelcase: false */
'use strict';
var fs = require('fs');
var thunkify = require('thunkify');
var jenkinsLib = require('jenkins');
var path = require('path');
var gitlab = require('pocci/gitlab.js');
var util = require('pocci/util.js');
var workspace = require('pocci/workspace.js');
var parse = require('url').parse;

var registerGitLab = function*(browser, url, job) {
  var jenkinsJobUrl = process.env.JENKINS_URL + '/project/' + job.jobName;

  browser.url(url + '/hooks');
  yield browser.save('jenkins-after-registerGitLab');

  browser.setValue('#hook_url', jenkinsJobUrl);

  var isSelected = yield browser.isSelected('#hook_push_events');
  if (!isSelected) {
    yield browser.click('#hook_push_events');
  }

  isSelected = yield browser.isSelected('#hook_merge_requests_events');
  if (!isSelected) {
    yield browser.click('#hook_merge_requests_events');
  }

  yield browser.save('jenkins-doing-registerGitLab');
  browser.submitForm('#new_hook');
  yield browser.save('jenkins-after-registerGitLab');
};

var createJob = function*(browser, jenkins, job, gitlabUrl) {
  var toUrl = function(path) {
    return util.getURL(gitlabUrl, null, path);
  };

  var destroy = thunkify(jenkins.job.destroy.bind(jenkins.job));
  var create = thunkify(jenkins.job.create.bind(jenkins.job));
  var replaceRepositoryUrl = function(text, repositoryUrl) {
    return text.replace('${REPOSITORY_URL}', repositoryUrl);
  };

  try {
    yield destroy(job.jobName);
  } catch(e) {
    // ignore
  }

  var configXml = fs.readFileSync(job.configXmlFilePath, 'utf8');
  var repositoryUrl = toUrl(job.repositoryPath);
  yield create(job.jobName, replaceRepositoryUrl(configXml, repositoryUrl));

  if(configXml.indexOf('GitLabPushTrigger') > -1) {
    yield registerGitLab(browser, repositoryUrl.slice(0, -4), job);
  }
};

var createJobs = function*(browser, jenkins, jobNames, gitlabUrl) {
  var toJob = function(jobName) {
    if(typeof jobName === 'object') {
      return jobName;
    } else {
      return {
        jobName:            path.basename(jobName),
        configXmlFilePath:  path.resolve('./config/code', jobName, 'jenkins-config.xml'),
        repositoryPath:     '/' + jobName + '.git'
      };
    }
  };

  var toJobs = function(jobNames) {
    var nomalizedJobs = [];
    for(var i = 0; i < jobNames.length; i++) {
      var job = toJob(jobNames[i]);
      nomalizedJobs.push(job);
    }
    return nomalizedJobs;
  };

  var jobs = toJobs(jobNames);
  for(var i = 0; i < jobs.length; i++) {
    yield createJob(browser, jenkins, jobs[i], gitlabUrl);
  }
};

var createNode = function*(jenkins, nodeName) {
  var destroy = thunkify(jenkins.node.destroy.bind(jenkins.node));
  var create = thunkify(jenkins.node.create.bind(jenkins.node));

  try {
    yield destroy(nodeName);
  } catch(e) {
    // ignore
  }

  var options = {
    name: nodeName,
    remoteFS: '/var/workspace',
    numExecutors: 1,
    exclusive: false
  };

  yield create(options);
};

var createNodes = function*(jenkins, nodes) {
  for(var i = 0; i < nodes.length; i++) {
    yield createNode(jenkins, nodes[i].name);
  }
};

var enableLdap = function*(browser, url, loginUser) {
  var enableSecurity = function*() {
    yield browser.save('jenkins-doing-enableSecurity-1');
    yield browser.click('input[type="checkbox"][name="_.useSecurity"]');

    browser.setValue('#slaveAgentPortId', process.env.JENKINS_JNLP_PORT);
    yield browser.save('jenkins-doing-enableSecurity-2');
    yield browser.click('#radio-block-2');
    yield browser.save('jenkins-doing-enableSecurity-3');
    yield browser.click('#yui-gen1-button');

    var uid = process.env.LDAP_ATTR_LOGIN;
    browser
      .setValue('input[type="text"][name="_.server"]', process.env.LDAP_URL)
      .setValue('input[type="text"][name="_.rootDN"]', process.env.LDAP_BASE_DN)
      .setValue('input[type="text"][name="_.userSearch"]', uid + '={0}')
      .setValue('input[type="text"][name="_.managerDN"]', process.env.LDAP_BIND_DN)
      .setValue('input[type="password"][name="_.managerPasswordSecret"]', process.env.LDAP_BIND_PASSWORD)
      .setValue('input[type="text"][name="_.displayNameAttributeName"]', uid);

    yield browser.save('jenkins-doing-enableSecurity-4');
    yield browser.click('#yui-gen6-button');
    yield browser.save('jenkins-after-enableSecurity');
  };

  browser.url(url + '/configureSecurity/');
  yield browser.save('jenkins-before-enableSecurity');

  var useSecuritySelector = 'input[type="checkbox"][name="_.useSecurity"]';
  var isDisabledSecurity = yield browser.isExisting(useSecuritySelector);
  if(isDisabledSecurity) {
    isDisabledSecurity = !(yield browser.isSelected(useSecuritySelector));
  }

  if(isDisabledSecurity) {
    yield enableSecurity();
  }

  browser.url(url + '/login');
  yield browser.save('jenkins-before-login-by-' + loginUser.uid);

  browser
    .setValue('#j_username', loginUser.uid)
    .setValue('input[type="password"][name="j_password"]', loginUser.userPassword);
  yield browser.save('jenkins-doing-login-by-' + loginUser.uid);

  yield browser.click('button');
  yield browser.save('jenkins-after-login-by-' + loginUser.uid);

  if(isDisabledSecurity) {
    browser.url(url + '/configureSecurity/');
    yield browser.save('jenkins-before-configureSecurity');

    yield browser.click('#radio-block-8');
    yield browser.save('jenkins-doing-configureSecurity');
    yield browser.click('#yui-gen6-button');
    yield browser.save('jenkins-after-configureSecurity');
  }
  return isDisabledSecurity;
};

var enableMasterToSlaveAccessControl = function*(browser, url) {
  browser.url(url + '/configureSecurity/');
  yield browser.save('jenkins-before-enableMasterToSlaveAccessControl');
  yield browser.click('input[type="checkbox"][name="_.masterToSlaveAccessControl"]');
  yield browser.save('jenkins-doing-enableMasterToSlaveAccessControl');
  yield browser.click('#yui-gen6-button');
  yield browser.save('jenkins-after-enableMasterToSlaveAccessControl');
};

var saveSecret = function*(browser, url, node, isEnabledAuth) {
  browser.url(url + '/computer/' + node.name);
  yield browser.save('jenkins-saveSecret');

  var secret = '';
  if(isEnabledAuth) {
    var text = yield browser.getText('pre');
    secret = text.replace(/.*-secret/,'-secret');
  }
  workspace.writeConfiguration('./config/services/core/jenkins/slave', node, secret);
};

var saveSecrets = function*(browser, url, nodes, isEnabledAuth) {
  for(var i = 0; i < nodes.length; i++) {
    yield saveSecret(browser, url, nodes[i], isEnabledAuth);
  }
};

var configureGitLab = function*(browser, url, gitlabUrl) {
  var apiToken = yield gitlab.getPrivateToken(browser, gitlabUrl);

  browser.url(url + '/configure');
  yield browser.save('jenkins-before-configureGitLab');
  browser
    .setValue('input[type="text"][name="_.gitlabHostUrl"]', gitlabUrl)
    .setValue('input[type="text"][name="_.gitlabApiToken"]', apiToken);
  yield browser.save('jenkins-doing-configureGitLab');
  yield browser.click('.submit-button.primary button');
  yield browser.save('jenkins-after-configureGitLab');
};

var configureMail = function*(browser, url) {
  browser.url(url + '/configure');
  yield browser.save('jenkins-before-configureMail');
  browser
    .setValue('input[type="text"][name="_.smtpServer"]', process.env.JENKINS_SMTP_HOST)
    .setValue('input[type="text"][name="_.adminAddress"]', process.env.JENKINS_MAIL_ADDRESS);
  yield browser.save('jenkins-doing-configureMail');
  yield browser.click('.submit-button.primary button');
  yield browser.save('jenkins-after-configureMail');
};

module.exports = {
  addDefaults: function(options) {
    options.jenkins             = options.jenkins             || {};
    options.jenkins.url         = options.jenkins.url         || 'http://jenkins.' + options.pocci.domain;
    options.jenkins.jnlpPort    = options.jenkins.jnlpPort    || '50000';
    options.jenkins.smtpHost    = options.jenkins.smtpHost    || 'smtp.' + options.pocci.domain;
    options.jenkins.mailAddress = options.jenkins.mailAddress || options.pocci.adminMailAddress;
    // options.jenkins.nodes = options.jenkins.nodes;
    // options.jenkins.user = options.jenkins.user;
  },
  addEnvironment: function(options, environment) {
    var url = parse(options.jenkins.url);
    environment.JENKINS_URL           = util.getHref(url);            // jenkins.js, workspaces.yml, shell scripts
    environment.JENKINS_PROTOCOL      = url.protocol;
    environment.JENKINS_HOST          = url.hostname;
    environment.JENKINS_PORT          = util.getPort(url);
    environment.JENKINS_JNLP_PORT     = options.jenkins.jnlpPort;     // workspaces.yml, jenkins.js
    environment.JENKINS_SMTP_HOST     = options.jenkins.smtpHost;     // jenkins.js
    environment.JENKINS_MAIL_ADDRESS  = options.jenkins.mailAddress;  // jenkins.js
  },
  setup: function*(browser, options) {
    yield this.handleSetup(browser, options, 'jenkins');
  },
  handleSetup: function*(browser, options, optionName) {
    var url = process.env.JENKINS_URL;
    var jenkinsOptions = options[optionName] || {};
    var userOptions = options.user || {};
    var jobs = jenkinsOptions.jobs || [];
    var isEnabledAuth = process.env.ALL_SERVICES.indexOf('user') > -1;
    var isEnabledGitLab = process.env.ALL_SERVICES.indexOf('gitlab') > -1;
    var loginUser = util.getUser(jenkinsOptions.user, userOptions.users);

    var isDisabledSecurity = false;
    if(isEnabledAuth) {
      isDisabledSecurity = yield enableLdap(browser, url, loginUser);
    }
    yield configureMail(browser, url);

    var getJenkins = function() {
      return jenkinsLib((isEnabledAuth)? util.getURL(url, loginUser) : url);
    };

    var jenkins = getJenkins();
    if(jenkinsOptions.nodes) {
      var nodes = workspace.normalize(jenkinsOptions.nodes);
      yield createNodes(jenkins, nodes);
      yield saveSecrets(browser, url, nodes, isEnabledAuth);
      if(isDisabledSecurity) {
        yield enableMasterToSlaveAccessControl(browser, url);
      }
    }

    if(isEnabledGitLab) {
      var gitlabUrl = process.env.GITLAB_URL;
      if(loginUser.uid === 'root') {
        yield gitlab.loginByAdmin(browser, gitlabUrl);
      } else {
        yield gitlab.login(browser, gitlabUrl, loginUser.uid, loginUser.userPassword);
      }
      yield configureGitLab(browser, url, gitlabUrl);
      yield createJobs(browser, jenkins, jobs, gitlabUrl);
      yield gitlab.logout(browser);
    }
  }
};