import {SEVERITY_TYPES} from "utils";

let appConfig = {
    apiPath: "/api",
    logger: {
        template: loggerTemplate,
        timestampFormat: "YYYY-MM-DD [[]hh:mm:ss[]]",
        defaultLevel: SEVERITY_TYPES.DEBUG,
        categories: {
            // "/tasks/taskRegistryService": SEVERITY_TYPES.DEBUG,
            // "/tasks/editUser/EditUserTaskForm": SEVERITY_TYPES.DEBUG
        }
    }
};

if (process && process.env && process.env.ENV === "development") {

	appConfig.apiPath = "/development/api"
} else if (process && process.env && process.env.ENV === "staging") {
    appConfig.apiPath = "/staging/api"
}

appConfig = Object.freeze(appConfig);

function loggerTemplate ({timestamp, category, messageLevel, message}){
	return `${timestamp} [${category}] (${messageLevel.toLowerCase()}) --> ${message}`
}

export default appConfig;