
const assert = Object.freeze({
	number: (value) => (
		typeof value === "number"
		&&	!isNaN(value)
		&&	isFinite(value)
	),
	boolean: (value) => (typeof value === "boolean"),
	string: (value) => (typeof value === "string"),
	object: (value) => (
		typeof value === "object"
		&&	value !== null
		&&	!Array.isArray(value)
	),
	date: (value) => (value instanceof Date),
	function: (value) => (typeof value === "function"),
	array: (value) => Array.isArray(value)
});

export default assert;