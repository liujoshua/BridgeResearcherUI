var utils = require('../../utils');
var ko = require('knockout');
var hash = require('object-hash');
var root = require('../../root');

function ListsSource(elements, element) {
    this.currentListEntry = null;
    this.listSet = [];
    var md5s = {};
    elements.forEach(function(anElement) {
        var enumeration = getEnumeration(anElement);
        if (enumeration) {
            var entry = makeListMapEntry(enumeration);
            if (!md5s[entry.md5]) {
                md5s[entry.md5] = entry;
            } else {
                md5s[entry.md5].occurrences++;
            }
            if (anElement === element) {
                this.currentListEntry = entry;
            }
        }
    }, this);
    for (var key in md5s) {
        this.listSet.push(md5s[key]);
    }
    this.listSet.sort(utils.makeFieldSorter('name'));
}
ListsSource.prototype = {
    getAllLists: function() {
        return this.listSet;
    },
    getCurrentEntry: function() {
        return this.currentListEntry;
    },
    setCurrentEntry: function(entry) {
        this.currentListEntry = entry;
    }
}

function makeListMapEntry(enumeration) {
    var name = "&lt;empty&gt;";
    if (enumeration.length === 1) {
        name = itemLabel(enumeration[0]);
    } else if (enumeration.length === 2) {
        name = itemLabel(enumeration[0]) + " / " + itemLabel(enumeration[enumeration.length-1]);
    } else if (enumeration.length > 2) {
        name = itemLabel(enumeration[0]) + " to " + itemLabel(enumeration[enumeration.length-1]);
    }
    // tediously, knockout.js fails when there's no detail property
    enumeration.forEach(function(item) {
        item.detail = item.detail || null;
    });
    return {name: name, md5: hash.MD5(enumeration), enumeration: enumeration, occurrences: 1};
}

function itemLabel(item) {
    return (item.detail) ? ("<b>"+item.label+"</b>&mdash;"+item.detail) : ("<b>"+item.label+"</b>");
}

function copyEntry(element, entry) {
    if (element.constraints.enumerationObs) {
        element.constraints.enumerationObs([].concat(entry.enumeration));
    }

}

function getEnumeration(element) {
    var con = element.constraints;
    if (con && con.enumerationObs) {
        return con.enumerationObs();
    }
    return null;
}

module.exports = function(params) {
    var self = this;

    var parent = params.parentViewModel;
    self.elementsObs = parent.elementsObs;
    self.element = parent.element;

    self.labelObs = ko.observable();
    self.detailObs = ko.observable();
    self.valueObs = ko.observable();

    // Should we copy edits over to all the same lists.
    self.copyToAllEnumsObs = ko.observable(true);

    var listsSource = new ListsSource(self.elementsObs(), self.element);
    self.allLists = ko.observableArray(listsSource.getAllLists());

    self.listObs = ko.observableArray(listsSource.getCurrentEntry().enumeration);

    self.hasDetail = function(item) {
        return !!item.detail;
    };
    self.removeListItem = function(item) {
        self.listObs.remove(item);
    };
    self.selectList = function(entry, event) {
        self.listObs(entry.enumeration);
        listsSource.setCurrentEntry(entry);
        self.currentTabObs('editor');
    };
    self.handleKeyEvent = function(vm, event) {
        if (event.keyCode === 13) {
            self.addListItem();
            return false;
        }
        return true;
    };
    self.addListItem = function() {
        var label = self.labelObs();
        if (label) {
            var value = self.valueObs() || label;
            self.listObs.push({label: label, value: value, detail: self.detailObs()});
        }
        self.labelObs("");
        self.detailObs("");
        self.valueObs("");
    };
    self.saveList = function() {
        var entry = listsSource.getCurrentEntry();

        entry.enumeration = self.listObs();

        // We're looking for lists on other elements that were similar to the list before
        // the user started editing it, so we want the original MD5 before it gets
        // recalculated
        var oldMD5 = entry.md5;

        copyEntry(self.element, entry);
        if (self.copyToAllEnumsObs()) {
            self.elementsObs().forEach(function (element) {
                var enumeration = getEnumeration(element);
                if (enumeration && hash.MD5(enumeration) === oldMD5) {
                    copyEntry(element, entry);
                }
            });
        }
        root.closeDialog();
    };
    self.cancel = function() {
        root.closeDialog();
    };

    self.currentTabObs = ko.observable('editor');
    self.isActive = function(tag) {
        return tag === self.currentTabObs();
    };
    self.setTab = function(tabName) {
        return function(vm, event) {
            event.stopPropagation();
            self.currentTabObs(tabName);
        };
    };
};
