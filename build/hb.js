
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
