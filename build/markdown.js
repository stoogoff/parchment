"use strict";

const marked = require("marked");
const utils = require("./utils");

// regex pattern for matching id and class name blocks, these are always in the form:
// { #newId .className1 .className2 }
const PATTERN = /{([^}]+)}/;

// regex pattern for matching multiple empty th
const EMPTY_CELL = /<t[hd]><\/t[hd]>/g;

// tracking opening and closing state for wrapping container divs around headings
let open = false;

// create a renderer and override its methods
let renderer = new marked.Renderer();

// store some existing methods for later reuse
const image = renderer.image.bind(renderer);
const table = renderer.table.bind(renderer);
const tablerow = renderer.tablerow.bind(renderer);


// override headings to wrap their content in a div so the output is...
// <div id="h3-title" class="h3-container container">
//    <h3>Title</h3>
//    ... rest of content...
// </div>
// heading IDs default to
//   h{level}-{text}
// where utils.id is used to strip text of spaces and other inappropriate characters
// heading class names always add
//   container
//   h{level}-container
// IDs can be overwritten in the form { #newId }
// class names can be added to (but not replace) in the form { .newClass1 .newClass 2 }
// these can be combined { #newId .newClass1 .newClass 2 }
renderer.heading = (text, level) => {
	const heading = `h${level}`;
	const result = [];

	if(open) {
		result.push("\n</div>");
	}

	open = true;

	let hash = {};

	if(PATTERN.test(text)) {
		hash = createAttrs(text);
		text = text.replace(PATTERN, "").trim();
	}

	// add hash to ID after attr checks as the heading might have a class but no ID,
	// in which case the class will be part of the ID
	if(!("id" in hash)) {
		hash["id"] = heading + "-" + utils.id(text);
	}

	if(!("class" in hash)) {
		hash["class"] = [];
	}

	hash["class"].push(heading + "-container");
	hash["class"].push("container");

	let attrs = attrsToString(hash);

	result.push(`<div ${attrs}><${heading}>${text}</${heading}>`);

	return result.join("\n");
};


// override link add the class no-page if the target is external to the document
// this is verified by checking if the target starts with a hash
renderer.link = (href, title, text) => {
	let noPage = href.startsWith("#") ? "" : ' class="no-page"';

	return `<a href="${href}"${noPage}>${text}</a>`;
};


// override paragraph to not wrap img and figure tags with p tags
renderer.paragraph = (text) => {
	// the paragraph only contains an image tag or starts with a figure just return the tag
	if(/^<img[^>]+>$/.test(text) || text.startsWith("<figure>")) {
		return text;
	}

	return `<p>${text}</p>\n`;
};


// override blockquote to allow an ID and class names to be specified in the first line
// > { #newId .className1 .className2 }
// > ...text...
renderer.blockquote = (quote) => {
	// check the first line to see if it contains the attribute delimiter {}
	let [first, ...lines] = quote.split("\n");
	let hash = {};

	if(PATTERN.test(first)) {
		hash = createAttrs(first);
		quote = "<p>" + lines.join("\n");
	}

	let attrs = attrsToString(hash);

	return `<blockquote ${attrs}>\n${quote}</blockquote>\n`;
};


// override image use a figure and figcaption for alt text
// if alt text is supplied the output is:
// <figure>
//   <img src="{href}" alt="{alt}" title="{title}" />
//   <figcaption>{alt}</figcaption>
// </figure>
// it would be better to use the title for this purpose but the alt text isn't used in a PDF
// and the syntax for alt is simpler
// if no alt text is provided then the following is returned:
// <img src="{href}" title="{title}" />
renderer.image = (href, title, alt) => {
	let result = image(href, title, alt);

	// if no alt text is provided return the image
	if(alt == "") {
		return result;
	}

	// if alt text is provided return the image wrapped in a figure with a caption
	return "<figure>" + result + `<figcaption>${alt}</figcaption></figure>`;
};


// override table to close a heading div if one is open
// this also wraps the table in <div class="table"></div>
renderer.table = (header, body) => {
	const result = [];

	if(open) {
		result.push("\n</div>");
		open = false;
	}

	result.push("<div class='table'>");
	result.push(table(header, body));
	result.push("</div>");

	return result.join("\n");
};


// override tablerow to remove multiple empty th
// if empty th are found a colspan is added to the previous th
// this is very primitive and likely to break...
renderer.tablerow = (content) => {

	let cells = content.split("\n");

	cells.forEach((cell, idx) => {
		// ignore first empty cell
		if(idx == 0) {
			return;
		}

		let match = cell.match(EMPTY_CELL);
		if(match) {
			cells[idx] = "";
			cells[idx - 1] = cells[idx - 1].replace("<th>", '<th colspan="2">');
		}
	})

	return tablerow(cells.join("\n"));
};


// helper functions

// convert a hash to HTML attribute format
// the hash format looks like this:
// hash["attrName1"] = "string value";
// hash["attrName2"] = ["array", "of", "string", "values"];
const attrsToString = (hash) => {
	return Object.keys(hash).map(attr => `${attr}="${Array.isArray(hash[attr]) ? hash[attr].join(" ") : hash[attr]}"`).join(" ");
};


// convert the {} delimited text to hash of id and class names
// matched text is in the format:
// { #newId .className1 .className2 }
const createAttrs = (text) => {
	let hash = {};

	text.match(PATTERN)[1].trim().split(" ").forEach(attr => {
		if(attr.startsWith("#")) {
			hash["id"] = attr.replace("#", "");
		}
		else if(attr.startsWith(".")) {
			hash["class"] = hash["class"] || [];
			hash["class"].push(attr.replace(".", ""));
		}
	});

	return hash;
};


// marked settings
const SETTINGS = {
	smartypants: true,
	gfm: true,
	tables: true,
	xhtml: true,
	renderer: renderer
};

module.exports = (text) => {
	open = false;

	let result = marked(text, SETTINGS);

	if(open) {
		result += "</div>";
	}

	return result;
};