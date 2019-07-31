
"use strict";

const path = require("path");
const fs = require("fs");

const Handlebars = require("handlebars");
const each = require("./each");
const id = require("./utils").id;


// register helpers
Handlebars.registerHelper("makeId", context => {
	return id(context);
});

Handlebars.registerHelper("contains", (container, item, options) => {
	if(container.indexOf && container.indexOf(item) != -1) {
		return options.fn(this);
	}
	else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper("is", (property, value, options) => {
	if(property === value) {
		return options.fn(this);
	}
	else {
		return options.inverse(this);
	}
});

Handlebars.registerHelper("range", (count, options) => {
	let buffer = [];

	for(let i = 0; i < count; ++i) {
		buffer.push(options.fn(this));
	}

	return buffer.join("");
});

// store templates
let templates = {};


// get metalsmith metadata
function metadata(metalsmith, file) {
	let data = metalsmith.metadata();
	let clone = {};

	for(var meta in data) {
		clone[meta] = data[meta];
	}

	for(var prop in file) {
		clone[prop] = file[prop];
	}

	return clone;
}

module.exports = () => {
	return each((file, p, files, metalsmith) => {
		if(!("template" in file)) {
			return;
		}

		let clone = metadata(metalsmith, file);
		let template = file.template;

		if(!templates[template]) {
			let filePath = path.join(__dirname, "../src/") + template;
			let templateString = fs.readFileSync(filePath, "utf8")

			templates[template] = Handlebars.compile(templateString);
		}

		file.contents = templates[template](clone);
	})
};
