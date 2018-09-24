import {SEVERITY_TYPES} from "utils";

export default logger;

const levelHierarchy = {
	[SEVERITY_TYPES.DEBUG]: {level:1, method: "debug"},
	[SEVERITY_TYPES.INFO]: {level:2, method: "info"},
	[SEVERITY_TYPES.LOG]: {level:2, method: "log"},
	[SEVERITY_TYPES.WARNING]: {level:3, method: "warn"},
	[SEVERITY_TYPES.ERROR]: {level:4, method: "error"}
};

function logger(cat, options){
	const opts = options || {};

	const category = cat || "";
	const $log = opts.delegateLog || console;
	const level = opts.level || SEVERITY_TYPES.SEVERITY_WARNING;
	const supplant = opts.template || nullTemplate;
	const timestampFormatter = opts.timestampFormatter || nullTimestampFormat;
	const handlers = opts.handlers || [];

	return{
		debug: createLogFunction(SEVERITY_TYPES.DEBUG),
		log: createLogFunction(SEVERITY_TYPES.LOG),
		info: createLogFunction(SEVERITY_TYPES.INFO),
		warn: createLogFunction(SEVERITY_TYPES.WARNING),
		error: createLogFunction(SEVERITY_TYPES.ERROR),
		isEnabledForLevel: isEnabledForLevel,
		LEVELS: Object.keys(levelHierarchy)
	};

	function createLogFunction(functionLevel) {

		return customLogFunction;

		function customLogFunction() {

			if (levelHierarchy[functionLevel].level < levelHierarchy[level].level || ( !$log[levelHierarchy[functionLevel].method] )) {
				return;
			}

			const args = Array.prototype.slice.call(arguments);

			if (typeof args[0] === "string") {

				const log = {
					messageLevel: functionLevel,
					timestamp: timestampFormatter(Date.now()),
					category: category,
					message: args[0]
				};

				handlers.forEach(function (handler) {
					handler(log);
				});

				args[0] = supplant(log);
			}

			$log[levelHierarchy[functionLevel].method].apply(null, args);
		}
	}

	function isEnabledForLevel(testLevel) {
		return levelHierarchy[testLevel] && levelHierarchy[testLevel].value <= levelHierarchy[level].value;
	}
}

function nullTemplate(data) {
	return data && data.message;
}

function nullTimestampFormat(date) {
	return date.toString();
}