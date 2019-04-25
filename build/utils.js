
"use strict";

module.exports = {
	id: (input) => {
		return (input || "").trim().toLowerCase().replace("&#x27;", "'").replace(/[\s\W]+/g, "-");
	}
};
