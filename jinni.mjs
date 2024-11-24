//const fs = require('fs');
//const path = require('path');
//const { exec, spawn } = require('child_process');
//const util = require('util');
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process'
import util from 'util';

//const vfs = require('./vfs');
//const createParser = require('./jparser');
import vfs from './vfs.mjs';

import { createParser } from './jparser.mjs';
import ErrorManager from './ErrorManager.mjs';
import ImportManager from './ImportManager.mjs';

// promisify exec
const execPromise = util.promisify(exec);

if (process.argv.length < 3) {
  console.error('يرجا ئعطائ ملف جني');
  process.exit(1);
}

var mainFilePath = null;
var jinniParams = [];
var userParams = [];

var processArgs = process.argv.slice(2);

// parse parameters
processArgs.forEach(arg => {
	if (arg.startsWith('--') && !mainFilePath) {
		jinniParams.push(arg);
	} else if (!arg.startsWith('--') && !mainFilePath) {
		mainFilePath = path.resolve(arg);
	} else {
		userParams.push(arg);
	}
});

//var mainFilePath = path.resolve(process.argv[2]);
var is_nowarning = jinniParams.includes('--nowarnings') || jinniParams.includes('--nowarning');
var is_web = jinniParams.includes('--web');
var is_norun = jinniParams.includes('--norun');
var is_nocompile = jinniParams.includes('--nocompile');

ErrorManager.showWarnings = !is_nowarning;

if (!mainFilePath.endsWith('.جني')) {
	console.error('يرجا ئعطائ ملف جني');
	process.exit();
}

const projectPath = path.resolve(path.dirname(mainFilePath));
const fileName = path.basename(mainFilePath, '.جني');
const outPath = path.join(projectPath, '__خام__');

vfs.mainFilePath = mainFilePath;
vfs.projectPath = projectPath;
vfs.outputPath = outPath;

if (is_nocompile) {
	runScript();
	process.exit();
}


// remove then create bin folder
try {
	fs.rmSync(outPath, { recursive: true });
} catch (err) {
} finally {
	fs.mkdirSync(outPath);
}

// compile the given main script file
let code;
try {
	const data = fs.readFileSync(mainFilePath, 'utf8');
	code = data;
} catch (error) {
	console.error('فشلت قرائة الملف: ', error);
}

try {
	const parser = createParser();
	const result = await parser.parse(code, {
		filePath: mainFilePath,
		projectPath: projectPath,
		outPath: outPath
	});
} catch (error) {
	let projectBasePath = path.dirname(projectPath);
	console.error("ملف: " + mainFilePath.replace(projectBasePath, ''));
	console.error(error);
}

// compile worker module
var workerFilePath = path.join(projectPath, 'مشتغلات.جني');
try {
	code = fs.readFileSync(workerFilePath, 'utf8');
} catch (error) {
	code = "";
}

try {
	const parser = createParser();
	const result = await parser.parse(code, {
		filePath: workerFilePath,
		projectPath: projectPath,
		outPath: outPath
	});
} catch (error) {
	let projectBasePath = path.dirname(projectPath);
	console.error("ملف: " + workerFilePath.replace(projectBasePath, ''));
	console.error(error);
}

console.log(ErrorManager.printAll(false));

if (ErrorManager.isBlocking) {
	console.error('خطئين فادحين، ترجا المراجعة');
	process.exit();
}

// generate files
if (is_web) {
	// template index.html
	var indexhtml;
	try {
		indexhtml = fs.readFileSync(path.join(vfs.execdir(), './templates/index.html'), 'utf8');
	} catch (error) {
		console.error('فشلت قرائة الملف: ', error);
	}
	// template server.mjs
	var serverjs;
	try {
		serverjs = fs.readFileSync(path.join(vfs.execdir(), './templates/server.mjs'), 'utf8');
	} catch (error) {
		console.error('فشلت قرائة الملف: ', error);
	}
	
	
	// template package.json
	var packagejson;
	try {
		packagejson = fs.readFileSync(path.join(vfs.execdir(), './templates/package.json'), 'utf8');
	} catch (error) {
		console.error('فشلت قرائة الملف: ', error);
	}

	// process and create index.html
	indexhtml = indexhtml.replace('%ئسملف%', fileName);
	try {
		fs.writeFileSync(path.join(projectPath, 'index.html'), indexhtml, { flag: 'w+' });
	} catch (error) {
		console.error('فشلت الكتابة في الملف: ', error);
	}
	
	// run jiss
	(async function runJiss() {
		try {
			const { stdout, stderr } = await execPromise('jinni --nowarnings --nocompile ~/.jinni/jiss/جيسس.جني ' + path.join(projectPath));
			console.log(stdout);
			if (stderr) {
				console.error(stderr);
			}
		} catch (error) {
			console.error(error.message);
		}
	})();
	
	// process and create server.mjs
	try {
		fs.writeFileSync(path.join(projectPath, 'server.mjs'), serverjs, { flag: 'w+' });
	} catch (error) {
		console.error('فشلت الكتابة في الملف: ', error);
	}
	
	// process and create package.json
	var deps = {'express':'latest'};
	ImportManager.dependencies.forEach(d => {
		if (!deps[d]) {
			deps[d] = 'latest';
		}
	});
	packagejson = packagejson.replace('%ئعتمادين%', JSON.stringify(deps));
	try {
		fs.writeFileSync(path.join(projectPath, 'package.json'), packagejson, { flag: 'w+' });
	} catch (error) {
		console.error('فشلت الكتابة في الملف: ', error);
	}
	
	// run server
	runScript(path.join(projectPath, 'server.mjs'));
	
} else {
	
	// template package.json
	var packagejson;
	try {
		packagejson = fs.readFileSync(path.join(vfs.execdir(), './templates/package.json'), 'utf8');
	} catch (error) {
		console.error('فشلت قرائة الملف: ', error);
	}
	
	// process and create package.json
	var deps = {};
	ImportManager.dependencies.forEach(d => {
		if (!deps[d]) {
			deps[d] = 'latest';
		}
	});
	packagejson = packagejson.replace('%ئعتمادين%', JSON.stringify(deps));
	try {
		fs.writeFileSync(path.join(projectPath, 'package.json'), packagejson, { flag: 'w+' });
	} catch (error) {
		console.error('فشلت الكتابة في الملف: ', error);
	}
	
	// run
	var scriptPath = path.join(projectPath, '__خام__', fileName + '.mjs');
	runScript(scriptPath, userParams);
}

async function runScript(myscript, params = []) {
	try {
		const { stdout, stderr } = await execPromise('npm install');
		console.log(stdout);
		if (stderr) {
			console.log(stderr);
		}
	} catch (error) {
		console.error(error.message);
	}
	
	// run script if requested
	if (!is_norun) {
		const child = spawn('node', [myscript, ...params]);
		child.stdout.on('data', (data) => {
			console.log(`${data}`);
		});
		child.stderr.on('data', (data) => {
			console.log(`${data}`);
		});
	}
}
