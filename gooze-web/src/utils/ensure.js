
import assert from "./assert";
import empty from "./empty";

const ensure = Object.freeze({
	number: createEnsure(assert.number, 0),
	boolean: createEnsure(assert.boolean, false),
	string: createEnsure(assert.string, ""),
	object: createEnsure(assert.object, () => ({}) ),
	date: createEnsure(assert.date, () => (new Date()) ),
	function: createEnsure(assert.function, () => (empty) ),
	array: createEnsure(assert.array, () => [] )
});

export default ensure;

function createEnsure(booleanCheck, fallbackDefaultValue) {

	return ensureFn;

	function ensureFn(value, defaultValue) {
		return (
			booleanCheck(value)
				? value
				: ensureFn(
					defaultValue,
					typeof fallbackDefaultValue === "function"
						? fallbackDefaultValue()
						: fallbackDefaultValue
				)
		);
	}

}