import { Command, flags } from '@oclif/command';
import {
  readdir,
  readFile,
  readdirSync,
  mkdirSync,
  createWriteStream,
} from 'fs-extra';
import { parse, stringify } from 'svgson';
import { query } from 'jsonpath';

class Svgtoquasar extends Command {
  static description = 'describe the command here';

  static args = [
    { name: 'src' },
    { name: 'type' },
    { name: 'customName' },
  ];
  static flags = {
    single: flags.boolean({ char: 's' }),
    base: flags.string({
      char: 'b',
    }),
  };

  async run() {
    const { args, flags } = this.parse(Svgtoquasar);

    const base = parseInt(flags.base!, 10) ?? 1;
    const src = args.src;
    let newPathname = src;
    if (flags.base) {
      newPathname = '';
      const path = src.split('/');
      for (let i = path.length - base; i < path.length; i++) {
        newPathname += path[i];
        newPathname += '/';
      }
    }
    console.log(src);
    if (flags.single) {
      const type = args.type;
      const customName = args.customName;
      convertFile(src, type, customName);
      console.log(`${src} ${type} converted`);
    } else {
      const folders = getDirectories(src);
      folders.forEach((f) => {
        const subFolders = getDirectories(`${src}/${f}`);
        subFolders.forEach((s) => {
          console.log(`${src}/${f}/${s}`);
          convertFolder(
            `${src}/${f}/${s}`,
            `${newPathname}${f}/${s}`
          );
          console.log(`${newPathname}${f}/${s} converted`);
        });
      });
    }
    console.log(`finished converting`);
  }
}

export = Svgtoquasar;

function readFiles(
  dirname: string,
  onFileContent: any,
  onError: any
) {
  readdir(dirname, function (err: any, filenames: any) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function (filename: string) {
      readFile(dirname + filename, 'utf-8', function (
        err: any,
        content: any
      ) {
        if (err) {
          onError(err);
          return;
        }
        onFileContent(filename, content);
      });
    });
  });
}

function toPascalCase(text: string) {
  return text.replace(/(^\w|-\w)/g, clearAndUpper);
}

function clearAndUpper(text: string) {
  return text.replace(/-/, '').toUpperCase();
}

function toCamelCase(text: string) {
  let arr = text.split('-');
  let capital = arr.map((item, index) =>
    index
      ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
      : item
  );
  // ^-- change here.
  return capital.join('');
}

function convertFolder(source: string, output: string) {
  const outputfolder = `export/${output}`;
  mkdirSync(outputfolder, { recursive: true });
  let stream = createWriteStream(`${outputfolder}/index.js`, {
    flags: 'a',
  });
  readFiles(
    `${source}/`,
    function (filename: string, content: string) {
      parse(content).then((json: any) => {
        // stream.write(JSON.stringify(json, null, 2));
        const name = query(
          json,
          "$.children[?(@.name=='title')].children..value"
        );
        const camelCase = toCamelCase(name[0]);
        stream.write('export const ' + camelCase + ' = `');
        const paths = query(json, '$..d');
        paths.forEach((path: string) => {
          stream.write(path + '&&');
        });
        stream.write('`;' + '\n');
      });
    },
    function (err: any) {
      throw err;
    }
  );
}

function getDirectories(folder: string) {
  return readdirSync(folder, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function convertFile(
  source: string,
  type: string,
  customName?: string
) {
  let stream = createWriteStream(`export/index.js`, {
    flags: 'a',
  });
  readFile(source, 'utf-8', function (err: any, content: any) {
    parse(content).then((json: any) => {
      // stream.write(JSON.stringify(json, null, 2));
      // console.log(JSON.stringify(json, null, 2));
      let name = '';
      const q = query(
        json,
        "$.children[?(@.name=='title')].children..value"
      );

      if (customName) {
        name = customName;
      } else {
        name = q[0];
      }
      const camelCase = 'sl' + toPascalCase(name + '-' + type);
      stream.write('export const ' + camelCase + ' = `');
      const paths = query(json, '$..d');
      paths.forEach((path: string) => {
        stream.write(path + ' ');
      });
      stream.write('`;' + '\n');
    });
  });
}
