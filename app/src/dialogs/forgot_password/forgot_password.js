var utils = require('../../utils');
var serverService = require('../../services/server_service');
var storeService = require('../../services/store_service');
var config = require('../../config');
var root = require('../../root');

var fields = ['email', 'study', 'environment', 'studyOptions[]'];

module.exports = function() {
    var self = this;

    var study = storeService.get('studyKey') || 'api';
    var env = storeService.get('environment') || 'production';

    utils.observablesFor(self, fields);
    self.studyObs(study);

    self.environmentOptions = config.environments;
    self.environmentObs.subscribe(function(newValue) {
        self.studyOptionsObs({name:'Updating...',identifier:''});
        serverService.getStudyList(newValue)
                .then(function(studies){
                    self.studyOptionsObs(studies.items);
                }).catch(utils.failureHandler(self));
    });
    self.environmentObs(env);

    self.sendResetPasswordRequest = function(vm, event) {
        if (self.emailObs() === "") {
            root.message('error', "Email address is required.");
            return;
        }
        storeService.set('environment', self.environmentObs());
        storeService.set('studyKey', self.studyObs());

        utils.startHandler(self, event);
        serverService.requestResetPassword(self.environmentObs(), {
            email: self.emailObs(), study: self.studyObs()
        })
        .then(function() {
            root.openDialog('sign_in_dialog');
        })
        .then(utils.successHandler(self, event, "An email has been sent to that address with instructions on changing your password."))
        .catch(utils.failureHandler(self, event));
    };
    self.cancel = function() {
        root.openDialog('sign_in_dialog');
    };
};