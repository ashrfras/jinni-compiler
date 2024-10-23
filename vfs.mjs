import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const SRCDBNAME = 'jinni:';
const BINDBNAME = 'jinnibin:';

export class vfs {
	
	static mainFilePath;
	static projectPath;
	static outputPath;
	
	static execdir () {
		if (isNode()) {
			var __filename = fileURLToPath(import.meta.url);
			return dirname(__filename);
		} else if (isBrowser()) {
			return SRCDBNAME;
		}
	}
	static مجلدتنفيد = vfs.execdir;
	
	// gives the exact file name without extension
	static basename (fpath) {
		if (isNode()) {
			return path.basename(fpath, '.جني');
		} else if (isBrowser()) {
			var splitted = fpath.split('.');
			// splitted.length-1 = جني
			return splitted[splitted.length-2];
		}
	}
	static مجلدئساس = vfs.basename;
	
	// gives project path from given main file path
	// on browser project path is dbname:
	static getProjectPath (mainfilepath) {
		if (isNode()) {
			if (mainfilepath) {
				vfs.projectPath = path.resolve(path.dirname(mainFilePath));
			}
		} else if (isBrowser()) {
			// if browser then dbname
			vfs.projectPath = SRCDBNAME;
		}
		return vfs.projectPath;
	}
	static ردمجلدمشروع = vfs.getProjectPath;
	
	// gives dotted file path relative to project
	// like ئساسية.نصية.mjs
	static relativeBasePath (fpath) {
		var fileName;
		
		if (isNode()) {
			let projectPath = vfs.getProjectPath();
			fileName = fpath.replace(projectPath, '.').replace('.جني', '.mjs');
			fileName = fileName.replace(vfs.execdir(), '.');
			fileName = fileName.replaceAll('/', '.').replace('..', '/');
		} else if (isBrowser()) {
			fileName = '/' + fpath.replace('.جني', '.mjs');
		}
		
		// make sure not to repeat last two names: ئساسية.ئساسية.جني becomes ئساسية.جني
		var nameArr = fileName.split('.');
		var lastName = nameArr[nameArr.length - 2];
		var lastLastName = nameArr[nameArr.length - 3];
		if (lastLastName) {
			if (lastName == lastLastName.replace('/', '')) {
				fileName = fileName.replace(lastName + '.', '');
			}
		}
		
		return fileName;
	}
	static ئسملفنسبي = vfs.relativeBasePath;
	
	// gives output (compiled bin) path from given main file path
	// on browser, output path is output dbname
	static getOutputPath (mainfilepath) {
		if (isNode()) {
			if (mainfilepath) {
				var projectPath = vfs.getProjectPath(mainfilepath);
				vfs.outputPath = path.join(projectPath, '__خام__');
			}
		} else if (isBrowser()) {
			// if browser then dbname
			vfs.outputPath = BINDBNAME;
		}
		return vfs.outputPath;
	}
	static ردمجلدخام = vfs.getOutputPath;
	
	// returns the full path of the compiled output file
	static outputFilePath (fileName) {
		if (isNode()) {
			return path.join(vfs.getOutputPath(), fileName);
		} else if (isBrowser()) {
			return vfs.getOutputPath() + fileName;
		}
	}
	static مسارملفخام = vfs.outputFilePath;
	
	static writeFile (filePath, content) {
		if (isNode()) {
			fs.writeFile(filePath, content, { flag: 'w+' }, (err) => {
				if (err) {
					throw new Error('فشل حفض الملف: ' + filePath);
				}
			});	
		} else if (isBrowser()) {
			var dbName = vfs.getDbName(filePath);
			var myDb = new PouchDB(dbName);
			//var nodbPath = vfs.getNodbPath(filePath);
			var fulfilled = false;
			myDb.put({
				_id: filePath,
				content
			}).then(() => fulfilled = true);
			
			while (!fulfilled) {}; // wait for promise, bad but for compatibility
		}
	}
	static ئكتبملف = vfs.writeFile;
	
	static readFile (filePath) {
		if (isNode()) {
			try {
				return fs.readFileSync(filePath, 'utf8');
			} catch (e) {
				return false;
			}
		} else if (isBrowser()) {
			var dbName = vfs.getDbName(filePath);
			var myDb = new PouchDB(dbName);
			var fulfilled = false;
			var myDoc;
			myDb.get(filePath).then((doc) => {
				fulfilled = true;
				myDoc = doc;
			});
			while (!fulfilled) {}; // wait for promise, bad but for compatibility
			if (myDoc) {
				return myDoc.content;
			} else {
				return false;
			}
		}
	}
	static ئقرئملف = vfs.readFile;
	
