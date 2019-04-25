
"use strict";

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const Metalsmith = require("metalsmith");
const markdown = require("metalsmith-markdown");
const drafts = require("metalsmith-drafts");
const sass = require("metalsmith-sass");

const each = require("./each");
const is = require("./is");
const hb = require("./hb");


const DESTINATION = "../dist";


// setup Metalsmith and run
module.exports = Metalsmith(__dirname)
	.source("../src")
	.destination(DESTINATION)

	.use(drafts())

	// add template file based on containing folder
	.use(each((file, p) => {
		file.template = path.join("tpl", p.substring(0, p.lastIndexOf("/"))) + ".html";
	}, ".md"))

	// convert from markdown to html
	.use(markdown({
		smartypants: true,
		gfm: true,
		tables: true,
		xhtml: true
	}))
	.use(sass({
		outputStyle: "expanded",
		outputDir: "css/"
	}))
	.use(hb())

	// remove template files
	.use(each((file, p, files) => {
		if(p.startsWith("tpl")) {
			delete files[p];
		}
	}, ".html"))

	// remove directory
	.use(each((file, p, files) => {
		let newPath = p.replace("/", "~");

		files[newPath] = files[p];

		delete files[p];

	}, ".html"))

	.build(err => {
		if(err) {
			console.error(err);
		}
		else {
			console.log("Writing:");

			fs.readdirSync(path.join(__dirname, DESTINATION)).forEach(file => {
				const target = makeTargetDir(file.replace(".html", ".pdf"));

				exec(`prince dist/${file} -o ${target}`, () => console.log(`* ${target}`));
			});
		}
	});


function makeTargetDir(target) {
	target = target.split("~");

	const dir = `pdf/${target[0]}`;

	if(!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	return dir + "/" + target[1];
}