
import ensure from "./ensure";
import assert from "./assert";

export function containedBy(array) {

	const target = ensure.array(array);

	return function (element) {
		return target.indexOf(element) >= 0;
	}

}

export function not(fn) {

	return function (...args) {
		return !fn(...args);
	}

}

export function prefixedSequence(prefix, start) {
	return compose(sequenceFrom(start), prefixWith(prefix))
}

export function sequenceFrom(start) {
	start = ensure.number(start);

	return function () {
		const next = start;
		start += 1;
		return next;
	}

}

export function prefixWith(prefix) {
	prefix = ensure.string(prefix);

	return function (value) {
		return `${prefix}${value}`;
	}

}

export function compose(...fns) {

	fns = ensure.array(fns);

	if (fns.length < 2) {
		throw new Error("Can't combine less that 2 functions");
	}

	return function (...args) {

		const [first, ...rest] = fns;

		return rest.reduce( (result, fn) => fn(result), first(...args));
	}

}

export function pluck(...args) {

    return function (obj) {
        return recursivePluck(obj, args);
	};

    function recursivePluck(state, path) {

        if (!assert.object(state)) {
            return state;
        }

        path = ensure.array(path);

        const [current, ...rest] = path;

        if (current === undefined) {
            return state;
        }

        return recursivePluck(state[current], ensure.array(rest));
    }

}

export function clamp(min, max) {
    return function (value) {
        return Math.max(min, Math.min(max, value));
    }
}