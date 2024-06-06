var oldConsoleLog;
var oldConsoleError;
var logger;

function runCollector() {
    logger.innerHTML = "";
    let codeText = document.getElementById("collectorCode").value.trim();
    eval("\"use strict\";" + codeText)
}

function main () {
    oldConsoleLog = console.log;
    oldConsoleError = console.error;
    logger = document.getElementById('loggerOutput');
    console.log = function () {
        for (var i = 0; i < arguments.length; i++) {
        logger.innerHTML += "<span class=\"hljs-meta prompt_\">&gt; </span>";
        if (typeof arguments[i] == 'object') {
            logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(arguments[i], undefined, 2) : arguments[i]) + '<br />';
        } else {
            logger.innerHTML += arguments[i] + '<br />';
        }
      }
    }
    console.error = function () {
        console.log("ERROR: ");
        console.log.apply(null, arguments);
    };
}