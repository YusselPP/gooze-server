
import {assert} from "utils";

Object.assign(download, {
    json,
    binary
});

Object.freeze(download);

export default download;

function json({data, fileName}) {
    return download({
        data: JSON.stringify(data, undefined, 2),
        fileName,
        type: "application/json"
    });
}

function binary({data, fileName}) {
    return download({
        data,
        fileName,
        type: "octet-stream"
    });
}

function download({data, fileName, type}) {
    const file = new Blob([data], {type});

    if (assert.object(window.navigator) && assert.function(window.navigator.msSaveOrOpenBlob)) {
        // Download on Edge and IE10+
        window.navigator.msSaveOrOpenBlob(file, fileName);
        return;
    }

    const el = document.createElement("a");

    el.href = URL.createObjectURL(file);
    el.download = fileName;

    document.body.appendChild(el);

    el.click();

    setTimeout(function () {
        document.body.removeChild(el);
        URL.revokeObjectURL(el.href);
    });
}