
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
const collections = require("./collections");

const EXCLUDE = require("./exclude.json");
const DESTINATION = "../dist";
const DESTINATION_PATH = path.join(__dirname, DESTINATION);


// setup Metalsmith and run
module.exports = Metalsmith(__dirname)
	.source("../src")
	.destination(DESTINATION)

	.use(drafts())
	.use(collections())

	.use(each((file, p) => {
		const folder = getTarget(p);

		// add template file based on containing folder
		if(!file.template) {
			file.template = path.join("tpl", "index.html");
		}

		// prefix directory with containing folder
		file.template = path.join(folder, file.template);

	}, ".md"))

	// convert from markdown to html
	.use(markdown({
		smartypants: true,
		gfm: true,
		tables: true,
		xhtml: true
	}))
	.use(sass({
		outputStyle: "expanded"
	}))
	.use(hb())

	// remove template files
	.use(each((file, p, files) => {
		const folder = path.join(getTarget(p), "tpl");

		if(p.startsWith(folder)) {
			delete files[p];
		}
	}))

	.build(err => {
		if(err) {
			console.error(err);
		}
		else {
			console.log("Writing:");

			fs.readdirSync(DESTINATION_PATH, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name).forEach(folder => {
				// skip if it's in the exclude list
				if(EXCLUDE.indexOf(folder) != -1) {
					return;
				}

				fs.readdirSync(path.join(DESTINATION_PATH, folder), { withFileTypes: true }).filter(dirent => !dirent.isDirectory()).map(dirent => dirent.name).forEach(file => {
					const source = path.join("dist", folder, file);
					const target = path.join(makeTargetDir(folder), file.replace(".html", ".pdf"));

					exec(`prince ${source} -o ${target}`, () => console.log(`* ${target}`));
				});
			});
		}
	});

function getTarget(target) {
	return target.substring(0, target.indexOf("/"));
}


function makeTargetDir(target) {
	const dir = path.join("pdf", target);

	if(!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	return dir;
}