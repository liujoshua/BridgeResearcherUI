var ko = require('knockout');
var utils = require('../../utils');

module.exports = function(params) {
    var self = this;

    self.scheduleObs = ko.observable();
    self.scheduleObs.callback = utils.identity;

    params.strategyObs.callback = function () {
        var strategy = params.strategyObs();
        strategy.schedule = self.scheduleObs.callback();
        return strategy;
    };

    // This is fired when the parent viewModel gets a plan back from the server
    ko.pureComputed(function () {
        var strategy = params.strategyObs();
        self.scheduleObs(strategy.schedule);
    });
}