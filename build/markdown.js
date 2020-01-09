"use strict";

const marked = require("marked");
const utils = require("./utils");

let renderer = new marked.Renderer();
let open = false;

renderer.heading = (text, level) => {
	const heading = `h${level}`;
	const id = heading + "-" + utils.id(text);
	const result = []

	if(open) {
		result.push("\n</div>");
	}

	open = true;

	result.push(`<div id="${id}"><${heading}>${text}</${heading}>`);

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
}

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