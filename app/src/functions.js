// Functions that return functions end in "Fn", e.g. makeSomethingFn
var SECOND = 1000;
var MINUTE = SECOND*60;
var HOUR = MINUTE*60;
var DAY = HOUR*24;
var WEEK = DAY*7;

function is(obj, typeName) {
    return Object.prototype.toString.call(obj) === "[object "+typeName+"]";
}
function isBlank(obj) {
    return (typeof obj === "undefined") || obj === null || obj === "";
}
function seq() {
    var args = Array.prototype.slice.call(arguments);
    return function(startValue) {
        return args.reduce(function(result, func) {
            return func.call(func, result);
        }, startValue);
    };
}
function asDate(value) {
    if (value === null) {
        throw Error('asDate cannot format a null value');
    }
    return is(value, 'Date') ? value : new Date(value);
}
function blankInvalidDateString(string) {
    return (string === "Invalid Date") ? "" : string;
}
function formatDateString(date) {
    return date.toLocaleDateString();    
}
function formatDateTimeString(date) {
    return date.toLocaleString();    
}
function formatMs(ms) {
    if (!is(ms, "Number")) { 
        throw Error('formatMs cannot format a non-number value');
    }
    if (ms < MINUTE) {
        var s = Math.floor(ms/SECOND);
        return s + "s";
    } else if (ms < HOUR) {
        var m = Math.floor(ms/MINUTE);
        return m + "m " + formatMs(ms%MINUTE);
    } else if (ms < DAY) {
        var h = Math.floor(ms/HOUR);
        return h + "h " + formatMs(ms%HOUR);
    } else if (ms < WEEK) {
        var d = Math.floor(ms/DAY);
        return d + "d " + formatMs(ms%DAY);
    } else {
        var w = Math.floor(ms/WEEK);
        return w + "w " + formatMs(ms%WEEK);
    }
}
function formatTitleElement(text, i) {
    if (i === 0) {
        return text.toUpperCase();
    } else if (!/[a-zA-Z0-9]/.test(text)) {
        return " ";
    } else if (/[A-Z]/.test(text)) {
        return " " + text.toLowerCase();
    }
    return text.toLowerCase();
}
function formatTitleCase(string, defaultValue) {
    if (string) {
        return string.split("").map(formatTitleElement).join('');
    }
    return defaultValue || '';
}
function queryString(object) {
    var string = "";
    if (object) {
        string = Object.keys(object).filter(function(key) { 
            return typeof object[key] !== "undefined" && object[key] !== null && object[key] !== ""; 
        }).map(function(key) { 
            return encodeURIComponent(key) + "=" + encodeURIComponent(object[key]); 
        }).join("&");
    }
    return (string) ? ("?"+string) : string;
}
function formatVersionRange(minValue, maxValue) {
    if (!isBlank(minValue) && !isBlank(maxValue)) {
        return minValue + "-" + maxValue;
    } else if (!isBlank(minValue)) {
        return minValue + "+";
    } else if (!isBlank(maxValue)) {
        return "0-" + maxValue;
    }
    return "<i>All versions</i>";
}
function formatLanguages(value) {
    return (value) ? value.join(", ") : '';
}
function persistLanguages(value) {
    return (value) ? value.split(/\W*,\W*/).map(function(value) {
        return value.trim(); 
    }).filter(function(value) {
        return value.length > 0;
    }) : null;
}
function formatRoles(roles) {
    return (roles || []).map(function(role) {
        return (role === "admin") ? "Administrator" : formatTitleCase(role);
    });
}
function persistRoles(roles) {
    return (roles || []).map(function(role) {
        return (role === "Administrator") ? "admin" : role.toLowerCase().replace(" ","_");
    });
}
function notBlankName(array, value) {
    if (typeof value !== 'undefined' && value !== '<EMPTY>' && value.length > 0) {
        array.push(value);
    }
}
function formatName(participant) {
    var array = [];
    if (participant) {
        notBlankName(array, participant.firstName);
        notBlankName(array, participant.lastName);
        if (array.length === 0 && participant.email) {
            return participant.email;
        }
    }
    return (array.length === 0) ? '—' : array.join(' ');
}
// Convert date object as if it were a LocalDateTime object to the UTC timezone
function localDateTimeToUTC(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
}
function utcTolocalDateTime(date) {
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
}

function checkArgs(value) {
    if (arguments.length !== 1) { throw new Error(arguments); }
    return value;
}
function dateTimeString(date) {
    if (is(date, 'Date')) {
        return date.toISOString();
    }
    return null;
}

var formatDate = seq(checkArgs, asDate, formatDateString, blankInvalidDateString);
var formatDateTime = seq(checkArgs, asDate, formatDateTimeString, blankInvalidDateString);

module.exports = {
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatMs: formatMs,
    formatTitleCase: formatTitleCase,
    formatVersionRange: formatVersionRange,
    queryString: queryString,
    formatLanguages: formatLanguages,
    persistLanguages: persistLanguages,
    formatRoles: formatRoles,
    persistRoles: persistRoles,
    formatName: formatName,
    localDateTimeToUTC: seq(asDate, localDateTimeToUTC),
    utcTolocalDateTime: seq(asDate, utcTolocalDateTime),
    dateTimeString: dateTimeString
};