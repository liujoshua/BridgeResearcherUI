var ko = require('knockout');
require('knockout-postbox');
var toastr = require('toastr');
var config = require('./config');
var $ = require('jquery');
var alerts = require('./widgets/alerts');
var fn = require('./functions');

var FAILURE_HANDLER = failureHandler({transient:true});
var GENERIC_ERROR = "A server error happened. We don't know what exactly. Please try again.";
var TIMEOUT_ERROR = "The request timed out. Please verify you have an internet connection, and try again.";
var ROLE_ERROR = 'You do not appear to be a developer, researcher, or admin.';
var pendingControl = null;
toastr.options = config.toastr;

var statusHandlers = {
      0: localError,
    400: badResponse,
    404: notFound,
    409: badResponse,
    412: notAdmin,
    500: serverError
};
function badResponse(response, params) {
    // If the error does not return JSON, we have to hunt around for what happened, 
    // and that gets sorted out here.
    var payload = response.responseJSON || {};
    payload.message = payload.message || response.responseText;
    if (!params.transient && !payload.errors) {
        payload.errors = {};
    }
    ko.postbox.publish("showErrors", payload);
}
function localError(response) {
    var error = (response.statusText === "timeout") ? TIMEOUT_ERROR : GENERIC_ERROR;
    toastr.error(error);
}
function notAdmin(response) {
    toastr.error(ROLE_ERROR);
}
function notFound(response, params) {
    if (params.redirectTo) {
        var root = require('./root'); // insane, but has to happen here.
        document.location = "#/" + params.redirectTo;
        root.changeView(params.redirectTo);
        if (params.redirectMsg) {
            setTimeout(function() {
                toastr.warning(params.redirectMsg);
            },500);
        }
    } else {
        badResponse(response, params);
    }
}
function serverError(response) {
    toastr.error(JSON.stringify(response.responseJSON));
}
function errorMessageHandler(message, params) {
    if (params.transient) {
        toastr.error(message);
    } else {
        var payload = {"message":message};
        ko.postbox.publish("showErrors", payload);
    }
}
function statusNotHandled(res) {
    console.error("Response code not handled", res.status);
}
/**
 * params:
 *  transient: boolean, default: true
 *  redirectTo: string, default null
 *  redirectMsg: message
 *  scrollTo: scrollTo function to execute.
 */
