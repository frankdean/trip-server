/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016, 2017 Frank Dean <frank@fdsd.co.uk>
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

var readline = require('readline');
var bcrypt = require('../../node_modules/bcrypt');
var uuidv4 = require('../../node_modules/uuid/v4');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr
});

var first, last, email, uuid, password, hash, nickname;

process.stderr.write('\n\nThis is a helper application to create an admin user.\n');
process.stderr.write('\nEither enter a preferred value, or just press enter to accept\n');
process.stderr.write('the default values.  Once you have logged on with this user,\n');
process.stderr.write('you will be able to change the values using the application.\n');
process.stderr.write('\nThe output of this application should be piped to the\n');
process.stderr.write('PostgreSQL psql application, e.g.:\n\n');
process.stderr.write('node startup_helper.js | psql trip');

rl.question('Enter initial user admin email [admin@trip.test]: ', function(answer) {
  email = answer ? answer : 'admin@trip.test';

  rl.question('Enter a nickname [admin]: ', function(answer) {
    nickname = answer ? answer : 'admin';

    rl.question('Enter initial admin password [secret]: ', function(answer) {
      password = answer ? answer : 'secret';

      rl.question('Enter a first name [admin]: ', function(answer) {
        first = answer ? answer : 'admin';

        rl.question('Enter a last name [admin]: ', function(answer) {
          last = answer ? answer : 'admin';

          hash = bcrypt.hashSync(password, 10);
          uuid = uuidv4();

          process.stdout.write('BEGIN;\n');
          process.stdout.write("WITH upd AS (INSERT INTO usertable (firstname, lastname, email, uuid, password, nickname) VALUES ('" +
                               first + "', '" +
                               last + "', '" +
                               email + "', '" +
                               uuid + "', '" +
                               hash + "', '" +
                               nickname +"') RETURNING id) INSERT INTO user_role (user_id, role_id) SELECT upd.id, r.id AS role_id FROM upd, role as r WHERE name='Admin';\n");

          process.stdout.write('\\x\n');
          process.stdout.write('SELECT u.id, u.nickname, u.email, u.uuid, u.password, u.firstname, u.lastname, r.name as role FROM usertable u JOIN user_role ur ON u.id=ur.user_id JOIN role r ON ur.role_id=r.id;\n');
          // process.stdout.write('ROLLBACK;\n');
          process.stdout.write('COMMIT;\n');

          rl.close();
        });
      });
    });
  });
});

