

import logger from "app/services/log/logger.component";
import moment from "moment";
import appConfig from "app/app.config";
import {SEVERITY_TYPES} from "utils";

const loggerConfig = appConfig.logger;
const handlers = [];

export function createLogger(category){
	const config = loggerConfig || {};
	const cat = category || "/";
	const categories = config.categories || {};
	const defaultLevel = config.defaultLevel || SEVERITY_TYPES.WARNING;
	const templateFunction = config.template || defaultTemplateFunction;
	const timestampFormat = config.timestampFormat || "YYYY-MM-DD [[]hh:mm:ss[]]";
	const handlers = [];

	const options = {
		delegateLog: console,
		level: getLevel(cat, categories, defaultLevel),
		template: templateFunction,
		// template: createTemplateFunction(templatePattern),
		timestampFormatter: createTimestampFormatter(timestampFormat),
		handlers: handlers
	};

	return logger(category, options);
}

export function createLoggerHandler(handler) {
	handlers.push(handler);
}

function getLevel(category, categories, defaultLevel) {
	if (category === "" || category === "/" || ( !categories)) {
		return defaultLevel;
	}
	return categories[category] || getLevel(getParentCategory(category), categories, defaultLevel);
}

function getParentCategory(category) {
	const childIndex = category.lastIndexOf("/");
	return category.substring(0, childIndex);

}

function createTimestampFormatter(pattern) {
	return function(date){
		return moment(date).format(pattern);
	}
}

function defaultTemplateFunction({timestamp, category, messageLevel, message}) {
	return `${timestamp} [${category}] (${messageLevel.toLowerCase()}) --> ${message}`;
}