function failureHandler(params) {
    if (arguments.length === 0) {
        return FAILURE_HANDLER;
    }
    if (typeof params.transient !== "boolean") {
        params.transient = true;
    }
    return function(response) {
        clearPendingControl();
        ko.postbox.publish("clearErrors");

        console.error(response);
        if (typeof response === "string") {
            errorMessageHandler(response, params);
        } else if (fn.is(response.status,'Number')) {
            var handler = statusHandlers[ response.status ] || statusNotHandled;
            handler(response, params);
        } else if (response.message) {
            errorMessageHandler(response.message, params);
        } else {
            console.error("Response object not handled", response);
        }
        if (params.scrollTo) {
            scrollTo(1);
        }
    };
}
function makeOptionFinder(arrayOrObs) {
    return function(value) {
        var options = ko.unwrap(arrayOrObs);
        for (var i= 0; i < options.length; i++) {
            var option = options[i];
            if (option.value === value) {
                return option;
            }
        }
    };
}
function makeOptionLabelFinder(arrayOrObs) {
    var finder = makeOptionFinder(arrayOrObs);
    return function(value) {
        var option = finder(value);
        return option ? option.label : "";
    };
}
function displayPendingControl(control) {
    clearPendingControl();
    control.classList.add("loading");
    pendingControl = control;
}
function clearPendingControl() {
    if (pendingControl) {
        pendingControl.classList.remove("loading");
        pendingControl = null;
    }
}
function createEmailTemplate(email, identifier) {
    var parts = email.split("@");
    if (parts[0].indexOf("+") > -1) {
        parts[0] = parts[0].split("+")[0];
    }
    return parts[0] + "+" + identifier + "@" + parts[1];
}
function atLeastOneSignedConsent(consentHistories) {
    if (Object.keys(consentHistories).length === 0) {
        return true;
    }
    // At least one consent history whose last item has not been withdrawn.
    return Object.keys(consentHistories).some(function(guid) {
        var history = consentHistories[guid];
        if (history.length === 0) {
            return true;
        }
        var last = history[history.length-1];
        return (last && typeof last.withdrewOn === "undefined");
    });
}
function copyString(value) {
    var p = document.createElement("textarea");
    p.style = "position:fixed;top:0;left:0";
    p.value = value;
    document.body.appendChild(p);
    p.select();
    if (document.execCommand && document.execCommand('copy')) {
        toastr.success("Copied: " + value);
    } else {
        toastr.error("Could not copy value.");        
    }
    document.body.removeChild(p);
}
function findStudyName(studies, studyIdentifier) {
    try {
        return (studies || []).filter(function(studyOption) {
            return (studyOption.identifier === studyIdentifier);
        })[0].name;
    } catch(e) {
        throw new Error("Study '"+studyIdentifier+"' not found.");
    }
}
function startHandler(vm, event) {
    if (event && event.target) {
        displayPendingControl(event.target);
    }
    ko.postbox.publish("clearErrors");
}
function successHandler(vm, event, message) {
    return function(response) {
        clearPendingControl();
        ko.postbox.publish("clearErrors");
        if (message) {
            toastr.success(message);
        }
        return response;
    };
}
function makeScrolTo(itemSelector) {
    return function scrollTo(index) {
        var offset = $(".fixed-header").outerHeight() * 1.75;
        var $scrollbox = $(".scrollbox");
        var $element = $scrollbox.find(itemSelector).eq(index);
        if ($scrollbox.length && $element.length) {
            $scrollbox.scrollTo($element, {offsetTop: offset});
            setTimeout(function() {
                $element.find(".focus").focus().click();
            },20);
        }
    };
}
function createParticipantForID(email, identifier) {
    return {
        "email": createEmailTemplate(email, identifier),
        "password": identifier,
        "externalId": identifier,
        "sharingScope": "all_qualified_researchers"
    };
}
function fadeUp() {
    return function(div) {
        if (div.nodeType === 1) {
            var $div = $(div);
            $div.slideUp(function() { $div.remove(); });
        }
    };
}
// TODO: Can we consolidate with fadeRemove binding?
function animatedDeleter(scrollTo, elementsObs, selectedElementObs) {
    return function(element, event) {
        event.stopPropagation();
        alerts.deleteConfirmation("Are you sure you want to delete this?", function() {
            setTimeout(function() {
                var index = elementsObs.indexOf(element);
                elementsObs.splice(index,1);
                setTimeout(function() {
                    if (selectedElementObs) {
                        selectedElementObs(index);
                    } else {
                        scrollTo(index);
                    }
                }, 300);
            }, 500);
        });
    };
}

module.exports = {
    /**
     * A start handler called before a request to the server is made. All errors are cleared
     * and a loading indicator is shown. This is not done globally because some server requests
     * happen in the background and don't signal to the user that they are occurring.
     * @param vm
     * @param event
     */
    startHandler: startHandler,
    /**
     * An Ajax success handler for a view model that supports the editing of a form.
     * Turns off the loading indicator on the button used to submit the form, and
     * clears error fields.
     * @param vm
     * @param event
     * @returns {Function}
     */
    successHandler: successHandler,
    clearPendingControl: clearPendingControl,
    /**
     * Given an array of option objects (with the properties "label" and "value"),
     * return a function that will return a specific option given a value.
     * @param options array or observableArray
     * @returns {Function}
     */
    makeOptionFinder: makeOptionFinder,
    /**
     * Given an array of option objects (with the properties "label" and "value"),
     * return a function that will return an option label given a value.
     * @param options array or observableArray
     * @returns {Function}
     */
    makeOptionLabelFinder: makeOptionLabelFinder,
    /**
     * The logic for the scrollbox scrolling is not idea so isolate it here where we
     * can fix it everywhere it is used.
     * @param itemSelector
     * @returns {scrollTo}
     */
    makeScrollTo: makeScrolTo,
    fadeUp: fadeUp,
    createParticipantForID: createParticipantForID,
    animatedDeleter: animatedDeleter,
    findStudyName: findStudyName,
    atLeastOneSignedConsent: atLeastOneSignedConsent,
    copyString: copyString,
    failureHandler: failureHandler
};
