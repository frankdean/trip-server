/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2020 Frank Dean <frank@fdsd.co.uk>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

const fs = require('fs'),
      path = require('path'),
      YAML = require('yaml'),
      yargs = require('yargs'),
      writeOptions = {flag: 'wx'},
      version = '1.0.0';

const argv = yargs
      .usage('Usage: $0 [options]')
      .example('$0 -i config.json -o config.yaml', '– Convert file formats between JSON and YAML')
      .help('h')
      .alias('h', 'help')
      .alias('i', 'infile')
      .default('i', 'config.json')
      .describe('i', 'the JSON or YAML input file to convert')
      .string('i')
      .alias('o', 'outfile')
      .default('o', '-')
      .describe('o', 'the output file')
      .string('o')
      .alias('f', 'force')
      .default('f', false)
      .describe('f', 'overwrite <infile> if it already exists')
      .boolean('f')
      .alias('s', 'spaces')
      .describe('s', 'How many spaces to ident the output.  Use \'0\' to disable indenting JSON')
      .number('s')
      .default('s', 2)
      .version(version)
      .epilog('Copyright 2020 Frank Dean <frank@fdsd.co.uk>')
      .wrap(Math.min(yargs.terminalWidth()))
      .argv;

if (argv.force) {
  writeOptions.flag = 'w';
}

fs.readFile(argv.infile, 'utf8', (err, data) => {
  if (err) {
    if (err.code === 'ENOENT') {
      console.error('Input file does not exist:', argv.infile);
    } else {
      console.error('Failure reading', argv.infile + ':', err);
    }
    process.exit(1);
  } else {
    try {
      const config = YAML.parse(data);
      const yamlOptions = {};
      if (argv.spaces > 0) {
        yamlOptions.indent = argv.spaces;
      }

      const output = ((argv.outfile === '-' && path.extname(argv.infile) !== '.json') ||
                      path.extname(argv.outfile) === '.json' ||
                      (path.extname(argv.infile) === '.yaml' && path.extname(argv.outfile) !== '.yaml')) ?
            JSON.stringify(config, null, argv.spaces) :
            YAML.stringify(config, yamlOptions);

      if (argv.outfile === '-') {
        console.log(output);
      } else {
        fs.writeFile(argv.outfile, output, writeOptions, (err) => {
          if (err) {
            if (err.code === 'EEXIST') {
              console.error('Output file exists - use the --force option to force overwriting the file');
            } else {
              console.error('Failure writing', argv.outfile + ':', err);
            }
            process.exit(1);
          } else {
            console.error('Wrote', argv.outfile);
          }
        });
      }
    } catch (e) {
      console.error('Failure parsing', argv.infile + ':', e);
      process.exit(1);
    }
  }
});