	static getDbName (filePath) {
		if (!filePath.includes(':')) {
			throw new Error('المسار لا يتضمن قاعدة بيانات: ' + filePath);
		}
		var splitted = filePath.split(':');
		return splitted[0];
	}
	static ردئسمقاب = vfs.getDbName;
	
	// get filepath without db part
	static getNoDbPath (filePath) {
		if (!filePath.includes(':')) {
			return filePath;
		} else {
			var dbName = vfs.getDbName(filePath) + ':';
			return filePath.replace(dbName, '');
		}
	}
	static مساربلاقاب = vfs.getNoDbPath;
	
	// removes dir/db at given path and/to recreate empty one
	static remakeDir (dirPath) {
		if (isNode()) {
			try {
				fs.rmSync(dirPath, { recursive: true });
			} catch (err) {
			} finally {
				fs.mkdirSync(dirPath);
			}
		} else if (isBrowser()) {
			var dbName = vfs.getDbName(dirPath);
			var myDb = new PouchDB(dbName);
			var fulfilled = false;
			myDb.destroy().then(() => fulfilled = true);
			while (!fulfilled) {}; // wait for promise, bad but for compatibility
		}
	}
	static ئعدئنشائ = vfs.remakeDir;
	
	static joinPath (elem1, elem2) {
		if (isNode()) {
			return path.join(elem1, elem2);
		} else if (isBrowser()) {
			var str = elem1 + '/' + elem2;
			return str.replaceAll('//', '/').replaceAll(':/', '/');
		}
	}
	static ئدمجمسار = vfs.joinPath;
	
	// directory path of the given filepath
	static dirname (filepath) {
		if (isNode()) {
			return path.dirname(filepath);
		} else if (isBrowser()) {
			var splitted = filepath.split('/');
			splitted.pop();
			return splitted.join('/');
		}
	}
	static ئسمجلد = vfs.dirname;
	
	static resolve (filePath) {
		if (isNode()) {
			return path.resolve(filePath);
		} else if (isBrowser()) {
			if (!filePath.includes(':')) {
				return vfs.getProjectPath() + filePath;
			} else {
				return filePath;
			}
		}
	}
	static حلل = vfs.resolve;
	
	static fileExist (filePath) {
		if (isNode()) {
			return fs.existsSync(filePath);
		} else if (isBrowser()) {
			// we'll search in jinni db if module exist
			var dbName = vfs.getDbName(filePath);
			var myDb = new PouchDB(dbName);
			var fulfilled = false;
			var resp;
			myDb.get(filePath).then((res) => {
				fulfilled = true;
				resp = res;
			});
			while (!fulfilled) {}; // wait for promise, bad but for compatibility
			return (resp ? true : false);
		}
	}
	static ملفموجود = vfs.fileExist;
	
	static copyFile (srcPath, dstPath) {
		if (isNode()) {
			fs.copyFileSync(srcPath, dstPath);
		} else if (isBrowser()) {
			var srcDb = vfs.getDbName(srcPath);
			var dstDb = vfs.getDbName(dstPath);
			var mySrcDb = new PouchDb(srcDb);
			var myDstDb = new PouchDb(dstDb);
			var fulfilled = 0;
			var mySrcDoc, myDstDoc;
			mySrcDb.get(srcPath).then((doc) => {
				fulfilled++;
				mySrcDoc = doc;
			});
			myDstDb.get(dstPath).then((doc) => {
				fulfilled++;
				myDstDoc = doc;
			});
			while (fulfilled < 2) {}; // wait for promises, bad but for compatibility
			var record = {
				_id: dstPath,
				content: mySrcDoc.content,
			};
			if (myDstDoc) {
				record._version = myDstDoc._version
			}
			fulfilled = false;
			myDstDb.put(record).then(() => {
				fulfilled = true;
			});
			while (!fulfilled) {}; // wait for promises, bad but for compatibility
		}
	}
	static ئنسخملف = vfs.copyFile;
}

function isNode() {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

function isBrowser() {
    return typeof window !== 'undefined';
}

export default vfs;