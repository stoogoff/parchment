
"use strict";

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const Metalsmith = require("metalsmith");
const markdown = require("./markdown");
const drafts = require("metalsmith-drafts");
const sass = require("metalsmith-sass");

const each = require("./each");
const is = require("./is");
const hb = require("./hb");
const collections = require("./collections");

const INCLUDE = require("./include.json");
const DESTINATION = "../dist";
const DESTINATION_PATH = path.join(__dirname, DESTINATION);


// setup Metalsmith and run
Metalsmith(__dirname)
	.source("../src")
	.destination(DESTINATION)

	.use(drafts())

	// only process files where the parent folder is in the include list
	.use(each((file, p, files) => {
		const target = getTarget(p);

		if(INCLUDE.indexOf(target) == -1) {
			delete files[p];
		}
	}))
	.use(collections())

	.use(each((file, p, files) => {
		// prefix template directory with containing folder
		if(file.template) {
			file.template = path.join(getTarget(p), file.template);
		}
	}, ".md"))

	// convert from markdown to html
	.use(each((file, p, files) => {
		let filename = p.replace(".md", ".html");

		file.contents = Buffer.from(markdown(file.contents.toString()));

		delete files[p];

		files[filename] = file;

	}, ".md"))

	// custom post process for each project
	.use(each((file, p, files) => {
		if(p.endsWith("post-markdown.js")) {
			const folder = getTarget(p);
			const post = require(path.join("../src", p));

			Object.keys(files).forEach(p2 => {
				if(is.ext(p2, ".html") && getTarget(p2) == folder) {
					files[p2].contents = post(files[p2]);
				}
			});

			delete files[p];
		}
	}, ".js"))

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

	// remove html files which don't have a template
	.use(each((file, p, files) => {
		if(!file.template) {
			delete files[p];
		}
	}, ".html"))

	.build(err => {
		if(err) {
			console.error(err);
		}
		else {
			console.log("Writing:");

			fs.readdirSync(DESTINATION_PATH, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name).forEach(folder => {
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