
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


const DESTINATION = "../dist";
const DESTINATION_PATH = path.join(__dirname, DESTINATION);


// setup Metalsmith and run
module.exports = Metalsmith(__dirname)
	.source("../src")
	.destination(DESTINATION)

	.use(drafts())
	.use(collections())

	// add template file based on containing folder
	.use(each((file, p) => {
		if(!file.template) {
			file.template = path.join("tpl", p.substring(0, p.lastIndexOf("/"))) + ".html";
		}
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

			const COPY_TARGET = path.join(__dirname, "../stuff/aletheiansoc/OEBPS");

			fs.readdirSync(DESTINATION_PATH).forEach(file => {
				const target = makeTargetDir(file.replace(".html", ".pdf"));

				exec(`prince dist/${file} -o ${target}`, () => console.log(`* ${target}`));

				// aletheiansoc specific
				if(file.startsWith("aletheiansoc~")) {
					let source = path.join(DESTINATION_PATH, file); 
					let dest = path.join(COPY_TARGET, file.replace("aletheiansoc~", ""));

					dest = dest.replace("toc.html", "toc.ncx").replace("content.html", "content.opf");

					if(!dest.endsWith("aletheiansoc.html") && !dest.endsWith("blurb.html")) {
						fs.copyFile(source, dest, (err) => {
							if(err) {
								console.error(err);
							}
						});
					}
				}
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