'use strict';
var through = require("through2");
var path = require("path");
var fs = require("fs");
var PluginError = require("plugin-error");
var File = require("vinyl");
var log = require("fancy-log");
var os = require("os");

module.exports = function(file, opt) {
	
	file = file || 'index.ts';  
	opt = opt || {};

	var fileName;
	var cwd;
	var ignoreToken = opt.ignoreToken || "/// tsindex:ignore";
	var tsIndex = [];

	if (typeof file === 'string') {
		fileName = file;
	} else if (typeof file.path === 'string') {
		fileName = path.basename(file.path);
	} else {
		throw new PluginError('gulp-create-tsindex', 'Missing file for gulp-create-tsindex');
	}

	const outputFilePath = path.dirname(fileName);

	function bufferContents(file, enc, cb) {
		this.push(file);

		if (file.isNull()) {
			cb();
			return;
		}

		if (file.isStream()) {
			this.emit('error', new PluginError('gulp-create-tsindex',  'Streaming not supported'));
			cb();
			return;
		}

		if(file.contents.toString().startsWith(ignoreToken)){
			log(`${path.basename(file.path)} is ignored from tsindex due to the presence of the token '${ignoreToken}'.`);
			cb();
			return;
		}		
		
		const ext = path.extname(file.path);
		const ext2 = path.extname(path.basename(file.path, ext));
		
		if ((ext === ".ts" && ext2 !== ".d") || (ext === ".tsx")) {	
			if (tsIndex.length == 0) {
				tsIndex.push("// Generated by gulp-create-tsindex");
				tsIndex.push("// https://github.com/Netatwork-de/gulp-create-tsindex");
			}
			
			cwd = file.cwd;			
			
			const filePath = path.relative(outputFilePath,file.path).replace(/\\/g, "/").replace(ext,"");
			tsIndex.push(`export * from "./${filePath}";`)
		}

		cb();
	}

	function endStream(cb) {
		
		if (tsIndex.length > 0) {				
			const indexFile = new File(
				{
					base: path.resolve(cwd, path.dirname(fileName)),
					path: path.resolve(cwd, fileName), 
					cwd: cwd,
					contents: new Buffer(tsIndex.join(os.EOL))
				});
						
			this.push(indexFile);
			log("Typescript index created");
		}
		cb();
	}

	return through.obj(bufferContents, endStream);
};
