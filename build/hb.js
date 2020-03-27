
"use strict";

const path = require("path");
const fs = require("fs");

const Handlebars = require("handlebars");
const each = require("./each");
const id = require("./utils").id;
const markdown = require("./markdown");


// register helpers
Handlebars.registerHelper("makeId", context => {
	return id(context);
});

Handlebars.registerHelper("contains", (container, item, options) => {
	if((Array.isArray(container) && container.indexOf && container.indexOf(item) != -1) || (item in container)) {
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
	let data;

	if(options.data) {
		data = Handlebars.createFrame(options.data);
	}

	for(let i = 0; i < count; ++i) {
		if(data) {
			data.index = i;
		}

		buffer.push(options.fn(this, { data: data }));
	}

	return buffer.join("");
});

Handlebars.registerHelper("eq", (val1, val2) => {
	return val1 === val2;
});

Handlebars.registerHelper("lt", (val1, val2) => {
	return val1 < val2;
});

Handlebars.registerHelper("lte", (val1, val2) => {
	return val1 <= val2;
});

Handlebars.registerHelper("gt", (val1, val2) => {
	return val1 > val2;
});

Handlebars.registerHelper("gte", (val1, val2) => {
	return val1 >= val2;
});

Handlebars.registerHelper("markdown", text => {
	return markdown(text.toString());
});

Handlebars.registerHelper("markdown-nop", text => {
	return markdown(text.toString()).replace("<p>", "").replace("</p>", "").trim();
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

		file.originalContents = file.contents;
		file.contents = templates[template](clone);
	})
};
