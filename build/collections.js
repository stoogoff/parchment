
"use strict";

module.exports = function collections() {
	return (files, metalsmith, next) => {
		let data = metalsmith.metadata();
		let keys = [];

		Object.keys(files).forEach(path => {
			if(!files[path].collection) {
				return;
			}

			let collections = files[path].collection;

			if(!Array.isArray(collections)) {
				files[path].collection = collections = [collections];
			}

			collections.forEach(collection => {
				data[collection] = data[collection] || [];
				data[collection].push(files[path]);

				keys.push(collection);
			});
		});

		keys.forEach((key) => {
			data[key].sort((a, b) => a.sort == b.sort ? 0 : (a.sort > b.sort ? 1 : -1));
		});

		next();
	}
};