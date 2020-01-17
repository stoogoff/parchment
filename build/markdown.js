"use strict";

const marked = require("marked");
const utils = require("./utils");

let renderer = new marked.Renderer();
let open = false;
const PATTERN = /{([^}]+)}/;

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

	let attrs = attrsToString(hash);

	result.push(`<div ${attrs}><${heading}>${text}</${heading}>`);

	return result.join("\n");
};

renderer.link = (href, title, text) => {
	let noPage = href.startsWith("#") ? "" : ' class="no-page"';

	return `<a href="${href}"${noPage}>${text}</a>`;
};

renderer.paragraph = (text) => {
	// the paragraph only contains an image tag or starts with a figure just return the tag
	if(/^<img[^>]+>$/.test(text) || text.startsWith("<figure>")) {
		return text;
	}

	return `<p>${text}</p>\n`;
};

let image = renderer.image.bind(renderer);

renderer.image = (href, title, text) => {
	let result = image(href, title, text);

	// if no text is provided return the image
	if(text == "") {
		return result;
	}

	// if text is provided return the image wrapped in a figure with a caption
	return "<figure>" + result + `<figcaption>${text}</figcaption></figure>`;
};

renderer.blockquote = (quote) => {
	// check the first line to see if it contains the attribute delimiter {}
	let [first, ...lines] = quote.split("\n");
	let hash = {};

	if(PATTERN.test(first)) {
		hash = createAttrs(first);
		quote = lines.join("\n");
	}

	let attrs = attrsToString(hash);

	return `<blockquote ${attrs}>\n${quote}</blockquote>\n`;
};

// convert a hash to HTML attribute format
const attrsToString = (hash) => {
	return Object.keys(hash).map(attr => `${attr}="${Array.isArray(hash[attr]) ? hash[attr].join(" ") : hash[attr]}"`).join(" ");
};

// convert the {} delimited text to hash of id and class names
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